package com.authservice.auth.controller;

import com.authservice.auth.model.User;
import com.authservice.auth.model.AuthResponseDTO;
import com.authservice.auth.model.ErrorResponseDTO;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.util.JwtService;
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

        User existingUser = null;
        String identifier = null;

        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            // login with email
            identifier = user.getEmail();
            existingUser = userRepository.findByEmail(identifier);
        } else if (user.getUsername() != null && !user.getUsername().isEmpty()) {
            // legacy login with username
            identifier = user.getUsername();
            existingUser = userRepository.findByUsername(identifier);
        } else {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Username or email must be provided"));
        }
        
        if (existingUser != null && passwordEncoder.matches(user.getPassword(), existingUser.getPassword())) {
            String jwt = jwtService.generateToken(identifier);
            AuthResponseDTO response = new AuthResponseDTO(jwt, "User authenticated");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body(new ErrorResponseDTO("Email or password is incorrect - please try again"));
        }
    }
}
