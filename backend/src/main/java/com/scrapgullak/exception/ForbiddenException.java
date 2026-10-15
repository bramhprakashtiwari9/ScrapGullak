package com.scrapgullak.exception;

import org.springframework.http.HttpStatus;

/** The caller is authenticated but may not act on this resource, e.g. a pickup assigned to another agent (403). */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}