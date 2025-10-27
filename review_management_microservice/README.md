# Review Management Microservice

## Overview

This microservice handles the student-instructor review process, including:
- Submitting review requests
- Instructors replying to reviews
- Students acknowledging replies
- Viewing reviews and replies

## Technologies Used

- Node.js
- Express
- RabbitMQ (RPC for inter-service communication)
- CORS and body parsing middlewares

## API Endpoints

### Health Check

- `GET /`
  - Returns: `"Review microservice is running"`

###  Review Workflow

####  Student Endpoints

- `POST /reviews/request`
  - Submit a new review request.
  - **Body**:
    ```json
    {
      "studentId": "123",
      "instructorId": "456",
      "courseId": "CS101",
      "message": "Please review my project"
    }
    ```

- `POST /reviews/ack`
  - Acknowledge the instructor's reply.
  - **Body**:
    ```json
    {
      "reviewId": "789"
    }
    ```

- `GET /reviews/view?id=REVIEW_ID`
  - View a specific review.

- `GET /replies/view?reviewId=REVIEW_ID`
  - Get the reply for a specific review.

####  Instructor Endpoints

- `POST /reviews/reply`
  - Submit a reply to a student review.
  - **Body**:
    ```json
    {
      "reviewId": "789",
      "message": "I'll change your grade"
    }
    ```

- `GET /reviews/instructor?instructorId=456`
  - Get all review requests for a given instructor.

## RabbitMQ Integration

This service initializes a connection to RabbitMQ for RPC calls. The utility is defined in `rabbitmq/rpc.js`. Make sure RabbitMQ is running and reachable.

## Project Structure

```
review_management_microservice/
├── server.js
├── reviewController.js
├── rabbitmq/
│   └── rpc.js
```

