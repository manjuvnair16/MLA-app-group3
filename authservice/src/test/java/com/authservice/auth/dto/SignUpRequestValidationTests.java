package com.authservice.auth.dto;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.ValidatorFactory;

import org.junit.jupiter.api.Test;

import javax.validation.Validator;

public class SignUpRequestValidationTests {

    private final Validator validator;
    
    public SignUpRequestValidationTests() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    @Test
    public void validRequest_shouldNotHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        dto.setEmail("test@example.com");
        dto.setPassword("ValidPassword#_+123");
        dto.setFirstName("Jane");
        dto.setLastName("Doe");
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        System.out.println(violations);
        assertTrue(violations.isEmpty());
    }

    @Test
    public void emailIncorrectFormat_shouldHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        dto.setEmail("invalid");
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Invalid email format")));
    }

    @Test
    public void emailTooLong_shouldHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        StringBuilder longEmail = new StringBuilder();
        for (int i = 0; i < 300; i++) {
            longEmail.append("a");
        }
        longEmail.append("@test.com");
        dto.setEmail(longEmail.toString());
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Email address must be between 5 and 254 characters")));
    }

    @Test
    public void passwordTooLong_shouldHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        StringBuilder longPassword = new StringBuilder();
        for (int i = 0; i < 130; i++) {
            longPassword.append("a");
        }
        dto.setPassword(longPassword.toString());
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Password must be between 8 and 128 characters")));
    }

    @Test
    public void passwordTooShort_shouldHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        dto.setPassword("Short1!");
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Password must be between 8 and 128 characters")));
    }

    @Test
    public void passwordMissingComplexity_shouldHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        dto.setPassword("alllowercase1");
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Password must contain")));
    }

    @Test
    public void firstNameLastNameTooLong_shouldHaveViolations() {
        SignUpRequestDTO dto = new SignUpRequestDTO();
        StringBuilder longName = new StringBuilder();
        for (int i = 0; i < 60; i++) {
            longName.append("a");
        }
        dto.setFirstName(longName.toString());
        dto.setLastName(longName.toString());
        Set<ConstraintViolation<SignUpRequestDTO>> violations = validator.validate(dto);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("firstName")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("First name must be between 1 and 50 characters")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("lastName")));
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Last name must be between 1 and 50 characters")));
    }
    
}
