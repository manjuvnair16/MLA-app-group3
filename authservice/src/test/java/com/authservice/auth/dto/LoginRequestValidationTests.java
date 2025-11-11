package com.authservice.auth.dto;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;

import org.junit.jupiter.api.Test;

public class LoginRequestValidationTests {

    private final Validator validator;

    public LoginRequestValidationTests() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    @Test
    public void validRequest_shouldNotHaveViolations() {
        LoginRequestDTO dto = new LoginRequestDTO();
        dto.setEmail("test@example.com");
        dto.setPassword("ValidPassword#_+123");
        Set<ConstraintViolation<LoginRequestDTO>> violations = validator.validate(dto);
        System.out.println(violations);
        assertTrue(violations.isEmpty());
    }

    @Test
    public void emailIncorrectFormat_shouldHaveViolations() {
        LoginRequestDTO dto = new LoginRequestDTO();
        dto.setEmail("invalid");
        Set<ConstraintViolation<LoginRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Invalid email format")));
    }

    @Test
    public void emailTooLong_shouldHaveViolations() {
        LoginRequestDTO dto = new LoginRequestDTO();
        StringBuilder longEmail = new StringBuilder();
        for (int i = 0; i < 300; i++) {
            longEmail.append("a");
        }
        longEmail.append("@test.com");
        dto.setEmail(longEmail.toString());
        Set<ConstraintViolation<LoginRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Email address must be between 5 and 254 characters")));
    }

    @Test
    public void passwordTooLong_shouldHaveViolations() {
        LoginRequestDTO dto = new LoginRequestDTO();
        StringBuilder longPassword = new StringBuilder();
        for (int i = 0; i < 130; i++) {
            longPassword.append("a");
        }
        dto.setPassword(longPassword.toString());
        Set<ConstraintViolation<LoginRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Password must be between 8 and 128 characters")));
    }

    @Test
    public void passwordTooShort_shouldHaveViolations() {
        LoginRequestDTO dto = new LoginRequestDTO();
        dto.setPassword("Short1!");
        Set<ConstraintViolation<LoginRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Password must be between 8 and 128 characters")));
    }
    
}
