package com.scrapgullak.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.scrapgullak.domain.enums.AccountType;
import com.scrapgullak.support.ValidationPatterns;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Customer self-registration. Role is always CUSTOMER; {@code accountType} defaults to B2C_HOUSEHOLD and
 * a corporate (B2B) account must supply a GSTIN.
 */
public record RegisterRequest(
        @NotBlank(message = "Enter your full name.")
        @Size(max = 100, message = "Name can be at most 100 characters.")
        String fullName,

        @NotBlank(message = "Enter your phone number.")
        @Pattern(regexp = ValidationPatterns.MOBILE_INPUT, message = "Enter a valid 10-digit Indian mobile number.")
        String phone,

        @Email(message = "Enter a valid email address.")
        @Size(max = 150, message = "Email can be at most 150 characters.")
        String email,

        @NotBlank(message = "Choose a password.")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters long.")
        String password,

        AccountType accountType,

        @Pattern(regexp = ValidationPatterns.GSTIN_OR_EMPTY, message = "GSTIN should look like 09AABCE1234F1Z5.")
        String gstNumber,

        @Size(max = 150, message = "Company name can be at most 150 characters.")
        String companyName,

        @Size(max = 500, message = "Address can be at most 500 characters.")
        String address,

        @Size(max = 80, message = "Sector can be at most 80 characters.")
        String noidaSector) {

    public RegisterRequest {
        if (accountType == null) {
            accountType = AccountType.B2C_HOUSEHOLD;
        }
    }

    /** Corporate accounts must provide a GSTIN. */
    @JsonIgnore
    @AssertTrue(message = "Enter your company's GSTIN to register a corporate account.")
    public boolean isGstNumberPresentForCorporate() {
        return accountType != AccountType.B2B_CORPORATE || (gstNumber != null && !gstNumber.isBlank());
    }

    @Override
    public String toString() {
        return "RegisterRequest[fullName=" + fullName + ", phone=" + phone + ", accountType=" + accountType
                + ", password=***]";
    }
}
