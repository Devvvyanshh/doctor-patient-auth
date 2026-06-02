package com.example.jwtapp.dto;

import com.example.jwtapp.model.AppUser;
import com.example.jwtapp.model.Role;

import java.time.Instant;

public class UserResponse {
    private final long id;
    private final String name;
    private final String email;
    private final Role role;
    private final Instant createdAt;

    public UserResponse(AppUser user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.createdAt = user.getCreatedAt();
    }

    public long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public Role getRole() {
        return role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
