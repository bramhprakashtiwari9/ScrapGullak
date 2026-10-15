package com.scrapgullak.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * One weighed scrap grade on a pickup (a line of the digital weight receipt). The buying rate is
 * snapshotted at weighing time so later rate changes never alter a paid receipt.
 */
@Entity
@Table(name = "order_items", indexes = @Index(name = "idx_order_items_order", columnList = "pickup_order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pickup_order_id", nullable = false)
    private PickupOrder pickupOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scrap_category_id", nullable = false)
    private ScrapCategory scrapCategory;

    @Column(name = "net_weight_kg", nullable = false)
    private Double netWeightKg;

    @Column(name = "applied_buying_rate_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal appliedBuyingRateInr;

    @Column(name = "sub_total_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal subTotalInr;
}
