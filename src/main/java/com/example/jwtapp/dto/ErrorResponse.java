package com.example.jwtapp.dto;

import java.time.Instant;

public class ErrorResponse {
    private final String error;
    private final Instant timestamp = Instant.now();

    public ErrorResponse(String error) {
        this.error = error;
    }

    public String getError() {
        return error;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
