# API Gateway

## Overview

The API Gateway is a centralized entry point for routing and managing requests to various backend microservices, including authentication, grades, and review services. It includes:
- Role-based authorization using JWT tokens
- Reverse proxy routing via `http-proxy-middleware`
- Header enrichment for downstream services

## Technologies Used

- Node.js
- Express
- http-proxy-middleware
- jsonwebtoken
- dotenv



## API Endpoints & Proxy Routes

###  Auth Routes (User Management Service)

- `POST /auth/login` → Proxy to `/api/login`
- `POST /auth/register` → Institution-only, proxy to `/api/register`
- `POST /auth/changePassword` → Institution-only, proxy to `/api/changePassword`
- `POST /auth/logout` → Authenticated users, proxy to `/api/logout`

###  Grades Microservice (Instructor & Student)

- `POST /grades/upload/initial` → Instructor-only, with Excel file
- `POST /grades/upload/final` → Instructor-only, with Excel file
- `GET /grades/validateExcel` → Instructor-only, validate Excel structure
- `GET /grades/view` → View grades, role-sensitive headers forwarded
- `GET /grades/available` → Courses available for grading
- `GET /grades/statistics` → Statistics and grade analytics

###  Review Microservice

- `POST /reviews/request` → Student-only, send review request
- `POST /reviews/reply` → Instructor-only, reply to a review
- `POST /reviews/ack` → Student-only, acknowledge reply
- `GET /reviews/instructor` → Instructor-only, fetch requests
- `GET /reviews/view?id=REVIEW_ID` → Authenticated users, get review
- `GET /replies/view?reviewId=REVIEW_ID` → Authenticated users, get reply

## Security & Middleware

- JWT token expected in header: `X-OBSERVATORY-AUTH`
- Routes are protected based on user roles (e.g., student, instructor, institution)

## Project Structure

```
api-gateway/
├── index.js             # Main gateway logic
├── package.json
├── Dockerfile
└── .env
```
