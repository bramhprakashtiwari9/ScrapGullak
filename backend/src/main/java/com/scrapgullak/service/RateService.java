package com.scrapgullak.service;

import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.dto.rate.EstimateLineDto;
import com.scrapgullak.dto.rate.EstimateLineRequest;
import com.scrapgullak.dto.rate.EstimateRequest;
import com.scrapgullak.dto.rate.EstimateResponse;
import com.scrapgullak.dto.rate.ScrapCategoryDto;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.ScrapCategoryRepository;
import com.scrapgullak.support.MoneyUtils;
import com.scrapgullak.support.PricingCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Public rate card and instant payout estimates. */
@Service
@RequiredArgsConstructor
public class RateService {

    private final ScrapCategoryRepository categoryRepository;
    private final PricingCalculator pricingCalculator;
    private final DtoMapper mapper;

    /**
     * Active categories ordered by id.
     *
     * @param includeMill expose {@code millSellingRateInr}; only true for ADMIN callers
     */
    @Transactional(readOnly = true)
    public List<ScrapCategoryDto> liveRates(boolean includeMill) {
        return categoryRepository.findByActiveTrueOrderByIdAsc().stream()
                .map(category -> mapper.toCategoryDto(category, includeMill))
                .toList();
    }

    /**
     * Prices a basket at current buying rates. Lines with a weight of 0 are skipped; an unknown or
     * inactive category is a 404.
     */
    @Transactional(readOnly = true)
    public EstimateResponse estimate(EstimateRequest request) {
        List<EstimateLineRequest> lines = request.items() == null ? List.of() : request.items().stream()
                .filter(Objects::nonNull)
                .filter(line -> line.weightKg() != null && line.weightKg() > 0)
                .toList();

        Map<Long, ScrapCategory> categories = categoryRepository.findAllById(
                        lines.stream().map(EstimateLineRequest::categoryId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(ScrapCategory::getId, Function.identity()));

        List<EstimateLineDto> priced = lines.stream()
                .map(line -> priceLine(line, categories.get(line.categoryId())))
                .toList();

        double totalWeightKg = MoneyUtils.round2(priced.stream().mapToDouble(EstimateLineDto::weightKg).sum());
        BigDecimal totalPayout = MoneyUtils.money(priced.stream()
                .map(EstimateLineDto::subTotalInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        return new EstimateResponse(priced, totalWeightKg, totalPayout);
    }

    private EstimateLineDto priceLine(EstimateLineRequest line, ScrapCategory category) {
        if (category == null || !category.isActive()) {
            throw new NotFoundException("Scrap category " + line.categoryId() + " was not found.");
        }
        double weightKg = MoneyUtils.round2(line.weightKg());
        return new EstimateLineDto(
                category.getId(),
                category.getName(),
                weightKg,
                MoneyUtils.money(category.getBuyingRateInr()),
                pricingCalculator.lineTotal(category, weightKg));
    }
}
