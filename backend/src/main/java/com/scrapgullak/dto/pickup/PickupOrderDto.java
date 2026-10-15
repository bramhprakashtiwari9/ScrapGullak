package com.scrapgullak.dto.pickup;

import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.domain.enums.OrderType;
import com.scrapgullak.domain.enums.PaymentMode;
import com.scrapgullak.dto.common.UserRef;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** A pickup order with its digital weight receipt ({@code items}) once weighed. */
public record PickupOrderDto(
        Long id,
        String orderNumber,
        UserRef customer,
        UserRef assignedAgent,
        OrderType orderType,
        OrderStatus status,
        String noidaSector,
        String fullAddress,
        Double gpsLat,
        Double gpsLng,
        LocalDate scheduledDate,
        String timeSlot,
        String estimatedWeightRange,
        String photoUrl,
        List<String> scrapGroups,
        String notes,
        CorporateDetailsDto corporateDetails,
        List<OrderItemDto> items,
        Double finalTotalWeightKg,
        BigDecimal finalPayoutInr,
        PaymentMode paymentMode,
        String upiTransactionRef,
        Instant createdAt,
        Instant paidAt) {
}