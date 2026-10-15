package com.scrapgullak.service;

import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.domain.enums.Role;
import com.scrapgullak.dto.admin.AgentDto;
import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.dto.rate.ScrapCategoryDto;
import com.scrapgullak.dto.rate.UpdateRateRequest;
import com.scrapgullak.exception.ConflictException;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.PickupOrderRepository;
import com.scrapgullak.repository.ScrapCategoryRepository;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.support.MoneyUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import java.util.Locale;

/**
 * Yard-admin operations: rate card management, pickup dispatch (assignment and cancellation) and the agent roster.
 * Inventory processing lives in {@link InventoryService}, metrics in {@link DashboardService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final ScrapCategoryRepository scrapCategoryRepository;
    private final PickupOrderRepository pickupOrderRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;
    private final Clock clock;

    // ------------------------------------------------------------------ rates

    /** Every category, inactive ones included, with the mill selling rate. */
    @Transactional(readOnly = true)
    public List<ScrapCategoryDto> allRates() {
        return scrapCategoryRepository.findAllByOrderByIdAsc().stream()
                .map(category -> mapper.toCategoryDto(category, true))
                .toList();
    }

    /**
     * Sets both rates (rounded to 2 dp) and, when given, the category's visibility. A buying rate at or above
     * the mill rate means buying at a loss: it is allowed (e.g. to win volume) but logged as a warning.
     */
    @Transactional
    public ScrapCategoryDto updateRate(Long categoryId, UpdateRateRequest request) {
        ScrapCategory category = scrapCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Scrap category %d was not found.".formatted(categoryId)));

        BigDecimal buying = MoneyUtils.money(request.buyingRateInr());
        BigDecimal mill = MoneyUtils.money(request.millSellingRateInr());
        category.setBuyingRateInr(buying);
        category.setMillSellingRateInr(mill);
        if (request.active() != null) {
            category.setActive(request.active());
        }
        if (buying.compareTo(mill) >= 0) {
            log.warn("Negative margin on {} (category {}): buying Rs {} >= mill Rs {}",
                    category.getName(), categoryId, buying, mill);
        }
        // Flush so the response carries the new @UpdateTimestamp value.
        ScrapCategory saved = scrapCategoryRepository.saveAndFlush(category);
        log.info("Rates updated for {} (category {}): buying Rs {}, mill Rs {}, active {}",
                saved.getName(), categoryId, buying, mill, saved.isActive());
        return mapper.toCategoryDto(saved, true);
    }

    // ------------------------------------------------------------------ pickups

    /** All pickups newest first, optionally only those in {@code status}. */
    @Transactional(readOnly = true)
    public List<PickupOrderDto> allPickups(OrderStatus status) {
        List<PickupOrder> orders = status == null
                ? pickupOrderRepository.findAllByOrderByCreatedAtDesc()
                : pickupOrderRepository.findByStatusOrderByCreatedAtDesc(status);
        return orders.stream().map(mapper::toOrderDto).toList();
    }

    /**
     * Assigns (or reassigns) an active agent. A BOOKED order becomes AGENT_ASSIGNED; an order already assigned or
     * out for pickup keeps its status, so a reassignment does not undo a started trip's state.
     */
    @Transactional
    public PickupOrderDto assignAgent(Long orderId, Long agentId) {
        PickupOrder order = lockOrder(orderId);
        User agent = userRepository.findByIdAndRole(agentId, Role.AGENT)
                .filter(User::isActive)
                .orElseThrow(() -> new NotFoundException("That agent was not found."));
        if (order.getStatus().isClosed()) {
            throw new ConflictException("Pickup %s is already closed.".formatted(order.getOrderNumber()));
        }

        User previous = order.getAssignedAgent();
        order.setAssignedAgent(agent);
        if (order.getStatus() == OrderStatus.BOOKED) {
            order.setStatus(OrderStatus.AGENT_ASSIGNED);
        }
        if (previous != null && !previous.getId().equals(agent.getId())) {
            log.info("Pickup {} reassigned from agent {} to agent {}", order.getOrderNumber(), previous.getId(),
                    agent.getId());
        } else {
            log.info("Pickup {} assigned to agent {}", order.getOrderNumber(), agent.getId());
        }
        return mapper.toOrderDto(order);
    }

    /** Cancels any order that is not yet closed. */
    @Transactional
    public PickupOrderDto cancelPickup(Long orderId) {
        PickupOrder order = lockOrder(orderId);
        if (order.getStatus().isClosed()) {
            throw new ConflictException("Pickup %s is already %s."
                    .formatted(order.getOrderNumber(), order.getStatus().name().toLowerCase(Locale.ROOT)));
        }
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(clock.instant());
        log.info("Pickup {} cancelled by admin", order.getOrderNumber());
        return mapper.toOrderDto(order);
    }

    // ------------------------------------------------------------------ agents

    /**
     * Active agents by name, each with their open workload (AGENT_ASSIGNED / OUT_FOR_PICKUP pickups).
     * Deactivated agents are left out because they cannot be assigned.
     */
    @Transactional(readOnly = true)
    public List<AgentDto> agents() {
        return userRepository.findByRoleOrderByFullNameAsc(Role.AGENT).stream()
                .filter(User::isActive)
                .map(agent -> mapper.toAgentDto(agent,
                        pickupOrderRepository.countByAssignedAgentIdAndStatusIn(agent.getId(),
                                OrderStatus.ACTIVE_FOR_AGENT)))
                .toList();
    }

    private PickupOrder lockOrder(Long orderId) {
        return pickupOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new NotFoundException("Pickup %d was not found.".formatted(orderId)));
    }
}
