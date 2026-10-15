package com.scrapgullak.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Per-year counter behind order numbers ({@code SG-<year>-<0001>}). Rows are read with a pessimistic
 * write lock so concurrent bookings never receive the same number. Column names avoid the
 * {@code YEAR}/{@code VALUE} keywords reserved by some databases (e.g. H2).
 */
@Entity
@Table(name = "order_sequences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderSequence {

    @Id
    @Column(name = "seq_year")
    private Integer year;

    @Column(name = "last_seq_value", nullable = false)
    private long lastValue;
}
