package com.scrapgullak.dto.rate;

import com.scrapgullak.domain.enums.CategoryGroup;
import com.scrapgullak.domain.enums.ScrapUnit;

/** Compact scrap-grade reference embedded in receipt lines and inventory rows. */
public record CategoryRef(Long id, String name, CategoryGroup categoryGroup, ScrapUnit unit) {
}