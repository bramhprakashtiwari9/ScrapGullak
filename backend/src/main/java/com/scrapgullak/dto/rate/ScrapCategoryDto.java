package com.scrapgullak.dto.rate;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.scrapgullak.domain.enums.CategoryGroup;
import com.scrapgullak.domain.enums.ScrapUnit;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A scrap grade as shown on the live rate board. {@code millSellingRateInr} is null (and therefore
 * omitted from JSON) for everyone except admins.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ScrapCategoryDto(
        Long id,
        String name,
        CategoryGroup categoryGroup,
        ScrapUnit unit,
        BigDecimal buyingRateInr,
        BigDecimal millSellingRateInr,
        String iconName,
        @JsonProperty("isActive") boolean active,
        Instant updatedAt) {
}