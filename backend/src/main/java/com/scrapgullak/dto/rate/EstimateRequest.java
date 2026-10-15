package com.scrapgullak.dto.rate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Instant payout estimate for a basket of scrap grades. Lines with weight 0 are ignored. */
public record EstimateRequest(
        @NotNull(message = "Add at least one scrap grade to estimate.")
        @Size(max = 50, message = "You can estimate at most 50 scrap grades at a time.")
        List<@Valid @NotNull(message = "Estimate lines cannot be empty.") EstimateLineRequest> items) {
}