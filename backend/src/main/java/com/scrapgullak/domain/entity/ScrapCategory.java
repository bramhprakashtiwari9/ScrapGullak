package com.scrapgullak.domain.entity;

import com.scrapgullak.domain.enums.CategoryGroup;
import com.scrapgullak.domain.enums.ScrapUnit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A scrap grade with the rate the yard pays customers ({@code buyingRateInr}) and the rate the mill pays
 * the yard ({@code millSellingRateInr}, admin-only information).
 */
@Entity
@Table(name = "scrap_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScrapCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category_group", nullable = false, length = 20)
    private CategoryGroup categoryGroup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private ScrapUnit unit = ScrapUnit.KG;

    @Column(name = "buying_rate_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal buyingRateInr;

    @Column(name = "mill_selling_rate_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal millSellingRateInr;

    @Column(name = "icon_name", length = 40)
    private String iconName;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
