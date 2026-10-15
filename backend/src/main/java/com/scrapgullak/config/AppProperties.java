package com.scrapgullak.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Typed binding of the {@code app.*} configuration tree. Missing sections fall back to safe
 * development defaults so the application (and tests) start without a full configuration.
 */
@ConfigurationProperties("app")
public record AppProperties(String timezone, Jwt jwt, Cors cors, Seed seed) {

    public static final String DEFAULT_TIMEZONE = "Asia/Kolkata";

    public AppProperties {
        timezone = (timezone == null || timezone.isBlank()) ? DEFAULT_TIMEZONE : timezone;
        jwt = jwt != null ? jwt : new Jwt(null, 0, null);
        cors = cors != null ? cors : new Cors(null);
        seed = seed != null ? seed : new Seed(true, true, null, null, null);
    }

    /**
     * JWT settings. {@code secret} is a Base64-encoded HMAC key (must decode to at least 32 bytes).
     */
    public record Jwt(String secret, long expirationMinutes, String issuer) {
        public static final long DEFAULT_EXPIRATION_MINUTES = 1440;
        public static final String DEFAULT_ISSUER = "scrapgullak";

        public Jwt {
            expirationMinutes = expirationMinutes > 0 ? expirationMinutes : DEFAULT_EXPIRATION_MINUTES;
            issuer = (issuer == null || issuer.isBlank()) ? DEFAULT_ISSUER : issuer;
        }
    }

    /** Browser origins allowed by CORS (patterns, e.g. {@code http://192.168.*.*:*}). */
    public record Cors(List<String> allowedOriginPatterns) {
        public static final List<String> DEFAULT_ORIGIN_PATTERNS = List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8081",
                "http://localhost:19006",
                "http://192.168.*.*:*",
                "exp://*");

        public Cors {
            allowedOriginPatterns = (allowedOriginPatterns == null || allowedOriginPatterns.isEmpty())
                    ? DEFAULT_ORIGIN_PATTERNS
                    : allowedOriginPatterns.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
    }

    /** Startup data seeding switches and the passwords given to seeded accounts. */
    public record Seed(boolean enabled, boolean demoData, String adminPassword, String agentPassword,
                       String customerPassword) {
        /** Publicly documented demo passwords (README, frontends' demo logins). */
        public static final String DEFAULT_ADMIN_PASSWORD = "Admin@123";
        public static final String DEFAULT_AGENT_PASSWORD = "Agent@123";
        public static final String DEFAULT_CUSTOMER_PASSWORD = "Customer@123";

        public Seed {
            adminPassword = adminPassword != null ? adminPassword : DEFAULT_ADMIN_PASSWORD;
            agentPassword = agentPassword != null ? agentPassword : DEFAULT_AGENT_PASSWORD;
            customerPassword = customerPassword != null ? customerPassword : DEFAULT_CUSTOMER_PASSWORD;
        }
    }
}
