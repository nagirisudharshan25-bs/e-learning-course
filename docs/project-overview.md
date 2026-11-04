# E-Learning Course Analytics System: Project Overview

---

## ================= PAGE 1 =================
# SECTION 1: EXECUTIVE SUMMARY, ARCHITECTURE & FUNCTIONAL CAPABILITIES

### 1.1 Document Header & Metadata
* **Project Name**: E-Learning Course Analytics System
* **System Domain**: Academic Course Analytics & Learning Management Reporting
* **Architecture**: Full-Stack Single-Page Application (SPA) + RESTful Microservices + Python Analytics Engine
* **Target Audience**: Academic Directors, Department Heads, Course Designers, Educational Analysts, and LMS Administrators
* **Design System**: Enterprise Academic Blue Palette (`#123B73` Navy, `#2563EB` Cobalt, `#60A5FA` Sky, `#F5F8FF` Canvas)

---

### 1.2 Executive Summary & Problem Statement
Educational institutions often struggle with fragmented Learning Management System (LMS) data, miscalculated completion metrics, and lack of timely intervention for disengaged students. Traditional reporting tools frequently:
1. Distort completion rates by including withdrawn or administrative dropouts in the denominator.
2. Inaccurately inflate student progress when learners re-attempt or replay lesson videos.
3. Lack proactive, rule-based inactivity detection to trigger early educational support.
4. Expose student records to security vulnerabilities, notably spreadsheet formula injection (`CSV Injection`) during report exports.

The **E-Learning Course Analytics System** resolves these challenges by providing an enterprise-grade academic analytics platform. It guarantees strict denominator accountability, distinct lesson progress tracking, configurable inactivity monitoring, role-based access control (RBAC), and fortified data export sanitization.

---

### 1.3 System Architecture
The application is structured into four decoupled, cohesive tiers:

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION TIER                                   |
|   React 19 • TypeScript • Vite • Tailwind CSS v4 • Recharts • Lucide Icons            |
|   - Executive KPI Dashboard (7 metric cards, 5 interactive analytical charts)          |
|   - Course & Curriculum Manager (Modular lesson sequencing, required/elective flags)   |
|   - Learner & Enrolment Manager (Lifecycle tracking, progress visualization)          |
|   - Live Learning Activity Stream (Immutable event ingestion & inspection)            |
|   - Inactivity Monitoring Console (Configurable day-threshold & cohort filters)       |
|   - Hardened Data Export Center (Instant CSV export with formula injection guard)     |
+-------------------------------------------+-------------------------------------------+
                                            | JSON / REST API (HTTP Port 3000)
+-------------------------------------------v-------------------------------------------+
|                                  APPLICATION & API TIER                               |
|   Node.js • Express • TypeScript • Server-Side Role Enforcement                       |
|   - RESTful Route Handlers (/api/courses, /api/learners, /api/analytics, etc.)        |
|   - Auth & Session Service: Administrator session tokens vs. Analyst read-only access |
|   - Decoupled Analytical Computation Engine (Zero-division safe, pure functions)      |
|   - Search & Filter Engine (Multi-entity substring matching & sanitization)           |
+---------------------+---------------------------------------------------+-------------+
                      |                                                   |
+---------------------v---------------------+       +---------------------v-------------+
|               DATA STORAGE TIER           |       |      SCIENTIFIC ANALYTICS TIER    |
|   MySQL 8.0 DDL • In-Memory Mirror        |       |   Python 3.11+ • Pandas • NumPy   |
|   - Foreign Keys & Referential Integrity  |       |   Matplotlib Visualization Engine |
|   - Unique Roll Number Constraint         |       |   - Activity & Course Analytics   |
|   - Duplicate Active Enrolment Guard      |       |   - Threshold Inactivity Parser   |
|   - Reproducible Seed Data & Migrations   |       |   - Publication-Quality Plots     |
+-------------------------------------------+       +-----------------------------------+
```

---

### 1.4 Relational Domain Model & Schema Design
The data model enforces relational consistency, cascading integrity, and business logic:

| Entity | Primary Attributes | Constraints & Business Rules |
|---|---|---|
| **Course** | `id`, `course_code`, `title`, `category`, `description`, `is_active` | `course_code` is unique; soft active/inactive toggle prevents orphan references. |
| **Lesson** | `id`, `course_id`, `title`, `sequence_order`, `is_required` | Foreign key to `Course`; `is_required` distinguishes core syllabus from electives. |
| **Learner** | `id`, `roll_number`, `full_name`, `email`, `department` | `roll_number` and `email` are strictly unique institutional identifiers. |
| **Enrollment** | `id`, `learner_id`, `course_id`, `status`, `enrolled_at`, `completed_at` | Status: `enrolled`, `completed`, `withdrawn`, `cancelled`. UNIQUE(`learner_id`, `course_id`, `status='enrolled'`). |
| **Activity** | `id`, `enrollment_id`, `activity_type`, `event_timestamp`, `completed` | Types: `lesson_opened`, `lesson_started`, `lesson_completed`, `video_watched`, `resource_accessed`. Immutable event log. |
| **AdminUser** | `id`, `username`, `password_hash`, `role`, `created_at` | RBAC roles: `administrator` (read/write/delete), `analyst` (read/export). |

---

### 1.5 Key Functional Capabilities
1. **Executive KPI Dashboard**: Immediate visibility into 7 vital academic statistics: Total Courses, Total Learners, Eligible Enrolments, Completed Enrolments, Overall Completion Rate, Recorded Active Enrolments, and Flagged Inactive Enrolments.
2. **Visual Analytics Suite**: 5 dynamic Recharts visualizations: (1) Course Enrolment vs Completion comparative bar chart; (2) Completion Rate breakdown; (3) Weekly Activity Trend over ISO calendar weeks; (4) Activity by Event Type distribution; (5) Learner Progress Distribution across 5 quartile bands.
3. **Course & Lesson Authoring**: Create, update, activate/deactivate courses, and sequence curriculum lessons with explicit mandatory (`is_required = true`) or elective classifications.
4. **Enrolment Lifecycle Control**: Register learners, enrol into courses with duplicate prevention, transition status (`enrolled` $\rightarrow$ `completed` / `withdrawn` / `cancelled`), and record completion timestamps.
5. **Real-Time Activity Simulation & Logging**: Modal-based live activity logger allowing instructors to simulate video views, lesson completions, and resource downloads with immediate dashboard reflection.

---

\newpage

## ================= PAGE 2 =================
# SECTION 2: ANALYTICAL METHODOLOGY, SECURITY, TESTING & DEPLOYMENT

### 2.1 Mathematical Analytical Framework & Metric Definitions
To prevent statistical distortion, all platform calculations adhere to strict academic standards:

* **Metric A: Eligible Enrolments Denominator**
  $$\text{Eligible Enrolments} = \sum \text{Enrolments with } \text{status} \in \{\text{'enrolled'}, \text{'completed'}\}$$
  *Rationale*: Students who officially withdrew or whose registrations were administratively cancelled are excluded from the denominator to avoid artificially deflating course success rates.

* **Metric B: Individual Learner Course Progress**
  $$\text{Progress \%} = \frac{\text{Count of Distinct Required Lessons Completed}}{\text{Total Required Lessons in Course}} \times 100$$
  *Duplicate Immunity*: Re-completing the same lesson multiple times records multiple activity events for auditing, but only increments distinct progress once.
  *Elective Neutrality*: Optional lessons (`is_required = false`) do not expand the required denominator. Courses with zero required lessons report `0.0%` progress rather than unearned 100% completion.

* **Metric C: Course Completion Rate**
  $$\text{Completion Rate \%} = \frac{\text{Completed Eligible Enrolments}}{\text{Total Eligible Enrolments}} \times 100$$
  *Transparency Policy*: Both numerator and denominator are always rendered together (e.g., `"42 / 120 (35.0%)"`) to prevent misleading fractional interpretations.

* **Metric D: Weekly ISO Calendar Activity Grouping**
  Aggregates activity logs by ISO calendar week (Monday 00:00:00 UTC to Sunday 23:59:59 UTC), computing total events, completions, distinct active enrolments, and distinct active learners.

* **Metric E: Configurable Inactivity Monitoring & Ethical Disclaimer**
  Evaluates active enrolments against an explicit reference timestamp across configurable windows (7, 14, 21, 30 days). Categorizes enrolments into: `active_within_window`, `no_activity_within_window`, or `no_activity_history`.
  *Ethical Governance Notice*: *Inactivity flags represent operational alerts for proactive outreach; they are never to be construed as assessments of student cognitive capability, nor proof that offline study has not occurred.*

---

### 2.2 Security Architecture & Data Governance
* **Spreadsheet Formula Injection Defense (CSV Injection)**:
  All exported fields are sanitized before streaming. Any text value commencing with hazardous execution characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is prefixed with a single apostrophe (`'`), neutralizing macro execution in Microsoft Excel, Google Sheets, and LibreOffice Calc.
* **Role-Based Access Control (RBAC)**:
  * *Administrator*: Authenticated via secure session tokens. Possesses unrestricted rights to create, edit, delete courses, learners, and enrolments.
  * *Analyst*: Read-only access accompanied by advanced filtering, visualization inspection, and CSV export rights. Destructive endpoints yield HTTP `403 Forbidden`.
* **Referential Integrity & Safe Error Boundaries**:
  Foreign key validation prevents orphaned records. Database constraints return structured JSON errors (`400 Bad Request` / `404 Not Found` / `409 Conflict`) without leaking raw database stack traces.

---

### 2.3 Quality Assurance & Automated Testing
The platform contains a dedicated test suite using Node.js native test runner (`node:test`, `node:assert/strict`) verifying 7 core critical domains:
1. **Division-by-Zero Handling**: Validates that empty courses or zero-enrolment cohorts safely return `0.0%` without crash.
2. **Deduplication Logic**: Verifies that redundant completion events for a single lesson do not inflate progress.
3. **Denominator Exclusions**: Asserts that `withdrawn` and `cancelled` enrolments do not affect completion percentages.
4. **Inactivity Boundary Conditions**: Validates threshold triggers exactly at day $N-1$, $N$, and $N+1$.
5. **CSV Sanitization**: Tests malicious formula injection payloads (`=SUM(...)`, `-cmd|...`, `@HYPERLINK(...)`).
6. **Unique Active Enrolment Enforcement**: Rejects duplicate simultaneous active enrolments.
7. **Role Protection**: Validates API guard authorization headers and token expiry.

---

### 2.4 Technology Stack & Deployment Specifications

| Layer | Technology | Version / Tooling | Purpose & Specifications |
|---|---|---|---|
| **Client UI** | React, TypeScript, Vite | React 19, TS 5.x, Vite 6 | High-performance SPA with instant HMR and type safety |
| **Styling** | Tailwind CSS | Tailwind v4 | Custom corporate Navy/Cobalt palette and responsive grid |
| **Data Viz** | Recharts, Lucide | Recharts 2.x, Lucide React | Grouped bar, line, and pie charts with responsive tooltips |
| **Server / API** | Node.js, Express | Node 20+, Express 4.x | REST API on port 3000, middleware validation & CSV streaming |
| **Data Layer** | MySQL 8.0 DDL | SQL Migrations + In-Memory | Normalized relational schema with foreign key cascades |
| **Analytics Lib** | Python Analytics | Python 3.11, Pandas, NumPy | Standalone computational engine and batch processing scripts |

---

### 2.5 Quick-Start Commands & Core API Endpoints

```bash
# 1. Install dependencies & run unified full-stack dev server (Vite + Express on port 3000)
npm install
npm run dev

# 2. Run automated test suite
node --test tests/analytics.test.ts

# 3. Production build & deployment
npm run build
node server.ts
```

| HTTP Method | API Route Endpoint | Functionality & Access Level |
|---|---|---|
| `GET` | `/api/analytics/overview` | Retrieves the 7 global KPIs and 5 chart series payloads (Public/Analyst) |
| `GET / POST` | `/api/courses` | Lists filtered courses / Creates new course with lessons (Admin only for POST) |
| `GET / POST` | `/api/learners` | Lists learners / Registers new learner with unique roll number (Admin for POST) |
| `GET / POST` | `/api/enrollments` | Queries enrolments / Enrols learner with duplicate validation (Admin for POST) |
| `POST` | `/api/activities` | Appends a timestamped learning activity event (Admin/Instructor) |
| `GET` | `/api/export/:type` | Streams sanitized CSV (`completion`, `inactivity`, `activities`) (All authenticated) |

---

### 2.6 Strategic Value & Project Impact
* **Actionable Student Support**: Identifies disengaged learners within 7-14 days, enabling proactive academic advising before dropouts occur.
* **Auditable Academic Metrics**: Standardized mathematical definitions eliminate subjective reporting, giving accreditation boards verified completion figures.
* **Enterprise Security Ready**: Zero formula injection vulnerability and robust RBAC safeguard institutional data integrity.
