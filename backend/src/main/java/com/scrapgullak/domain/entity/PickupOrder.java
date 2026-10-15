package com.scrapgullak.domain.entity;

import com.scrapgullak.domain.converter.StringListConverter;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.domain.enums.OrderType;
import com.scrapgullak.domain.enums.PaymentMode;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * A customer's pickup request, from booking through agent assignment to weighing and payment.
 * Corporate (INDUSTRIAL_B2B) requests additionally carry company/contact details.
 */
@Entity
@Table(name = "pickup_orders", indexes = {
        @Index(name = "idx_pickup_orders_customer", columnList = "customer_id"),
        @Index(name = "idx_pickup_orders_agent_status", columnList = "assigned_agent_id, status"),
        @Index(name = "idx_pickup_orders_status", columnList = "status"),
        @Index(name = "idx_pickup_orders_paid_at", columnList = "paid_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PickupOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true, length = 20)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_agent_id")
    private User assignedAgent;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 20)
    @Builder.Default
    private OrderType orderType = OrderType.DOORSTEP_B2C;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.BOOKED;

    @Column(name = "noida_sector", length = 80)
    private String noidaSector;

    @Column(name = "full_address", length = 500)
    private String fullAddress;

    @Column(name = "gps_lat")
    private Double gpsLat;

    @Column(name = "gps_lng")
    private Double gpsLng;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "time_slot", length = 40)
    private String timeSlot;

    @Column(name = "estimated_weight_range", length = 40)
    private String estimatedWeightRange;

    @Column(name = "photo_url", length = 1000)
    private String photoUrl;

    @Convert(converter = StringListConverter.class)
    @Column(name = "scrap_groups", length = 500)
    @Builder.Default
    private List<String> scrapGroups = new ArrayList<>();

    @Column(length = 1000)
    private String notes;

    // ---- corporate (INDUSTRIAL_B2B) details

    @Column(name = "company_name", length = 150)
    private String companyName;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 15)
    private String contactPhone;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Column(name = "corporate_gst_number", length = 15)
    private String corporateGstNumber;

    @Column(name = "request_type", length = 60)
    private String requestType;

    @Column(length = 60)
    private String frequency;

    // ---- weighing & payment

    @OneToMany(mappedBy = "pickupOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "final_total_weight_kg")
    private Double finalTotalWeightKg;

    @Column(name = "final_payout_inr", precision = 14, scale = 2)
    private BigDecimal finalPayoutInr;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode", length = 20)
    private PaymentMode paymentMode;

    @Column(name = "upi_transaction_ref", length = 64)
    private String upiTransactionRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "weighed_at")
    private Instant weighedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Version
    private Long version;

    /** Adds a weighed line and wires the back-reference. */
    public void addItem(OrderItem item) {
        item.setPickupOrder(this);
        items.add(item);
    }

    /** Removes every line (orphan removal deletes them on flush). */
    public void clearItems() {
        items.forEach(i -> i.setPickupOrder(null));
        items.clear();
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
