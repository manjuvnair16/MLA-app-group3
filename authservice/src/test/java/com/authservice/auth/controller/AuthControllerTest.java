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
import org.mockito.ArgumentCaptor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import com.authservice.auth.dto.AuthResponseDTO;
import com.authservice.auth.dto.ErrorResponseDTO;
import com.authservice.auth.dto.SignUpRequestDTO;
import com.authservice.auth.dto.LoginRequestDTO;
import com.authservice.auth.dto.UpdateUserRequestDTO;
import com.authservice.auth.dto.UserResponseDTO;
import com.authservice.auth.model.User;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.JwtService;

public class AuthControllerTest {

    private static final String PASSWORD = "testPassword";
    private static final String WRONG_PASSWORD = "wrongPassword";
    private static final String ENCODED_PASSWORD = "encodedPassword";
    private static final String EMAIL = "testemail@test.com";
    private static final String USER_ID = "testId";
    private static final String FIRST_NAME = "Jane";
    private static final String LAST_NAME = "Doe";
    private static final String USER_REGISTERED_MSG = "User registered successfully!";
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

    private SignUpRequestDTO createSignUpRequest(String email, String password) {
        SignUpRequestDTO request = new SignUpRequestDTO();
        request.setEmail(email);
        request.setPassword(password);
        request.setFirstName(FIRST_NAME);
        request.setLastName(LAST_NAME);
        return request;
    }

    private LoginRequestDTO createLoginRequest(String email, String password) {
        LoginRequestDTO request = new LoginRequestDTO();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private User createUser(String email, String password, String firstName, String lastName) {
        User user = new User();
        user.setId(USER_ID);
        user.setEmail(email);
        user.setPassword(password);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        return user;
    }

    // Tests for sign up
    @Test
    public void registerUser_whenEmailDoesNotExist_registersUser() {
        SignUpRequestDTO request = createSignUpRequest(EMAIL, PASSWORD);

        when(userRepository.existsByEmail(EMAIL))
            .thenReturn(false);
        when(passwordEncoder.encode(PASSWORD))
            .thenReturn(ENCODED_PASSWORD);

        ResponseEntity<?> response = authController.registerUser(request);
        AuthResponseDTO body = (AuthResponseDTO) response.getBody();
        verify(userRepository).existsByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_REGISTERED_MSG, body.getMessage());
        assertEquals(JWT, body.getJwt());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertEquals(ENCODED_PASSWORD, savedUser.getPassword());
        assertEquals(EMAIL, savedUser.getEmail());
        assertEquals(FIRST_NAME, savedUser.getFirstName());
        assertEquals(LAST_NAME, savedUser.getLastName());
    }

    @Test
    public void registerUser_whenEmailExists_returnsBadRequest() {
        SignUpRequestDTO request = createSignUpRequest(EMAIL, PASSWORD);

        when(userRepository.existsByEmail(EMAIL))
            .thenReturn(true);

        ResponseEntity<?> response = authController.registerUser(request);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).existsByEmail(EMAIL);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals(EMAIL_EXISTS_MSG, body.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    // Tests for login

    @Test
    public void authenticateUser_whenEmailDoesNotExist_returnsUnauthorized() {
        LoginRequestDTO request = createLoginRequest(EMAIL, PASSWORD);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(null);

        ResponseEntity<?> response = authController.authenticateUser(request);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, body.getMessage());
    }

    @Test
    public void authenticateUser_whenEmailAndPasswordCorrect_authenticatesUser() {
        LoginRequestDTO request = createLoginRequest(EMAIL, PASSWORD);
        User existingUser = createUser(EMAIL, ENCODED_PASSWORD, FIRST_NAME, LAST_NAME);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(existingUser);
        when(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD))
            .thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(request);
        AuthResponseDTO body = (AuthResponseDTO) response.getBody();
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(USER_AUTHENTICATED_MSG, body.getMessage());
        assertEquals(JWT, body.getJwt());
    }

    @Test
    public void authenticateUser_whenEmailCorrectPasswordIncorrect_returnsUnauthorized() {
        LoginRequestDTO request = createLoginRequest(EMAIL, WRONG_PASSWORD);
        User existingUser = createUser(EMAIL, ENCODED_PASSWORD, FIRST_NAME, LAST_NAME);

        when(userRepository.findByEmail(EMAIL))
            .thenReturn(existingUser);
        when(passwordEncoder.matches(WRONG_PASSWORD, ENCODED_PASSWORD))
            .thenReturn(false);

        ResponseEntity<?> response = authController.authenticateUser(request);
        ErrorResponseDTO body = (ErrorResponseDTO) response.getBody();
        verify(userRepository).findByEmail(EMAIL);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals(INVALID_CREDENTIALS_MSG, body.getMessage());
    }

    // Tests for get/patch user
    @Test
    public void getUserByEmail_whenUserExists_returnsUser() {
        User user = createUser(EMAIL, PASSWORD, FIRST_NAME, LAST_NAME);

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
        User user = createUser(EMAIL, PASSWORD, FIRST_NAME, LAST_NAME);
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
        User user = createUser(EMAIL, PASSWORD, FIRST_NAME, LAST_NAME);
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
