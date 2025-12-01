package com.authservice.auth.controller;

import com.authservice.auth.model.User;
import com.authservice.auth.dto.AuthResponseDTO;
import com.authservice.auth.dto.ErrorResponseDTO;
import com.authservice.auth.dto.LoginRequestDTO;
import com.authservice.auth.dto.PasswordResetDTO;
import com.authservice.auth.dto.SignUpRequestDTO;
import com.authservice.auth.dto.UpdateUserRequestDTO;
import com.authservice.auth.dto.UserResponseDTO;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.EmailService;
import com.authservice.auth.service.JwtService;
import com.authservice.auth.util.ValidationUtils;

import static java.time.Instant.now;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private EmailService emailService;

    @GetMapping("/user")
    public ResponseEntity<?> getUserByEmail(@RequestParam("email") String email) {
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        User user = userRepository.findByEmail(email);
        if (user != null) {
            UserResponseDTO userDto = new UserResponseDTO(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName());
            return ResponseEntity.ok(userDto);
        } else {
            return ResponseEntity.status(404).body("User not found");
        }
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<?> getUserById(@PathVariable("id") String id) {
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body("User ID is required");
        }
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            UserResponseDTO userDto = new UserResponseDTO(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName());
            return ResponseEntity.ok(userDto);
        } else {
            return ResponseEntity.status(404).body("User not found");
        }
    }

    @PatchMapping("/user/{id}")
    public ResponseEntity<?> updateUserDetails(@PathVariable("id") String id, @RequestBody UpdateUserRequestDTO request) {
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body("User ID is required");
        }
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }

        userRepository.save(user);
        return ResponseEntity.ok("User details updated successfully");
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequestDTO request) {
    try {
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            // Normalise and validate email
            String email = request.getEmail().trim().toLowerCase();
            ValidationUtils.validateEmailAddressConstraints(email);

            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email already registered - please log in"));
            }
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setFirstName(request.getFirstName());
            user.setLastName(request.getLastName());
            userRepository.save(user);
                        
            try {
                emailService.sendVerificationEmail(user);
                user.setVerificationEmailSentAt(now());
                userRepository.save(user);
            } catch (Exception e) {
            }
            
            AuthResponseDTO response = new AuthResponseDTO("User registered successfully! Please check your email to verify your account before logging in.");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email must be provided"));
        }
    } catch (Exception e) {
        return ResponseEntity.status(500).body(new ErrorResponseDTO("An error occurred during registration: " + e.getMessage()));
    }
}

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequestDTO request) {
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            // Normalise and validate email
            String email = request.getEmail().trim().toLowerCase();
            ValidationUtils.validateEmailAddressConstraints(email);

            User existingUser = userRepository.findByEmail(email);
            if (existingUser != null && passwordEncoder.matches(request.getPassword(), existingUser.getPassword())) {
                if (existingUser.isVerified()) {
                    String jwt = jwtService.createUserToken(email);
                    AuthResponseDTO response = new AuthResponseDTO(jwt, "User authenticated");
                    return ResponseEntity.ok(response);
                } else {
                    ErrorResponseDTO response = new ErrorResponseDTO("Email not verified");
                    return ResponseEntity.status(403).body(response);
                }
            } else {
                return ResponseEntity.status(401).body(new ErrorResponseDTO("Email or password is incorrect - please try again"));
            }
        } else {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email must be provided")); 
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        String userId = emailService.extractUserIdFromToken(token);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(new ErrorResponseDTO("User not found"));
        }

        if (!user.isVerified()) {
            user.setVerified(true);
            userRepository.save(user);
        }
    
        return ResponseEntity.ok("Email verified successfully");
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request) {
        String rawEmail = request.get("email");
        if (rawEmail == null || rawEmail.isEmpty()) {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email must be provided"));
        }

        String email = rawEmail.trim().toLowerCase();
        ValidationUtils.validateEmailAddressConstraints(email);

        User user = userRepository.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(404).body(new ErrorResponseDTO("User not found"));
        }

        if (user.isVerified()) {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email already verified"));
        }

        Instant lastRequest = user.getVerificationEmailSentAt();

        // Limit requests to once every minute
        if (lastRequest != null && lastRequest.isAfter(now().minusSeconds(60))) {
            long secondsRemaining = Duration.between(now(), lastRequest.plusSeconds(60)).getSeconds();
            return ResponseEntity.status(429).body(new ErrorResponseDTO(
                "Please wait before requesting another verification email (retry in: " 
                + secondsRemaining + " seconds)"
            ));
        }

        emailService.sendVerificationEmail(user);
        user.setVerificationEmailSentAt(now());
        userRepository.save(user);

        return ResponseEntity.ok("Verification email resent");
    }

    @PostMapping("/send-reset-email")
    public ResponseEntity<?> sendPasswordResetEmail(@RequestBody Map<String, String> request) {
        String rawEmail = request.get("email");
        if (rawEmail == null || rawEmail.isEmpty()) {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email must be provided"));
        }

        String email = rawEmail.trim().toLowerCase();
        ValidationUtils.validateEmailAddressConstraints(email);

        User user = userRepository.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(404).body(new ErrorResponseDTO("User not found"));
        }

        Instant lastRequest = user.getPasswordResetEmailSentAt();

        // Limit requests to once every minute
        if (lastRequest != null && lastRequest.isAfter(now().minusSeconds(60))) {
            long secondsRemaining = Duration.between(now(), lastRequest.plusSeconds(60)).getSeconds();
            return ResponseEntity.status(429).body(new ErrorResponseDTO(
                "Please wait before requesting another password reset (retry in: " 
                + secondsRemaining + " seconds)"
            ));
        }

        emailService.sendPasswordResetEmail(user);
        user.setPasswordResetEmailSentAt(now());
        userRepository.save(user);
        return ResponseEntity.ok("Password reset email sent");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody PasswordResetDTO request) {
        String token = request.getToken();
        String userId = emailService.extractUserIdFromToken(token);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(new ErrorResponseDTO("User not found"));
        }

        String newPassword = request.getNewPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok("Password changed successfully");
    }
} 

