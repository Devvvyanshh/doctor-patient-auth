package com.example.jwtapp.controller;

import com.example.jwtapp.dto.UserResponse;
import com.example.jwtapp.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RoleController {
    private final UserRepository users;

    public RoleController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/api/patient/profile")
    public Map<String, Object> patientProfile(Authentication authentication) {
        String email = authentication.getName();
        String name = users.findByEmail(email).map(user -> user.getName()).orElse(email);
        return Map.of(
                "message", "Patient profile opened successfully",
                "patient", name,
                "email", email,
                "nextAppointment", "2026-06-10 10:30"
        );
    }

    @GetMapping("/api/doctor/dashboard")
    public Map<String, Object> doctorDashboard(Authentication authentication) {
        String email = authentication.getName();
        String name = users.findByEmail(email).map(user -> user.getName()).orElse(email);
        return Map.of(
                "message", "Doctor dashboard opened successfully",
                "doctor", name,
                "todayAppointments", 8,
                "pendingReports", 3
        );
    }

    @GetMapping("/api/admin/users")
    public Map<String, Object> users() {
        return Map.of(
                "users",
                users.findAll().stream().map(UserResponse::new).toList()
        );
    }
}
