package com.scrapgullak.domain.enums;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderStatusTest {

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"PAID", "CANCELLED", "WEIGHED"})
    void closedStatuses(OrderStatus status) {
        assertThat(status.isClosed()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"BOOKED", "AGENT_ASSIGNED", "OUT_FOR_PICKUP"})
    void openStatuses(OrderStatus status) {
        assertThat(status.isClosed()).isFalse();
    }

    @Test
    void activeForAgentIsAssignedOrOutForPickup() {
        assertThat(OrderStatus.ACTIVE_FOR_AGENT)
                .containsExactlyInAnyOrder(OrderStatus.AGENT_ASSIGNED, OrderStatus.OUT_FOR_PICKUP);
    }

    @Test
    void pendingIsEveryOpenStatus() {
        assertThat(OrderStatus.PENDING)
                .containsExactlyInAnyOrder(OrderStatus.BOOKED, OrderStatus.AGENT_ASSIGNED, OrderStatus.OUT_FOR_PICKUP);
        for (OrderStatus status : OrderStatus.values()) {
            assertThat(OrderStatus.PENDING.contains(status)).as(status.name()).isEqualTo(!status.isClosed());
        }
    }

    @Test
    void statusSetsAreUnmodifiable() {
        assertThatThrownBy(() -> OrderStatus.PENDING.add(OrderStatus.PAID))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> OrderStatus.ACTIVE_FOR_AGENT.remove(OrderStatus.AGENT_ASSIGNED))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
