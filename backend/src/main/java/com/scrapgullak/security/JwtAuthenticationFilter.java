package com.scrapgullak.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Authenticates requests carrying {@code Authorization: Bearer <jwt>}. A valid token for an existing,
 * active account populates the security context; anything else (no header, bad signature, expired token,
 * deleted or deactivated user) leaves it empty without failing the request, so public routes keep
 * working and protected routes get the JSON 401 from {@link RestAuthenticationEntryPoint}.
 *
 * <p>Instantiated by {@link SecurityConfig} (not a Spring bean) so it is not also registered as a
 * plain servlet filter.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final DbUserDetailsService userDetailsService;
    private final WebAuthenticationDetailsSource detailsSource = new WebAuthenticationDetailsSource();
    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();

    public JwtAuthenticationFilter(JwtService jwtService, DbUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = bearerToken(request);
        if (token != null && contextHolder.getContext().getAuthentication() == null) {
            jwtService.extractUserId(token)
                    .flatMap(userDetailsService::loadActiveById)
                    .ifPresent(principal -> authenticate(principal, request));
        }
        chain.doFilter(request, response);
    }

    private void authenticate(AppUserPrincipal principal, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
        authentication.setDetails(detailsSource.buildDetails(request));
        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        contextHolder.setContext(context);
    }

    /** The raw token from a {@code Bearer} Authorization header, or {@code null} if there is none. */
    private static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || header.length() <= BEARER_PREFIX.length()
                || !header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return null;
        }
        String token = header.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }
}
