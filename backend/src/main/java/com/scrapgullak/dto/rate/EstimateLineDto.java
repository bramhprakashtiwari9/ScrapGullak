package com.scrapgullak.dto.rate;

import java.math.BigDecimal;

public record EstimateLineDto(
        Long categoryId,
        String categoryName,
        double weightKg,
        BigDecimal buyingRateInr,
        BigDecimal subTotalInr) {
}