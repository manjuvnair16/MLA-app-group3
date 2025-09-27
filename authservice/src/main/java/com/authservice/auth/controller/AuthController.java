package com.authservice.auth.controller;

import com.authservice.auth.model.User;
import com.authservice.auth.repository.UserRepository;
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

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        // Supports legacy registration with username, and new email registration
        // TODO: deprecate username registration

        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            // registration with email
            if (userRepository.existsByEmail(user.getEmail())) {
                return ResponseEntity.badRequest().body("Email already registered - please log in");
            }
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            userRepository.save(user);
            return ResponseEntity.ok("User registered successfully!");
        } else if (user.getUsername() != null && !user.getUsername().isEmpty()) {
            // legacy registration with username
            if (userRepository.existsByUsername(user.getUsername())) {
                return ResponseEntity.badRequest().body("User already exists - please log in");
            }
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            userRepository.save(user);
            return ResponseEntity.ok("User registered successfully!");
        } else {
            return ResponseEntity.badRequest().body("Username or email must be provided");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody User user) {
        // Supports login with either username or email
        // TODO: deprecate username login

        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            // login with email
            User existingUser = userRepository.findByEmail(user.getEmail());
            if (existingUser != null && passwordEncoder.matches(user.getPassword(), existingUser.getPassword())) {
                return ResponseEntity.ok("User authenticated");
            } else {
                return ResponseEntity.status(401).body("Invalid credentials");
            }
        } else if (user.getUsername() != null && !user.getUsername().isEmpty()) {
            // legacy login with username
            User existingUser = userRepository.findByUsername(user.getUsername());
            if (existingUser != null && passwordEncoder.matches(user.getPassword(), existingUser.getPassword())) {
                return ResponseEntity.ok("User authenticated");
            } else {
                return ResponseEntity.status(401).body("Invalid credentials");
            }
        } else {
            return ResponseEntity.badRequest().body("Username or email must be provided");
        }
    }
}
