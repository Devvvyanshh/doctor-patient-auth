# Doctor Patient JWT Role Based API

This is a Spring Boot application that demonstrates JWT authentication and role-based authorization for a hospital-style Doctor / Patient system.

## Features

- Register users with `ADMIN`, `DOCTOR`, or `PATIENT` roles
- Login and receive a signed JWT token
- Protect routes with `Authorization: Bearer <token>`
- Restrict endpoints by role
- Spring Security stateless JWT filter
- MySQL persistence for auth users, doctors, and patients
- Separate CRUD APIs for doctors and patients
- Doctor and patient CRUD creates matching login accounts with hashed passwords in `app_users`
- React frontend connected to the Spring Boot API

## Run Backend

Create a MySQL server/database first, or let the app create the schema when the user has permission:

```sql
CREATE DATABASE doctor_patient_jwt;
```

Set these database environment variables before running if your MySQL `root` user has a password:

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/doctor_patient_jwt?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_mysql_password"
```

```powershell
mvn spring-boot:run
```

The API starts at:

```text
http://localhost:8080
```

If Maven is not on your PATH, IntelliJ includes Maven here on this machine:

```powershell
& 'C:\Program Files\JetBrains\IntelliJ IDEA 2025.3.2\plugins\maven\lib\maven3\bin\mvn.cmd' spring-boot:run
```

## React Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The frontend uses `http://localhost:8080` as the API by default. To point it elsewhere:

```powershell
$env:VITE_API_BASE_URL="http://localhost:9090"
npm run dev
```

Required for any environment:

```powershell
$env:APP_JWT_SECRET="use-a-long-secret-value-at-least-32-characters"
```

The application will not start without `APP_JWT_SECRET`. Use a securely generated secret of at least 32 characters and keep it in an environment-specific secret manager; do not commit it to the repository.

Optional environment variables:

```powershell
$env:SERVER_PORT="9090"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_mysql_password"
```

## Seed Users

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@hospital.com` | `admin123` |
| DOCTOR | `doctor@hospital.com` | `doctor123` |
| PATIENT | `patient@hospital.com` | `patient123` |

## Endpoints

### Health

```powershell
Invoke-RestMethod http://localhost:8080/api/public/health
```

### Register

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/register `
  -ContentType "application/json" `
  -Body '{"name":"New Patient","email":"newpatient@example.com","password":"pass123","role":"PATIENT"}'
```

### Login

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"doctor@hospital.com","password":"doctor123"}'

$token = $login.token
```

### Doctor Route

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/doctor/dashboard `
  -Headers @{ Authorization = "Bearer $token" }
```

### Patient Route

Login as `patient@hospital.com` first, then call:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/patient/profile `
  -Headers @{ Authorization = "Bearer $token" }
```

### Admin Route

Login as `admin@hospital.com` first, then call:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/admin/users `
  -Headers @{ Authorization = "Bearer $token" }
```

### Doctor CRUD

Use a valid JWT token in the `Authorization` header.
Create requests require `password`; update requests may omit it to keep the existing login password.

```powershell
$doctor = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/doctors `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name":"Dr. Meera Shah","email":"meera@example.com","password":"doctorPass123","specialization":"Cardiology","phone":"9876543210"}'

Invoke-RestMethod `
  -Uri http://localhost:8080/api/doctors `
  -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Uri "http://localhost:8080/api/doctors/$($doctor.id)" `
  -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Method Put `
  -Uri "http://localhost:8080/api/doctors/$($doctor.id)" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name":"Dr. Meera Shah","email":"meera@example.com","specialization":"Neurology","phone":"9876543210"}'

Invoke-RestMethod `
  -Method Delete `
  -Uri "http://localhost:8080/api/doctors/$($doctor.id)" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Patient CRUD

Use a valid JWT token in the `Authorization` header.
Create requests require `password`; update requests may omit it to keep the existing login password.

```powershell
$patient = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/patients `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name":"Anita Rao","email":"anita@example.com","password":"patientPass123","phone":"9123456780","age":32,"address":"Pune","medicalHistory":"No known allergies"}'

Invoke-RestMethod `
  -Uri http://localhost:8080/api/patients `
  -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Uri "http://localhost:8080/api/patients/$($patient.id)" `
  -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Method Put `
  -Uri "http://localhost:8080/api/patients/$($patient.id)" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name":"Anita Rao","email":"anita@example.com","phone":"9123456780","age":33,"address":"Pune","medicalHistory":"Diabetes"}'

Invoke-RestMethod `
  -Method Delete `
  -Uri "http://localhost:8080/api/patients/$($patient.id)" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Project Structure

```text
src/main/java/com/example/jwtapp
  JwtRoleBasedApplication.java
  config/SecurityConfig.java
  controller/AuthController.java
  controller/DoctorController.java
  controller/PatientController.java
  controller/PublicController.java
  controller/RoleController.java
  dto/
  model/
  repository/
  security/
  service/
src/main/resources/application.properties
frontend/
```
