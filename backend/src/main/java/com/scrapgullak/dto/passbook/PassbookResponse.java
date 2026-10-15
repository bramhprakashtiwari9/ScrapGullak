package com.scrapgullak.dto.passbook;

import java.math.BigDecimal;
import java.util.List;

/**
 * The customer's Gullak: lifetime earnings and recycled weight, estimated CO2 saved and the
 * paid-pickup ledger (newest first).
 */
public record PassbookResponse(
        BigDecimal gullakTotalEarnings,
        double totalRecycledKg,
        long co2SavedKg,
        int totalPickups,
        List<PassbookTransactionDto> transactions) {
}