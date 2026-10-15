package com.scrapgullak.dto.passbook;

import com.scrapgullak.domain.enums.PaymentMode;

import java.math.BigDecimal;
import java.time.Instant;

/** One paid pickup in the passbook; {@code date} is the payment time. */
public record PassbookTransactionDto(
        Long orderId,
        String orderNumber,
        Instant date,
        Double weightKg,
        BigDecimal amountInr,
        PaymentMode paymentMode,
        String upiTransactionRef) {
}