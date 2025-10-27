# MICROSERVICE

## User Management Microservice

## Overview

This microservice is responsible for managing user-related operations, including user registration, authentication, profile management, and role-based access control.

## Features

- User registration and account creation
- User authentication (login/logout)
- Password management (reset, change)
- User profile management
- Role-based access control (RBAC)
- API for user-related operations

## API Endpoints


- `POST /auth/register` - Register a new user
- `POST /auth/login` - Authenticate a user and return a token
- `POST /auth/logout` - Logout a user
- `POST /auth/changePassword` - Change the password of an existing user
