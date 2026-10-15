package com.scrapgullak.dto.pickup;

import com.scrapgullak.dto.rate.CategoryRef;

import java.math.BigDecimal;

/** One line of the digital weight receipt. */
public record OrderItemDto(
        Long id,
        CategoryRef scrapCategory,
        Double netWeightKg,
        BigDecimal appliedBuyingRateInr,
        BigDecimal subTotalInr) {
}