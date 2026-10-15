package com.scrapgullak.controller;

import com.scrapgullak.dto.passbook.PassbookResponse;
import com.scrapgullak.dto.pickup.CreatePickupRequest;
import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.security.AppUserPrincipal;
import com.scrapgullak.service.CustomerPickupService;
import com.scrapgullak.service.PassbookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Customer self-service: book, list and cancel pickups, and view the Gullak passbook. */
@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Customer", description = "Pickup booking, pickup history and the Gullak passbook")
public class CustomerController {

    private final CustomerPickupService pickupService;
    private final PassbookService passbookService;

    @PostMapping("/pickups")
    @Operation(summary = "Book a pickup",
            description = "Doorstep (B2C) or industrial (B2B) pickup for a date between today and 60 days ahead.")
    public ResponseEntity<PickupOrderDto> createPickup(@AuthenticationPrincipal AppUserPrincipal principal,
                                                       @Valid @RequestBody CreatePickupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pickupService.createPickup(principal.id(), request));
    }

    @GetMapping("/pickups")
    @Operation(summary = "My pickups", description = "Newest first, with digital weight receipts for paid pickups.")
    public ResponseEntity<List<PickupOrderDto>> myPickups(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(pickupService.myPickups(principal.id()));
    }

    @PostMapping("/pickups/{orderId}/cancel")
    @Operation(summary = "Cancel my pickup", description = "Allowed while the pickup is BOOKED or AGENT_ASSIGNED.")
    public ResponseEntity<PickupOrderDto> cancelPickup(@AuthenticationPrincipal AppUserPrincipal principal,
                                                       @PathVariable Long orderId) {
        return ResponseEntity.ok(pickupService.cancelPickup(principal.id(), orderId));
    }

    @GetMapping("/gullak-passbook")
    @Operation(summary = "My Gullak passbook", description = "Lifetime earnings, recycled kg, CO2 saved and paid pickups.")
    public ResponseEntity<PassbookResponse> passbook(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(passbookService.getPassbook(principal.id()));
    }
}
