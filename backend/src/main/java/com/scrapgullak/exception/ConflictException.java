package com.scrapgullak.exception;

import org.springframework.http.HttpStatus;

/** The request conflicts with the current state, e.g. a duplicate phone or an already closed pickup (409). */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}