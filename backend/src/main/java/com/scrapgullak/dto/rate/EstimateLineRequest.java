package com.scrapgullak.dto.rate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record EstimateLineRequest(
        @NotNull(message = "Choose a scrap grade for every line.")
        Long categoryId,

        @NotNull(message = "Enter a weight for every scrap grade.")
        @DecimalMin(value = "0", message = "Weight cannot be negative.")
        @DecimalMax(value = "1000000", message = "Weight can be at most 1,000,000 kg.")
        Double weightKg) {
}