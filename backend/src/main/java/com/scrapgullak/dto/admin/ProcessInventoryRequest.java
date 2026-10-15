package com.scrapgullak.dto.admin;

import com.scrapgullak.domain.enums.InventoryStage;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Moves yard stock of one grade a stage forward: SEGREGATE, BALE or DISPATCH. */
public record ProcessInventoryRequest(
        @NotNull(message = "Choose a scrap grade.")
        Long categoryId,

        @NotNull(message = "Choose a processing stage.")
        InventoryStage stage,

        @NotNull(message = "Enter a weight greater than 0 kg.")
        @DecimalMin(value = "0", inclusive = false, message = "Enter a weight greater than 0 kg.")
        @DecimalMax(value = "1000000", message = "Weight can be at most 1,000,000 kg.")
        Double weightKg) {
}