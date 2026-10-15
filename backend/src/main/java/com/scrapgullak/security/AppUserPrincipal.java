package com.scrapgullak.security;

import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * The authenticated caller, as stored in the security context. Controllers obtain it with
 * {@code @AuthenticationPrincipal AppUserPrincipal principal}. The username is the normalised phone
 * number and the single authority is {@code ROLE_<role>}.
 */
public record AppUserPrincipal(Long id, String phone, String fullName, Role role, String passwordHash)
        implements UserDetails {

    public static AppUserPrincipal from(User user) {
        return new AppUserPrincipal(user.getId(), user.getPhone(), user.getFullName(), user.getRole(),
                user.getPasswordHash());
    }

    /** True when this caller has the given role. */
    public boolean hasRole(Role expected) {
        return role == expected;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return phone;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    /** Never prints the password hash (records include every component by default). */
    @Override
    public String toString() {
        return "AppUserPrincipal[id=" + id + ", phone=" + phone + ", role=" + role + "]";
    }
}
