package com.scrapgullak.exception;

import org.springframework.http.HttpStatus;

/** Well-formed input that breaks a business rule, e.g. a date out of range or insufficient yard stock (422). */
public class BusinessRuleException extends ApiException {

    public BusinessRuleException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}