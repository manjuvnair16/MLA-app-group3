package com.authservice.auth.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

import java.util.Optional;

import com.authservice.auth.model.UpdateUserRequestDTO;
import com.authservice.auth.model.AuthResponseDTO;
import com.authservice.auth.model.ErrorResponseDTO;
import com.authservice.auth.model.User;
import com.authservice.auth.model.UserResponseDTO;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.JwtService;

public class AuthControllerTest {

    private static final String USERNAME = "testUser";
    private static final String PASSWORD = "testPassword";
    private static final String WRONG_PASSWORD = "wrongPassword";
    private static final String ENCODED_PASSWORD = "encodedPassword";
    private static final String EMAIL = "testEmail@test.com";
    private static final String USER_ID = "testId";
    private static final String FIRST_NAME = "Jane";
    private static final String LAST_NAME = "Doe";
    private static final String USER_REGISTERED_MSG = "User registered successfully!";
    private static final String USER_EXISTS_MSG = "User already exists - please log in";
    private static final String EMAIL_EXISTS_MSG = "Email already registered - please log in";
    private static final String USER_AUTHENTICATED_MSG = "User authenticated";
    private static final String INVALID_CREDENTIALS_MSG = "Email or password is incorrect - please try again";
    private static final String JWT = "jwt-token-for-use-in-tests-123456789";

    // Mock dependencies
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        when(jwtService.generateToken(any(String.class))).thenReturn(JWT);
    }

    private User createUser(String username, String password) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        return user;
    }

    private User createUserWithEmail(String email, String password) {
        User user = new User();
        user.setId(USER_ID);
        user.setEmail(email);
        user.setPassword(password);
        user.setFirstName(FIRST_NAME);
        user.setLastName(LAST_NAME);
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
        AuthResponseDTO body = (AuthResponseDTO) response.getBody();
        verify(userRepository).existsByUsername(USERNAME);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_REGISTERED_MSG, body.getMessage());
        assertEquals(JWT, body.getJwt());
        assertEquals(ENCODED_PASSWORD, user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenUsernameExists_returnsBadRequest() {
        User user = createUser(USERNAME, PASSWORD);

        when(userRepository.existsByUsername(USERNAME))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).existsByUsername(USERNAME);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals(USER_EXISTS_MSG, body.getMessage());
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
        AuthResponseDTO body = (AuthResponseDTO) response.getBody();
        verify(userRepository).existsByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_REGISTERED_MSG, body.getMessage());
        assertEquals(JWT, body.getJwt());
        assertEquals(ENCODED_PASSWORD, user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    public void registerUser_whenEmailExists_returnsBadRequest() {
        User user = createUserWithEmail(EMAIL, PASSWORD);

        when(userRepository.existsByEmail(EMAIL))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(user);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).existsByEmail(EMAIL);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals(EMAIL_EXISTS_MSG, body.getMessage());
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
        AuthResponseDTO body = (AuthResponseDTO) response.getBody();
        verify(userRepository).findByUsername(USERNAME);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_AUTHENTICATED_MSG, body.getMessage());
        assertEquals(JWT, body.getJwt());
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
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).findByUsername(USERNAME);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, body.getMessage());
    }

    @Test
    public void authenticateUser_whenUsernameDoesNotExist_returnsUnauthorized() {
        User user = createUser(USERNAME, PASSWORD);

        when(userRepository.findByUsername(USERNAME))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).findByUsername(USERNAME);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, body.getMessage());
    }

    @Test
    public void authenticateUser_whenEmailDoesNotExist_returnsUnauthorized() {
        User user = createUserWithEmail(EMAIL, PASSWORD);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(user);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, body.getMessage());
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
        AuthResponseDTO body = (AuthResponseDTO) response.getBody();
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_AUTHENTICATED_MSG, body.getMessage());
        assertEquals(JWT, body.getJwt());
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
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, body.getMessage());
    }

    // Tests for user
    @Test
    public void getUserByEmail_whenUserExists_returnsUser() {
        User user = createUserWithEmail(EMAIL, PASSWORD);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(user);

        ResponseEntity<?> response = authController.getUserByEmail(EMAIL);
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertTrue(response.getBody() instanceof UserResponseDTO);

        UserResponseDTO userDto = (UserResponseDTO) response.getBody();
        assertEquals(user.getId(), userDto.getId());
        assertEquals(user.getEmail(), userDto.getEmail());
        assertEquals(user.getFirstName(), userDto.getFirstName());
        assertEquals(user.getLastName(), userDto.getLastName());
    }

    @Test
    public void getUserByEmail_whenUserDoesNotExist_returnsNotFound() {
        when(userRepository.findByEmail(EMAIL))
            .thenReturn(null);

        ResponseEntity<?> response = authController.getUserByEmail(EMAIL);
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(404, response.getStatusCodeValue());
        assertEquals("User not found", response.getBody());
    }

    @Test
    public void getUserByEmail_whenEmailIsNull_returnsBadRequest() {
        ResponseEntity<?> response = authController.getUserByEmail(null);
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("Email is required", response.getBody());
    }

    @Test
    public void getUserById_whenUserExists_returnsUser() {
        User user = createUserWithEmail(EMAIL, PASSWORD);
        when(userRepository.findById(user.getId()))
            .thenReturn(Optional.of(user));

        ResponseEntity<?> response = authController.getUserById(user.getId());
        verify(userRepository).findById(user.getId());

        assertEquals(200, response.getStatusCodeValue());
        assertTrue(response.getBody() instanceof UserResponseDTO);

        UserResponseDTO userDto = (UserResponseDTO) response.getBody();
        assertEquals(user.getId(), userDto.getId());
        assertEquals(user.getEmail(), userDto.getEmail());
        assertEquals(user.getFirstName(), userDto.getFirstName());
        assertEquals(user.getLastName(), userDto.getLastName());
    }

    @Test
    public void getUserById_whenUserDoesNotExist_returnsNotFound() {    
        when(userRepository.findById(USER_ID))
            .thenReturn(Optional.empty());

        ResponseEntity<?> response = authController.getUserById(USER_ID);
        verify(userRepository).findById(USER_ID);

        assertEquals(404, response.getStatusCodeValue());
        assertEquals("User not found", response.getBody());
    }

    @Test
    public void getUserById_whenIdIsNull_returnsBadRequest() {
        ResponseEntity<?> response = authController.getUserById(null);
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("User ID is required", response.getBody());
    
    }

    @Test
    public void updateUserDetails_whenUserDoesNotExist_returnsNotFound() {
        UpdateUserRequestDTO updateRequest = new UpdateUserRequestDTO();
        updateRequest.setFirstName("NewFirstName");

        when(userRepository.findById(USER_ID))
            .thenReturn(Optional.empty());

        ResponseEntity<?> response = authController.updateUserDetails(USER_ID, updateRequest);
        verify(userRepository).findById(USER_ID);

        assertEquals(404, response.getStatusCodeValue());
        assertEquals("User not found", response.getBody());
    }

    @Test
    public void updateUserDetails_whenUserExists_updatesUser() {
        User user = createUserWithEmail(EMAIL, PASSWORD);
        UpdateUserRequestDTO updateRequest = new UpdateUserRequestDTO();
        updateRequest.setFirstName("NewFirstName");
        updateRequest.setLastName("NewLastName");

        when(userRepository.findById(USER_ID))
            .thenReturn(Optional.of(user));

        ResponseEntity<?> response = authController.updateUserDetails(USER_ID, updateRequest);
        verify(userRepository).findById(USER_ID);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("User details updated successfully", response.getBody());
        verify(userRepository).save(user);
        assertEquals("NewFirstName", user.getFirstName());
        assertEquals("NewLastName", user.getLastName());
        assertEquals(USER_ID, user.getId());
        assertEquals(EMAIL, user.getEmail());
        assertEquals(PASSWORD, user.getPassword());
    }
}
