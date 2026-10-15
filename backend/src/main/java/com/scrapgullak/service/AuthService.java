package com.scrapgullak.service;

import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.AccountType;
import com.scrapgullak.domain.enums.Role;
import com.scrapgullak.dto.auth.AuthResponse;
import com.scrapgullak.dto.auth.LoginRequest;
import com.scrapgullak.dto.auth.RegisterRequest;
import com.scrapgullak.dto.common.UserDto;
import com.scrapgullak.dto.passbook.PassbookResponse;
import com.scrapgullak.exception.BusinessRuleException;
import com.scrapgullak.exception.ConflictException;
import com.scrapgullak.exception.NotFoundException;
import com.scrapgullak.mapper.DtoMapper;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.security.JwtService;
import com.scrapgullak.support.PhoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;

/**
 * Customer self-registration and phone/password sign-in. Every sign-in failure (unknown phone, wrong
 * password, deactivated account) surfaces as the same 401 so phone numbers cannot be enumerated.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    static final String DUPLICATE_PHONE = "An account with this phone number already exists.";
    static final String INVALID_CREDENTIALS = "Invalid phone number or password.";
    static final String INVALID_MOBILE = "Enter a valid 10-digit Indian mobile number.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PassbookService passbookService;
    private final DtoMapper mapper;
    private final Clock clock;

    /** Registers a CUSTOMER account (role is never taken from the request) and signs it in. */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String phone = PhoneUtils.normalize(request.phone());
        if (!PhoneUtils.isValidMobile(phone)) {
            throw new BusinessRuleException(INVALID_MOBILE);
        }
        if (userRepository.existsByPhone(phone)) {
            throw new ConflictException(DUPLICATE_PHONE);
        }

        AccountType accountType = request.accountType() == null ? AccountType.B2C_HOUSEHOLD : request.accountType();
        String gstNumber = trimToNull(request.gstNumber());
        User user = User.builder()
                .fullName(request.fullName().trim())
                .phone(phone)
                .email(trimToNull(request.email()))
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.CUSTOMER)
                .accountType(accountType)
                .gstNumber(gstNumber == null ? null : gstNumber.toUpperCase(Locale.ROOT))
                .companyName(trimToNull(request.companyName()))
                .address(trimToNull(request.address()))
                .noidaSector(trimToNull(request.noidaSector()))
                .createdAt(Instant.now(clock))
                .build();

        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Lost a race with a concurrent registration for the same phone.
            throw new ConflictException(DUPLICATE_PHONE);
        }
        log.info("Registered {} customer {} (id={})", accountType, maskPhone(phone), user.getId());
        return authResponseFor(user);
    }

    /**
     * Authenticates through Spring Security's {@link AuthenticationManager}; its exceptions propagate and
     * are rendered as 401 by the global exception handler.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String phone = PhoneUtils.normalize(request.phone());
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(phone, request.password()));

        User user = userRepository.findByPhone(phone)
                .filter(User::isActive)
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS));
        log.debug("User {} signed in as {}", user.getId(), user.getRole());
        return authResponseFor(user);
    }

    @Transactional(readOnly = true)
    public UserDto currentUser(Long userId) {
        return userRepository.findById(userId)
                .map(mapper::toUserDto)
                .orElseThrow(() -> new NotFoundException("Your account was not found."));
    }

    private AuthResponse authResponseFor(User user) {
        PassbookResponse passbook = user.getRole() == Role.CUSTOMER ? passbookService.buildFor(user) : null;
        return AuthResponse.bearer(
                jwtService.generateToken(user),
                jwtService.getExpirationSeconds(),
                mapper.toUserDto(user),
                passbook);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String maskPhone(String phone) {
        return phone.length() <= 4 ? "****" : "******" + phone.substring(phone.length() - 4);
    }
}
