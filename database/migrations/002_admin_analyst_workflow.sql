-- Migration 002: Admin Approval Workflow, Analyst Activity Monitoring, and Audit Logs
-- Target: MySQL 8.0+

-- ---------------------------------------------------------------------
-- Table 1: users (Administrator and Analyst Accounts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    role ENUM('administrator', 'analyst') NOT NULL DEFAULT 'analyst',
    department VARCHAR(100) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email),
    INDEX idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table 2: course_requests (Approval Workflow Queue)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_requests (
    request_id VARCHAR(36) NOT NULL PRIMARY KEY,
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
    CONSTRAINT fk_course_requests_analyst FOREIGN KEY (analyst_id) REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_course_requests_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_course_requests_course FOREIGN KEY (published_course_id) REFERENCES courses (course_id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_requests_status (status),
    INDEX idx_requests_analyst (analyst_id),
    INDEX idx_requests_created (created_at),
    INDEX idx_requests_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table 3: audit_logs (Append-Only Secure Activity Stream)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id VARCHAR(36) NOT NULL PRIMARY KEY,
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
    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_action (action_type),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
