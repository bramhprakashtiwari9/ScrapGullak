package com.scrapgullak.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scrapgullak.dto.common.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;

/** Answers unauthenticated access to a protected route with a JSON 401 {@link ErrorResponse}. */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    static final String MESSAGE = "Please sign in to continue.";

    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        writeError(objectMapper, response,
                ErrorResponse.of(clock.instant(), HttpStatus.UNAUTHORIZED, MESSAGE, request.getRequestURI()));
    }

    /** Shared JSON writer for the security error handlers. */
    static void writeError(ObjectMapper objectMapper, HttpServletResponse response, ErrorResponse body)
            throws IOException {
        response.setStatus(body.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
