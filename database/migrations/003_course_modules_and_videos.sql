-- Migration 003: Course Modules and Educational Videos
-- Target: MySQL 8.0+
-- Adds structured learning modules and verified educational video assets per course

-- ---------------------------------------------------------------------
-- Table 1: course_modules (5 Structured Modules per Course)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_modules (
    module_id VARCHAR(36) NOT NULL PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_modules_course (course_id, sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Table 2: module_videos (Educational Videos per Module)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_videos (
    video_id VARCHAR(36) NOT NULL PRIMARY KEY,
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
    CONSTRAINT fk_videos_module FOREIGN KEY (module_id) REFERENCES course_modules (module_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_videos_course FOREIGN KEY (course_id) REFERENCES courses (course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_videos_module (module_id, sequence_no),
    INDEX idx_videos_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
