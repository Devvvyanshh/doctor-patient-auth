package com.example.jwtapp.service;

import com.example.jwtapp.model.Doctor;
import com.example.jwtapp.model.AppUser;
import com.example.jwtapp.model.Role;
import com.example.jwtapp.repository.DoctorRepository;
import com.example.jwtapp.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DoctorService {
    private final DoctorRepository doctors;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public DoctorService(DoctorRepository doctors, UserRepository users, PasswordEncoder passwordEncoder) {
        this.doctors = doctors;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Doctor> findAll() {
        return doctors.findAll();
    }

    public Doctor findById(Long id) {
        return doctors.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id " + id));
    }

    @Transactional
    public Doctor create(Doctor request) {
        validate(request);
        require(request.getPassword(), "password");
        String email = UserRepository.normalize(request.getEmail());
        if (doctors.existsByEmail(email)) {
            throw new IllegalArgumentException("Doctor email is already registered");
        }
        if (users.existsByEmail(email)) {
            throw new IllegalArgumentException("Login email is already registered");
        }
        users.save(new AppUser(
                request.getName().trim(),
                email,
                passwordEncoder.encode(request.getPassword()),
                Role.DOCTOR
        ));
        return doctors.save(new Doctor(
                request.getName().trim(),
                email,
                request.getSpecialization().trim(),
                trimToNull(request.getPhone())
        ));
    }

    @Transactional
    public Doctor update(Long id, Doctor request) {
        validate(request);
        Doctor doctor = findById(id);
        String previousEmail = doctor.getEmail();
        String email = UserRepository.normalize(request.getEmail());
        if (doctors.existsByEmailAndIdNot(email, id)) {
            throw new IllegalArgumentException("Doctor email is already registered");
        }
        users.findByEmail(email)
                .filter(user -> !previousEmail.equals(email) || !user.getEmail().equals(previousEmail))
                .ifPresent(user -> {
                    throw new IllegalArgumentException("Login email is already registered");
                });

        doctor.setName(request.getName().trim());
        doctor.setEmail(email);
        doctor.setSpecialization(request.getSpecialization().trim());
        doctor.setPhone(trimToNull(request.getPhone()));
        Doctor saved = doctors.save(doctor);

        AppUser user = users.findByEmailAndRole(previousEmail, Role.DOCTOR)
                .orElseGet(() -> new AppUser(request.getName().trim(), email, "", Role.DOCTOR));
        user.setName(request.getName().trim());
        user.setEmail(email);
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        } else if (user.getPassword().isBlank()) {
            throw new IllegalArgumentException("password is required when creating doctor login");
        }
        users.save(user);

        return saved;
    }

    @Transactional
    public void delete(Long id) {
        Doctor doctor = findById(id);
        doctors.delete(doctor);
        users.findByEmailAndRole(doctor.getEmail(), Role.DOCTOR).ifPresent(users::delete);
    }

    private void validate(Doctor doctor) {
        require(doctor.getName(), "name");
        require(doctor.getEmail(), "email");
        require(doctor.getSpecialization(), "specialization");
    }

    private void require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
