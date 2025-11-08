package com.authservice.auth.controller;

import com.authservice.auth.model.User;
import com.authservice.auth.dto.AuthResponseDTO;
import com.authservice.auth.dto.ErrorResponseDTO;
import com.authservice.auth.dto.LoginRequestDTO;
import com.authservice.auth.dto.SignUpRequestDTO;
import com.authservice.auth.dto.UpdateUserRequestDTO;
import com.authservice.auth.dto.UserResponseDTO;
import com.authservice.auth.repository.UserRepository;
import com.authservice.auth.service.JwtService;
import com.authservice.auth.util.ValidationUtils;

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
            String jwt = jwtService.generateToken(email);
            AuthResponseDTO response = new AuthResponseDTO(jwt, "User registered successfully!");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email must be provided"));
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
                String jwt = jwtService.generateToken(email);
                AuthResponseDTO response = new AuthResponseDTO(jwt, "User authenticated");
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(401).body(new ErrorResponseDTO("Email or password is incorrect - please try again"));
            }
        } else {
            return ResponseEntity.badRequest().body(new ErrorResponseDTO("Email must be provided")); 
        }
    }
}
