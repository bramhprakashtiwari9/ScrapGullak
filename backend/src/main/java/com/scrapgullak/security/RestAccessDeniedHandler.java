package com.scrapgullak.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scrapgullak.dto.common.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Clock;

/** Answers an authenticated caller hitting a route their role may not use with a JSON 403. */
@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    static final String MESSAGE = "You do not have access to this action.";

    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        RestAuthenticationEntryPoint.writeError(objectMapper, response,
                ErrorResponse.of(clock.instant(), HttpStatus.FORBIDDEN, MESSAGE, request.getRequestURI()));
    }
}
