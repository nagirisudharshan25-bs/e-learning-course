# Database Design: E-Learning Course Analytics System

Target Database: **MySQL 8.0+**
Character Set: `utf8mb4`
Collation: `utf8mb4_unicode_ci`

## Relational Tables

### Table A: `courses`
Stores course definitions, categories, and active lifecycle status.
- `course_id` (VARCHAR(36), PRIMARY KEY): Unique course identifier.
- `course_name` (VARCHAR(255), NOT NULL): Name of the course.
- `category` (VARCHAR(100), NOT NULL): Academic or subject category.
- `description` (TEXT, NULL): Overview and syllabus details.
- `created_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP).
- `is_active` (BOOLEAN, NOT NULL DEFAULT TRUE): Whether the course is currently active.
- Indexes: `idx_courses_category`, `idx_courses_is_active`.

### Table B: `learners`
Stores learner master information. Collects only minimal data needed.
- `learner_id` (VARCHAR(36), PRIMARY KEY): Unique learner identifier.
- `roll_no` (VARCHAR(50), NULL, UNIQUE): Institutional student identification number.
- `display_name` (VARCHAR(150), NOT NULL): Learner name.
- `created_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP).
- Indexes: `idx_learners_roll_no`.

### Table C: `enrollments`
Tracks learner enrolments in courses.
- `enrollment_id` (VARCHAR(36), PRIMARY KEY): Unique enrolment identifier.
- `learner_id` (VARCHAR(36), NOT NULL, FOREIGN KEY -> `learners.learner_id`).
- `course_id` (VARCHAR(36), NOT NULL, FOREIGN KEY -> `courses.course_id`).
- `enrolled_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP).
- `status` (ENUM('enrolled', 'completed', 'withdrawn', 'cancelled'), NOT NULL DEFAULT 'enrolled').
- `updated_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP).
- Indexes: `idx_enrollments_learner_id`, `idx_enrollments_course_id`, `idx_enrollments_status`, `idx_enrollments_enrolled_at`.
- Constraint: Business logic prevents concurrent active ('enrolled') enrolments for the same (learner_id, course_id) pair.

### Table D: `lessons`
Curriculum breakdown into modular lessons with mandatory vs elective classification.
- `lesson_id` (VARCHAR(36), PRIMARY KEY): Unique lesson identifier.
- `course_id` (VARCHAR(36), NOT NULL, FOREIGN KEY -> `courses.course_id` ON DELETE CASCADE).
- `lesson_name` (VARCHAR(255), NOT NULL).
- `sequence_no` (INT, NOT NULL DEFAULT 1): Order within the course.
- `is_required` (BOOLEAN, NOT NULL DEFAULT TRUE): Distinguishes required lessons from elective/optional ones.
- `created_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP).
- Indexes: `idx_lessons_course_id`, `idx_lessons_sequence`.

### Table E: `activities`
Granular, immutable learning event logs.
- `activity_id` (VARCHAR(36), PRIMARY KEY): Unique activity event identifier.
- `enrollment_id` (VARCHAR(36), NOT NULL, FOREIGN KEY -> `enrollments.enrollment_id` ON DELETE CASCADE).
- `lesson_id` (VARCHAR(36), NULL, FOREIGN KEY -> `lessons.lesson_id` ON DELETE SET NULL).
- `activity_type` (ENUM('lesson_opened', 'lesson_started', 'lesson_completed', 'video_watched', 'resource_accessed'), NOT NULL).
- `activity_date` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP).
- `completed` (BOOLEAN, NOT NULL DEFAULT FALSE).
- `created_at` (DATETIME, NOT NULL DEFAULT CURRENT_TIMESTAMP).
- Indexes: `idx_activities_enrollment_id`, `idx_activities_lesson_id`, `idx_activities_activity_date`, `idx_activities_type`, `idx_activities_completed`.
