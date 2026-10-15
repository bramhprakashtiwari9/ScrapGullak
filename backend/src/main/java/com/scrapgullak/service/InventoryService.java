package com.scrapgullak.service;

import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.entity.YardInventory;
import com.scrapgullak.dto.admin.ProcessInventoryRequest;
import com.scrapgullak.dto.admin.YardInventoryDto;
import com.scrapgullak.exception.BusinessRuleException;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.YardInventoryRepository;
import com.scrapgullak.support.MoneyUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * Yard stock per scrap grade. Every change runs on a row locked with {@code PESSIMISTIC_WRITE}, so concurrent
 * weighings and processing steps never lose an update.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final YardInventoryRepository yardInventoryRepository;
    private final DtoMapper mapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<YardInventoryDto> listInventory() {
        return yardInventoryRepository.findAllByOrderByScrapCategoryIdAsc().stream()
                .map(mapper::toInventoryDto)
                .toList();
    }

    /**
     * Moves stock one stage forward: SEGREGATE (raw to sorted), BALE (sorted to baled) or DISPATCH (baled stock
     * leaves the yard on the mill truck). Moving more than the source stage holds is a 422.
     */
    @Transactional
    public YardInventoryDto process(ProcessInventoryRequest request) {
        YardInventory inventory = yardInventoryRepository.findByScrapCategoryIdForUpdate(request.categoryId())
                .orElseThrow(() -> new NotFoundException("No yard stock exists for that category."));

        double kg = request.weightKg() == null ? 0 : MoneyUtils.round2(request.weightKg());
        if (!(kg > 0)) {
            throw new BusinessRuleException("Enter a weight greater than 0 kg.");
        }

        String name = inventory.getScrapCategory().getName();
        double raw = orZero(inventory.getRawMixedWeightKg());
        double segregated = orZero(inventory.getSegregatedWeightKg());
        double baled = orZero(inventory.getBaledReadyForMillWeightKg());

        switch (request.stage()) {
            case SEGREGATE -> {
                if (kg > raw) {
                    throw new BusinessRuleException(
                            "Only %s kg of raw %s is on the yard.".formatted(formatKg(raw), name));
                }
                inventory.setRawMixedWeightKg(MoneyUtils.round2(raw - kg));
                inventory.setSegregatedWeightKg(MoneyUtils.round2(segregated + kg));
            }
            case BALE -> {
                if (kg > segregated) {
                    throw new BusinessRuleException(
                            "Only %s kg of sorted %s is ready to bale.".formatted(formatKg(segregated), name));
                }
                inventory.setSegregatedWeightKg(MoneyUtils.round2(segregated - kg));
                inventory.setBaledReadyForMillWeightKg(MoneyUtils.round2(baled + kg));
            }
            case DISPATCH -> {
                if (kg > baled) {
                    throw new BusinessRuleException(
                            "Only %s kg of %s is baled.".formatted(formatKg(baled), name));
                }
                inventory.setBaledReadyForMillWeightKg(MoneyUtils.round2(baled - kg));
            }
            default -> throw new BusinessRuleException("Unknown processing stage.");
        }
        inventory.setLastUpdated(clock.instant());
        log.info("Yard {} of {} kg {} (category {})", request.stage(), formatKg(kg), name, request.categoryId());
        return mapper.toInventoryDto(inventory);
    }

    /**
     * Credits freshly weighed scrap to the grade's raw-mixed stock, creating the yard row with default
     * thresholds when the grade has none yet. Must join the caller's transaction (the weighing).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void receiveRawStock(ScrapCategory category, double weightKg, Instant at) {
        YardInventory inventory = yardInventoryRepository.findByScrapCategoryIdForUpdate(category.getId())
                .orElse(null);
        if (inventory == null) {
            yardInventoryRepository.save(YardInventory.builder()
                    .scrapCategory(category)
                    .rawMixedWeightKg(MoneyUtils.round2(weightKg))
                    .lastUpdated(at)
                    .build());
            log.info("Opened yard stock for {} (category {}) with {} kg raw", category.getName(), category.getId(),
                    formatKg(weightKg));
            return;
        }
        inventory.setRawMixedWeightKg(MoneyUtils.round2(orZero(inventory.getRawMixedWeightKg()) + weightKg));
        inventory.setLastUpdated(at);
    }

    private static double orZero(Double value) {
        return value == null ? 0.0 : value;
    }

    /** Weight as people write it: 120 rather than 120.0, 12.5 rather than 12.50. */
    private static String formatKg(double kg) {
        return BigDecimal.valueOf(MoneyUtils.round2(kg)).stripTrailingZeros().toPlainString();
    }
}
