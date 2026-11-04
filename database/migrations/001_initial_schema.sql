-- Migration 001: Initial schema for E-Learning Course Analytics System
-- Target: MySQL 8.0+

CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(36) NOT NULL PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS learners (
    learner_id VARCHAR(36) NOT NULL PRIMARY KEY,
    roll_no VARCHAR(50) NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id VARCHAR(36) NOT NULL PRIMARY KEY,
    learner_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('enrolled', 'completed', 'withdrawn', 'cancelled') NOT NULL DEFAULT 'enrolled',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_enrollments_learner FOREIGN KEY (learner_id) REFERENCES learners (learner_id) ON DELETE RESTRICT,
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lessons (
    lesson_id VARCHAR(36) NOT NULL PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    lesson_name VARCHAR(255) NOT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activities (
    activity_id VARCHAR(36) NOT NULL PRIMARY KEY,
    enrollment_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36) NULL,
    activity_type ENUM('lesson_opened', 'lesson_started', 'lesson_completed', 'video_watched', 'resource_accessed') NOT NULL,
    activity_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (enrollment_id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (lesson_id) ON DELETE SET NULL
);
