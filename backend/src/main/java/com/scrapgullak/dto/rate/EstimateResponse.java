package com.scrapgullak.dto.rate;

import java.math.BigDecimal;
import java.util.List;

public record EstimateResponse(
        List<EstimateLineDto> items,
        double totalWeightKg,
        BigDecimal totalEstimatedPayoutInr) {
}