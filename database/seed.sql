-- =====================================================================
-- E-Learning Course Analytics System - Development Seed Data
-- =====================================================================

-- Clean existing data
DELETE FROM activities;
DELETE FROM lessons;
DELETE FROM enrollments;
DELETE FROM learners;
DELETE FROM courses;

-- 1. Courses
INSERT INTO courses (course_id, course_name, category, description, is_active, created_at) VALUES
('crs-101', 'Modern Full-Stack Web Development', 'Computer Science', 'Comprehensive React, Node.js, and TypeScript engineering course.', 1, '2026-08-01 09:00:00'),
('crs-102', 'Practical Data Science & Machine Learning', 'Data & AI', 'Exploratory data analysis, statistical modeling, and ML pipelines.', 1, '2026-08-05 10:30:00'),
('crs-103', 'Cloud Infrastructure & DevOps Mastery', 'Cloud Architecture', 'Docker, Kubernetes, CI/CD automation, and cloud deployments.', 1, '2026-08-10 11:15:00'),
('crs-104', 'Applied Cybersecurity & Threat Defense', 'Information Security', 'Network security, ethical hacking fundamentals, and incident response.', 1, '2026-08-15 14:00:00'),
('crs-105', 'Enterprise UI/UX Design Systems', 'Design & Product', 'Atomic design principles, accessibility standards, and design workflows.', 1, '2026-08-20 16:20:00'),
('crs-106', 'Special Topics Seminar (Elective Only)', 'General Studies', 'Course with optional elective modules and 0 required lessons to test edge cases.', 1, '2026-09-01 08:00:00'),
('crs-107', 'Upcoming Quantum Computing Primer', 'Advanced Science', 'Newly scheduled course with zero current enrolments.', 0, '2026-09-10 12:00:00');

-- 2. Lessons
-- Modern Full-Stack (4 lessons: 3 required, 1 optional)
INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at) VALUES
('les-101-1', 'crs-101', 'Architecture & TypeScript Fundamentals', 1, 1, '2026-08-01 09:30:00'),
('les-101-2', 'crs-101', 'React Component State & Custom Hooks', 2, 1, '2026-08-01 10:00:00'),
('les-101-3', 'crs-101', 'Building Express REST APIs & Auth', 3, 1, '2026-08-01 10:30:00'),
('les-101-4', 'crs-101', 'Bonus: Performance Profiling Workshop', 4, 0, '2026-08-01 11:00:00');

-- Practical Data Science (3 lessons: all required)
INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at) VALUES
('les-102-1', 'crs-102', 'Data Wrangling with Pandas & NumPy', 1, 1, '2026-08-05 11:00:00'),
('les-102-2', 'crs-102', 'Statistical Testing & Feature Engineering', 2, 1, '2026-08-05 11:30:00'),
('les-102-3', 'crs-102', 'Supervised Learning Classification Models', 3, 1, '2026-08-05 12:00:00');

-- Cloud DevOps (2 lessons: both required)
INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at) VALUES
('les-103-1', 'crs-103', 'Containerization with Docker & Multi-stage', 1, 1, '2026-08-10 12:00:00'),
('les-103-2', 'crs-103', 'Kubernetes Pods, Services & Deployments', 2, 1, '2026-08-10 13:00:00');

-- Cybersecurity (3 lessons: 2 required, 1 optional)
INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at) VALUES
('les-104-1', 'crs-104', 'Network Packet Analysis & WireShark', 1, 1, '2026-08-15 15:00:00'),
('les-104-2', 'crs-104', 'OWASP Top 10 Vulnerabilities & Mitigations', 2, 1, '2026-08-15 15:30:00'),
('les-104-3', 'crs-104', 'Elective Lab: CTF Challenge Lab', 3, 0, '2026-08-15 16:00:00');

-- Special Topics (Optional only - tests denominator handling)
INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at) VALUES
('les-106-1', 'crs-106', 'Optional Guest Lecture Discussion', 1, 0, '2026-09-01 08:30:00');

-- 3. Learners
INSERT INTO learners (learner_id, roll_no, display_name, created_at) VALUES
('lrn-001', 'CS2026-001', 'Amina Al-Mansoor', '2026-08-02 08:30:00'),
('lrn-002', 'CS2026-002', 'Marcus Vance', '2026-08-02 09:15:00'),
('lrn-003', 'CS2026-003', 'Elena Rostova', '2026-08-03 10:00:00'),
('lrn-004', 'CS2026-004', 'Devon Bailey', '2026-08-04 11:20:00'),
('lrn-005', 'CS2026-005', 'Priya Sundaram', '2026-08-05 13:45:00'),
('lrn-006', 'CS2026-006', 'Liam O Connor', '2026-08-06 14:10:00'),
('lrn-007', 'CS2026-007', 'Chloe Zhang', '2026-08-07 15:30:00'),
('lrn-008', 'CS2026-008', 'Tariq Hassan', '2026-08-08 16:00:00');

-- 4. Enrollments
INSERT INTO enrollments (enrollment_id, learner_id, course_id, status, enrolled_at) VALUES
('enr-001', 'lrn-001', 'crs-101', 'completed', '2026-08-05 10:00:00'),
('enr-002', 'lrn-002', 'crs-101', 'enrolled', '2026-08-06 11:00:00'),
('enr-003', 'lrn-003', 'crs-101', 'withdrawn', '2026-08-07 12:00:00'),
('enr-004', 'lrn-004', 'crs-101', 'completed', '2026-08-08 14:00:00'),
('enr-005', 'lrn-005', 'crs-102', 'completed', '2026-08-10 09:00:00'),
('enr-006', 'lrn-006', 'crs-102', 'enrolled', '2026-08-11 10:00:00'),
('enr-007', 'lrn-007', 'crs-102', 'enrolled', '2026-08-12 11:00:00'),
('enr-008', 'lrn-001', 'crs-103', 'enrolled', '2026-08-15 13:00:00'),
('enr-009', 'lrn-003', 'crs-103', 'completed', '2026-08-16 14:00:00'),
('enr-010', 'lrn-005', 'crs-104', 'enrolled', '2026-08-18 15:00:00'),
('enr-011', 'lrn-008', 'crs-104', 'cancelled', '2026-08-20 16:00:00'),
('enr-012', 'lrn-002', 'crs-106', 'enrolled', '2026-09-02 10:00:00');

-- 5. Activities (Realistic timestamp spread relative to current date ~Oct 2026)
-- enr-001: Completed crs-101 (completed required 1, 2, 3 + optional 4)
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-001', 'enr-001', 'les-101-1', 'lesson_opened', '2026-09-15 10:00:00', 0),
('act-002', 'enr-001', 'les-101-1', 'lesson_completed', '2026-09-15 11:30:00', 1),
('act-003', 'enr-001', 'les-101-1', 'lesson_completed', '2026-09-15 11:35:00', 1), -- Duplicate completion event (dedup check)
('act-004', 'enr-001', 'les-101-2', 'lesson_started', '2026-09-18 14:00:00', 0),
('act-005', 'enr-001', 'les-101-2', 'lesson_completed', '2026-09-18 16:00:00', 1),
('act-006', 'enr-001', 'les-101-3', 'lesson_completed', '2026-09-22 17:00:00', 1),
('act-007', 'enr-001', 'les-101-4', 'lesson_completed', '2026-09-23 18:00:00', 1);

-- enr-002: Enrolled in crs-101, completed 1 of 3 required lessons (progress ~33.3%)
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-008', 'enr-002', 'les-101-1', 'lesson_opened', '2026-10-14 09:00:00', 0),
('act-009', 'enr-002', 'les-101-1', 'lesson_completed', '2026-10-14 10:30:00', 1),
('act-010', 'enr-002', 'les-101-2', 'lesson_started', '2026-10-15 14:20:00', 0);

-- enr-004: Completed crs-101
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-011', 'enr-004', 'les-101-1', 'lesson_completed', '2026-09-10 12:00:00', 1),
('act-012', 'enr-004', 'les-101-2', 'lesson_completed', '2026-09-12 15:00:00', 1),
('act-013', 'enr-004', 'les-101-3', 'lesson_completed', '2026-09-14 16:30:00', 1);

-- enr-005: Completed crs-102
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-014', 'enr-005', 'les-102-1', 'lesson_completed', '2026-09-20 10:00:00', 1),
('act-015', 'enr-005', 'les-102-2', 'lesson_completed', '2026-09-25 11:00:00', 1),
('act-016', 'enr-005', 'les-102-3', 'lesson_completed', '2026-09-28 14:00:00', 1);

-- enr-006: Inactive on crs-102 (Last active Sep 18, >25 days ago)
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-017', 'enr-006', 'les-102-1', 'lesson_started', '2026-09-18 09:15:00', 0),
('act-018', 'enr-006', 'les-102-1', 'lesson_completed', '2026-09-18 10:45:00', 1);

-- enr-007: No activity records at all (testing empty activity history)

-- enr-008: Active on crs-103 (Active 2 days ago, Oct 15)
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-019', 'enr-008', 'les-103-1', 'lesson_opened', '2026-10-15 11:00:00', 0),
('act-020', 'enr-008', 'les-103-1', 'video_watched', '2026-10-15 11:30:00', 0),
('act-021', 'enr-008', 'les-103-1', 'lesson_completed', '2026-10-15 12:00:00', 1);

-- enr-009: Completed crs-103
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-022', 'enr-009', 'les-103-1', 'lesson_completed', '2026-09-28 15:00:00', 1),
('act-023', 'enr-009', 'les-103-2', 'lesson_completed', '2026-10-02 16:30:00', 1);

-- enr-010: Active on crs-104 (Oct 16 resource accessed)
INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed) VALUES
('act-024', 'enr-010', 'les-104-1', 'resource_accessed', '2026-10-16 14:00:00', 0);
