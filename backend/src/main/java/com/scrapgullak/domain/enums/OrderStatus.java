package com.scrapgullak.domain.enums;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Pickup order lifecycle: BOOKED -> AGENT_ASSIGNED -> OUT_FOR_PICKUP -> (WEIGHED) -> PAID, or CANCELLED.
 */
public enum OrderStatus {
    BOOKED,
    AGENT_ASSIGNED,
    OUT_FOR_PICKUP,
    WEIGHED,
    PAID,
    CANCELLED;

    /** Statuses that count as an agent's active workload. */
    public static final Set<OrderStatus> ACTIVE_FOR_AGENT =
            Collections.unmodifiableSet(EnumSet.of(AGENT_ASSIGNED, OUT_FOR_PICKUP));

    /** Statuses of orders still waiting to be collected. */
    public static final Set<OrderStatus> PENDING =
            Collections.unmodifiableSet(EnumSet.of(BOOKED, AGENT_ASSIGNED, OUT_FOR_PICKUP));

    /** Closed orders can no longer be weighed, assigned or cancelled. */
    public boolean isClosed() {
        return this == PAID || this == CANCELLED || this == WEIGHED;
    }
}
