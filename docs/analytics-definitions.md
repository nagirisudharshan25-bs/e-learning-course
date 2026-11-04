# Analytics Definitions and Calculations

This document details the exact mathematical formulas, eligibility policies, and limitations used across the analytics platform.

---

### Metric A: Course Enrolments & Eligible Enrolments
- **Total Enrolments**: The total number of all enrollment records tied to a course.
- **Eligible Enrolments (Denominator)**: Enrolments with `status IN ('enrolled', 'completed')`.
  - *Rationale*: Students who have `withdrawn` or whose registrations were `cancelled` are administrative exits and should not unfairly penalize the course's completion rate denominator.

---

### Metric B: Individual Course Progress
$$\text{Progress \%} = \frac{\text{Distinct Required Lessons Completed}}{\text{Total Required Lessons}} \times 100$$

- **Numerator**: The count of distinct required lessons for which at least one valid completion event (`completed = TRUE` and `activity_type = 'lesson_completed'`) exists for that enrolment.
  - *Duplicate Protection*: Repeated completion events for the same lesson do NOT inflate the numerator.
- **Denominator**: Total lessons in the course where `is_required = TRUE`.
  - Non-required (elective/optional) lessons are excluded from the denominator.
- **Zero-Required Course Handling**: If a course has 0 required lessons, progress is reported as `0.0%` (or Elective-Only) and is never automatically classified as 100% complete without explicit criteria.

---

### Metric C: Course Completion Rate
$$\text{Course Completion Rate \%} = \frac{\text{Completed Eligible Enrolments}}{\text{Total Eligible Enrolments}} \times 100$$

- **Numerator**: Number of distinct eligible enrolments marked as completed.
- **Denominator**: Total eligible enrolments (`enrolled` + `completed`).
- **Reporting Requirement**: Both the numerator and denominator are displayed alongside the percentage (e.g., "30 / 100 (30.0%)").

---

### Metric D: Weekly Activity Grouping
- **Grouping Unit**: ISO calendar week (Monday through Sunday).
- **Timezone**: Evaluated in UTC or system configured timezone.
- **Metrics Tracked**:
  - Total activity events.
  - Completed events.
  - Distinct active enrolments (count of unique `enrollment_id` with >= 1 event that week).
  - Distinct active learners (count of unique `learner_id` active that week).
  - Breakdown by event type (`lesson_opened`, `lesson_started`, `lesson_completed`, `video_watched`, `resource_accessed`).

---

### Metric E: Inactivity Monitor
- **Configurable Threshold**: Observation window defaulting to 14 days (customizable to 7, 21, 30 days, etc.).
- **Reference Timestamp**: Explicitly specified date (e.g., current report generation date), preventing ambiguity across batch runs.
- **Status Classification**:
  1. `active_within_window`: Activity recorded within the last $N$ days.
  2. `no_activity_within_window`: Past activity recorded, but none within the last $N$ days.
  3. `no_activity_history`: Zero recorded activity events since enrolment.
  4. `excluded_by_status`: Enrolment is withdrawn or cancelled.
  5. `completed_enrolment`: Enrolment has already reached completion.
- **Ethical Limitation Statement**:
  *An inactivity flag is a rule-based operational alert and must never be interpreted as proof that a learner did not study offline, nor as a prediction of ability or academic success.*
