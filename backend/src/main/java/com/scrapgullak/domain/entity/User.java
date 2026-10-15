package com.scrapgullak.domain.entity;

import com.scrapgullak.domain.enums.AccountType;
import com.scrapgullak.domain.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Any ScrapGullak account: household/corporate customer, field agent or yard admin.
 * Customers carry their running Gullak totals, which are only ever changed via an atomic SQL increment.
 */
@Entity
@Table(name = "users", indexes = @Index(name = "idx_users_role", columnList = "role"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", length = 20)
    @Builder.Default
    private AccountType accountType = AccountType.B2C_HOUSEHOLD;

    @Column(name = "gst_number", length = 15)
    private String gstNumber;

    @Column(name = "company_name", length = 150)
    private String companyName;

    @Column(length = 500)
    private String address;

    @Column(name = "noida_sector", length = 80)
    private String noidaSector;

    /** Agent's vehicle description, e.g. "Tata Ace, UP16 CT 4471". */
    @Column(length = 100)
    private String vehicle;

    @Column(name = "gullak_total_earnings", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal gullakTotalEarnings = new BigDecimal("0.00");

    @Column(name = "total_recycled_kg", nullable = false)
    @Builder.Default
    private Double totalRecycledKg = 0.0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (accountType == null) {
            accountType = AccountType.B2C_HOUSEHOLD;
        }
        if (gullakTotalEarnings == null) {
            gullakTotalEarnings = new BigDecimal("0.00");
        }
        if (totalRecycledKg == null) {
            totalRecycledKg = 0.0;
        }
    }
}
