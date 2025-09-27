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

    private static final String USERNAME = "testUser";
    private static final String PASSWORD = "testPassword";
    private static final String WRONG_PASSWORD = "wrongPassword";
    private static final String ENCODED_PASSWORD = "encodedPassword";
    private static final String EMAIL = "testEmail@test.com";
    private static final String USER_REGISTERED_MSG = "User registered successfully!";
    private static final String USER_EXISTS_MSG = "User already exists - please log in";
    private static final String EMAIL_EXISTS_MSG = "Email already registered - please log in";
    private static final String USER_AUTHENTICATED_MSG = "User authenticated";
    private static final String INVALID_CREDENTIALS_MSG = "Invalid credentials";


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
        User user = createUser(USERNAME, PASSWORD);

        when(userRepository.existsByUsername(USERNAME))
            .thenReturn(false);
        when(passwordEncoder.encode(PASSWORD))
            .thenReturn(ENCODED_PASSWORD);

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByUsername(USERNAME);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_REGISTERED_MSG, response.getBody());
        assertEquals(ENCODED_PASSWORD, user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenUsernameExists_returnsBadRequest() {
        User user = createUser(USERNAME, PASSWORD);

        when(userRepository.existsByUsername(USERNAME))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByUsername(USERNAME);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals(USER_EXISTS_MSG, response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    public void registerUser_whenEmailDoesNotExist_registersUser() {
        User user = createUserWithEmail(EMAIL, PASSWORD);

        when(userRepository.existsByEmail(EMAIL))
            .thenReturn(false);
        when(passwordEncoder.encode(PASSWORD))
            .thenReturn(ENCODED_PASSWORD);

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_REGISTERED_MSG, response.getBody());
        assertEquals(ENCODED_PASSWORD, user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenEmailExists_returnsBadRequest() {
        User user = createUserWithEmail(EMAIL, PASSWORD);

        when(userRepository.existsByEmail(EMAIL))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);
        verify(userRepository).existsByEmail(EMAIL);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals(EMAIL_EXISTS_MSG, response.getBody());
        verify(userRepository, never()).save(any(User.class));
    }

    // Tests for login
    @Test
    public void authenticateUser_whenUsernameAndPasswordCorrect_authenticatesUser() {
        User user = createUser(USERNAME, PASSWORD);
        User existingUser = createUser(USERNAME, ENCODED_PASSWORD);

        when(userRepository.findByUsername(USERNAME))
            .thenReturn(existingUser);
        when(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByUsername(USERNAME);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_AUTHENTICATED_MSG, response.getBody());
    }

    @Test
    public void authenticateUser_whenUsernameCorrectPasswordIncorrect_returnsUnauthorized() {
        User user = createUser(USERNAME, WRONG_PASSWORD);
        User existingUser = createUser(USERNAME, ENCODED_PASSWORD);

        when(userRepository.findByUsername(USERNAME))
            .thenReturn(existingUser);
        when(passwordEncoder.matches(WRONG_PASSWORD, ENCODED_PASSWORD))
            .thenReturn(false);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByUsername(USERNAME);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, response.getBody());
    }

    @Test
    public void authenticateUser_whenUsernameDoesNotExist_returnsUnauthorized() {
        User user = createUser(USERNAME, PASSWORD);

        when(userRepository.findByUsername(USERNAME))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByUsername(USERNAME);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, response.getBody());
    }

    @Test
    public void authenticateUser_whenEmailDoesNotExist_returnsUnauthorized() {
        User user = createUserWithEmail(EMAIL, PASSWORD);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, response.getBody());
    }

    @Test
    public void authenticateUser_whenEmailAndPasswordCorrect_authenticatesUser() {
        User user = createUserWithEmail(EMAIL, PASSWORD);
        User existingUser = createUserWithEmail(EMAIL, ENCODED_PASSWORD);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(existingUser);
        when(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_AUTHENTICATED_MSG, response.getBody());
    }

    @Test
    public void authenticateUser_whenEmailCorrectPasswordIncorrect_returnsUnauthorized() {
        User user = createUserWithEmail(EMAIL, WRONG_PASSWORD);
        User existingUser = createUserWithEmail(EMAIL, ENCODED_PASSWORD);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(existingUser);
        when(passwordEncoder.matches(WRONG_PASSWORD, ENCODED_PASSWORD))
            .thenReturn(false);

        ResponseEntity<?> response = authController.authenticateUser(user);
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, response.getBody());
    }
}
