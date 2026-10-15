package com.scrapgullak.dto.pickup;

import com.scrapgullak.domain.enums.OrderType;
import com.scrapgullak.support.ValidationPatterns;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * A customer's pickup booking. {@code orderType} defaults to DOORSTEP_B2C. {@code photoUrl} must be an
 * http(s) link (photos are uploaded to object storage first; data: URLs are rejected). The
 * scheduled-date window (today .. today+60) is a business rule checked by the service.
 */
public record CreatePickupRequest(
        OrderType orderType,

        @NotBlank(message = "Select your sector.")
        @Size(max = 80, message = "Sector can be at most 80 characters.")
        String noidaSector,

        @NotBlank(message = "Add your flat, tower or plot number so the agent can find you.")
        @Size(max = 500, message = "Address can be at most 500 characters.")
        String fullAddress,

        @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90.")
        @DecimalMax(value = "90", message = "Latitude must be between -90 and 90.")
        Double gpsLat,

        @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180.")
        @DecimalMax(value = "180", message = "Longitude must be between -180 and 180.")
        Double gpsLng,

        @NotNull(message = "Choose a pickup date.")
        LocalDate scheduledDate,

        @NotBlank(message = "Select a time slot.")
        @Size(max = 40, message = "Time slot can be at most 40 characters.")
        String timeSlot,

        @Size(max = 40, message = "Weight range can be at most 40 characters.")
        String estimatedWeightRange,

        @Size(max = 12, message = "Select at most 12 scrap types.")
        List<@NotBlank(message = "Scrap types cannot be blank.")
             @Size(max = 40, message = "Scrap type names can be at most 40 characters.") String> scrapGroups,

        @Size(max = 1000, message = "Photo link can be at most 1000 characters.")
        @Pattern(regexp = ValidationPatterns.HTTP_URL_OR_EMPTY,
                message = "Photo must be an http(s) link. Upload the photo first.")
        String photoUrl,

        @Size(max = 1000, message = "Notes can be at most 1000 characters.")
        String notes,

        @Size(max = 150, message = "Company name can be at most 150 characters.")
        String companyName,

        @Size(max = 20, message = "Enter a valid contact phone number.")
        String contactPhone,

        @Valid
        CorporateDetailsDto corporateDetails) {

    public CreatePickupRequest {
        if (orderType == null) {
            orderType = OrderType.DOORSTEP_B2C;
        }
        if (scrapGroups == null) {
            scrapGroups = List.of();
        }
    }
}