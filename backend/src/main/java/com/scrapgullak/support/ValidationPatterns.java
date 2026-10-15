package com.scrapgullak.support;

/** Regular expressions shared by request DTO validation annotations. */
public final class ValidationPatterns {

    /** 15-character Indian GSTIN, e.g. {@code 09AABCE1234F1Z5}. */
    public static final String GSTIN = "^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";

    /** Empty, or a valid GSTIN (optional form fields are often sent as ""). */
    public static final String GSTIN_OR_EMPTY = "^$|" + GSTIN;

    /**
     * Indian mobile number in any common format accepted by {@link PhoneUtils#normalize(String)}:
     * {@code 9876543210}, {@code +91 98765 43210}, {@code 91-9876543210}, {@code 09876543210}.
     * After normalisation it is always {@link #MOBILE_NORMALIZED}.
     */
    public static final String MOBILE_INPUT = "^\\s*(?:\\+?91[\\s-]*|0)?[6-9](?:[\\s-]*\\d){9}\\s*$";

    /** A normalised 10-digit Indian mobile number. */
    public static final String MOBILE_NORMALIZED = "^[6-9]\\d{9}$";

    /** Empty, or an absolute http(s) URL (data:/file: URIs are rejected). */
    public static final String HTTP_URL_OR_EMPTY = "^$|^(?i)https?://\\S+$";

    private ValidationPatterns() {
    }
}
