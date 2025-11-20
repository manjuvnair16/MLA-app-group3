package com.authservice.auth.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import javax.mail.Session;
import javax.mail.internet.MimeMessage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.authservice.auth.model.User;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.EmailService;
import com.authservice.auth.service.JwtService;

import io.jsonwebtoken.Claims;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("integration")
public class SignupLoginIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @MockBean
    private JwtService jwtService;

    @SpyBean
    private EmailService emailService;

    @MockBean
    private JavaMailSender mailSender;

    private final String EMAIL = "user@test.com";
    private final String FIRST_NAME = "Jane";
    private final String LAST_NAME = "Doe";
    private final String PASSWORD = "ValidPassword1!";
    private final String VERIFY_TOKEN = "email-token";
    private final String LOGIN_TOKEN = "login-token";

    @BeforeEach
    public void cleanUp() {
        userRepository.deleteAll();
        MimeMessage message = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(message);
    }
    
    @Test
    public void testSignupAndEmailVerification() throws Exception {
        // Stub tokens for email verification and login
        when(jwtService.createEmailVerificationToken(anyString())).thenReturn(VERIFY_TOKEN);
        when(jwtService.createUserToken(anyString())).thenReturn(LOGIN_TOKEN);

        // User signs up
        String signupRequest = "{ \"email\": \"" + EMAIL
            + "\", \"password\": \"" + PASSWORD
            + "\", \"firstName\": \"" + FIRST_NAME
            + "\", \"lastName\": \"" + LAST_NAME + "\" }";

        mockMvc.perform(post("/api/auth/signup")
            .contentType(MediaType.APPLICATION_JSON)
            .content(signupRequest))
            .andExpect(status().isOk());

        User user = userRepository.findByEmail(EMAIL);
        if (user == null) throw new AssertionError("User not persisted after signup");
        if (user.getId() == null) throw new AssertionError("User ID is null after signup");
        assertFalse(user.isVerified());

        // Verification email sent
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(emailService, times(1)).sendVerificationEmail(userCaptor.capture());
        User emailedUser = userCaptor.getValue();
        assertEquals(EMAIL, emailedUser.getEmail());

        // Email contains the verification link with token
        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(1)).send(mailCaptor.capture());
        MimeMessage sentMsg = mailCaptor.getValue();
        String content = sentMsg.getContent().toString();
        assertTrue(content.contains(VERIFY_TOKEN), "Email content does not include verification token");

        // User clicks link & is verified
        Claims claims = mock(Claims.class);
        when(jwtService.parseToken(VERIFY_TOKEN)).thenReturn(claims);
        when(claims.getSubject()).thenReturn(user.getId());

        mockMvc.perform(get("/api/auth/verify")
            .param("token", VERIFY_TOKEN))
            .andExpect(status().isOk());

        User verifiedUser = userRepository.findByEmail(EMAIL);
        assertTrue(verifiedUser.isVerified());

        // User can now log in
        String loginRequest = "{ \"email\": \"" + EMAIL
            + "\", \"password\": \"" + PASSWORD + "\" }";
        mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jwt").value(LOGIN_TOKEN));
    }

    @Test
    public void testLoginAndResendVerificationEmail() throws Exception {
        // Stub tokens for email verification and login
        when(jwtService.createEmailVerificationToken(anyString())).thenReturn(VERIFY_TOKEN);
        when(jwtService.createUserToken(anyString())).thenReturn(LOGIN_TOKEN);

        // Create unverified user
        User user = new User();
        user.setEmail(EMAIL);
        user.setFirstName(FIRST_NAME);
        user.setLastName(LAST_NAME);
        user.setPassword(passwordEncoder.encode(PASSWORD));
        user.setVerified(false);
        userRepository.save(user);

        // Attempt login - should fail due to unverified email
        String loginRequest = "{ \"email\": \"" + EMAIL
            + "\", \"password\": \"" + PASSWORD + "\" }";
        mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginRequest))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Email not verified"));

        // Resend verification email
        String resendRequest = "{ \"email\": \"" + EMAIL + "\" }";
        mockMvc.perform(post("/api/auth/resend-verification")
            .contentType(MediaType.APPLICATION_JSON)
            .content(resendRequest))
            .andExpect(status().isOk());

        // Verification email sent
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(emailService, times(1)).sendVerificationEmail(userCaptor.capture());
        User emailedUser = userCaptor.getValue();
        assertEquals(EMAIL, emailedUser.getEmail());

        // Email contains the verification link with token
        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(1)).send(mailCaptor.capture());
        MimeMessage sentMsg = mailCaptor.getValue();
        String content = sentMsg.getContent().toString();
        assertTrue(content.contains(VERIFY_TOKEN), "Email content does not include verification token");

        // User clicks link & is verified
        Claims claims = mock(Claims.class);
        when(jwtService.parseToken(VERIFY_TOKEN)).thenReturn(claims);
        when(claims.getSubject()).thenReturn(user.getId());

        mockMvc.perform(get("/api/auth/verify")
            .param("token", VERIFY_TOKEN))
            .andExpect(status().isOk());

        User verifiedUser = userRepository.findByEmail(EMAIL);
        assertTrue(verifiedUser.isVerified());

        // User can now log in
        mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jwt").value(LOGIN_TOKEN));
    }
}
