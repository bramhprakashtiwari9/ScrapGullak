package com.scrapgullak.support;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Rupee and weight rounding: 2 decimal places, HALF_UP, everywhere. */
public final class MoneyUtils {

    public static final int SCALE = 2;
    public static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(SCALE, ROUNDING);

    private MoneyUtils() {
    }

    /** Scales an amount to 2 dp; {@code null} is treated as zero. */
    public static BigDecimal money(BigDecimal value) {
        return value == null ? ZERO : value.setScale(SCALE, ROUNDING);
    }

    /** Converts via the decimal string form (so 0.1 stays 0.10, not 0.1000000000000000055...). */
    public static BigDecimal money(double value) {
        return BigDecimal.valueOf(value).setScale(SCALE, ROUNDING);
    }

    /** Rounds a weight to 2 dp; non-finite values are returned unchanged. */
    public static double round2(double value) {
        if (!Double.isFinite(value)) {
            return value;
        }
        return BigDecimal.valueOf(value).setScale(SCALE, ROUNDING).doubleValue();
    }
}