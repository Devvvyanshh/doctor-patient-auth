package com.example.jwtapp.service;

import com.example.jwtapp.model.AppUser;
import com.example.jwtapp.model.Patient;
import com.example.jwtapp.model.Role;
import com.example.jwtapp.repository.PatientRepository;
import com.example.jwtapp.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PatientService {
    private final PatientRepository patients;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public PatientService(PatientRepository patients, UserRepository users, PasswordEncoder passwordEncoder) {
        this.patients = patients;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Patient> findAll() {
        return patients.findAll();
    }

    public Patient findById(Long id) {
        return patients.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id " + id));
    }

    @Transactional
    public Patient create(Patient request) {
        validate(request);
        String email = UserRepository.normalize(request.getEmail());
        if (patients.existsByEmail(email)) {
            throw new IllegalArgumentException("Patient email is already registered");
        }
        users.findByEmail(email).ifPresentOrElse(
                user -> ensureCurrentPatientOwnsEmail(user, email),
                () -> {
                    require(request.getPassword(), "password");
                    users.save(new AppUser(
                            request.getName().trim(),
                            email,
                            passwordEncoder.encode(request.getPassword()),
                            Role.PATIENT
                    ));
                }
        );
        return patients.save(new Patient(
                request.getName().trim(),
                email,
                trimToNull(request.getPhone()),
                request.getAge(),
                trimToNull(request.getAddress()),
                trimToNull(request.getMedicalHistory())
        ));
    }

    @Transactional
    public Patient update(Long id, Patient request) {
        validate(request);
        Patient patient = findById(id);
        String previousEmail = patient.getEmail();
        String email = UserRepository.normalize(request.getEmail());
        if (patients.existsByEmailAndIdNot(email, id)) {
            throw new IllegalArgumentException("Patient email is already registered");
        }
        users.findByEmail(email)
                .filter(user -> !previousEmail.equals(email) || !user.getEmail().equals(previousEmail))
                .ifPresent(user -> {
                    throw new IllegalArgumentException("Login email is already registered");
                });

        patient.setName(request.getName().trim());
        patient.setEmail(email);
        patient.setPhone(trimToNull(request.getPhone()));
        patient.setAge(request.getAge());
        patient.setAddress(trimToNull(request.getAddress()));
        patient.setMedicalHistory(trimToNull(request.getMedicalHistory()));
        Patient saved = patients.save(patient);

        AppUser user = users.findByEmailAndRole(previousEmail, Role.PATIENT)
                .orElseGet(() -> new AppUser(request.getName().trim(), email, "", Role.PATIENT));
        user.setName(request.getName().trim());
        user.setEmail(email);
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        } else if (user.getPassword().isBlank()) {
            throw new IllegalArgumentException("password is required when creating patient login");
        }
        users.save(user);

        return saved;
    }

    @Transactional
    public void delete(Long id) {
        Patient patient = findById(id);
        patients.delete(patient);
        users.findByEmailAndRole(patient.getEmail(), Role.PATIENT).ifPresent(users::delete);
    }

    private void validate(Patient patient) {
        require(patient.getName(), "name");
        require(patient.getEmail(), "email");
        if (patient.getAge() != null && patient.getAge() < 0) {
            throw new IllegalArgumentException("age must be zero or greater");
        }
    }

    private void require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    private void ensureCurrentPatientOwnsEmail(AppUser user, String email) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = authentication == null ? null : UserRepository.normalize(authentication.getName());
        if (user.getRole() != Role.PATIENT || !email.equals(currentEmail)) {
            throw new IllegalArgumentException("Login email is already registered");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
