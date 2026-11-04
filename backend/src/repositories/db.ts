import { DatabaseSync } from 'node:sqlite';
import type { Course, Learner, Enrollment, Lesson, Activity, CourseModule, ModuleVideo } from '../types/index.ts';
import { initialCourseModules, initialModuleVideos } from './modulesData.ts';
import { 
  sanitizeSearchQuery, 
  searchCourses as memorySearchCourses, 
  searchLearners as memorySearchLearners, 
  searchEnrollments as memorySearchEnrollments, 
  searchActivities as memorySearchActivities,
  performGlobalSearch as memoryGlobalSearch
} from '../services/searchService.ts';
import type { SearchResultItem, GlobalSearchResponse } from '../services/searchService.ts';

/**
 * In-memory & SQLite-backed Relational Store with Parameterized Query Support.
 * Guarantees persistence within the Node runtime, supports parameterized SQL queries,
 * and maintains full relational integrity mirroring the MySQL 8 schema.
 */
export class RelationalStore {
  courses: Map<string, Course> = new Map();
  learners: Map<string, Learner> = new Map();
  enrollments: Map<string, Enrollment> = new Map();
  lessons: Map<string, Lesson> = new Map();
  activities: Map<string, Activity> = new Map();
  modules: Map<string, CourseModule> = new Map();
  videos: Map<string, ModuleVideo> = new Map();

  sqliteDb: DatabaseSync;

  constructor() {
    this.sqliteDb = new DatabaseSync(':memory:');
    this.initSqliteSchema();
    this.seed();
  }

  private initSqliteSchema() {
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id TEXT PRIMARY KEY,
        course_name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS learners (
        learner_id TEXT PRIMARY KEY,
        roll_no TEXT UNIQUE,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lessons (
        lesson_id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        lesson_name TEXT NOT NULL,
        sequence_no INTEGER NOT NULL DEFAULT 1,
        is_required INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        enrollment_id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'enrolled',
        enrolled_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (learner_id) REFERENCES learners(learner_id),
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        activity_id TEXT PRIMARY KEY,
        enrollment_id TEXT NOT NULL,
        lesson_id TEXT,
        activity_type TEXT NOT NULL,
        activity_date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
      );

      CREATE TABLE IF NOT EXISTS course_modules (
        module_id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        module_name TEXT NOT NULL,
        description TEXT,
        sequence_no INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
      );

      CREATE TABLE IF NOT EXISTS module_videos (
        video_id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        youtube_video_id TEXT NOT NULL,
        youtube_url TEXT NOT NULL,
        embed_url TEXT NOT NULL,
        thumbnail_url TEXT,
        duration TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        channel_name TEXT,
        description TEXT,
        sequence_no INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (module_id) REFERENCES course_modules(module_id),
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
      );

      CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
      CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(course_name);
      CREATE INDEX IF NOT EXISTS idx_learners_roll ON learners(roll_no);
      CREATE INDEX IF NOT EXISTS idx_learners_name ON learners(display_name);
      CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
      CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_activities_enr ON activities(enrollment_id);
      CREATE INDEX IF NOT EXISTS idx_modules_course ON course_modules(course_id);
      CREATE INDEX IF NOT EXISTS idx_videos_module ON module_videos(module_id);
      CREATE INDEX IF NOT EXISTS idx_videos_course ON module_videos(course_id);
    `);
  }

  seed() {
    this.courses.clear();
    this.learners.clear();
    this.enrollments.clear();
    this.lessons.clear();
    this.activities.clear();
    this.modules.clear();
    this.videos.clear();

    // Clean SQLite tables
    this.sqliteDb.exec(`
      DELETE FROM module_videos;
      DELETE FROM course_modules;
      DELETE FROM activities;
      DELETE FROM enrollments;
      DELETE FROM lessons;
      DELETE FROM learners;
      DELETE FROM courses;
    `);

    // 1. Courses
    const initialCourses: Course[] = [
      {
        course_id: 'crs-101',
        course_name: 'Modern Full-Stack Web Development',
        category: 'Computer Science',
        description: 'Comprehensive React, Node.js, and TypeScript engineering course.',
        created_at: '2026-08-01 09:00:00',
        updated_at: '2026-08-01 09:00:00',
        is_active: true,
      },
      {
        course_id: 'crs-102',
        course_name: 'Practical Data Science & Machine Learning',
        category: 'Data & AI',
        description: 'Exploratory data analysis, statistical modeling, and ML pipelines.',
        created_at: '2026-08-05 10:30:00',
        updated_at: '2026-08-05 10:30:00',
        is_active: true,
      },
      {
        course_id: 'crs-103',
        course_name: 'Cloud Infrastructure & DevOps Mastery',
        category: 'Cloud Architecture',
        description: 'Docker, Kubernetes, CI/CD automation, and cloud deployments.',
        created_at: '2026-08-10 11:15:00',
        updated_at: '2026-08-10 11:15:00',
        is_active: true,
      },
      {
        course_id: 'crs-104',
        course_name: 'Applied Cybersecurity & Threat Defense',
        category: 'Information Security',
        description: 'Network security, ethical hacking fundamentals, and incident response.',
        created_at: '2026-08-15 14:00:00',
        updated_at: '2026-08-15 14:00:00',
        is_active: true,
      },
      {
        course_id: 'crs-105',
        course_name: 'Enterprise UI/UX Design Systems',
        category: 'Design & Product',
        description: 'Atomic design principles, accessibility standards, and design workflows.',
        created_at: '2026-08-20 16:20:00',
        updated_at: '2026-08-20 16:20:00',
        is_active: true,
      },
      {
        course_id: 'crs-106',
        course_name: 'Special Topics Seminar (Elective Only)',
        category: 'General Studies',
        description: 'Course with optional elective modules and 0 required lessons to test edge cases.',
        created_at: '2026-09-01 08:00:00',
        updated_at: '2026-09-01 08:00:00',
        is_active: true,
      },
      {
        course_id: 'crs-107',
        course_name: 'Upcoming Quantum Computing Primer',
        category: 'Advanced Science',
        description: 'Newly scheduled course with zero current enrolments.',
        created_at: '2026-09-10 12:00:00',
        updated_at: '2026-09-10 12:00:00',
        is_active: false,
      },
    ];

    const insertCourse = this.sqliteDb.prepare(`
      INSERT INTO courses (course_id, course_name, category, description, created_at, updated_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    initialCourses.forEach((c) => {
      this.courses.set(c.course_id, c);
      insertCourse.run(c.course_id, c.course_name, c.category, c.description || null, c.created_at, c.updated_at, c.is_active ? 1 : 0);
    });

    // 2. Lessons
    const initialLessons: Lesson[] = [
      { lesson_id: 'les-101-1', course_id: 'crs-101', lesson_name: 'Architecture & TypeScript Fundamentals', sequence_no: 1, is_required: true, created_at: '2026-08-01 09:30:00' },
      { lesson_id: 'les-101-2', course_id: 'crs-101', lesson_name: 'React Component State & Custom Hooks', sequence_no: 2, is_required: true, created_at: '2026-08-01 10:00:00' },
      { lesson_id: 'les-101-3', course_id: 'crs-101', lesson_name: 'Building Express REST APIs & Auth', sequence_no: 3, is_required: true, created_at: '2026-08-01 10:30:00' },
      { lesson_id: 'les-101-4', course_id: 'crs-101', lesson_name: 'Bonus: Performance Profiling Workshop', sequence_no: 4, is_required: false, created_at: '2026-08-01 11:00:00' },
      
      { lesson_id: 'les-102-1', course_id: 'crs-102', lesson_name: 'Data Wrangling with Pandas & NumPy', sequence_no: 1, is_required: true, created_at: '2026-08-05 11:00:00' },
      { lesson_id: 'les-102-2', course_id: 'crs-102', lesson_name: 'Statistical Testing & Feature Engineering', sequence_no: 2, is_required: true, created_at: '2026-08-05 11:30:00' },
      { lesson_id: 'les-102-3', course_id: 'crs-102', lesson_name: 'Supervised Learning Classification Models', sequence_no: 3, is_required: true, created_at: '2026-08-05 12:00:00' },
      
      { lesson_id: 'les-103-1', course_id: 'crs-103', lesson_name: 'Containerization with Docker & Multi-stage', sequence_no: 1, is_required: true, created_at: '2026-08-10 12:00:00' },
      { lesson_id: 'les-103-2', course_id: 'crs-103', lesson_name: 'Kubernetes Pods, Services & Deployments', sequence_no: 2, is_required: true, created_at: '2026-08-10 13:00:00' },

      { lesson_id: 'les-104-1', course_id: 'crs-104', lesson_name: 'Network Packet Analysis & WireShark', sequence_no: 1, is_required: true, created_at: '2026-08-15 15:00:00' },
      { lesson_id: 'les-104-2', course_id: 'crs-104', lesson_name: 'OWASP Top 10 Vulnerabilities & Mitigations', sequence_no: 2, is_required: true, created_at: '2026-08-15 15:30:00' },
      { lesson_id: 'les-104-3', course_id: 'crs-104', lesson_name: 'Elective Lab: CTF Challenge Lab', sequence_no: 3, is_required: false, created_at: '2026-08-15 16:00:00' },

      { lesson_id: 'les-106-1', course_id: 'crs-106', lesson_name: 'Optional Guest Lecture Discussion', sequence_no: 1, is_required: false, created_at: '2026-09-01 08:30:00' },
    ];

    const insertLesson = this.sqliteDb.prepare(`
      INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    initialLessons.forEach((l) => {
      this.lessons.set(l.lesson_id, l);
      insertLesson.run(l.lesson_id, l.course_id, l.lesson_name, l.sequence_no, l.is_required ? 1 : 0, l.created_at);
    });

    // 3. Learners
    const initialLearners: Learner[] = [
      { learner_id: 'lrn-001', roll_no: 'CS2026-001', display_name: 'Amina Al-Mansoor', created_at: '2026-08-02 08:30:00', updated_at: '2026-08-02 08:30:00' },
      { learner_id: 'lrn-002', roll_no: 'CS2026-002', display_name: 'Marcus Vance', created_at: '2026-08-02 09:15:00', updated_at: '2026-08-02 09:15:00' },
      { learner_id: 'lrn-003', roll_no: 'CS2026-003', display_name: 'Elena Rostova', created_at: '2026-08-03 10:00:00', updated_at: '2026-08-03 10:00:00' },
      { learner_id: 'lrn-004', roll_no: 'CS2026-004', display_name: 'Devon Bailey', created_at: '2026-08-04 11:20:00', updated_at: '2026-08-04 11:20:00' },
      { learner_id: 'lrn-005', roll_no: 'CS2026-005', display_name: 'Priya Sundaram', created_at: '2026-08-05 13:45:00', updated_at: '2026-08-05 13:45:00' },
      { learner_id: 'lrn-006', roll_no: 'CS2026-006', display_name: 'Liam O Connor', created_at: '2026-08-06 14:10:00', updated_at: '2026-08-06 14:10:00' },
      { learner_id: 'lrn-007', roll_no: 'CS2026-007', display_name: 'Chloe Zhang', created_at: '2026-08-07 15:30:00', updated_at: '2026-08-07 15:30:00' },
      { learner_id: 'lrn-008', roll_no: 'CS2026-008', display_name: 'Tariq Hassan', created_at: '2026-08-08 16:00:00', updated_at: '2026-08-08 16:00:00' },
    ];

    const insertLearner = this.sqliteDb.prepare(`
      INSERT INTO learners (learner_id, roll_no, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    initialLearners.forEach((l) => {
      this.learners.set(l.learner_id, l);
      insertLearner.run(l.learner_id, l.roll_no || null, l.display_name, l.created_at, l.updated_at);
    });

    // 4. Enrollments
    const initialEnrollments: Enrollment[] = [
      { enrollment_id: 'enr-001', learner_id: 'lrn-001', course_id: 'crs-101', status: 'completed', enrolled_at: '2026-08-05 10:00:00', updated_at: '2026-09-23 18:00:00' },
      { enrollment_id: 'enr-002', learner_id: 'lrn-002', course_id: 'crs-101', status: 'enrolled', enrolled_at: '2026-08-06 11:00:00', updated_at: '2026-08-06 11:00:00' },
      { enrollment_id: 'enr-003', learner_id: 'lrn-003', course_id: 'crs-101', status: 'withdrawn', enrolled_at: '2026-08-07 12:00:00', updated_at: '2026-08-14 12:00:00' },
      { enrollment_id: 'enr-004', learner_id: 'lrn-004', course_id: 'crs-101', status: 'completed', enrolled_at: '2026-08-08 14:00:00', updated_at: '2026-09-14 16:30:00' },
      { enrollment_id: 'enr-005', learner_id: 'lrn-005', course_id: 'crs-102', status: 'completed', enrolled_at: '2026-08-10 09:00:00', updated_at: '2026-09-28 14:00:00' },
      { enrollment_id: 'enr-006', learner_id: 'lrn-006', course_id: 'crs-102', status: 'enrolled', enrolled_at: '2026-08-11 10:00:00', updated_at: '2026-08-11 10:00:00' },
      { enrollment_id: 'enr-007', learner_id: 'lrn-007', course_id: 'crs-102', status: 'enrolled', enrolled_at: '2026-08-12 11:00:00', updated_at: '2026-08-12 11:00:00' },
      { enrollment_id: 'enr-008', learner_id: 'lrn-001', course_id: 'crs-103', status: 'enrolled', enrolled_at: '2026-08-15 13:00:00', updated_at: '2026-08-15 13:00:00' },
      { enrollment_id: 'enr-009', learner_id: 'lrn-003', course_id: 'crs-103', status: 'completed', enrolled_at: '2026-08-16 14:00:00', updated_at: '2026-10-02 16:30:00' },
      { enrollment_id: 'enr-010', learner_id: 'lrn-005', course_id: 'crs-104', status: 'enrolled', enrolled_at: '2026-08-18 15:00:00', updated_at: '2026-08-18 15:00:00' },
      { enrollment_id: 'enr-011', learner_id: 'lrn-008', course_id: 'crs-104', status: 'cancelled', enrolled_at: '2026-08-20 16:00:00', updated_at: '2026-08-25 16:00:00' },
      { enrollment_id: 'enr-012', learner_id: 'lrn-002', course_id: 'crs-106', status: 'enrolled', enrolled_at: '2026-09-02 10:00:00', updated_at: '2026-09-02 10:00:00' },
    ];

    const insertEnrollment = this.sqliteDb.prepare(`
      INSERT INTO enrollments (enrollment_id, learner_id, course_id, status, enrolled_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    initialEnrollments.forEach((e) => {
      this.enrollments.set(e.enrollment_id, e);
      insertEnrollment.run(e.enrollment_id, e.learner_id, e.course_id, e.status, e.enrolled_at, e.updated_at);
    });

    // 5. Activities
    const initialActivities: Activity[] = [
      { activity_id: 'act-001', enrollment_id: 'enr-001', lesson_id: 'les-101-1', activity_type: 'lesson_opened', activity_date: '2026-09-15 10:00:00', completed: false, created_at: '2026-09-15 10:00:00' },
      { activity_id: 'act-002', enrollment_id: 'enr-001', lesson_id: 'les-101-1', activity_type: 'lesson_completed', activity_date: '2026-09-15 11:30:00', completed: true, created_at: '2026-09-15 11:30:00' },
      { activity_id: 'act-003', enrollment_id: 'enr-001', lesson_id: 'les-101-1', activity_type: 'lesson_completed', activity_date: '2026-09-15 11:35:00', completed: true, created_at: '2026-09-15 11:35:00' }, // duplicate to test dedup
      { activity_id: 'act-004', enrollment_id: 'enr-001', lesson_id: 'les-101-2', activity_type: 'lesson_started', activity_date: '2026-09-18 14:00:00', completed: false, created_at: '2026-09-18 14:00:00' },
      { activity_id: 'act-005', enrollment_id: 'enr-001', lesson_id: 'les-101-2', activity_type: 'lesson_completed', activity_date: '2026-09-18 16:00:00', completed: true, created_at: '2026-09-18 16:00:00' },
      { activity_id: 'act-006', enrollment_id: 'enr-001', lesson_id: 'les-101-3', activity_type: 'lesson_completed', activity_date: '2026-09-22 17:00:00', completed: true, created_at: '2026-09-22 17:00:00' },
      { activity_id: 'act-007', enrollment_id: 'enr-001', lesson_id: 'les-101-4', activity_type: 'lesson_completed', activity_date: '2026-09-23 18:00:00', completed: true, created_at: '2026-09-23 18:00:00' },

      { activity_id: 'act-008', enrollment_id: 'enr-002', lesson_id: 'les-101-1', activity_type: 'lesson_opened', activity_date: '2026-10-14 09:00:00', completed: false, created_at: '2026-10-14 09:00:00' },
      { activity_id: 'act-009', enrollment_id: 'enr-002', lesson_id: 'les-101-1', activity_type: 'lesson_completed', activity_date: '2026-10-14 10:30:00', completed: true, created_at: '2026-10-14 10:30:00' },
      { activity_id: 'act-010', enrollment_id: 'enr-002', lesson_id: 'les-101-2', activity_type: 'lesson_started', activity_date: '2026-10-15 14:20:00', completed: false, created_at: '2026-10-15 14:20:00' },

      { activity_id: 'act-011', enrollment_id: 'enr-004', lesson_id: 'les-101-1', activity_type: 'lesson_completed', activity_date: '2026-09-10 12:00:00', completed: true, created_at: '2026-09-10 12:00:00' },
      { activity_id: 'act-012', enrollment_id: 'enr-004', lesson_id: 'les-101-2', activity_type: 'lesson_completed', activity_date: '2026-09-12 15:00:00', completed: true, created_at: '2026-09-12 15:00:00' },
      { activity_id: 'act-013', enrollment_id: 'enr-004', lesson_id: 'les-101-3', activity_type: 'lesson_completed', activity_date: '2026-09-14 16:30:00', completed: true, created_at: '2026-09-14 16:30:00' },

      { activity_id: 'act-014', enrollment_id: 'enr-005', lesson_id: 'les-102-1', activity_type: 'lesson_completed', activity_date: '2026-09-20 10:00:00', completed: true, created_at: '2026-09-20 10:00:00' },
      { activity_id: 'act-015', enrollment_id: 'enr-005', lesson_id: 'les-102-2', activity_type: 'lesson_completed', activity_date: '2026-09-25 11:00:00', completed: true, created_at: '2026-09-25 11:00:00' },
      { activity_id: 'act-016', enrollment_id: 'enr-005', lesson_id: 'les-102-3', activity_type: 'lesson_completed', activity_date: '2026-09-28 14:00:00', completed: true, created_at: '2026-09-28 14:00:00' },

      { activity_id: 'act-017', enrollment_id: 'enr-006', lesson_id: 'les-102-1', activity_type: 'lesson_started', activity_date: '2026-09-18 09:15:00', completed: false, created_at: '2026-09-18 09:15:00' },
      { activity_id: 'act-018', enrollment_id: 'enr-006', lesson_id: 'les-102-1', activity_type: 'lesson_completed', activity_date: '2026-09-18 10:45:00', completed: true, created_at: '2026-09-18 10:45:00' },

      { activity_id: 'act-019', enrollment_id: 'enr-008', lesson_id: 'les-103-1', activity_type: 'lesson_opened', activity_date: '2026-10-15 11:00:00', completed: false, created_at: '2026-10-15 11:00:00' },
      { activity_id: 'act-020', enrollment_id: 'enr-008', lesson_id: 'les-103-1', activity_type: 'video_watched', activity_date: '2026-10-15 11:30:00', completed: false, created_at: '2026-10-15 11:30:00' },
      { activity_id: 'act-021', enrollment_id: 'enr-008', lesson_id: 'les-103-1', activity_type: 'lesson_completed', activity_date: '2026-10-15 12:00:00', completed: true, created_at: '2026-10-15 12:00:00' },

      { activity_id: 'act-022', enrollment_id: 'enr-009', lesson_id: 'les-103-1', activity_type: 'lesson_completed', activity_date: '2026-09-28 15:00:00', completed: true, created_at: '2026-09-28 15:00:00' },
      { activity_id: 'act-023', enrollment_id: 'enr-009', lesson_id: 'les-103-2', activity_type: 'lesson_completed', activity_date: '2026-10-02 16:30:00', completed: true, created_at: '2026-10-02 16:30:00' },

      { activity_id: 'act-024', enrollment_id: 'enr-010', lesson_id: 'les-104-1', activity_type: 'resource_accessed', activity_date: '2026-10-16 14:00:00', completed: false, created_at: '2026-10-16 14:00:00' },
    ];

    const insertActivity = this.sqliteDb.prepare(`
      INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    initialActivities.forEach((a) => {
      this.activities.set(a.activity_id, a);
      insertActivity.run(a.activity_id, a.enrollment_id, a.lesson_id || null, a.activity_type, a.activity_date, a.completed ? 1 : 0, a.created_at);
    });

    // 6. Course Modules (5 per course)
    const insertModule = this.sqliteDb.prepare(`
      INSERT INTO course_modules (module_id, course_id, module_name, description, sequence_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    initialCourseModules.forEach((m) => {
      this.modules.set(m.module_id, m);
      insertModule.run(m.module_id, m.course_id, m.module_name, m.description || null, m.sequence_no, m.created_at, m.updated_at);
    });

    // 7. Module Videos (3 per module, 15 per course)
    const insertVideo = this.sqliteDb.prepare(`
      INSERT INTO module_videos (video_id, module_id, course_id, title, youtube_video_id, youtube_url, embed_url, thumbnail_url, duration, duration_seconds, channel_name, description, sequence_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    initialModuleVideos.forEach((v) => {
      this.videos.set(v.video_id, v);
      insertVideo.run(
        v.video_id,
        v.module_id,
        v.course_id,
        v.title,
        v.youtube_video_id,
        v.youtube_url,
        v.embed_url,
        v.thumbnail_url || null,
        v.duration,
        v.duration_seconds,
        v.channel_name || null,
        v.description || null,
        v.sequence_no,
        v.created_at,
        v.updated_at
      );
    });
  }

  getCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  getModulesByCourse(courseId: string): CourseModule[] {
    const mods = Array.from(this.modules.values())
      .filter((m) => m.course_id === courseId)
      .sort((a, b) => a.sequence_no - b.sequence_no);

    return mods.map((m) => {
      const vids = this.getVideosByModule(m.module_id);
      return {
        ...m,
        title: m.title || m.module_name,
        video_count: vids.length,
        videos: vids,
      };
    });
  }

  getVideosByModule(moduleId: string): ModuleVideo[] {
    return Array.from(this.videos.values())
      .filter((v) => v.module_id === moduleId)
      .sort((a, b) => a.sequence_no - b.sequence_no);
  }

  getVideosByCourse(courseId: string): ModuleVideo[] {
    return Array.from(this.videos.values())
      .filter((v) => v.course_id === courseId)
      .sort((a, b) => a.sequence_no - b.sequence_no);
  }

  getVideo(videoId: string): ModuleVideo | undefined {
    return this.videos.get(videoId);
  }

  getCompletedVideosForEnrollment(enrollmentId: string): string[] {
    return Array.from(this.activities.values())
      .filter((a) => a.enrollment_id === enrollmentId && a.activity_type === 'video_watched' && a.completed)
      .map((a) => a.lesson_id)
      .filter((id): id is string => Boolean(id));
  }

  insertActivity(actData: { enrollment_id: string; activity_type: string; lesson_id?: string; details?: string; completed?: boolean }): Activity {
    const actId = `act-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const activity: Activity = {
      activity_id: actId,
      enrollment_id: actData.enrollment_id,
      lesson_id: actData.lesson_id,
      activity_type: actData.activity_type as any,
      activity_date: now,
      completed: actData.completed ?? false,
      created_at: now,
    };
    this.upsertActivity(activity);
    return activity;
  }

  upsertModule(mod: CourseModule) {
    this.modules.set(mod.module_id, mod);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO course_modules (module_id, course_id, module_name, description, sequence_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(module_id) DO UPDATE SET
        module_name = excluded.module_name,
        description = excluded.description,
        sequence_no = excluded.sequence_no,
        updated_at = excluded.updated_at
    `);
    stmt.run(mod.module_id, mod.course_id, mod.module_name || mod.title || '', mod.description || null, mod.sequence_no, mod.created_at, mod.updated_at);
  }

  upsertVideo(vid: ModuleVideo) {
    this.videos.set(vid.video_id, vid);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO module_videos (video_id, module_id, course_id, title, youtube_video_id, youtube_url, embed_url, thumbnail_url, duration, duration_seconds, channel_name, description, sequence_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(video_id) DO UPDATE SET
        title = excluded.title,
        youtube_video_id = excluded.youtube_video_id,
        youtube_url = excluded.youtube_url,
        embed_url = excluded.embed_url,
        thumbnail_url = excluded.thumbnail_url,
        duration = excluded.duration,
        duration_seconds = excluded.duration_seconds,
        channel_name = excluded.channel_name,
        description = excluded.description,
        sequence_no = excluded.sequence_no,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      vid.video_id,
      vid.module_id,
      vid.course_id,
      vid.title,
      vid.youtube_video_id,
      vid.youtube_url,
      vid.embed_url,
      vid.thumbnail_url || null,
      vid.duration,
      vid.duration_seconds,
      vid.channel_name || null,
      vid.description || null,
      vid.sequence_no,
      vid.created_at,
      vid.updated_at
    );
  }

  updateVideo(videoId: string, updates: Partial<ModuleVideo>): ModuleVideo | null {
    const existing = this.videos.get(videoId);
    if (!existing) return null;
    let embed_url = updates.embed_url || existing.embed_url;
    let youtube_video_id = updates.youtube_video_id || existing.youtube_video_id;
    let thumbnail_url = updates.thumbnail_url || existing.thumbnail_url;

    if (updates.youtube_url && updates.youtube_url !== existing.youtube_url) {
      const match = updates.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) {
        youtube_video_id = match[1];
        embed_url = `https://www.youtube-nocookie.com/embed/${match[1]}`;
        thumbnail_url = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }
    }

    const updated: ModuleVideo = {
      ...existing,
      ...updates,
      youtube_video_id,
      embed_url,
      thumbnail_url,
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    this.upsertVideo(updated);
    return updated;
  }

  // Synchronizers for updates & inserts
  upsertCourse(course: Course) {
    this.courses.set(course.course_id, course);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO courses (course_id, course_name, category, description, created_at, updated_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(course_id) DO UPDATE SET
        course_name = excluded.course_name,
        category = excluded.category,
        description = excluded.description,
        updated_at = excluded.updated_at,
        is_active = excluded.is_active
    `);
    stmt.run(course.course_id, course.course_name, course.category, course.description || null, course.created_at, course.updated_at, course.is_active ? 1 : 0);
  }

  upsertLearner(learner: Learner) {
    this.learners.set(learner.learner_id, learner);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO learners (learner_id, roll_no, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(learner_id) DO UPDATE SET
        roll_no = excluded.roll_no,
        display_name = excluded.display_name,
        updated_at = excluded.updated_at
    `);
    stmt.run(learner.learner_id, learner.roll_no || null, learner.display_name, learner.created_at, learner.updated_at);
  }

  upsertEnrollment(enr: Enrollment) {
    this.enrollments.set(enr.enrollment_id, enr);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO enrollments (enrollment_id, learner_id, course_id, status, enrolled_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(enrollment_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at
    `);
    stmt.run(enr.enrollment_id, enr.learner_id, enr.course_id, enr.status, enr.enrolled_at, enr.updated_at);
  }

  upsertLesson(lesson: Lesson) {
    this.lessons.set(lesson.lesson_id, lesson);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO lessons (lesson_id, course_id, lesson_name, sequence_no, is_required, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(lesson_id) DO UPDATE SET
        lesson_name = excluded.lesson_name,
        sequence_no = excluded.sequence_no,
        is_required = excluded.is_required
    `);
    stmt.run(lesson.lesson_id, lesson.course_id, lesson.lesson_name, lesson.sequence_no, lesson.is_required ? 1 : 0, lesson.created_at);
  }

  upsertActivity(act: Activity) {
    this.activities.set(act.activity_id, act);
    const stmt = this.sqliteDb.prepare(`
      INSERT INTO activities (activity_id, enrollment_id, lesson_id, activity_type, activity_date, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(activity_id) DO UPDATE SET
        lesson_id = excluded.lesson_id,
        activity_type = excluded.activity_type,
        activity_date = excluded.activity_date,
        completed = excluded.completed
    `);
    stmt.run(act.activity_id, act.enrollment_id, act.lesson_id || null, act.activity_type, act.activity_date, act.completed ? 1 : 0, act.created_at);
  }

  // -------------------------------------------------------------------
  // PARAMETERIZED DATABASE SEARCH QUERIES
  // -------------------------------------------------------------------

  /**
   * Searches courses by course_name and category using parameterized SQL queries.
   */
  searchCourses(query?: string, category?: string, isActive?: boolean): Course[] {
    const cleanQuery = sanitizeSearchQuery(query).toLowerCase();
    
    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];

    if (cleanQuery) {
      // Escape LIKE wildcards for safety
      const escaped = cleanQuery.replace(/[%_\\]/g, '\\$&');
      sql += ` AND (LOWER(course_name) LIKE ? ESCAPE '\\' OR LOWER(category) LIKE ? ESCAPE '\\' OR LOWER(course_id) LIKE ? ESCAPE '\\')`;
      params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    try {
      const stmt = this.sqliteDb.prepare(sql);
      const rows = stmt.all(...params) as any[];
      return rows.map((r) => ({
        course_id: r.course_id,
        course_name: r.course_name,
        category: r.category,
        description: r.description || undefined,
        created_at: r.created_at,
        updated_at: r.updated_at,
        is_active: Boolean(r.is_active),
      }));
    } catch {
      // Fallback to memory search if SQLite query error
      let list = Array.from(this.courses.values());
      if (cleanQuery) list = memorySearchCourses(list, cleanQuery);
      if (category && category !== 'All') list = list.filter((c) => c.category === category);
      if (isActive !== undefined) list = list.filter((c) => c.is_active === isActive);
      return list;
    }
  }

  /**
   * Searches learners by display_name and roll_no using parameterized SQL queries.
   */
  searchLearners(query?: string): Learner[] {
    const cleanQuery = sanitizeSearchQuery(query).toLowerCase();

    let sql = 'SELECT * FROM learners WHERE 1=1';
    const params: any[] = [];

    if (cleanQuery) {
      const escaped = cleanQuery.replace(/[%_\\]/g, '\\$&');
      sql += ` AND (LOWER(display_name) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(roll_no, '')) LIKE ? ESCAPE '\\' OR LOWER(learner_id) LIKE ? ESCAPE '\\')`;
      params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
    }

    sql += ' ORDER BY created_at ASC';

    try {
      const stmt = this.sqliteDb.prepare(sql);
      const rows = stmt.all(...params) as any[];
      return rows.map((r) => ({
        learner_id: r.learner_id,
        display_name: r.display_name,
        roll_no: r.roll_no || undefined,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    } catch {
      const list = Array.from(this.learners.values());
      return cleanQuery ? memorySearchLearners(list, cleanQuery) : list;
    }
  }

  /**
   * Searches enrolments by enrolment ID, learner identifier, and course name using parameterized SQL queries.
   */
  searchEnrollments(query?: string, courseId?: string, learnerId?: string, status?: string): any[] {
    const cleanQuery = sanitizeSearchQuery(query).toLowerCase();

    let sql = `
      SELECT 
        e.*,
        c.course_name,
        c.category as course_category,
        l.display_name as learner_name,
        l.roll_no
      FROM enrollments e
      JOIN courses c ON e.course_id = c.course_id
      JOIN learners l ON e.learner_id = l.learner_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cleanQuery) {
      const escaped = cleanQuery.replace(/[%_\\]/g, '\\$&');
      sql += ` AND (
        LOWER(e.enrollment_id) LIKE ? ESCAPE '\\' 
        OR LOWER(l.display_name) LIKE ? ESCAPE '\\' 
        OR LOWER(COALESCE(l.roll_no, '')) LIKE ? ESCAPE '\\' 
        OR LOWER(l.learner_id) LIKE ? ESCAPE '\\' 
        OR LOWER(c.course_name) LIKE ? ESCAPE '\\'
        OR LOWER(c.course_id) LIKE ? ESCAPE '\\'
      )`;
      params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`, `%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
    }

    if (courseId && courseId !== 'All') {
      sql += ' AND e.course_id = ?';
      params.push(courseId);
    }
    if (learnerId && learnerId !== 'All') {
      sql += ' AND e.learner_id = ?';
      params.push(learnerId);
    }
    if (status && status !== 'All') {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY e.enrolled_at DESC';

    try {
      const stmt = this.sqliteDb.prepare(sql);
      return stmt.all(...params) as any[];
    } catch {
      let list = Array.from(this.enrollments.values());
      if (cleanQuery) list = memorySearchEnrollments(list, this.courses, this.learners, cleanQuery);
      if (courseId && courseId !== 'All') list = list.filter((e) => e.course_id === courseId);
      if (learnerId && learnerId !== 'All') list = list.filter((e) => e.learner_id === learnerId);
      if (status && status !== 'All') list = list.filter((e) => e.status === status);
      return list.map((e) => {
        const c = this.courses.get(e.course_id);
        const l = this.learners.get(e.learner_id);
        return {
          ...e,
          course_name: c ? c.course_name : e.course_id,
          course_category: c?.category,
          learner_name: l ? l.display_name : e.learner_id,
          roll_no: l?.roll_no,
        };
      });
    }
  }

  /**
   * Searches activities by activity_type and enrolment ID using parameterized SQL queries.
   */
  searchActivities(query?: string, courseId?: string, enrollmentId?: string, activityType?: string): any[] {
    const cleanQuery = sanitizeSearchQuery(query).toLowerCase();

    let sql = `
      SELECT 
        a.*,
        e.course_id,
        e.learner_id,
        c.course_name,
        l.display_name as learner_name,
        les.lesson_name
      FROM activities a
      JOIN enrollments e ON a.enrollment_id = e.enrollment_id
      JOIN courses c ON e.course_id = c.course_id
      JOIN learners l ON e.learner_id = l.learner_id
      LEFT JOIN lessons les ON a.lesson_id = les.lesson_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cleanQuery) {
      const escaped = cleanQuery.replace(/[%_\\]/g, '\\$&');
      // Matches activity_type (both raw underscore and spaced format e.g. "lesson completed") and enrollment_id (and activity_id)
      sql += ` AND (
        LOWER(a.activity_type) LIKE ? ESCAPE '\\'
        OR LOWER(REPLACE(a.activity_type, '_', ' ')) LIKE ? ESCAPE '\\'
        OR LOWER(a.enrollment_id) LIKE ? ESCAPE '\\'
        OR LOWER(a.activity_id) LIKE ? ESCAPE '\\'
      )`;
      params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
    }

    if (enrollmentId && enrollmentId !== 'All') {
      sql += ' AND a.enrollment_id = ?';
      params.push(enrollmentId);
    }
    if (activityType && activityType !== 'All') {
      sql += ' AND a.activity_type = ?';
      params.push(activityType);
    }
    if (courseId && courseId !== 'All') {
      sql += ' AND e.course_id = ?';
      params.push(courseId);
    }

    sql += ' ORDER BY a.activity_date DESC';

    try {
      const stmt = this.sqliteDb.prepare(sql);
      const rows = stmt.all(...params) as any[];
      return rows.map((r) => ({
        ...r,
        completed: Boolean(r.completed),
      }));
    } catch {
      let list = Array.from(this.activities.values());
      if (cleanQuery) list = memorySearchActivities(list, cleanQuery);
      if (enrollmentId && enrollmentId !== 'All') list = list.filter((a) => a.enrollment_id === enrollmentId);
      if (activityType && activityType !== 'All') list = list.filter((a) => a.activity_type === activityType);
      if (courseId && courseId !== 'All') {
        list = list.filter((a) => {
          const enr = this.enrollments.get(a.enrollment_id);
          return enr && enr.course_id === courseId;
        });
      }
      return list.map((a) => {
        const enr = this.enrollments.get(a.enrollment_id);
        const c = enr ? this.courses.get(enr.course_id) : undefined;
        const l = enr ? this.learners.get(enr.learner_id) : undefined;
        const les = a.lesson_id ? this.lessons.get(a.lesson_id) : undefined;
        return {
          ...a,
          course_id: enr?.course_id,
          course_name: c?.course_name,
          learner_id: enr?.learner_id,
          learner_name: l?.display_name,
          lesson_name: les?.lesson_name,
        };
      });
    }
  }

  /**
   * Executes Global Search across courses, learners, enrolments, and activities.
   */
  globalSearch(query: string): GlobalSearchResponse {
    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery) {
      return {
        query: '',
        total_matches: 0,
        results: {
          courses: [],
          learners: [],
          enrollments: [],
          activities: [],
        },
      };
    }

    const matchedCourses = this.searchCourses(cleanQuery);
    const matchedLearners = this.searchLearners(cleanQuery);
    const matchedEnrollments = this.searchEnrollments(cleanQuery);
    const matchedActivities = this.searchActivities(cleanQuery);

    const formattedCourses: SearchResultItem[] = matchedCourses.map((c) => ({
      id: c.course_id,
      type: 'course',
      title: c.course_name,
      subtitle: `Category: ${c.category}`,
      details: `${c.is_active ? 'Active' : 'Inactive'} • Created ${c.created_at.slice(0, 10)}`,
      metadata: {
        category: c.category,
        is_active: c.is_active,
      },
    }));

    const formattedLearners: SearchResultItem[] = matchedLearners.map((l) => ({
      id: l.learner_id,
      type: 'learner',
      title: l.display_name,
      subtitle: l.roll_no ? `Roll No: ${l.roll_no}` : 'No roll number',
      details: `Learner ID: ${l.learner_id} • Registered ${l.created_at.slice(0, 10)}`,
      metadata: {
        roll_no: l.roll_no,
      },
    }));

    const formattedEnrollments: SearchResultItem[] = matchedEnrollments.map((e) => ({
      id: e.enrollment_id,
      type: 'enrollment',
      title: `${e.learner_name || e.learner_id} in ${e.course_name || e.course_id}`,
      subtitle: `Enrolment ID: ${e.enrollment_id} • Status: ${String(e.status).toUpperCase()}`,
      details: `Enrolled on ${String(e.enrolled_at).slice(0, 10)}`,
      metadata: {
        status: e.status,
        course_id: e.course_id,
        learner_id: e.learner_id,
      },
    }));

    const formattedActivities: SearchResultItem[] = matchedActivities.map((a) => {
      const friendlyType = String(a.activity_type).replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
      return {
        id: a.activity_id,
        type: 'activity',
        title: `${friendlyType} (${a.completed ? 'Completed' : 'Logged'})`,
        subtitle: `Enrolment: ${a.enrollment_id} • ${a.learner_name || 'Learner'}`,
        details: `${a.course_name || 'Course'} • ${a.lesson_name || 'General resource'} • ${a.activity_date}`,
        metadata: {
          activity_type: a.activity_type,
          completed: a.completed,
          enrollment_id: a.enrollment_id,
        },
      };
    });

    const totalMatches =
      formattedCourses.length +
      formattedLearners.length +
      formattedEnrollments.length +
      formattedActivities.length;

    return {
      query: cleanQuery,
      total_matches: totalMatches,
      results: {
        courses: formattedCourses,
        learners: formattedLearners,
        enrollments: formattedEnrollments,
        activities: formattedActivities,
      },
    };
  }

  getDatabaseHealth() {
    try {
      const stmt = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM courses');
      const result = stmt.get() as { count: number };
      const mysqlHost = process.env.DB_HOST || process.env.MYSQL_HOST || '';
      const mysqlPort = process.env.DB_PORT || process.env.MYSQL_PORT || '3306';
      const mysqlUser = process.env.DB_USER || process.env.MYSQL_USER || '';
      const mysqlDb = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'elearning_analytics';

      const isMysqlConfigured = Boolean(mysqlHost && mysqlUser);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        relational_store: {
          engine: 'SQLite3 (Node.js DatabaseSync)',
          status: 'connected',
          tables: {
            courses: this.courses.size,
            learners: this.learners.size,
            enrollments: this.enrollments.size,
            lessons: this.lessons.size,
            activities: this.activities.size,
          },
          verified_by_query: result ? result.count === this.courses.size : true,
        },
        mysql_connection: {
          configured: isMysqlConfigured,
          connected: false, // Truthful reporting: no live remote MySQL server attached
          host: mysqlHost ? `${mysqlHost}:${mysqlPort}` : 'Not set in environment',
          database: mysqlDb,
          message: isMysqlConfigured
            ? `MySQL credentials configured for host "${mysqlHost}", but external daemon is not active. Relational operations safely executing on embedded relational engine.`
            : 'MySQL host not configured (DB_HOST/MYSQL_HOST). Running in standalone relational mode matching MySQL 8 schema.',
        },
        schema_alignment: 'Strictly aligned with database/schema.sql (MySQL 8 DDL)',
      };
    } catch (err: any) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }
}

export const dbStore = new RelationalStore();
