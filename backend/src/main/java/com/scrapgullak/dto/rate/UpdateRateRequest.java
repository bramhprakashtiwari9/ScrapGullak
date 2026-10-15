package com.scrapgullak.dto.rate;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Admin rate update. A buying rate at or above the mill rate (negative margin) is allowed but logged.
 * {@code isActive} is optional: when null the category's visibility is left unchanged. Rates are rounded to 2 decimals.
 */
public record UpdateRateRequest(
        @NotNull(message = "Enter the buying rate.")
        @DecimalMin(value = "0", inclusive = false, message = "Rates must be greater than ₹0.")
        @DecimalMax(value = "100000", message = "Rates can be at most ₹100000.")
        BigDecimal buyingRateInr,

        @NotNull(message = "Enter the mill selling rate.")
        @DecimalMin(value = "0", inclusive = false, message = "Rates must be greater than ₹0.")
        @DecimalMax(value = "100000", message = "Rates can be at most ₹100000.")
        BigDecimal millSellingRateInr,

        @JsonProperty("isActive") Boolean active) {
}