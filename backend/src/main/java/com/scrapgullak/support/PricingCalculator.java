package com.scrapgullak.support;

import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.enums.ScrapUnit;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Prices a weighed quantity of a scrap grade. Rates are per the category's unit, so the weight is first
 * converted to that unit: KG -> kg, TON -> kg / 1000, PIECE -> the value is taken as a piece count.
 * Results are rounded to 2 dp (HALF_UP).
 */
@Component
public class PricingCalculator {

    private static final BigDecimal KG_PER_TON = BigDecimal.valueOf(1000);

    /** What the yard pays the customer: quantity x {@code buyingRateInr}. */
    public BigDecimal lineTotal(ScrapCategory category, double weightKg) {
        return price(category.getBuyingRateInr(), category.getUnit(), weightKg);
    }

    /** What the mill pays the yard: quantity x {@code millSellingRateInr}. */
    public BigDecimal millValue(ScrapCategory category, double weightKg) {
        return price(category.getMillSellingRateInr(), category.getUnit(), weightKg);
    }

    private static BigDecimal price(BigDecimal rate, ScrapUnit unit, double weightKg) {
        if (rate == null || !Double.isFinite(weightKg) || weightKg == 0) {
            return MoneyUtils.ZERO;
        }
        BigDecimal amount = BigDecimal.valueOf(weightKg).multiply(rate);
        if (unit == ScrapUnit.TON) {
            amount = amount.divide(KG_PER_TON, MoneyUtils.SCALE + 4, MoneyUtils.ROUNDING);
        }
        return MoneyUtils.money(amount);
    }
}