package com.scrapgullak.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class for expected, user-facing errors. The message is shown verbatim by the frontends,
 * so it must be a complete, human-readable sentence.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    protected ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
