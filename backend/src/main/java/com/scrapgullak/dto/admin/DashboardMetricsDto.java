package com.scrapgullak.dto.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Yard P&L for today (Asia/Kolkata business day) plus pickup backlog and mill-truck readiness. */
public record DashboardMetricsDto(
        Instant date,
        BigDecimal todayProcurementCostInr,
        BigDecimal projectedMillResaleInr,
        BigDecimal netProfitMarginInr,
        BigDecimal marginPercent,
        double todayCollectedKg,
        long todayCompletedPickups,
        long pendingPickups,
        long unassignedPickups,
        List<TruckAlertDto> truckAlerts) {
}