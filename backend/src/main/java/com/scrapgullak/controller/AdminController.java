package com.scrapgullak.controller;

import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.dto.admin.AgentDto;
import com.scrapgullak.dto.admin.DashboardMetricsDto;
import com.scrapgullak.dto.admin.ProcessInventoryRequest;
import com.scrapgullak.dto.admin.YardInventoryDto;
import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.dto.rate.ScrapCategoryDto;
import com.scrapgullak.dto.rate.UpdateRateRequest;
import com.scrapgullak.service.AdminService;
import com.scrapgullak.service.DashboardService;
import com.scrapgullak.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Yard-admin endpoints: rate card, pickup dispatch, agents, yard inventory and the P&L dashboard. */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Yard administration: rates, dispatch, inventory and metrics")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;
    private final InventoryService inventoryService;
    private final DashboardService dashboardService;

    // ------------------------------------------------------------------ rates

    @GetMapping("/rates")
    @Operation(summary = "Full rate card", description = "All scrap categories, inactive ones included, with mill rates.")
    public List<ScrapCategoryDto> rates() {
        return adminService.allRates();
    }

    @PutMapping("/rates/{categoryId}")
    @Operation(summary = "Update a category's rates",
            description = "Sets the buying and mill selling rates and optionally isActive. A buying rate at or above "
                    + "the mill rate is allowed but logged as a negative margin.")
    public ScrapCategoryDto updateRate(@PathVariable("categoryId") Long categoryId,
                                       @Valid @RequestBody UpdateRateRequest request) {
        return adminService.updateRate(categoryId, request);
    }

    // ------------------------------------------------------------------ pickups

    @GetMapping("/pickups")
    @Operation(summary = "All pickups", description = "Every pickup, newest first, optionally filtered by status.")
    public List<PickupOrderDto> pickups(
            @Parameter(description = "Only pickups in this status")
            @RequestParam(name = "status", required = false) OrderStatus status) {
        return adminService.allPickups(status);
    }

    @PatchMapping("/pickups/{orderId}/assign/{agentId}")
    @Operation(summary = "Assign or reassign an agent",
            description = "A BOOKED pickup becomes AGENT_ASSIGNED; other open pickups keep their status.")
    public PickupOrderDto assignAgent(@PathVariable("orderId") Long orderId,
                                      @PathVariable("agentId") Long agentId) {
        return adminService.assignAgent(orderId, agentId);
    }

    @PatchMapping("/pickups/{orderId}/cancel")
    @Operation(summary = "Cancel a pickup", description = "Cancels any pickup that is not yet closed (weighed, paid or cancelled).")
    public PickupOrderDto cancelPickup(@PathVariable("orderId") Long orderId) {
        return adminService.cancelPickup(orderId);
    }

    // ------------------------------------------------------------------ agents

    @GetMapping("/agents")
    @Operation(summary = "Agent roster", description = "Active agents with their count of open assigned pickups.")
    public List<AgentDto> agents() {
        return adminService.agents();
    }

    // ------------------------------------------------------------------ inventory

    @GetMapping("/inventory")
    @Operation(summary = "Yard inventory", description = "Stock per grade by stage, ordered by category id.")
    public List<YardInventoryDto> inventory() {
        return inventoryService.listInventory();
    }

    @PostMapping("/inventory/process")
    @Operation(summary = "Process yard stock",
            description = "SEGREGATE moves raw to sorted, BALE moves sorted to baled, DISPATCH sends baled stock "
                    + "to the mill.")
    public YardInventoryDto processInventory(@Valid @RequestBody ProcessInventoryRequest request) {
        return inventoryService.process(request);
    }

    // ------------------------------------------------------------------ dashboard

    @GetMapping("/dashboard/metrics")
    @Operation(summary = "Dashboard metrics",
            description = "Today's procurement cost, projected mill resale and margin (Asia/Kolkata business day), "
                    + "pickup backlog and mill-truck readiness alerts.")
    public DashboardMetricsDto metrics() {
        return dashboardService.metrics();
    }
}
