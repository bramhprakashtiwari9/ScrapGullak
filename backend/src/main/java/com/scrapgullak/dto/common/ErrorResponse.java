package com.scrapgullak.dto.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/**
 * Uniform error body for every non-2xx response (exception handler, 401 entry point, 403 handler).
 * {@code message} is a human-readable sentence the frontends display as-is; {@code fieldErrors}
 * (field -> message) is present only for validation failures.
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) Map<String, String> fieldErrors) {

    public static ErrorResponse of(Instant timestamp, HttpStatus status, String message, String path,
                                   Map<String, String> fieldErrors) {
        return new ErrorResponse(timestamp, status.value(), status.getReasonPhrase(), message, path,
                fieldErrors == null ? Map.of() : fieldErrors);
    }

    public static ErrorResponse of(Instant timestamp, HttpStatus status, String message, String path) {
        return of(timestamp, status, message, path, Map.of());
    }

    /** Convenience for callers without a {@link java.time.Clock} (e.g. security filters). */
    public static ErrorResponse of(HttpStatus status, String message, String path) {
        return of(Instant.now(), status, message, path, Map.of());
    }
}
