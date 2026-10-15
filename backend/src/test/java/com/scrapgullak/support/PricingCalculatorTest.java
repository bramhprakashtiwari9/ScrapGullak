package com.scrapgullak.support;

import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.enums.CategoryGroup;
import com.scrapgullak.domain.enums.ScrapUnit;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PricingCalculatorTest {

    private final PricingCalculator calculator = new PricingCalculator();

    private static ScrapCategory category(ScrapUnit unit, String buyingRate, String millRate) {
        return ScrapCategory.builder()
                .name("Test grade")
                .categoryGroup(CategoryGroup.NON_FERROUS)
                .unit(unit)
                .buyingRateInr(buyingRate == null ? null : new BigDecimal(buyingRate))
                .millSellingRateInr(millRate == null ? null : new BigDecimal(millRate))
                .build();
    }

    @Test
    void lineTotalMultipliesKgByBuyingRate() {
        ScrapCategory copper = category(ScrapUnit.KG, "680", "735");

        assertThat(calculator.lineTotal(copper, 2.5)).isEqualTo(new BigDecimal("1700.00"));
    }

    @Test
    void millValueUsesMillSellingRate() {
        ScrapCategory copper = category(ScrapUnit.KG, "680", "735");

        assertThat(calculator.millValue(copper, 2.5)).isEqualTo(new BigDecimal("1837.50"));
    }

    @Test
    void resultIsAlwaysScaledToTwoDecimals() {
        ScrapCategory cardboard = category(ScrapUnit.KG, "14", "18.5");

        BigDecimal total = calculator.lineTotal(cardboard, 22.5);

        assertThat(total).isEqualTo(new BigDecimal("315.00"));
        assertThat(total.scale()).isEqualTo(2);
    }

    @Test
    void fractionalWeightsAreExactNotBinaryFloatingPoint() {
        ScrapCategory pet = category(ScrapUnit.KG, "18", "26");

        // 6.2 * 18 = 111.6 exactly; a naive double multiplication gives 111.60000000000001
        assertThat(calculator.lineTotal(pet, 6.2)).isEqualTo(new BigDecimal("111.60"));
    }

    @Test
    void roundsHalfUp() {
        ScrapCategory grade = category(ScrapUnit.KG, "1.25", "2");

        // 0.1 * 1.25 = 0.125 -> 0.13
        assertThat(calculator.lineTotal(grade, 0.1)).isEqualTo(new BigDecimal("0.13"));
    }

    @Test
    void tonRatesAreDividedByThousand() {
        ScrapCategory bulk = category(ScrapUnit.TON, "25000", "30000");

        assertThat(calculator.lineTotal(bulk, 500)).isEqualTo(new BigDecimal("12500.00"));
        assertThat(calculator.millValue(bulk, 1250)).isEqualTo(new BigDecimal("37500.00"));
    }

    @Test
    void pieceRatesTreatTheValueAsACount() {
        ScrapCategory appliance = category(ScrapUnit.PIECE, "50", "65");

        assertThat(calculator.lineTotal(appliance, 3)).isEqualTo(new BigDecimal("150.00"));
    }

    @Test
    void zeroWeightOrMissingRateIsZero() {
        assertThat(calculator.lineTotal(category(ScrapUnit.KG, "680", "735"), 0)).isEqualTo(new BigDecimal("0.00"));
        assertThat(calculator.lineTotal(category(ScrapUnit.KG, null, "735"), 5)).isEqualTo(new BigDecimal("0.00"));
        assertThat(calculator.millValue(category(ScrapUnit.KG, "680", null), 5)).isEqualTo(new BigDecimal("0.00"));
    }

    @Test
    void nonFiniteWeightIsZero() {
        ScrapCategory copper = category(ScrapUnit.KG, "680", "735");

        assertThat(calculator.lineTotal(copper, Double.NaN)).isEqualTo(new BigDecimal("0.00"));
        assertThat(calculator.lineTotal(copper, Double.POSITIVE_INFINITY)).isEqualTo(new BigDecimal("0.00"));
    }
}
