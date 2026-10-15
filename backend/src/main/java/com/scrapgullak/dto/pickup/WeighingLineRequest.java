package com.scrapgullak.dto.pickup;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;

public record WeighingLineRequest(
        @NotNull(message = "Choose a scrap grade for every weighed line.")
        Long categoryId,

        @NotNull(message = "Enter the net weight for every scrap grade.")
        @DecimalMax(value = "100000", message = "A single weighed line can be at most 100,000 kg.")
        Double netWeightKg) {
}