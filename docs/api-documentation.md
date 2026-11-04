# REST API Documentation

Base URL: `/api`

### 1. Courses
- `GET /api/courses`: Query params: `search`, `category`, `is_active`. Returns list of courses with lesson and enrolment counts.
- `POST /api/courses`: Body: `{ course_name, category, description?, is_active? }`. (Requires Administrator role).
- `GET /api/courses/:id`: Returns course details and syllabus lesson list.
- `PUT /api/courses/:id`: Updates course fields. (Requires Administrator role).
- `PATCH /api/courses/:id/status`: Body: `{ is_active: boolean }`. (Requires Administrator role).

### 2. Learners
- `GET /api/learners`: Query params: `search`. Returns learners with enrolment stats.
- `POST /api/learners`: Body: `{ display_name, roll_no? }`. (Requires Administrator role).
- `GET /api/learners/:id`: Returns learner record, enrolments, and calculated course progress.
- `PUT /api/learners/:id`: Updates learner details. (Requires Administrator role).

### 3. Enrolments
- `GET /api/enrollments`: Query params: `course_id`, `learner_id`, `status`. Returns enriched enrolments with real-time calculated lesson progress.
- `POST /api/enrollments`: Body: `{ learner_id, course_id, status? }`. Validates foreign keys and checks for duplicate active enrolments. (Requires Administrator role).
- `PATCH /api/enrollments/:id/status`: Body: `{ status: 'enrolled' | 'completed' | 'withdrawn' | 'cancelled' }`.

### 4. Lessons
- `GET /api/courses/:id/lessons`: Returns all lessons for a course sorted by sequence number.
- `POST /api/courses/:id/lessons`: Body: `{ lesson_name, sequence_no?, is_required? }`. (Requires Administrator role).
- `PUT /api/lessons/:id`: Updates lesson name, sequence, or requirement status. (Requires Administrator role).

### 5. Activities
- `GET /api/activities`: Query params: `course_id`, `enrollment_id`, `activity_type`, `start_date`, `end_date`. Returns activity event stream.
- `POST /api/activities`: Body: `{ enrollment_id, lesson_id?, activity_type, activity_date?, completed? }`. Logs new learning event.

### 6. Analytics
- `GET /api/analytics/overview`: Key dashboard metrics, course performance array, and denominator annotations.
- `GET /api/analytics/courses`: Comparison of eligible enrolments vs completions per course.
- `GET /api/analytics/completion`: Completion rates with explicit numerators and denominators.
- `GET /api/analytics/progress`: Progress band distribution (0-24%, 25-49%, 50-74%, 75-99%, 100%) and individual progress metrics.
- `GET /api/analytics/activity/weekly`: ISO calendar week aggregations with distinct active learners/enrolments and type breakdowns.
- `GET /api/analytics/inactive-enrollments`: Query params: `threshold` (default 14), `ref_date`. Evaluates inactive enrolments with status reasons.

### 7. Reports & CSV Exports
- `GET /api/reports/course-completion?format=csv`: Downloadable formula-sanitized CSV export.
- `GET /api/reports/inactive-enrollments?format=csv&threshold=14`: Inactivity monitoring CSV report.
- `GET /api/reports/activity?format=csv`: Complete audit log CSV export.

### 8. System Tools
- `POST /api/system/reset`: Re-seeds the database with reproducible seed dataset. (Requires Administrator role).
