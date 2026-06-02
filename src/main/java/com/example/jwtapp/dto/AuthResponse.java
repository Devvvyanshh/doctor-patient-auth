package com.example.jwtapp.dto;

public class AuthResponse {
    private final String token;
    private final String tokenType;
    private final UserResponse user;

    public AuthResponse(String token, UserResponse user) {
        this.token = token;
        this.tokenType = "Bearer";
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public UserResponse getUser() {
        return user;
    }
}
