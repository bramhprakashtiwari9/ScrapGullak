package com.scrapgullak.support;

import com.scrapgullak.domain.enums.CategoryGroup;

/** Estimated kg of CO2 avoided per kg recycled, by material family (shown on the customer's passbook). */
public final class Co2Calculator {

    public static final double DEFAULT_FACTOR = 1.2;

    private Co2Calculator() {
    }

    public static double factor(CategoryGroup group) {
        if (group == null) {
            return DEFAULT_FACTOR;
        }
        return switch (group) {
            case NON_FERROUS -> 4.5;
            case FERROUS -> 1.6;
            case PAPER -> 0.9;
            case PLASTIC -> 1.5;
            case E_WASTE -> 2.2;
        };
    }

    public static double co2ForKg(double kg, CategoryGroup group) {
        return kg * factor(group);
    }
}