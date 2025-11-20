package com.authservice.auth.service;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.authservice.auth.exception.InvalidTokenException;
import com.authservice.auth.model.User;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final JwtService jwtService;

    @Value("${FRONTEND_URL:http://localhost:3000}")
    private String frontendUrl;

    @Autowired
    public EmailService(JavaMailSender mailSender, JwtService jwtService) {
        this.mailSender = mailSender;
        this.jwtService = jwtService;
    }

    public void sendVerificationEmail(User user) {
        String token = jwtService.createEmailVerificationToken(user.getId());
        try {
            String url = frontendUrl + "/verify?token=" + URLEncoder.encode(token, "UTF-8");
            String name = user.getFirstName();
            String html = "<p>Hi " + name + ",</p>" 
                + "<p>Thanks for signing up!<p>"
                + "<p>To begin your fitness journey, please click the link below to verify your email address:</p>"
                + "<a href=\"" + url + "\">Verify email</a>"
                + "<br/>"
                + "<p>This link will expire in 24 hours.</p>";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "utf-8");
            helper.setTo(user.getEmail());
            helper.setSubject("MLA Fitness App - Verify your email");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (UnsupportedEncodingException | MessagingException e) {
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    public String extractUserIdFromVerificationToken(String token) {
        String userId;
        try {
            userId = jwtService.parseToken(token).getSubject();
        } catch (Exception e) {
            throw new InvalidTokenException("Invalid or expired token", e);
        }
        return userId;
    }

}
