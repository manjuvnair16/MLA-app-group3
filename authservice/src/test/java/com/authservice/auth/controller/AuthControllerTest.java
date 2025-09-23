package com.authservice.auth.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.authservice.auth.model.User;
import com.authservice.auth.repository.UserRepository;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

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

    // Tests for sign up
    @Test
    public void registerUser_whenUserDoesNotExist_registersUser() {
        User user = new User();
        user.setUsername("validUser");
        user.setPassword("password");

        when(userRepository.existsByUsername("validUser"))
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
        User user = new User();
        user.setUsername("existingUser");
        user.setPassword("password");

        when(userRepository.existsByUsername("existingUser"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("User already exists - please log in", response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    // Tests for login
    @Test
    public void authenticateUser_whenCredentialsAreValid_authenticatesUser() {
        User user = new User();
        user.setUsername("validUser");
        user.setPassword("password");

        User existingUser = new User();
        existingUser.setUsername("validUser");
        existingUser.setPassword("encodedPassword");

        when(userRepository.findByUsername("validUser"))
            .thenReturn(existingUser);
        when(passwordEncoder.matches("password", "encodedPassword"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(user);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User authenticated", response.getBody());
    }
    
}
