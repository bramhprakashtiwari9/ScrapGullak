package com.scrapgullak.dto.admin;

import com.scrapgullak.domain.enums.Role;

/** Field agent with the number of pickups currently on their route (assigned or out for pickup). */
public record AgentDto(
        Long id,
        String fullName,
        String phone,
        String email,
        Role role,
        String noidaSector,
        String vehicle,
        long activePickups) {
}