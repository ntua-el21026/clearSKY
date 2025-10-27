CREATE DATABASE IF NOT EXISTS clearSKY_reviews;
USE clearSKY_reviews;

CREATE TABLE review_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    institution VARCHAR(50) NOT NULL,
    instructor_id INT NOT NULL,
    course VARCHAR(255) NOT NULL,
    period VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'accepted', 'denied') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE review_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_request_id INT UNIQUE NOT NULL,
    status ENUM('accepted', 'denied') NOT NULL,
    message TEXT,
    attachment_path VARCHAR(255),
    ack BOOLEAN DEFAULT FALSE,
    replied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_request_id) REFERENCES review_requests(id) ON DELETE CASCADE
);
