# Architecture Documentation: E-Learning Course Analytics System

## 1. System Overview

The E-Learning Course Analytics System provides an enterprise academic analytics platform for tracking student progress, course enrolments, learning activity frequencies, completion rates, and inactivity monitoring.

```
+-------------------------------------------------------------------+
|                        Frontend Layer                             |
|  React 19 + TypeScript + Tailwind CSS (Navy/Blue Design System)   |
|  - Dashboard Overview (7 KPI cards, 5 Recharts visualizations)    |
|  - Course Management (CRUD, Activation toggles, Category filters) |
|  - Learner & Enrolment Management (Progress bars, Status flow)     |
|  - Learning Activity Log (Live event recording & filtering)       |
|  - Inactivity Monitor (Configurable threshold, rule-based flags)  |
|  - Data Export Engine (Sanitized CSV with formula injection guard)|
|  - Database Schema & Seed Data Tool (Reproducible reset)          |
+---------------------------------+---------------------------------+
                                  |
                           HTTP / REST API (Port 3000)
                                  |
+---------------------------------v---------------------------------+
|                        Backend Layer                              |
|  Node.js + Express + TypeScript                                   |
|  - RESTful Architecture (/api/courses, /api/learners, etc.)       |
|  - Server-side Role Authorization (Administrator vs Analyst)      |
|  - Strict Validation Middleware & Foreign Key Verification        |
|  - Decoupled Pure Mathematical Analytics Engine                   |
|  - Sanitized CSV Streaming & Formula Injection Protection         |
+---------------------------------+---------------------------------+
                                  |
              +-------------------+-------------------+
              |                                       |
+-------------v---------------+       +---------------v---------------+
|    Database Storage Layer   |       |   Python Analytics Package    |
|  MySQL 8 / Relational Store |       |  (Pandas, NumPy, Matplotlib)  |
|  - Courses, Learners        |       |  - course_analytics.py        |
|  - Enrollments, Lessons     |       |  - progress_analytics.py      |
|  - Activities               |       |  - activity_analytics.py      |
|  - DDL Schema & Migrations  |       |  - inactivity_analytics.py    |
|  - Reproducible Seed Data   |       |  - visualizations.py          |
+-----------------------------+       +-------------------------------+
```

## 2. Key Architecture Principles

1. **Analytical Integrity & Strict Denominators**:
   - Course completion rates clearly document the denominator: only eligible enrolments (`enrolled` and `completed`). `withdrawn` and `cancelled` records are excluded.
   - Individual progress evaluates distinct required lessons. Non-required elective lessons are excluded from the denominator. Repeated completions do not inflate progress.
   - Inactivity is calculated relative to an explicit reference timestamp and configurable day threshold (default 14 days), with the disclaimer that it is a rule-based flag, not a judgment of learning.

2. **Security & Privacy**:
   - Zero spreadsheet formula injection: CSV exports escape strings starting with `=`, `+`, `-`, `@`, `\t`, `\r`.
   - Role-Based Access Control: Administrators have full CRUD management rights; Analysts have view and export permissions.
   - Safe SQL / No raw exception leaks: Database operations use parameterized queries and structured error responses.

3. **Multi-Environment Support**:
   - Single-command developer server combines React UI and Express API via Vite middleware.
   - Standalone Node.js server (`server.ts`) for Docker / Cloud Run deployment.
   - Ready-to-run Python analytics package and MySQL 8 SQL schema.
