package com.authservice.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import javax.mail.Session;
import javax.mail.internet.MimeMessage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import com.authservice.auth.exception.InvalidTokenException;
import com.authservice.auth.model.User;

import io.jsonwebtoken.Claims;

public class EmailServiceTests {
    private JavaMailSender mailSender;
    private JwtService jwtService;
    private EmailService emailService;
    private final String TOKEN = "test-token";

    private User createUser() {
        User user = new User();
        user.setId("testID");
        user.setEmail("user@test.com");
        user.setFirstName("Jane");
        return user;
    }

    @BeforeEach
    public void setUp() {
        mailSender = mock(JavaMailSender.class);
        jwtService = mock(JwtService.class);
        emailService = new EmailService(mailSender, jwtService);
    }

    @Test
    public void sendVerificationEmail_sendsEmail() {
        User user = createUser();

        when(jwtService.createEmailVerificationToken(user.getId())).thenReturn(TOKEN);

        MimeMessage message = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(message);

        emailService.sendVerificationEmail(user);

        verify(jwtService, times(1)).createEmailVerificationToken(user.getId());
        verify(mailSender, times(1)).send(message);
    }

    @Test
    public void sendVerificationEmail_sendsEmailWithCorrectContent() throws Exception {
        User user = createUser();

        when(jwtService.createEmailVerificationToken(user.getId())).thenReturn(TOKEN);

        MimeMessage message = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(message);

        emailService.sendVerificationEmail(user);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sentMessage = captor.getValue();
        String content = (String) sentMessage.getContent();
        
        assertEquals(user.getEmail(), sentMessage.getAllRecipients()[0].toString());
        assertEquals("MLA Fitness App - Verify your email", sentMessage.getSubject());
        assertTrue(content.contains("Hi " + user.getFirstName()));
        assertTrue(content.contains("verify?token=" + TOKEN));
    }

    @Test
    public void sendVerificationEmail_mailError_throwsRuntimeException() {
        User user = createUser();

        when(jwtService.createEmailVerificationToken(user.getId())).thenReturn(TOKEN);

        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("Mail server error"));

        assertThrows(RuntimeException.class, () -> emailService.sendVerificationEmail(user));
        verify(jwtService, times(1)).createEmailVerificationToken(user.getId());
        verify(mailSender, times(1)).createMimeMessage();
    }

    @Test
    public void extractUserIdFromVerificationToken_validToken_returnsCorrectUserId() {
        String userId = "testID";
        Claims jwt = mock(Claims.class);

        when(jwtService.parseToken(TOKEN)).thenReturn(jwt);
        when(jwt.getSubject()).thenReturn(userId);

        String extractedUserId = emailService.extractUserIdFromVerificationToken(TOKEN);

        assertEquals(userId, extractedUserId);
    }

    @Test
    public void extractUserIdFromVerificationToken_invalidToken_throwsInvalidTokenException() {
        String token = "invalid-token";

        when(jwtService.parseToken(token)).thenThrow(new RuntimeException("Token parsing error"));

        assertThrows(InvalidTokenException.class, () -> {
            emailService.extractUserIdFromVerificationToken(token);
        });
    }
}
