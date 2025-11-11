package com.authservice.auth.util;

import java.util.regex.Pattern;

import com.authservice.auth.exception.ValidationException;

public class ValidationUtils {
    
    public static void validateEmailAddressConstraints(String email) {
        if (email == null) throw new ValidationException("Email is required");

        String[] parts = email.split("@", -1);
        if (parts.length != 2) throw new ValidationException("Invalid email format");

        String local = parts[0];
        String domain = parts[1];

        if (local.length() < 1 || local.length() > 64) {
            throw new ValidationException("Email local part must be between 1 and 64 characters");
        }
        if (local.startsWith(".") || local.endsWith(".") || local.contains("..")) {
            throw new ValidationException("Email local part cannot start/end with or contain consecutive dots");
        }

        if (domain.length() < 4 || domain.length() > 255) {
            throw new ValidationException("Email domain must be between 4 and 255 characters");
        }
        if (!domain.contains(".") || domain.startsWith(".") || domain.endsWith(".") || domain.contains("..")) {
            throw new ValidationException("Email domain must contain a dot and cannot start/end with or contain consecutive dots");
        }

        Pattern pattern = Pattern.compile("^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
        if (!pattern.matcher(email).matches()) {
            throw new ValidationException("Invalid email format");
        }
    }
}
