package com.scrapgullak.controller;

import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.dto.pickup.WeighingRequest;
import com.scrapgullak.security.AppUserPrincipal;
import com.scrapgullak.service.AgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/** Field-agent endpoints. Complete-weighing is also open to admins (yard walk-ins and corrections). */
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
@PreAuthorize("hasRole('AGENT')")
@Tag(name = "Agent", description = "Pickup route and doorstep weighing for field agents")
@SecurityRequirement(name = "bearerAuth")
public class AgentController {

    private final AgentService agentService;

    @GetMapping("/pickups/assigned")
    @Operation(summary = "My pickup route",
            description = "Open pickups assigned to the caller scheduled on or before the date (default today, "
                    + "Asia/Kolkata), so overdue pickups are included. Sorted by sector, then time slot.")
    public List<PickupOrderDto> assignedPickups(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @Parameter(description = "Route date (yyyy-MM-dd); defaults to today")
            @RequestParam(name = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {
        return agentService.assignedPickups(principal.id(), date);
    }

    @PostMapping("/pickups/{orderId}/start")
    @Operation(summary = "Start a pickup",
            description = "Moves an assigned pickup to OUT_FOR_PICKUP. Repeating the call is harmless.")
    public PickupOrderDto startPickup(@AuthenticationPrincipal AppUserPrincipal principal,
                                      @PathVariable("orderId") Long orderId) {
        return agentService.startPickup(principal.id(), orderId);
    }

    @PostMapping("/pickups/{orderId}/complete-weighing")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    @Operation(summary = "Complete the doorstep weighing",
            description = "Records the weighed grades at current buying rates, marks the pickup PAID, credits the "
                    + "customer's Gullak and adds the weight to the yard's raw stock, all in one transaction. "
                    + "Agents may only weigh their own pickups; admins may weigh any open pickup.")
    public PickupOrderDto completeWeighing(@AuthenticationPrincipal AppUserPrincipal principal,
                                           @PathVariable("orderId") Long orderId,
                                           @Valid @RequestBody WeighingRequest request) {
        return agentService.completeWeighing(principal.id(), principal.role(), orderId, request);
    }
}
