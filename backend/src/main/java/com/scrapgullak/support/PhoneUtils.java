package com.scrapgullak.support;

import java.util.regex.Pattern;

/** Normalises Indian mobile numbers to the 10-digit form stored in {@code users.phone}. */
public final class PhoneUtils {

    private static final Pattern NON_DIGITS = Pattern.compile("\\D");
    private static final Pattern VALID_MOBILE = Pattern.compile(ValidationPatterns.MOBILE_NORMALIZED);

    private PhoneUtils() {
    }

    /**
     * Strips every non-digit, then drops a {@code 91} country code (12 digits) or a trunk {@code 0}
     * (11 digits). Returns {@code null} for {@code null} input; other lengths are returned as digits only.
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = NON_DIGITS.matcher(raw).replaceAll("");
        if (digits.length() == 12 && digits.startsWith("91")) {
            return digits.substring(2);
        }
        if (digits.length() == 11 && digits.startsWith("0")) {
            return digits.substring(1);
        }
        return digits;
    }

    /** True when the (already normalised) value is a valid 10-digit Indian mobile number. */
    public static boolean isValidMobile(String normalized) {
        return normalized != null && VALID_MOBILE.matcher(normalized).matches();
    }
}