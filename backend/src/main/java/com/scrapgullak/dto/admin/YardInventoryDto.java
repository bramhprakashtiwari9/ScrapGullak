package com.scrapgullak.dto.admin;

import com.scrapgullak.dto.rate.CategoryRef;

import java.time.Instant;

public record YardInventoryDto(
        Long id,
        CategoryRef scrapCategory,
        Double rawMixedWeightKg,
        Double segregatedWeightKg,
        Double baledReadyForMillWeightKg,
        Double minTruckDispatchThresholdKg,
        Instant lastUpdated) {
}