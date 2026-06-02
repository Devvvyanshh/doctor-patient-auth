package com.example.jwtapp.service;

import com.example.jwtapp.dto.AuthResponse;
import com.example.jwtapp.dto.LoginRequest;
import com.example.jwtapp.dto.RegisterRequest;
import com.example.jwtapp.dto.UserResponse;
import com.example.jwtapp.model.AppUser;
import com.example.jwtapp.model.Role;
import com.example.jwtapp.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostConstruct
    void seedUsers() {
        seedUser("Admin", "admin@hospital.com", "admin123", Role.ADMIN);
        seedUser("Dr. Asha", "doctor@hospital.com", "doctor123", Role.DOCTOR);
        seedUser("Ravi Patient", "patient@hospital.com", "patient123", Role.PATIENT);
    }

    public AuthResponse register(RegisterRequest request) {
        require(request.getName(), "name");
        require(request.getEmail(), "email");
        require(request.getPassword(), "password");
        if (request.getRole() == null) {
            throw new IllegalArgumentException("role is required");
        }

        String email = UserRepository.normalize(request.getEmail());
        if (users.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        AppUser user = users.save(new AppUser(
                request.getName(),
                email,
                passwordEncoder.encode(request.getPassword()),
                request.getRole()
        ));
        return response(user);
    }

    public AuthResponse login(LoginRequest request) {
        require(request.getEmail(), "email");
        require(request.getPassword(), "password");
        AppUser user = users.findByEmail(UserRepository.normalize(request.getEmail()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return response(user);
    }

    private AuthResponse response(AppUser user) {
        return new AuthResponse(jwtService.generateToken(user), new UserResponse(user));
    }

    private void require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    private void seedUser(String name, String email, String password, Role role) {
        String normalizedEmail = UserRepository.normalize(email);
        if (!users.existsByEmail(normalizedEmail)) {
            users.save(new AppUser(name, normalizedEmail, passwordEncoder.encode(password), role));
        }
    }
}
