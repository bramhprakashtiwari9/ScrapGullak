package com.scrapgullak.service;

import com.scrapgullak.domain.entity.OrderItem;
import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.dto.passbook.PassbookResponse;
import com.scrapgullak.dto.passbook.PassbookTransactionDto;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.PickupOrderRepository;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.support.Co2Calculator;
import com.scrapgullak.support.MoneyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Builds a customer's Gullak passbook. Lifetime earnings and recycled kg come from the {@code users} row
 * (maintained by atomic increments at weighing time); the ledger and CO2 estimate come from PAID orders.
 */
@Service
@RequiredArgsConstructor
public class PassbookService {

    private final UserRepository userRepository;
    private final PickupOrderRepository pickupOrderRepository;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public PassbookResponse getPassbook(Long customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("Your account was not found."));
        return buildFor(customer);
    }

    /**
     * Passbook for an already loaded customer (used by login/registration). Joins the caller's transaction;
     * the user's totals must be current (load the user after any {@code addToGullak} in the same transaction).
     */
    @Transactional(readOnly = true)
    public PassbookResponse buildFor(User customer) {
        List<PickupOrder> paid = pickupOrderRepository
                .findByCustomerIdAndStatusOrderByPaidAtDesc(customer.getId(), OrderStatus.PAID);

        double co2 = paid.stream()
                .flatMap(order -> order.getItems().stream())
                .mapToDouble(PassbookService::co2For)
                .sum();

        List<PassbookTransactionDto> transactions = paid.stream()
                .map(mapper::toPassbookTransaction)
                .toList();

        double recycledKg = customer.getTotalRecycledKg() == null ? 0.0 : customer.getTotalRecycledKg();
        return new PassbookResponse(
                MoneyUtils.money(customer.getGullakTotalEarnings()),
                MoneyUtils.round2(recycledKg),
                Math.round(co2),
                paid.size(),
                transactions);
    }

    private static double co2For(OrderItem item) {
        if (item.getNetWeightKg() == null || item.getScrapCategory() == null) {
            return 0.0;
        }
        return Co2Calculator.co2ForKg(item.getNetWeightKg(), item.getScrapCategory().getCategoryGroup());
    }
}
