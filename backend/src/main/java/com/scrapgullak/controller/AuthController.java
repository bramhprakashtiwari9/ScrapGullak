package com.scrapgullak.controller;

import com.scrapgullak.dto.auth.AuthResponse;
import com.scrapgullak.dto.auth.LoginRequest;
import com.scrapgullak.dto.auth.RegisterRequest;
import com.scrapgullak.dto.common.UserDto;
import com.scrapgullak.security.AppUserPrincipal;
import com.scrapgullak.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Registration, sign-in and the current user's profile. Register and login are public. */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Customer registration, phone/password sign-in and the signed-in profile")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a customer account",
            description = "Creates a CUSTOMER (household or corporate) account and returns a JWT with the empty passbook.")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in with phone and password",
            description = "Returns a JWT; customers also receive their Gullak passbook.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Current user's profile")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(authService.currentUser(principal.id()));
    }
}
