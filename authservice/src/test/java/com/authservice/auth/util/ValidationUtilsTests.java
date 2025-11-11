package com.authservice.auth.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.authservice.auth.exception.ValidationException;

public class ValidationUtilsTests {

    @Test
    public void validateEmailAddressConstraints_validEmails_doNotThrow() {
        assertDoesNotThrow(() -> ValidationUtils.validateEmailAddressConstraints("validemail@test.com"));
        assertDoesNotThrow(() -> ValidationUtils.validateEmailAddressConstraints("valid_email@test-domain.co.uk"));
        assertDoesNotThrow(() -> ValidationUtils.validateEmailAddressConstraints("valid.email+123@test-domain.de"));
    }

    @Test
    public void validateEmailAddressConstraints_nullEmail_throwsValidationException() {
        ValidationException ex = assertThrows(ValidationException.class,
            () -> ValidationUtils.validateEmailAddressConstraints(null));
        assertEquals("Email is required", ex.getMessage());
    }

    @Test
    public void validateEmailAddressConstraints_invalidEmails_throwValidationException() {
        assertThrows(ValidationException.class, () -> ValidationUtils.validateEmailAddressConstraints("invalidemail"));
        assertThrows(ValidationException.class, () -> ValidationUtils.validateEmailAddressConstraints("invalid@.domain.com"));
        assertThrows(ValidationException.class, () -> ValidationUtils.validateEmailAddressConstraints(".dot@start.com"));
        assertThrows(ValidationException.class, () -> ValidationUtils.validateEmailAddressConstraints("local..dots@domain.com"));
        assertThrows(ValidationException.class, () -> ValidationUtils.validateEmailAddressConstraints("invalid@domaindots..com"));
        assertThrows(ValidationException.class, () -> ValidationUtils.validateEmailAddressConstraints("invalid@domain"));
    }

    @Test
    public void validateEmailAddressConstraints_localPartTooLong_throwsValidationException() {
        StringBuilder local = new StringBuilder();
        for (int i = 0; i < 65; i++) {
            local.append("a");
        }
        String email = local + "@test-domain.com";
        ValidationException ex = assertThrows(ValidationException.class,
            () -> ValidationUtils.validateEmailAddressConstraints(email));
        assertTrue(ex.getMessage().toLowerCase().contains("local"));
    }

    @Test
    public void validateEmailAddressConstraints_domainTooLong_throwsValidationException() {
        StringBuilder domain = new StringBuilder();
        for (int i = 0; i < 256; i++) {
            domain.append("a");
        }
        String email = "test@" + domain + ".com";
        ValidationException ex = assertThrows(ValidationException.class,
            () -> ValidationUtils.validateEmailAddressConstraints(email));
        assertTrue(ex.getMessage().toLowerCase().contains("domain"));
    }

    @Test
    public void validateEmailAddressConstraints_domainTooShort_throwsValidationException() {
        ValidationException ex = assertThrows(ValidationException.class,
            () -> ValidationUtils.validateEmailAddressConstraints("a@b.c"));
        assertTrue(ex.getMessage().toLowerCase().contains("domain"));
    }
}
