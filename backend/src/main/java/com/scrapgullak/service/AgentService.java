package com.scrapgullak.service;

import com.scrapgullak.domain.entity.OrderItem;
import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.domain.enums.PaymentMode;
import com.scrapgullak.domain.enums.Role;
import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.dto.pickup.WeighingLineRequest;
import com.scrapgullak.dto.pickup.WeighingRequest;
import com.scrapgullak.exception.BusinessRuleException;
import com.scrapgullak.exception.ConflictException;
import com.scrapgullak.exception.ForbiddenException;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.PickupOrderRepository;
import com.scrapgullak.repository.ScrapCategoryRepository;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.support.MoneyUtils;
import com.scrapgullak.support.PricingCalculator;
import com.scrapgullak.support.SectorComparator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Field-agent workflow: the day's route, starting a pickup and the doorstep weighing that pays the customer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    static final double MAX_LINE_WEIGHT_KG = 100_000;

    /** Route order: sector (natural order), then slot start time, then booking time. */
    private static final Comparator<PickupOrder> ROUTE_ORDER =
            Comparator.comparing(PickupOrder::getNoidaSector, SectorComparator.INSTANCE)
                    .thenComparingInt(o -> slotStartMinutes(o.getTimeSlot()))
                    .thenComparing(PickupOrder::getTimeSlot, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                    .thenComparing(PickupOrder::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));

    private final PickupOrderRepository pickupOrderRepository;
    private final ScrapCategoryRepository scrapCategoryRepository;
    private final UserRepository userRepository;
    private final InventoryService inventoryService;
    private final PricingCalculator pricingCalculator;
    private final DtoMapper mapper;
    private final Clock clock;

    /**
     * The agent's open pickups (AGENT_ASSIGNED / OUT_FOR_PICKUP) scheduled on or before {@code date}
     * (default today, Asia/Kolkata), so overdue pickups stay on the route.
     */
    @Transactional(readOnly = true)
    public List<PickupOrderDto> assignedPickups(Long agentId, LocalDate date) {
        LocalDate upTo = date != null ? date : LocalDate.now(clock);
        return pickupOrderRepository
                .findByAssignedAgentIdAndStatusInAndScheduledDateLessThanEqual(agentId, OrderStatus.ACTIVE_FOR_AGENT, upTo)
                .stream()
                .sorted(ROUTE_ORDER)
                .map(mapper::toOrderDto)
                .toList();
    }

    /** AGENT_ASSIGNED -> OUT_FOR_PICKUP for the assigned agent; repeating the call is a no-op. */
    @Transactional
    public PickupOrderDto startPickup(Long agentId, Long orderId) {
        PickupOrder order = lockOrder(orderId);
        ensureOpen(order);
        ensureAssignedTo(order, agentId);
        switch (order.getStatus()) {
            case AGENT_ASSIGNED -> {
                order.setStatus(OrderStatus.OUT_FOR_PICKUP);
                log.info("Agent {} started pickup {}", agentId, order.getOrderNumber());
            }
            case OUT_FOR_PICKUP -> log.debug("Pickup {} already out for pickup", order.getOrderNumber());
            default -> throw new ConflictException(
                    "Pickup %s has not been assigned yet.".formatted(order.getOrderNumber()));
        }
        return mapper.toOrderDto(order);
    }

    /**
     * Records the doorstep weighing and pays the customer, all in one transaction:
     * <ol>
     *   <li>row-lock the order; closed orders are a 409, an agent may only weigh their own pickup
     *       (admins may weigh any open order, including an unassigned BOOKED one);</li>
     *   <li>drop lines of 0 kg or less and merge duplicate grades;</li>
     *   <li>replace the receipt lines, pricing each at the grade's current buying rate;</li>
     *   <li>mark the order PAID;</li>
     *   <li>credit the customer's Gullak with an atomic SQL increment;</li>
     *   <li>add each grade's weight to the yard's raw-mixed stock (row-locked, created when absent).</li>
     * </ol>
     */
    @Transactional
    public PickupOrderDto completeWeighing(Long callerId, Role callerRole, Long orderId, WeighingRequest request) {
        // 1. lock and authorise
        PickupOrder order = lockOrder(orderId);
        ensureOpen(order);
        if (callerRole != Role.ADMIN) {
            ensureAssignedTo(order, callerId);
        }

        // 2. clean the weighed lines
        Map<Long, Double> weights = mergeLines(request.items());
        if (weights.isEmpty()) {
            throw new BusinessRuleException("Add at least one weighed scrap grade.");
        }
        Map<Long, ScrapCategory> categories = loadCategories(weights.keySet());

        // 3. price the receipt
        order.clearItems();
        double totalKg = 0;
        BigDecimal totalPayout = MoneyUtils.ZERO;
        for (Map.Entry<Long, Double> line : weights.entrySet()) {
            ScrapCategory category = categories.get(line.getKey());
            double kg = line.getValue();
            BigDecimal subTotal = pricingCalculator.lineTotal(category, kg);
            order.addItem(OrderItem.builder()
                    .scrapCategory(category)
                    .netWeightKg(kg)
                    .appliedBuyingRateInr(MoneyUtils.money(category.getBuyingRateInr()))
                    .subTotalInr(subTotal)
                    .build());
            totalKg += kg;
            totalPayout = totalPayout.add(subTotal);
        }
        double finalKg = MoneyUtils.round2(totalKg);
        BigDecimal finalPayout = MoneyUtils.money(totalPayout);

        // 4. settle the order
        Instant now = clock.instant();
        order.setFinalTotalWeightKg(finalKg);
        order.setFinalPayoutInr(finalPayout);
        order.setPaymentMode(request.paymentMode() != null ? request.paymentMode() : PaymentMode.UPI);
        order.setUpiTransactionRef(trimToNull(request.upiTransactionRef()));
        order.setStatus(OrderStatus.PAID);
        order.setWeighedAt(now);
        order.setPaidAt(now);

        // 5. credit the customer's Gullak (flushes the order and its new lines first)
        User customer = order.getCustomer();
        int credited = userRepository.addToGullak(customer.getId(), finalPayout, finalKg);
        if (credited != 1) {
            throw new IllegalStateException("Customer " + customer.getId() + " of pickup "
                    + order.getOrderNumber() + " could not be credited");
        }

        // 6. stock the yard; grades are locked in id order so concurrent weighings cannot deadlock
        order.getItems().stream()
                .sorted(Comparator.comparing((OrderItem item) -> item.getScrapCategory().getId()))
                .forEach(item -> inventoryService.receiveRawStock(item.getScrapCategory(), item.getNetWeightKg(), now));

        log.info("Pickup {} weighed by {} {}: {} kg, Rs {} via {}", order.getOrderNumber(), callerRole, callerId,
                finalKg, finalPayout, order.getPaymentMode());
        return mapper.toOrderDto(order);
    }

    // ------------------------------------------------------------------ helpers

    private PickupOrder lockOrder(Long orderId) {
        return pickupOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new NotFoundException("Pickup %d was not found.".formatted(orderId)));
    }

    private static void ensureOpen(PickupOrder order) {
        if (order.getStatus().isClosed()) {
            throw new ConflictException("Pickup %s is already %s."
                    .formatted(order.getOrderNumber(), order.getStatus().name().toLowerCase(Locale.ROOT)));
        }
    }

    private static void ensureAssignedTo(PickupOrder order, Long agentId) {
        User agent = order.getAssignedAgent();
        if (agent == null || !Objects.equals(agent.getId(), agentId)) {
            throw new ForbiddenException("This pickup is not assigned to you.");
        }
    }

    /**
     * Drops lines of 0 kg or less, sums duplicate grades (keeping first-seen order) and rounds each grade's
     * weight to 2 dp. A merged grade above 100,000 kg is a 422.
     */
    private static Map<Long, Double> mergeLines(List<WeighingLineRequest> lines) {
        Map<Long, Double> merged = new LinkedHashMap<>();
        if (lines != null) {
            for (WeighingLineRequest line : lines) {
                if (line == null || line.categoryId() == null || line.netWeightKg() == null
                        || !(line.netWeightKg() > 0)) {
                    continue;
                }
                merged.merge(line.categoryId(), line.netWeightKg(), Double::sum);
            }
        }
        Map<Long, Double> cleaned = new LinkedHashMap<>();
        merged.forEach((categoryId, kg) -> {
            double rounded = MoneyUtils.round2(kg);
            if (rounded > MAX_LINE_WEIGHT_KG) {
                throw new BusinessRuleException("A single weighed line can be at most 100,000 kg.");
            }
            if (rounded > 0) {
                cleaned.put(categoryId, rounded);
            }
        });
        return cleaned;
    }

    private Map<Long, ScrapCategory> loadCategories(Set<Long> ids) {
        Map<Long, ScrapCategory> byId = scrapCategoryRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(ScrapCategory::getId, Function.identity()));
        for (Long id : ids) {
            if (!byId.containsKey(id)) {
                throw new NotFoundException("Scrap category %d was not found.".formatted(id));
            }
        }
        return byId;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    // ------------------------------------------------------------------ time-slot ordering

    private static final Pattern SLOT_TIME = Pattern.compile("(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm)?",
            Pattern.CASE_INSENSITIVE);

    /**
     * Start of a free-text slot in minutes after midnight, e.g. "8 – 11 AM" -> 480, "11 AM – 2 PM" -> 660,
     * "2 – 5 PM" -> 840. When only the end time carries AM/PM, the start shares it unless that would put the
     * start after the end ("10 – 1 PM" starts at 10 AM). Unparseable slots sort last.
     */
    static int slotStartMinutes(String slot) {
        if (slot == null) {
            return Integer.MAX_VALUE;
        }
        Matcher m = SLOT_TIME.matcher(slot);
        if (!m.find()) {
            return Integer.MAX_VALUE;
        }
        int hour = Integer.parseInt(m.group(1));
        int minute = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
        String meridiem = m.group(3);
        if (meridiem == null && m.find()) {
            int endHour = Integer.parseInt(m.group(1));
            String endMeridiem = m.group(3);
            if ("pm".equalsIgnoreCase(endMeridiem)) {
                meridiem = hour == 12 || (hour < endHour && endHour != 12) ? "pm" : "am";
            } else {
                meridiem = endMeridiem;
            }
        }
        if (hour > 23 || minute > 59) {
            return Integer.MAX_VALUE;
        }
        if (meridiem != null && hour <= 12) {
            hour = hour % 12 + ("pm".equalsIgnoreCase(meridiem) ? 12 : 0);
        }
        return hour * 60 + minute;
    }
}
