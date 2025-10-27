CREATE DATABASE IF NOT EXISTS clearSKY_grades;
USE clearSKY_grades;

CREATE TABLE institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_code VARCHAR(20) UNIQUE,  -- Corresponds to ΑΜ
    institution_name VARCHAR(100),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_code VARCHAR(20) UNIQUE,  -- Corresponds to ΑΜ
    fullname VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    institution VARCHAR(50),  -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code)  -- FK to institutions
);





CREATE TABLE instructors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_code INT UNIQUE,  -- Corresponds to ΑΜ
    fullname VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    institution VARCHAR(50),  -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code)  -- FK to institutions
);

CREATE TABLE exam_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_name VARCHAR(100) UNIQUE,  -- e.g., '2023-1', '2023-2'
    start_date DATE,
    end_date DATE
);


CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE,
    course_name VARCHAR(100),
    instructor_id INT,  -- FK to instructors or users table
    exam_period VARCHAR(20),
    exam_period_id INT,
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code),  -- FK to institutions
    FOREIGN KEY (exam_period_id) REFERENCES exam_periods(id),  -- e.g., '2023-1'
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_code)
);



-- Upload events (history/versioning)
CREATE TABLE grade_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    instructor_id INT,
    exam_period VARCHAR(200), 
    exam_period_id INT, 
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (exam_period_id) REFERENCES exam_periods(id),
    filename VARCHAR(200), -- optional
    status ENUM('initial','final') DEFAULT 'initial',
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT, 
    number_of_grades INT, -- Number of grades uploaded
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_code),
    FOREIGN KEY (institution) REFERENCES institutions(institution_code)  -- FK to institutions
);

-- Initial grades per upload per student
CREATE TABLE initial_grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT,
    student_id VARCHAR(20),  -- FK to students
    student_name VARCHAR(200),
    student_email VARCHAR(100), 
    exam_period VARCHAR(200), -- e.g., '2023-1'
    exam_period_id INT,
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code),
    FOREIGN KEY (exam_period_id) REFERENCES exam_periods(id),
    grade TINYINT CHECK (grade BETWEEN 0 AND 10),
    FOREIGN KEY (upload_id) REFERENCES grade_uploads(id),
    FOREIGN KEY (student_id) REFERENCES students(student_code),
    UNIQUE (upload_id, student_id, exam_period_id)  -- Ensure one grade per student per upload per exam period
);


CREATE TABLE final_grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT,
    student_id VARCHAR(20),  -- FK to students
    student_name VARCHAR(200),
    student_email VARCHAR(100), 
    exam_period VARCHAR(200), -- e.g., '2023-1'
    exam_period_id INT,
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code),
    FOREIGN KEY (exam_period_id) REFERENCES exam_periods(id),
    grade TINYINT CHECK (grade BETWEEN 0 AND 10),
    FOREIGN KEY (upload_id) REFERENCES grade_uploads(id),
    FOREIGN KEY (student_id) REFERENCES students(student_code),
    UNIQUE (upload_id, student_id, exam_period_id)  -- Ensure one grade per student per upload per exam period
);


CREATE TABLE analytic_grades_initial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    initial_grade_id INT,  -- FK to initial_grades
    question_label VARCHAR(20),  -- e.g., 'Q1', 'Q2'
    grade TINYINT CHECK (grade BETWEEN 0 AND 10),
    FOREIGN KEY (initial_grade_id) REFERENCES initial_grades(id),
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code)
);

CREATE TABLE analytic_grades_final (
    id INT AUTO_INCREMENT PRIMARY KEY,
    final_grade_id INT,  -- FK to initial_grades
    question_label VARCHAR(20),  -- e.g., 'Q1', 'Q2'
    grade TINYINT CHECK (grade BETWEEN 0 AND 10),
    FOREIGN KEY (final_grade_id) REFERENCES final_grades(id),
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code)
);

CREATE TABLE grade_distribution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    exam_period VARCHAR(100),
    grade TINYINT CHECK (grade BETWEEN 0 AND 10),
    count INT DEFAULT 0,
    status ENUM('initial', 'final'),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code) 
);

CREATE TABLE analytic_grade_distribution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    exam_period VARCHAR(100),
    question_label VARCHAR(20),         -- Q01, Q02, ...
    grade TINYINT CHECK (grade BETWEEN 0 AND 10),
    count INT DEFAULT 0,
    status ENUM('initial', 'final'),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    institution VARCHAR(50), -- FK to institutions
    FOREIGN KEY (institution) REFERENCES institutions(institution_code)
);


