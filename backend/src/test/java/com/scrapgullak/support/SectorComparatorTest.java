package com.scrapgullak.support;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SectorComparatorTest {

    private final SectorComparator comparator = SectorComparator.INSTANCE;

    @Test
    void comparesDigitRunsNumerically() {
        assertThat(comparator.compare("Sector 18", "Sector 62")).isNegative();
        assertThat(comparator.compare("Sector 62", "Sector 137")).isNegative();
        assertThat(comparator.compare("Sector 137", "Sector 18")).isPositive();
    }

    @Test
    void sortsAnAgentRouteNaturallyWithNullsLast() {
        List<String> sectors = new ArrayList<>(Arrays.asList(
                "Sector 137", null, "Sector 18", "sector 62", "Phase-2", "Sector 125", "Sector 74"));

        sectors.sort(comparator);

        assertThat(sectors).containsExactly(
                "Phase-2", "Sector 18", "sector 62", "Sector 74", "Sector 125", "Sector 137", null);
    }

    @Test
    void isCaseInsensitive() {
        assertThat(comparator.compare("sector 18", "Sector 62")).isNegative();
        assertThat(comparator.compare("SECTOR 62", "sector 18")).isPositive();
    }

    @Test
    void nullsSortLast() {
        assertThat(comparator.compare(null, "Sector 1")).isPositive();
        assertThat(comparator.compare("Sector 1", null)).isNegative();
        assertThat(comparator.compare(null, null)).isZero();
    }

    @Test
    void equalStringsCompareAsZero() {
        assertThat(comparator.compare("Sector 62", "Sector 62")).isZero();
    }

    @Test
    void prefixSortsBeforeLongerName() {
        assertThat(comparator.compare("Sector", "Sector 62")).isNegative();
    }

    @Test
    void handlesNumbersLongerThanALong() {
        assertThat(comparator.compare("Sector 99999999999999999999999", "Sector 2")).isPositive();
    }

    @Test
    void isAntisymmetric() {
        List<String> samples = Arrays.asList("Sector 7", "Sector 007", "sector 7", "Sector 70", "Phase-2",
                "Greater Noida West", "Ecotech-3 (Greater Noida)", "Indirapuram", null);
        for (String a : samples) {
            for (String b : samples) {
                assertThat(Integer.signum(comparator.compare(a, b)))
                        .as("compare(%s, %s)", a, b)
                        .isEqualTo(-Integer.signum(comparator.compare(b, a)));
            }
        }
    }
}
