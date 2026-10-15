package com.scrapgullak.security;

import com.scrapgullak.config.AppProperties;
import com.scrapgullak.domain.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and validates HS256 access tokens. Claims: {@code sub} = user id, {@code phone}, {@code role},
 * {@code iss}, {@code iat}, {@code exp}. The signing key is the Base64-decoded {@code app.jwt.secret};
 * startup fails if it is missing, not Base64, or shorter than 32 bytes.
 */
@Slf4j
@Service
public class JwtService {

    static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_PHONE = "phone";
    private static final String CLAIM_ROLE = "role";
    private static final long ALLOWED_CLOCK_SKEW_SECONDS = 30;
    /** Marker inside the decoded default key shipped in application.yml. */
    private static final String DEV_SECRET_MARKER = "dev-only";

    private final SecretKey signingKey;
    private final String issuer;
    private final Duration expiration;
    private final Clock clock;
    private final JwtParser parser;

    public JwtService(AppProperties properties, Clock clock) {
        AppProperties.Jwt jwt = properties.jwt();
        byte[] secret = decodeSecret(jwt.secret());
        if (new String(secret, StandardCharsets.UTF_8).contains(DEV_SECRET_MARKER)) {
            log.warn("*** Using the published DEV-ONLY JWT key: anyone can forge tokens. "
                    + "Set JWT_SECRET (e.g. `openssl rand -base64 48`) before exposing this server. ***");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret);
        this.issuer = jwt.issuer();
        this.expiration = Duration.ofMinutes(jwt.expirationMinutes());
        this.clock = clock;
        this.parser = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .clock(() -> Date.from(clock.instant()))
                .clockSkewSeconds(ALLOWED_CLOCK_SKEW_SECONDS)
                .build();
    }

    /** Signs a fresh access token for the given (persisted) user. */
    public String generateToken(User user) {
        Instant now = clock.instant();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .issuer(issuer)
                .claim(CLAIM_PHONE, user.getPhone())
                .claim(CLAIM_ROLE, user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiration)))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /** Token lifetime in seconds, reported to clients as {@code expiresInSeconds}. */
    public long getExpirationSeconds() {
        return expiration.toSeconds();
    }

    /**
     * Returns the user id of a valid token (correct signature and issuer, not expired), or empty for any
     * malformed, tampered, expired or otherwise unusable token. Never throws.
     */
    public Optional<Long> extractUserId(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = parser.parseSignedClaims(token).getPayload();
            String subject = claims.getSubject();
            return subject == null ? Optional.empty() : Optional.of(Long.valueOf(subject));
        } catch (JwtException | IllegalArgumentException e) {
            // NumberFormatException is an IllegalArgumentException as well.
            log.debug("Rejected JWT: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static byte[] decodeSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET) is not set. Provide a Base64 key of at least "
                            + MIN_SECRET_BYTES + " bytes, e.g. `openssl rand -base64 48`.");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret.trim());
        } catch (IllegalArgumentException standardFailure) {
            try {
                bytes = Base64.getUrlDecoder().decode(secret.trim());
            } catch (IllegalArgumentException urlFailure) {
                throw new IllegalStateException("app.jwt.secret (JWT_SECRET) is not valid Base64.", urlFailure);
            }
        }
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) decodes to " + bytes.length
                    + " bytes; HS256 needs at least " + MIN_SECRET_BYTES + " bytes.");
        }
        return bytes;
    }
}
