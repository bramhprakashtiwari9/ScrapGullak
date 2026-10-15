package com.scrapgullak.dto.pickup;

import com.scrapgullak.support.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Company/contact details of an INDUSTRIAL_B2B (corporate tender / bulk) pickup; null for household pickups. */
public record CorporateDetailsDto(
        @Size(max = 150, message = "Company name can be at most 150 characters.")
        String companyName,

        @Pattern(regexp = ValidationPatterns.GSTIN_OR_EMPTY, message = "GSTIN should look like 09AABCE1234F1Z5.")
        String gstNumber,

        @Size(max = 100, message = "Contact name can be at most 100 characters.")
        String contactName,

        @Size(max = 20, message = "Enter a valid contact phone number.")
        String phone,

        @Email(message = "Enter a valid email address.")
        @Size(max = 150, message = "Email can be at most 150 characters.")
        String email,

        @Size(max = 60, message = "Request type can be at most 60 characters.")
        String requestType,

        @Size(max = 60, message = "Frequency can be at most 60 characters.")
        String frequency) {
}