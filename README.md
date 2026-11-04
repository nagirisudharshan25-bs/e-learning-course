# E-Learning Course Analytics System

A complete full-stack academic course analytics platform engineered with a professional Blue & White design system (`#123B73`, `#2563EB`, `#60A5FA`, `#F5F8FF`).

## Key Features & Capabilities

- **Executive Analytics Dashboard**:
  - 7 KPI cards: Total Courses, Total Learners, Eligible Enrolments, Completed Enrolments, Overall Completion Rate, Recorded Active Enrolments, and Enrolments Flagged for Inactivity.
  - 5 Interactive Charts:
    1. *Course Comparison*: Side-by-side grouped bar chart comparing eligible vs completed enrolments.
    2. *Completion Rate*: Progress and percentages with explicit numerators and denominators.
    3. *Weekly Activity Trend*: Interactive timeline aggregating events over calendar weeks.
    4. *Activity by Type*: Event breakdown across lesson completions, video views, and resource access.
    5. *Progress Distribution*: Learner groupings across 5 distinct progress bands (0-24%, 25-49%, 50-74%, 75-99%, 100%).

- **Relational Course & Curriculum Management**:
  - Full CRUD operations with instant persistence.
  - Sequence tracking for modular course lessons with `is_required` mandatory vs elective flags.
  - Active/Inactive lifecycle toggle.

- **Learner & Enrolment Management**:
  - Learner registration with unique institutional roll number enforcement.
  - Duplicate active enrolment protection preventing multiple concurrent active registrations in the same course.
  - Status transition flow (`enrolled` -> `completed`, `withdrawn`, `cancelled`).

- **Activity Tracking**:
  - Immutable learning event stream recording timestamps, event types, and completion flags.
  - Live activity logging modal for immediate metric verification.

- **Configurable Inactivity Monitoring**:
  - Configurable observation threshold (7, 14, 21, 30 days) relative to an explicit reference timestamp.
  - Strict analytical limitation: Rule-based indicator, not a judgment of student intelligence or offline study.

- **Spreadsheet Formula Injection Defense & Data Export**:
  - Sanitizes CSV fields beginning with `=`, `+`, `-`, `@`, `\t`, `\r` by prefixing `'`.
  - Export Course Completion, Inactivity, and Activity logs with metadata headers.

---

## Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts |
| **Backend** | Node.js, Express, TypeScript REST API, Server-Side Role Middleware |
| **Database** | MySQL 8.0 DDL Schema (`database/schema.sql`), Seed Dataset (`database/seed.sql`) |
| **Analytics Engine** | Decoupled pure logic + Python Analytics Package (`analytics/`) with Pandas/NumPy/Matplotlib |
| **Testing** | Node.js native test runner (`node:test`, `node:assert/strict`) |

---

## Directory Structure

```
├── analytics/                      # Python Analytics Engine package
│   ├── activity_analytics.py       # Weekly grouping & activity breakdown
│   ├── course_analytics.py         # Course enrolments & completion rates
│   ├── database.py                 # MySQL / SQLite query adapter
│   ├── inactivity_analytics.py     # Threshold-based inactivity evaluator
│   ├── main.py                     # Entrypoint CLI & microservice
│   ├── progress_analytics.py       # Distinct required lesson progress
│   ├── requirements.txt            # Python dependencies (Pandas, NumPy, Matplotlib)
│   └── visualizations.py           # Matplotlib publication chart generators
├── backend/
│   └── src/
│       ├── app.ts                  # Express application setup
│       ├── routes/api.ts           # Complete REST API endpoints
│       ├── repositories/db.ts      # Relational store mirroring MySQL 8
│       ├── services/
│       │   └── analyticsLogic.ts   # Decoupled mathematical analytics
│       └── types/index.ts          # Core domain models
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Initial schema migration
│   ├── schema.sql                  # Complete MySQL 8 DDL with FKs & indexes
│   └── seed.sql                    # Reproducible seed data
├── docs/
│   ├── analytics-definitions.md    # Documented formulas & denominators
│   ├── api-documentation.md        # REST API endpoints reference
│   ├── architecture.md             # System architecture overview
│   ├── database-design.md          # Relational tables schema design
│   └── setup-guide.md              # Installation & external deployment guide
├── src/                            # Frontend React application
│   ├── components/                 # Views, Navigation, Modals, Charts
│   ├── services/apiClient.ts       # Typed REST client with role headers
│   ├── types.ts                    # Frontend interfaces
│   ├── App.tsx                     # Main application layout
│   └── main.tsx                    # React DOM entrypoint
└── tests/
    └── analytics.test.ts           # Automated test suite (7 scenarios)
```

---

## Running the Application

### 1. Unified Development Server
```bash
npm install
npm run dev
```
Serves both the React frontend and Express REST API concurrently on `http://localhost:3000`.

### 2. Running Automated Unit Tests
```bash
node --test tests/analytics.test.ts
```
Executes all 7 test cases covering division-by-zero protection, deduplication, documented denominators, inactivity thresholds, and formula injection escaping.

### 3. Production Deployment
```bash
npm run build
node backend/src/server.ts
```
