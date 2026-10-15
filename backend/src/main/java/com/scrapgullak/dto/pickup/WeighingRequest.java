package com.scrapgullak.dto.pickup;

import com.scrapgullak.domain.enums.PaymentMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Doorstep weighing result. Lines with weight 0 are dropped and duplicate grades merged by the service
 * (an empty result is a 422). {@code paymentMode} defaults to UPI.
 */
public record WeighingRequest(
        @NotNull(message = "Add at least one weighed scrap grade.")
        @Size(max = 50, message = "A pickup can have at most 50 weighed lines.")
        List<@Valid @NotNull(message = "Weighing lines cannot be empty.") WeighingLineRequest> items,

        PaymentMode paymentMode,

        @Size(max = 64, message = "UPI reference can be at most 64 characters.")
        String upiTransactionRef) {

    public WeighingRequest {
        if (paymentMode == null) {
            paymentMode = PaymentMode.UPI;
        }
    }
}