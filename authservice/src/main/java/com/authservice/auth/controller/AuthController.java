package com.authservice.auth.controller;

import com.authservice.auth.model.UpdateUserRequestDTO;
import com.authservice.auth.model.User;
import com.authservice.auth.model.UserResponseDTO;
import com.authservice.auth.model.AuthResponseDTO;
import com.authservice.auth.model.ErrorResponseDTO;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.JwtService;

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

        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            if (userRepository.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest().body("Email already in use");
            }
            user.setEmail(request.getEmail());
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
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        // Supports legacy registration with username, and new email registration
        // TODO: deprecate username registration

        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            // registration with email
            String email = user.getEmail();
            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email already registered - please log in"));
            }
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            userRepository.save(user);
            String jwt = jwtService.generateToken(email);
            AuthResponseDTO response = new AuthResponseDTO(jwt, "User registered successfully!");
            return ResponseEntity.ok(response);
        } else if (user.getUsername() != null && !user.getUsername().isEmpty()) {
            // legacy registration with username
            String username = user.getUsername();
            if (userRepository.existsByUsername(username)) {
                return ResponseEntity.badRequest().body(new ErrorResponseDTO("User already exists - please log in"));
            }
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            userRepository.save(user);
            String jwt = jwtService.generateToken(username);
            AuthResponseDTO response = new AuthResponseDTO(jwt, "User registered successfully!");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Username or email must be provided"));
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
