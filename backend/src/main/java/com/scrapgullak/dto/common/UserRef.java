package com.scrapgullak.dto.common;

/**
 * Compact user reference embedded in pickups. {@code fullName} is the company name for corporate
 * customers (when set), otherwise the person's name.
 */
public record UserRef(Long id, String fullName, String phone) {
}
