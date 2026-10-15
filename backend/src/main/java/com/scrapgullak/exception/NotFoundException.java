package com.scrapgullak.exception;

import org.springframework.http.HttpStatus;

/** A requested resource (pickup, category, agent, ...) does not exist or is not visible to the caller (404). */
public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}