package com.scrapgullak.support;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PhoneUtilsTest {

    @ParameterizedTest
    @CsvSource({
            "9876543210,        9876543210",
            "'+91 98765 43210', 9876543210",
            "+919876543210,     9876543210",
            "919876543210,      9876543210",
            "91-9876543210,     9876543210",
            "09876543210,       9876543210",
            "'98765-43210',     9876543210",
            "' 98765 43210 ',   9876543210"
    })
    void normalizesCommonIndianFormats(String raw, String expected) {
        assertThat(PhoneUtils.normalize(raw)).isEqualTo(expected);
    }

    @Test
    void nullStaysNull() {
        assertThat(PhoneUtils.normalize(null)).isNull();
    }

    @Test
    void otherLengthsAreReturnedAsDigitsOnly() {
        assertThat(PhoneUtils.normalize("12-345")).isEqualTo("12345");
        assertThat(PhoneUtils.normalize("abc")).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"9876543210", "6000000000", "7012345678", "8123456789"})
    void acceptsValidMobiles(String phone) {
        assertThat(PhoneUtils.isValidMobile(phone)).isTrue();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "5876543210", "987654321", "98765432100", "98765 43210", "+919876543210"})
    void rejectsInvalidMobiles(String phone) {
        assertThat(PhoneUtils.isValidMobile(phone)).isFalse();
    }

    @Test
    void normalizedInputIsValid() {
        assertThat(PhoneUtils.isValidMobile(PhoneUtils.normalize("+91 98765 43210"))).isTrue();
    }
}
