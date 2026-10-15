package com.scrapgullak.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Phone + password sign-in. The phone is normalised (spaces, +91, leading 0 removed) before lookup. */
public record LoginRequest(
        @NotBlank(message = "Enter your phone number.")
        @Size(max = 20, message = "Enter a valid phone number.")
        String phone,

        @NotBlank(message = "Enter your password.")
        @Size(max = 72, message = "Invalid phone number or password.")
        String password) {

    @Override
    public String toString() {
        return "LoginRequest[phone=" + phone + ", password=***]";
    }
}
