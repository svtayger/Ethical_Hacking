CREATE DATABASE IF NOT EXISTS myeduconnect;
USE myeduconnect;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- VULNERABILITY: Stored as MD5 or plaintext
    role ENUM('student', 'admin') DEFAULT 'student',
    full_name VARCHAR(255),
    email VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    user_id INT,
    content TEXT, -- VULNERABILITY: Stored raw for XSS
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed data
INSERT INTO users (username, password, role, full_name, email) VALUES 
('admin', '21232f297a57a5a743894a0e4a801fc3', 'admin', 'System Administrator', 'admin@myeduconnect.local'), -- password: admin
('student1', '5f4dcc3b5aa765d61d8327deb882cf99', 'student', 'John Doe', 'john@student.local'); -- password: password

INSERT INTO courses (title, description, price) VALUES 
('Introduction to Ethical Hacking', 'Learn the basics of penetration testing.', 49.99),
('Advanced SQL Injection', 'Master the art of breaking databases.', 99.99),
('Web Security Fundamentals', 'How to secure your applications (or not).', 29.99);
