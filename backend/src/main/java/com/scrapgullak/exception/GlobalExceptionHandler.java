package com.scrapgullak.exception;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.scrapgullak.dto.common.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingPathVariableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Clock;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Maps every exception to an {@link ErrorResponse} with a message the frontends can show verbatim.
 * Unexpected errors are logged with their stack trace and answered with a generic 500 message; internal
 * details never leak to the client.
 */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    static final String MSG_VALIDATION = "Some fields are invalid. Check the highlighted fields.";
    static final String MSG_MALFORMED_JSON = "Malformed JSON request.";
    static final String MSG_NOT_FOUND = "The requested resource was not found.";
    static final String MSG_SIGN_IN = "Please sign in to continue.";
    static final String MSG_BAD_CREDENTIALS = "Invalid phone number or password.";
    static final String MSG_FORBIDDEN = "You do not have access to this action.";
    static final String MSG_DATA_CONFLICT = "This change conflicts with existing data.";
    static final String MSG_CONCURRENT_UPDATE = "This record was just updated by someone else. Refresh and try again.";
    static final String MSG_SERVER_ERROR = "Something went wrong on the server. Try again.";

    private final Clock clock;

    // ------------------------------------------------------------------ application errors

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex, HttpServletRequest request) {
        log.debug("{} {} -> {}: {}", request.getMethod(), request.getRequestURI(), ex.getStatus().value(),
                ex.getMessage());
        return respond(ex.getStatus(), ex.getMessage(), request);
    }

    // ------------------------------------------------------------------ request validation (400)

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleBodyValidation(MethodArgumentNotValidException ex,
                                                              HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(error.getField(), messageOf(error));
        }
        String message;
        if (!fieldErrors.isEmpty()) {
            message = fieldErrors.values().iterator().next();
        } else {
            message = ex.getBindingResult().getGlobalErrors().stream()
                    .map(ObjectError::getDefaultMessage)
                    .filter(m -> m != null && !m.isBlank())
                    .findFirst()
                    .orElse(MSG_VALIDATION);
        }
        return respond(HttpStatus.BAD_REQUEST, message, request, fieldErrors);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException ex,
                                                                HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getAllValidationResults().forEach(result -> {
            String name = result.getMethodParameter().getParameterName();
            result.getResolvableErrors().forEach(error ->
                    fieldErrors.putIfAbsent(name != null ? name : "parameter", messageOf(error)));
        });
        String message = fieldErrors.isEmpty() ? MSG_VALIDATION : fieldErrors.values().iterator().next();
        return respond(HttpStatus.BAD_REQUEST, message, request, fieldErrors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex,
                                                                   HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        if (ex.getConstraintViolations() != null) {
            for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
                fieldErrors.putIfAbsent(lastPathNode(violation.getPropertyPath().toString()), violation.getMessage());
            }
        }
        String message = fieldErrors.isEmpty() ? MSG_VALIDATION : fieldErrors.values().iterator().next();
        return respond(HttpStatus.BAD_REQUEST, message, request, fieldErrors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex,
                                                          HttpServletRequest request) {
        String message = MSG_MALFORMED_JSON;
        if (ex.getCause() instanceof InvalidFormatException ife) {
            String field = jsonPath(ife);
            Class<?> target = ife.getTargetType();
            if (target != null && target.isEnum()) {
                String allowed = Arrays.stream(target.getEnumConstants())
                        .map(c -> ((Enum<?>) c).name())
                        .collect(Collectors.joining(", "));
                message = "Invalid value '%s' for %s. Allowed: %s".formatted(ife.getValue(), field, allowed);
            } else if (!field.isEmpty()) {
                message = "Invalid value '%s' for %s.".formatted(ife.getValue(), field);
            }
        }
        return respond(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                            HttpServletRequest request) {
        String message = "Invalid value '%s' for %s.".formatted(ex.getValue(), ex.getName());
        Class<?> required = ex.getRequiredType();
        if (required != null && required.isEnum()) {
            String allowed = Arrays.stream(required.getEnumConstants())
                    .map(c -> ((Enum<?>) c).name())
                    .collect(Collectors.joining(", "));
            message = "Invalid value '%s' for %s. Allowed: %s".formatted(ex.getValue(), ex.getName(), allowed);
        }
        return respond(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex,
                                                            HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST,
                "Missing required parameter '%s'.".formatted(ex.getParameterName()), request);
    }

    @ExceptionHandler(MissingPathVariableException.class)
    public ResponseEntity<ErrorResponse> handleMissingPathVariable(MissingPathVariableException ex,
                                                                   HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST,
                "Missing required path value '%s'.".formatted(ex.getVariableName()), request);
    }

    // ------------------------------------------------------------------ routing (404/405/415)

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return respond(HttpStatus.NOT_FOUND, MSG_NOT_FOUND, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                                  HttpServletRequest request) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED,
                "%s is not supported for this endpoint.".formatted(ex.getMethod()), request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException ex,
                                                         HttpServletRequest request) {
        return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Send the request body as application/json.", request);
    }

    // ------------------------------------------------------------------ security (401/403)

    /** Covers {@code AuthorizationDeniedException} (a subclass) from method security too. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        if (isAnonymous(SecurityContextHolder.getContext().getAuthentication())) {
            return respond(HttpStatus.UNAUTHORIZED, MSG_SIGN_IN, request);
        }
        return respond(HttpStatus.FORBIDDEN, MSG_FORBIDDEN, request);
    }

    /**
     * Missing credentials ask the user to sign in; any other authentication failure (bad credentials,
     * disabled account, unknown phone) gets one generic message so accounts cannot be enumerated.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex,
                                                              HttpServletRequest request) {
        boolean notSignedIn = ex instanceof AuthenticationCredentialsNotFoundException
                || ex instanceof InsufficientAuthenticationException;
        return respond(HttpStatus.UNAUTHORIZED, notSignedIn ? MSG_SIGN_IN : MSG_BAD_CREDENTIALS, request);
    }

    // ------------------------------------------------------------------ persistence (409)

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex,
                                                             HttpServletRequest request) {
        log.warn("Data integrity violation on {} {}: {}", request.getMethod(), request.getRequestURI(),
                ex.getMostSpecificCause().getMessage());
        return respond(HttpStatus.CONFLICT, MSG_DATA_CONFLICT, request);
    }

    /** Covers {@code ObjectOptimisticLockingFailureException} and pessimistic lock timeouts/deadlocks. */
    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class})
    public ResponseEntity<ErrorResponse> handleLockingFailure(RuntimeException ex, HttpServletRequest request) {
        log.info("Concurrent update on {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        return respond(HttpStatus.CONFLICT, MSG_CONCURRENT_UPDATE, request);
    }

    // ------------------------------------------------------------------ fallback (500)

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, MSG_SERVER_ERROR, request);
    }

    // ------------------------------------------------------------------ helpers

    private ResponseEntity<ErrorResponse> respond(HttpStatus status, String message, HttpServletRequest request) {
        return respond(status, message, request, Map.of());
    }

    private ResponseEntity<ErrorResponse> respond(HttpStatus status, String message, HttpServletRequest request,
                                                  Map<String, String> fieldErrors) {
        ErrorResponse body = ErrorResponse.of(clock.instant(), status, message, request.getRequestURI(), fieldErrors);
        return ResponseEntity.status(status).body(body);
    }

    private static String messageOf(MessageSourceResolvable error) {
        String message = error.getDefaultMessage();
        return (message == null || message.isBlank()) ? "Invalid value." : message;
    }

    private static boolean isAnonymous(Authentication authentication) {
        return authentication == null
                || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated();
    }

    /** JSON path of the offending property, e.g. {@code items[0].categoryId}. */
    private static String jsonPath(JsonMappingException ex) {
        StringBuilder path = new StringBuilder();
        for (JsonMappingException.Reference ref : ex.getPath()) {
            if (ref.getFieldName() != null) {
                if (!path.isEmpty()) {
                    path.append('.');
                }
                path.append(ref.getFieldName());
            } else if (ref.getIndex() >= 0) {
                path.append('[').append(ref.getIndex()).append(']');
            }
        }
        return path.toString();
    }

    private static String lastPathNode(String propertyPath) {
        int dot = propertyPath.lastIndexOf('.');
        return dot >= 0 ? propertyPath.substring(dot + 1) : propertyPath;
    }
}
