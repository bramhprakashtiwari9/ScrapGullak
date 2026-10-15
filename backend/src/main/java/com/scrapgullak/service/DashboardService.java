package com.scrapgullak.service;

import com.scrapgullak.domain.entity.OrderItem;
import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.YardInventory;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.dto.admin.DashboardMetricsDto;
import com.scrapgullak.dto.admin.TruckAlertDto;
import com.scrapgullak.repository.PickupOrderRepository;
import com.scrapgullak.repository.YardInventoryRepository;
import com.scrapgullak.support.MoneyUtils;
import com.scrapgullak.support.PricingCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Admin yard dashboard: today's procurement cost against the projected mill resale of what was bought,
 * the pickup backlog, and which baled grades are close to filling a mill truck.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    /** A grade appears in truck alerts once its baled stock reaches this share of a truck load. */
    static final int TRUCK_ALERT_MIN_PERCENT = 75;

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final PickupOrderRepository pickupOrderRepository;
    private final YardInventoryRepository yardInventoryRepository;
    private final PricingCalculator pricingCalculator;
    private final Clock clock;

    /**
     * "Today" is the business day in the configured zone (Asia/Kolkata), i.e. PAID orders with
     * {@code paidAt} in [start of today, start of tomorrow). Resale is valued at the current mill rates.
     */
    @Transactional(readOnly = true)
    public DashboardMetricsDto metrics() {
        Instant now = clock.instant();
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.ofInstant(now, zone);
        Instant dayStart = today.atStartOfDay(zone).toInstant();
        Instant dayEnd = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<PickupOrder> paidToday = pickupOrderRepository
                .findByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThan(OrderStatus.PAID, dayStart, dayEnd);

        BigDecimal procurement = MoneyUtils.ZERO;
        BigDecimal resale = MoneyUtils.ZERO;
        double collectedKg = 0;
        for (PickupOrder order : paidToday) {
            procurement = procurement.add(MoneyUtils.money(order.getFinalPayoutInr()));
            collectedKg += order.getFinalTotalWeightKg() != null ? order.getFinalTotalWeightKg() : 0;
            for (OrderItem item : order.getItems()) {
                double kg = item.getNetWeightKg() != null ? item.getNetWeightKg() : 0;
                resale = resale.add(pricingCalculator.millValue(item.getScrapCategory(), kg));
            }
        }
        procurement = MoneyUtils.money(procurement);
        resale = MoneyUtils.money(resale);
        BigDecimal margin = MoneyUtils.money(resale.subtract(procurement));
        BigDecimal marginPercent = resale.signum() > 0
                ? margin.multiply(HUNDRED).divide(resale, MoneyUtils.SCALE, MoneyUtils.ROUNDING)
                : MoneyUtils.ZERO;

        return new DashboardMetricsDto(
                now,
                procurement,
                resale,
                margin,
                marginPercent,
                MoneyUtils.round2(collectedKg),
                paidToday.size(),
                pickupOrderRepository.countByStatusIn(OrderStatus.PENDING),
                pickupOrderRepository.countByStatus(OrderStatus.BOOKED),
                truckAlerts());
    }

    /** Every yard row with a positive threshold whose baled stock is at least 75% of it, fullest first. */
    private List<TruckAlertDto> truckAlerts() {
        return yardInventoryRepository.findAllByOrderByScrapCategoryIdAsc().stream()
                .map(this::toTruckAlert)
                .filter(Objects::nonNull)
                .filter(alert -> alert.readinessPercent() >= TRUCK_ALERT_MIN_PERCENT)
                .sorted(Comparator.comparingInt(TruckAlertDto::readinessPercent).reversed())
                .toList();
    }

    private TruckAlertDto toTruckAlert(YardInventory inventory) {
        double threshold = inventory.getMinTruckDispatchThresholdKg() != null
                ? inventory.getMinTruckDispatchThresholdKg() : 0;
        if (!(threshold > 0)) {
            return null;
        }
        double baled = inventory.getBaledReadyForMillWeightKg() != null ? inventory.getBaledReadyForMillWeightKg() : 0;
        long percent = Math.round(baled / threshold * 100);
        int readiness = (int) Math.max(Integer.MIN_VALUE, Math.min(Integer.MAX_VALUE, percent));
        return new TruckAlertDto(
                inventory.getScrapCategory().getId(),
                inventory.getScrapCategory().getName(),
                MoneyUtils.round2(baled),
                MoneyUtils.round2(threshold),
                readiness,
                baled >= threshold);
    }
}
