package com.scrapgullak.security;

import com.scrapgullak.domain.entity.User;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.support.PhoneUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Loads accounts for login (by normalised phone number) and for JWT authentication (by id).
 * Deactivated accounts are treated as unknown, so login answers with the same generic 401 for a
 * wrong phone, a wrong password and a disabled account.
 */
@Service
@RequiredArgsConstructor
public class DbUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AppUserPrincipal loadUserByUsername(String username) {
        String phone = PhoneUtils.normalize(username);
        if (phone == null || phone.isEmpty()) {
            throw new UsernameNotFoundException("No active account for that phone number.");
        }
        return userRepository.findByPhone(phone)
                .filter(User::isActive)
                .map(AppUserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("No active account for that phone number."));
    }

    /** The active account with this id, or empty when it no longer exists or was deactivated. */
    @Transactional(readOnly = true)
    public Optional<AppUserPrincipal> loadActiveById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return userRepository.findById(id)
                .filter(User::isActive)
                .map(AppUserPrincipal::from);
    }
}
