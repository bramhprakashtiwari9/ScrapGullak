package com.scrapgullak.dto.auth;

import com.scrapgullak.domain.enums.Role;
import com.scrapgullak.dto.common.UserDto;
import com.scrapgullak.dto.passbook.PassbookResponse;

/**
 * Result of login/registration. {@code passbook} is included only for customers (null otherwise),
 * so the customer app can render the Gullak immediately after sign-in.
 */
public record AuthResponse(
        String token,
        String tokenType,
        long expiresInSeconds,
        Role role,
        UserDto user,
        PassbookResponse passbook) {

    public static final String BEARER = "Bearer";

    public static AuthResponse bearer(String token, long expiresInSeconds, UserDto user, PassbookResponse passbook) {
        return new AuthResponse(token, BEARER, expiresInSeconds, user.role(), user, passbook);
    }
}
