package com.scrapgullak.dto.common;

import com.scrapgullak.domain.enums.AccountType;
import com.scrapgullak.domain.enums.Role;

import java.math.BigDecimal;
import java.time.Instant;

/** Profile of the signed-in user (never includes the password hash). */
public record UserDto(
        Long id,
        String fullName,
        String phone,
        String email,
        Role role,
        AccountType accountType,
        String gstNumber,
        String companyName,
        String address,
        String noidaSector,
        String vehicle,
        BigDecimal gullakTotalEarnings,
        Double totalRecycledKg,
        Instant createdAt) {
}
