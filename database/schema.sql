-- =====================================================================
-- E-Learning Course Analytics System - Database Schema (MySQL 8)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS elearning_analytics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE elearning_analytics;

-- ---------------------------------------------------------------------
-- Table A: courses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(36) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (course_id),
    INDEX idx_courses_category (category),
    INDEX idx_courses_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table B: learners
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learners (
    learner_id VARCHAR(36) NOT NULL,
    roll_no VARCHAR(50) NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (learner_id),
    INDEX idx_learners_roll_no (roll_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table C: enrollments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id VARCHAR(36) NOT NULL,
    learner_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('enrolled', 'completed', 'withdrawn', 'cancelled') NOT NULL DEFAULT 'enrolled',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (enrollment_id),
    CONSTRAINT fk_enrollments_learner FOREIGN KEY (learner_id) REFERENCES learners (learner_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_enrollments_learner_id (learner_id),
    INDEX idx_enrollments_course_id (course_id),
    INDEX idx_enrollments_status (status),
    INDEX idx_enrollments_enrolled_at (enrolled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table D: lessons
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
    lesson_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    lesson_name VARCHAR(255) NOT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lesson_id),
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_lessons_course_id (course_id),
    INDEX idx_lessons_sequence (course_id, sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table E: activities
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
    activity_id VARCHAR(36) NOT NULL,
    enrollment_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36) NULL,
    activity_type ENUM('lesson_opened', 'lesson_started', 'lesson_completed', 'video_watched', 'resource_accessed') NOT NULL,
    activity_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (activity_id),
    CONSTRAINT fk_activities_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (enrollment_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_activities_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (lesson_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_activities_enrollment_id (enrollment_id),
    INDEX idx_activities_lesson_id (lesson_id),
    INDEX idx_activities_activity_date (activity_date),
    INDEX idx_activities_type (activity_type),
    INDEX idx_activities_completed (completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table F: users (Administrators & Analysts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    role ENUM('administrator', 'analyst') NOT NULL DEFAULT 'analyst',
    department VARCHAR(100) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    INDEX idx_users_role (role),
    INDEX idx_users_email (email),
    INDEX idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table G: course_requests (Approval Workflow Queue)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_requests (
    request_id VARCHAR(36) NOT NULL,
    analyst_id VARCHAR(36) NOT NULL,
    analyst_name VARCHAR(150) NOT NULL,
    analyst_email VARCHAR(191) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    lessons_json JSON NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    reviewer_id VARCHAR(36) NULL,
    reviewer_name VARCHAR(150) NULL,
    review_notes TEXT NULL,
    rejection_reason TEXT NULL,
    published_course_id VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    PRIMARY KEY (request_id),
    CONSTRAINT fk_course_requests_analyst FOREIGN KEY (analyst_id) REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_course_requests_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_course_requests_course FOREIGN KEY (published_course_id) REFERENCES courses (course_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_requests_status (status),
    INDEX idx_requests_analyst (analyst_id),
    INDEX idx_requests_created (created_at),
    INDEX idx_requests_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table H: audit_logs (Append-Only Event Stream)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role ENUM('administrator', 'analyst', 'system') NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    related_request_id VARCHAR(36) NULL,
    outcome ENUM('SUCCESS', 'FAILURE', 'REJECTED') NOT NULL DEFAULT 'SUCCESS',
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_id),
    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_action (action_type),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table I: course_modules (5 Modules per Course)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_modules (
    module_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (module_id),
    CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_modules_course (course_id, sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table J: module_videos (Educational Videos per Module)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_videos (
    video_id VARCHAR(36) NOT NULL,
    module_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    youtube_video_id VARCHAR(32) NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    embed_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NULL,
    duration VARCHAR(20) NOT NULL DEFAULT '10:00',
    duration_seconds INT NOT NULL DEFAULT 600,
    channel_name VARCHAR(150) NULL,
    description TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id),
    CONSTRAINT fk_videos_module FOREIGN KEY (module_id) REFERENCES course_modules (module_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_videos_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_videos_module (module_id, sequence_no),
    INDEX idx_videos_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

