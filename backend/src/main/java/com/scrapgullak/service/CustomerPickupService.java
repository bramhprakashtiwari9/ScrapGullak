package com.scrapgullak.service;

import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.domain.enums.OrderType;
import com.scrapgullak.dto.pickup.CorporateDetailsDto;
import com.scrapgullak.dto.pickup.CreatePickupRequest;
import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.exception.BusinessRuleException;
import com.scrapgullak.exception.ConflictException;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.PickupOrderRepository;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.support.OrderNumberGenerator;
import com.scrapgullak.support.PhoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** A customer's own pickups: booking, history (with digital weight receipts) and cancellation. */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerPickupService {

    /** Furthest a pickup can be booked ahead, in days (inclusive). */
    static final int MAX_DAYS_AHEAD = 60;
    static final String DATE_WINDOW_MESSAGE = "Pick a date between today and the next 60 days.";

    private static final Set<OrderStatus> CANCELLABLE = EnumSet.of(OrderStatus.BOOKED, OrderStatus.AGENT_ASSIGNED);
    private static final int CONTACT_PHONE_MAX = 15;

    private final PickupOrderRepository pickupOrderRepository;
    private final UserRepository userRepository;
    private final OrderNumberGenerator orderNumberGenerator;
    private final DtoMapper mapper;
    private final Clock clock;

    /**
     * Books a pickup for the caller (status BOOKED). The date must fall within today..today+60 in the
     * business time zone. Corporate details are copied onto the order; an INDUSTRIAL_B2B request falls back
     * to the customer's profile for company name, GSTIN and contact.
     */
    @Transactional
    public PickupOrderDto createPickup(Long customerId, CreatePickupRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Your account was not found."));

        LocalDate today = LocalDate.now(clock);
        LocalDate date = request.scheduledDate();
        if (date == null || date.isBefore(today) || date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
            throw new BusinessRuleException(DATE_WINDOW_MESSAGE);
        }

        String photoUrl = trimToNull(request.photoUrl());
        if (photoUrl != null && !isHttpUrl(photoUrl)) {
            // Bean validation already rejects this; guard against callers that bypass it.
            throw new BusinessRuleException("Photo must be an http(s) link. Upload the photo first.");
        }

        OrderType orderType = request.orderType() == null ? OrderType.DOORSTEP_B2C : request.orderType();
        PickupOrder order = PickupOrder.builder()
                .orderNumber(orderNumberGenerator.next())
                .customer(customer)
                .orderType(orderType)
                .status(OrderStatus.BOOKED)
                .noidaSector(request.noidaSector().trim())
                .fullAddress(request.fullAddress().trim())
                .gpsLat(request.gpsLat())
                .gpsLng(request.gpsLng())
                .scheduledDate(date)
                .timeSlot(request.timeSlot().trim())
                .estimatedWeightRange(trimToNull(request.estimatedWeightRange()))
                .scrapGroups(cleanGroups(request.scrapGroups()))
                .photoUrl(photoUrl)
                .notes(trimToNull(request.notes()))
                .createdAt(Instant.now(clock))
                .build();
        applyCorporateDetails(order, request, customer);

        PickupOrder saved = pickupOrderRepository.save(order);
        log.info("Customer {} booked {} pickup {} for {} ({})",
                customerId, orderType, saved.getOrderNumber(), date, saved.getNoidaSector());
        return mapper.toOrderDto(saved);
    }

    /** The caller's pickups, newest first, including weighed line items. */
    @Transactional(readOnly = true)
    public List<PickupOrderDto> myPickups(Long customerId) {
        return pickupOrderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(mapper::toOrderDto)
                .toList();
    }

    /**
     * Cancels the caller's own pickup while it is BOOKED or AGENT_ASSIGNED. Another customer's order is
     * reported as not found so order ids cannot be probed.
     */
    @Transactional
    public PickupOrderDto cancelPickup(Long customerId, Long orderId) {
        PickupOrder order = pickupOrderRepository.findByIdForUpdate(orderId)
                .filter(o -> Objects.equals(o.getCustomer().getId(), customerId))
                .orElseThrow(() -> new NotFoundException("Pickup " + orderId + " was not found."));

        OrderStatus status = order.getStatus();
        if (!CANCELLABLE.contains(status)) {
            throw new ConflictException(status == OrderStatus.OUT_FOR_PICKUP
                    ? "Pickup " + order.getOrderNumber() + " is already out for pickup and can no longer be cancelled."
                    : "Pickup " + order.getOrderNumber() + " is already " + status.name().toLowerCase(Locale.ROOT) + ".");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(Instant.now(clock));
        log.info("Customer {} cancelled pickup {}", customerId, order.getOrderNumber());
        return mapper.toOrderDto(order);
    }

    private static void applyCorporateDetails(PickupOrder order, CreatePickupRequest request, User customer) {
        CorporateDetailsDto details = request.corporateDetails();
        boolean industrial = order.getOrderType() == OrderType.INDUSTRIAL_B2B;
        if (!industrial && details == null) {
            return; // household pickup: no corporate block
        }

        String companyName = firstText(details == null ? null : details.companyName(), request.companyName());
        String gstNumber = details == null ? null : trimToNull(details.gstNumber());
        String contactName = details == null ? null : trimToNull(details.contactName());
        String contactPhone = firstText(details == null ? null : details.phone(), request.contactPhone());
        String contactEmail = details == null ? null : trimToNull(details.email());

        if (industrial) {
            companyName = firstText(companyName, customer.getCompanyName());
            gstNumber = firstText(gstNumber, customer.getGstNumber());
            contactName = firstText(contactName, customer.getFullName());
            contactPhone = firstText(contactPhone, customer.getPhone());
            contactEmail = firstText(contactEmail, customer.getEmail());
        }

        order.setCompanyName(companyName);
        order.setCorporateGstNumber(gstNumber == null ? null : gstNumber.toUpperCase(Locale.ROOT));
        order.setContactName(contactName);
        order.setContactPhone(normalizeContactPhone(contactPhone));
        order.setContactEmail(contactEmail);
        order.setRequestType(details == null ? null : trimToNull(details.requestType()));
        order.setFrequency(details == null ? null : trimToNull(details.frequency()));
    }

    /** Mobile numbers are stored in the canonical 10-digit form; landlines keep their digits. */
    private static String normalizeContactPhone(String raw) {
        String digits = PhoneUtils.normalize(raw);
        if (digits == null || digits.isEmpty()) {
            return null;
        }
        if (digits.length() > CONTACT_PHONE_MAX) {
            throw new BusinessRuleException("Enter a valid contact phone number.");
        }
        return digits;
    }

    private static List<String> cleanGroups(List<String> groups) {
        if (groups == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(groups.stream()
                .map(CustomerPickupService::trimToNull)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
    }

    private static boolean isHttpUrl(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("http://") || lower.startsWith("https://");
    }

    private static String firstText(String first, String second) {
        String value = trimToNull(first);
        return value != null ? value : trimToNull(second);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
