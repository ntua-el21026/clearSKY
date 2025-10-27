# NTUA ECE SAAS 2025 PROJECT

## TEAM (15)

# clearSKY User Management System

## Overview

This system is part of the NTUA ECE SAAS 2025 Project. It includes  user, grades, review management microservices an api gateway build with node.js using RabbitMQ, and a frontend built with React and Vite.

## Technologies

- **Backend**: Node.js, Express, MariaDB
- **Frontend**: React, Vite, Tailwind CSS
- **Authentication**: JWT, SHA-256 hashing
- **Containerization**: Docker, Docker Compose

## How to Run

1. **Install Docker & Docker Compose**
2. Run:
   ```bash
   docker-compose up --build
   ```
3. Frontend at `http://localhost:5173`

## Environment Variables

Set via Docker Compose:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `JWT_SECRET`

