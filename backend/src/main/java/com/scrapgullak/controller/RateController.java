package com.scrapgullak.controller;

import com.scrapgullak.domain.enums.Role;
import com.scrapgullak.dto.rate.EstimateRequest;
import com.scrapgullak.dto.rate.EstimateResponse;
import com.scrapgullak.dto.rate.ScrapCategoryDto;
import com.scrapgullak.security.AppUserPrincipal;
import com.scrapgullak.service.RateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public rate card and payout estimator. A token is optional here; when the caller is an ADMIN the
 * mill selling rate is included in the rate card.
 */
@RestController
@RequestMapping("/api/v1/rates")
@RequiredArgsConstructor
@Tag(name = "Rates", description = "Live scrap buying rates and instant payout estimates (public)")
public class RateController {

    private final RateService rateService;

    @GetMapping("/live")
    @Operation(summary = "Live rate card",
            description = "Active scrap categories ordered by id. millSellingRateInr is only returned to admins.")
    public ResponseEntity<List<ScrapCategoryDto>> liveRates(@AuthenticationPrincipal AppUserPrincipal principal) {
        boolean includeMill = principal != null && principal.role() == Role.ADMIN;
        return ResponseEntity.ok(rateService.liveRates(includeMill));
    }

    @PostMapping("/estimate")
    @Operation(summary = "Estimate a payout",
            description = "Prices a basket of scrap grades at current buying rates; zero-weight lines are skipped.")
    public ResponseEntity<EstimateResponse> estimate(@Valid @RequestBody EstimateRequest request) {
        return ResponseEntity.ok(rateService.estimate(request));
    }
}
