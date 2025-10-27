CREATE DATABASE IF NOT EXISTS clearSKY_users;
USE clearSKY_users;

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    user_role ENUM('institution', 'student', 'instructor', 'admin') DEFAULT 'student',
    institution VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    student_id VARCHAR(50) UNIQUE
);

INSERT INTO users (username, password_hash, user_role, institution)
VALUES ('test-institution', SHA2('12345', 256), 'institution', "ECE NTUA");

DROP TABLE IF EXISTS `blacklisted_tokens`;


CREATE TABLE blacklisted_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token TEXT NOT NULL
);



