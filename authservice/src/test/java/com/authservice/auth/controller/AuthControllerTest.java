package com.authservice.auth.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.authservice.auth.model.User;
import com.authservice.auth.repository.UserRepository;

public class AuthControllerTest {

    // Mock dependencies
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private User createUser(String username, String password) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        return user;
    }

    // Tests for sign up
    @Test
    public void registerUser_whenUserDoesNotExist_registersUser() {
        User user = createUser("newUser", "password");

        when(userRepository.existsByUsername("newUser"))
            .thenReturn(false);
        when(passwordEncoder.encode("password"))
            .thenReturn("encodedPassword");

        ResponseEntity<?> response = authController.registerUser(user);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User registered successfully!", response.getBody());
        assertEquals("encodedPassword", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenUserExists_returnsBadRequest() {
        User user = createUser("existingUser", "password");

        when(userRepository.existsByUsername("existingUser"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("User already exists - please log in", response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    // Tests for login
    @Test
    public void authenticateUser_whenCredentialsAreCorrect_authenticatesUser() {
        User user = createUser("validUser", "password");
        User existingUser = createUser("validUser", "encodedPassword");

        when(userRepository.findByUsername("validUser"))
            .thenReturn(existingUser);
        when(passwordEncoder.matches("password", "encodedPassword"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(user);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User authenticated", response.getBody());
    }

    @Test
    public void authenticateUser_whenPasswordIsIncorrect_returnsUnauthorized() {
        User user = createUser("validUser", "wrongPassword");
        User existingUser = createUser("validUser", "encodedPassword");

        when(userRepository.findByUsername("validUser"))
            .thenReturn(existingUser);
        when(passwordEncoder.matches("wrongPassword", "encodedPassword"))
            .thenReturn(false);

        ResponseEntity<?> response = authController.authenticateUser(user);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals("Invalid credentials", response.getBody());
    }

    @Test
    public void authenticateUser_whenUserDoesNotExist_returnsUnauthorized() {
        User user = createUser("nonExistentUser", "password");

        when(userRepository.findByUsername("nonExistentUser"))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals("Invalid credentials", response.getBody());
    }
    
}
