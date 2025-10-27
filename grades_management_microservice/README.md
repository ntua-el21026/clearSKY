# Grades Management Microservice

## Overview

This microservice manages uploading, validating, and retrieving student grades and grade statistics.

## Technologies Used

- Node.js
- Express
- Multer (for file uploads)
- RabbitMQ (for instructor lookup integration)
- CORS and body parsing middlewares


## API Endpoints

###  Health Check

- `GET /`
  - Returns: `"Grades microservice is running"`

---

###  Grade Operations

####  Instructor Endpoints

- `POST /grades/upload/initial`
  - Upload initial grades as an Excel file.
  - **Headers**: `x-user-id` required
  - **FormData**: `file` (Excel file)

- `POST /grades/upload/final`
  - Upload final grades as an Excel file.
  - **Headers**: `x-user-id` required
  - **FormData**: `file` (Excel file)

- `GET /grades/validateExcel`
  - Validate structure of an uploaded Excel file.
  - **FormData**: `file` (Excel file)

---

####  Student Endpoints

- `GET /grades/view`
  - View personal grades for the authenticated user.

- `GET /grades/available`
  - List available courses for grade access.

---

####  Statistcs

- `GET /grades/statistics`
  - Retrieve grade distribution for a specific course and exam period.

---

## RabbitMQ Integration

This microservice initializes a consumer to listen for instructor-related messages from RabbitMQ. Ensure RabbitMQ is accessible and running.

## Project Structure

```
grades_management_microservice/
├── server.js
├── gradesController.js
├── rabbitmq/
│   └── consumer.js
```
