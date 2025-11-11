package com.authservice.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.authservice.auth.model.User;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.JwtService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;



@WebMvcTest(AuthController.class)
public class AuthControllerValidationTests {
    
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JwtService jwtService;

    private final String signupUrl = "/api/auth/signup";
    private final String loginUrl = "/api/auth/login";

    private String createSignUpRequest(String email, String password, String firstName, String lastName) {
        return "{ \"email\": \"" + email 
            + "\", \"password\": \"" + password 
            + "\", \"firstName\": \"" + firstName 
            + "\", \"lastName\": \"" + lastName + "\" }";
    }

    private String createLoginRequest(String email, String password) {
        return "{ \"email\": \"" + email 
            + "\", \"password\": \"" + password + "\" }";
    }

    @Test
    public void signUp_invalidRequest_returnsBadRequest() throws Exception {
        char[] longName = new char[51];
        for (int i = 0; i < longName.length; i++) {
            longName[i] = 'a';
        }
        String name = new String(longName);
        String body = createSignUpRequest("invalid-email", "invalid", name, name);

        mockMvc.perform(post(signupUrl)
            .contentType(APPLICATION_JSON)
            .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$.message", containsString("Invalid email")))
            .andExpect(jsonPath("$.message", containsString("Password must contain")))
            .andExpect(jsonPath("$.message", containsString("Password must be between")))
            .andExpect(jsonPath("$.message", containsString("First name")))
            .andExpect(jsonPath("$.message", containsString("Last name")));
    }

    @Test
    public void signUp_validRequest_returnsOk() throws Exception {
        String body = createSignUpRequest("email@test.com", "ValidPassword#_+123", "Jane", "Doe");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(jwtService.generateToken(anyString())).thenReturn("jwt");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post(signupUrl)
            .contentType(APPLICATION_JSON)
            .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jwt").value("jwt"));
        
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    public void login_invalidRequest_returnsBadRequest() throws Exception {
        String body = createLoginRequest("invalid-email", "invalid");

        mockMvc.perform(post(loginUrl)
            .contentType(APPLICATION_JSON)
            .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
            .andExpect(jsonPath("$.message", containsString("Invalid email")))
            .andExpect(jsonPath("$.message", containsString("Password must be between")));
    }

    @Test
    public void login_validRequest_returnsOk() throws Exception {
        String body = createLoginRequest("email@test.com", "ValidPassword#_+123");
        User user = new User();
        user.setEmail("email@test.com");
        user.setPassword("encoded");

        when(userRepository.findByEmail("email@test.com")).thenReturn(user);
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtService.generateToken(anyString())).thenReturn("jwt");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post(loginUrl)
            .contentType(APPLICATION_JSON)
            .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jwt").value("jwt"))
            .andExpect(jsonPath("$.message").value("User authenticated"));
    }
}
