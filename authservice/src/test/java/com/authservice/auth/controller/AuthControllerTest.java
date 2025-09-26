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

    private User createUserWithEmail(String email, String password) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(password);
        return user;
    }

    // Tests for sign up
    @Test
    public void registerUser_whenUsernameDoesNotExist_registersUser() {
        User user = createUser("newUser", "password");

        when(userRepository.existsByUsername("newUser"))
            .thenReturn(false);
        when(passwordEncoder.encode("password"))
            .thenReturn("encodedPassword");

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByUsername("newUser");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User registered successfully!", response.getBody());
        assertEquals("encodedPassword", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenUsernameExists_returnsBadRequest() {
        User user = createUser("existingUser", "password");

        when(userRepository.existsByUsername("existingUser"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByUsername("existingUser");

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("User already exists - please log in", response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void registerUser_whenEmailDoesNotExist_registersUser() {
        User user = createUserWithEmail("newEmail@test.com", "password");

        when(userRepository.existsByEmail("newEmail@test.com"))
            .thenReturn(false);
        when(passwordEncoder.encode("password"))
            .thenReturn("encodedPassword");

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByEmail("newEmail@test.com");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User registered successfully!", response.getBody());
        assertEquals("encodedPassword", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenEmailExists_returnsBadRequest() {
        User user = createUserWithEmail("existingEmail@test.com", "password");

        when(userRepository.existsByEmail("existingEmail@test.com"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByEmail("existingEmail@test.com");

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("Email already registered - please log in", response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    // Tests for login
    @Test
    public void authenticateUser_whenUsernameAndPasswordCorrect_authenticatesUser() {
        User user = createUser("validUser", "password");
        User existingUser = createUser("validUser", "encodedPassword");

        when(userRepository.findByUsername("validUser"))
            .thenReturn(existingUser);
        when(passwordEncoder.matches("password", "encodedPassword"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByUsername("validUser");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User authenticated", response.getBody());
    }

    @Test
    public void authenticateUser_whenUsernameCorrectPasswordIncorrect_returnsUnauthorized() {
        User user = createUser("validUser", "wrongPassword");
        User existingUser = createUser("validUser", "encodedPassword");

        when(userRepository.findByUsername("validUser"))
            .thenReturn(existingUser);
        when(passwordEncoder.matches("wrongPassword", "encodedPassword"))
            .thenReturn(false);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByUsername("validUser");

        assertEquals(401, response.getStatusCodeValue());
        assertEquals("Invalid credentials", response.getBody());
    }

    @Test
    public void authenticateUser_whenUsernameDoesNotExist_returnsUnauthorized() {
        User user = createUser("nonExistentUser", "password");

        when(userRepository.findByUsername("nonExistentUser"))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByUsername("nonExistentUser");

        assertEquals(401, response.getStatusCodeValue());
        assertEquals("Invalid credentials", response.getBody());
    }

    @Test
    public void authenticateUser_whenEmailDoesNotExist_returnsUnauthorized() {
        User user = createUserWithEmail("nonExistentEmail@test.com", "password");

        when(userRepository.findByEmail("nonExistentEmail@test.com"))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByEmail("nonExistentEmail@test.com");

        assertEquals(401, response.getStatusCodeValue());
        assertEquals("Invalid credentials", response.getBody());
    }

    @Test
    public void authenticateUser_whenEmailAndPasswordCorrect_authenticatesUser() {
        User user = createUserWithEmail("validEmail@test.com", "password");
        User existingUser = createUserWithEmail("validEmail@test.com", "encodedPassword");

        when(userRepository.findByEmail("validEmail@test.com"))
            .thenReturn(existingUser);
        when(passwordEncoder.matches("password", "encodedPassword"))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByEmail("validEmail@test.com");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User authenticated", response.getBody());
    }
}
