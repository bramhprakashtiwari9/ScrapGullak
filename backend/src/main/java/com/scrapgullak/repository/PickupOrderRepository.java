package com.scrapgullak.repository;

import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Pickup orders. List finders fetch customer, agent and receipt lines in one query (open-in-view is off),
 * so results can be mapped to DTOs without lazy-loading surprises.
 */
public interface PickupOrderRepository extends JpaRepository<PickupOrder, Long> {

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    List<PickupOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    List<PickupOrder> findByAssignedAgentIdAndStatusInAndScheduledDateLessThanEqual(
            Long agentId, Collection<OrderStatus> statuses, LocalDate date);

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    List<PickupOrder> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    List<PickupOrder> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    List<PickupOrder> findByCustomerIdAndStatusOrderByPaidAtDesc(Long customerId, OrderStatus status);

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    List<PickupOrder> findByStatusAndPaidAtGreaterThanEqualAndPaidAtLessThan(
            OrderStatus status, Instant fromInclusive, Instant toExclusive);

    @EntityGraph(attributePaths = {"customer", "assignedAgent", "items", "items.scrapCategory"})
    Optional<PickupOrder> findWithDetailsById(Long id);

    /** Row-locks the order for a state transition (weighing, assignment, cancellation). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from PickupOrder o where o.id = :id")
    Optional<PickupOrder> findByIdForUpdate(@Param("id") Long id);

    long countByStatusIn(Collection<OrderStatus> statuses);

    long countByStatus(OrderStatus status);

    long countByAssignedAgentIdAndStatusIn(Long agentId, Collection<OrderStatus> statuses);
}
