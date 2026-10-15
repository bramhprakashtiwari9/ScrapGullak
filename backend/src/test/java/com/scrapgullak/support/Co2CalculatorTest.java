package com.scrapgullak.support;

import com.scrapgullak.domain.enums.CategoryGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class Co2CalculatorTest {

    @ParameterizedTest
    @CsvSource({
            "NON_FERROUS, 4.5",
            "FERROUS,     1.6",
            "PAPER,       0.9",
            "PLASTIC,     1.5",
            "E_WASTE,     2.2"
    })
    void factorPerMaterialFamily(CategoryGroup group, double expected) {
        assertThat(Co2Calculator.factor(group)).isEqualTo(expected);
    }

    @Test
    void unknownGroupUsesDefaultFactor() {
        assertThat(Co2Calculator.factor(null)).isEqualTo(1.2);
        assertThat(Co2Calculator.co2ForKg(10, null)).isCloseTo(12.0, within(1e-9));
    }

    @Test
    void co2IsKgTimesFactor() {
        assertThat(Co2Calculator.co2ForKg(10, CategoryGroup.NON_FERROUS)).isCloseTo(45.0, within(1e-9));
        assertThat(Co2Calculator.co2ForKg(22.5, CategoryGroup.PAPER)).isCloseTo(20.25, within(1e-9));
        assertThat(Co2Calculator.co2ForKg(0, CategoryGroup.E_WASTE)).isZero();
    }

    @Test
    void everyGroupHasAPositiveFactor() {
        for (CategoryGroup group : CategoryGroup.values()) {
            assertThat(Co2Calculator.factor(group)).as(group.name()).isPositive();
        }
    }
}
