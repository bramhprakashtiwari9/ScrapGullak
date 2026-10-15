package com.scrapgullak.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Yard stock of one scrap grade through its processing stages:
 * raw mixed -> segregated -> baled (ready for the mill truck).
 */
@Entity
@Table(name = "yard_inventory")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YardInventory {

    /** Default baled weight that fills a mill truck. */
    public static final double DEFAULT_TRUCK_THRESHOLD_KG = 1000.0;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scrap_category_id", nullable = false, unique = true)
    private ScrapCategory scrapCategory;

    @Column(name = "raw_mixed_weight_kg", nullable = false)
    @Builder.Default
    private Double rawMixedWeightKg = 0.0;

    @Column(name = "segregated_weight_kg", nullable = false)
    @Builder.Default
    private Double segregatedWeightKg = 0.0;

    @Column(name = "baled_ready_for_mill_weight_kg", nullable = false)
    @Builder.Default
    private Double baledReadyForMillWeightKg = 0.0;

    @Column(name = "min_truck_dispatch_threshold_kg", nullable = false)
    @Builder.Default
    private Double minTruckDispatchThresholdKg = DEFAULT_TRUCK_THRESHOLD_KG;

    @Column(name = "last_updated")
    private Instant lastUpdated;

    @Version
    private Long version;

    @PrePersist
    @PreUpdate
    void ensureDefaults() {
        if (rawMixedWeightKg == null) {
            rawMixedWeightKg = 0.0;
        }
        if (segregatedWeightKg == null) {
            segregatedWeightKg = 0.0;
        }
        if (baledReadyForMillWeightKg == null) {
            baledReadyForMillWeightKg = 0.0;
        }
        if (minTruckDispatchThresholdKg == null) {
            minTruckDispatchThresholdKg = DEFAULT_TRUCK_THRESHOLD_KG;
        }
        if (lastUpdated == null) {
            lastUpdated = Instant.now();
        }
    }
}
