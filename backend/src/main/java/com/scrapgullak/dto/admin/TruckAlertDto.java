package com.scrapgullak.dto.admin;

/** A grade whose baled stock is at least 75% of a mill truck load; {@code ready} once the threshold is met. */
public record TruckAlertDto(
        Long categoryId,
        String categoryName,
        double baledKg,
        double thresholdKg,
        int readinessPercent,
        boolean ready) {
}