import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateCompletionRates, 
  calculateEnrolmentProgress, 
  getInactivityAnalysis, 
  escapeCsvField 
} from '../backend/src/services/analyticsLogic.ts';
import type { Course, Enrollment, Lesson, Activity } from '../backend/src/types/index.ts';

test('1. calculateCompletionRates handles zero eligible enrolments without division by zero', () => {
  const courses: Course[] = [
    { course_id: 'c1', course_name: 'Empty Course', category: 'General', created_at: '', updated_at: '', is_active: true }
  ];
  const enrollments: Enrollment[] = [
    { enrollment_id: 'e1', learner_id: 'l1', course_id: 'c1', status: 'withdrawn', enrolled_at: '', updated_at: '' }
  ];

  const results = calculateCompletionRates(courses, enrollments);
  assert.equal(results.length, 1);
  assert.equal(results[0].eligible_enrolments, 0);
  assert.equal(results[0].completed_enrolments, 0);
  assert.equal(results[0].completion_rate_percent, 0.0);
});

test('2. calculateCompletionRates correctly handles 100% completion and excludes withdrawn/cancelled', () => {
  const courses: Course[] = [
    { course_id: 'c1', course_name: 'Full Stack', category: 'Tech', created_at: '', updated_at: '', is_active: true }
  ];
  const enrollments: Enrollment[] = [
    { enrollment_id: 'e1', learner_id: 'l1', course_id: 'c1', status: 'completed', enrolled_at: '', updated_at: '' },
    { enrollment_id: 'e2', learner_id: 'l2', course_id: 'c1', status: 'completed', enrolled_at: '', updated_at: '' },
    { enrollment_id: 'e3', learner_id: 'l3', course_id: 'c1', status: 'withdrawn', enrolled_at: '', updated_at: '' },
    { enrollment_id: 'e4', learner_id: 'l4', course_id: 'c1', status: 'cancelled', enrolled_at: '', updated_at: '' },
  ];

  const results = calculateCompletionRates(courses, enrollments);
  assert.equal(results[0].total_enrolments, 4);
  assert.equal(results[0].eligible_enrolments, 2);
  assert.equal(results[0].completed_enrolments, 2);
  assert.equal(results[0].completion_rate_percent, 100.0);
});

test('3. calculateCompletionRates correctly calculates 50% completion rate with documented denominator', () => {
  const courses: Course[] = [
    { course_id: 'c1', course_name: 'Data Science', category: 'Data', created_at: '', updated_at: '', is_active: true }
  ];
  const enrollments: Enrollment[] = [
    { enrollment_id: 'e1', learner_id: 'l1', course_id: 'c1', status: 'completed', enrolled_at: '', updated_at: '' },
    { enrollment_id: 'e2', learner_id: 'l2', course_id: 'c1', status: 'enrolled', enrolled_at: '', updated_at: '' },
  ];

  const results = calculateCompletionRates(courses, enrollments);
  assert.equal(results[0].eligible_enrolments, 2);
  assert.equal(results[0].completed_enrolments, 1);
  assert.equal(results[0].completion_rate_percent, 50.0);
});

test('4. calculateEnrolmentProgress deduplicates repeated lesson completion events and excludes non-required lessons', () => {
  const enrollment: Enrollment = {
    enrollment_id: 'e1',
    learner_id: 'l1',
    course_id: 'c1',
    status: 'enrolled',
    enrolled_at: '',
    updated_at: '',
  };

  const lessons: Lesson[] = [
    { lesson_id: 'les-1', course_id: 'c1', lesson_name: 'Lesson 1', sequence_no: 1, is_required: true, created_at: '' },
    { lesson_id: 'les-2', course_id: 'c1', lesson_name: 'Lesson 2', sequence_no: 2, is_required: true, created_at: '' },
    { lesson_id: 'les-3', course_id: 'c1', lesson_name: 'Lesson 3 (Optional)', sequence_no: 3, is_required: false, created_at: '' },
  ];

  // Learner completed Lesson 1 THREE times (duplicate logs) and optional Lesson 3
  const activities: Activity[] = [
    { activity_id: 'a1', enrollment_id: 'e1', lesson_id: 'les-1', activity_type: 'lesson_completed', activity_date: '2026-09-01 10:00:00', completed: true, created_at: '' },
    { activity_id: 'a2', enrollment_id: 'e1', lesson_id: 'les-1', activity_type: 'lesson_completed', activity_date: '2026-09-01 10:05:00', completed: true, created_at: '' },
    { activity_id: 'a3', enrollment_id: 'e1', lesson_id: 'les-1', activity_type: 'lesson_completed', activity_date: '2026-09-01 10:10:00', completed: true, created_at: '' },
    { activity_id: 'a4', enrollment_id: 'e1', lesson_id: 'les-3', activity_type: 'lesson_completed', activity_date: '2026-09-02 12:00:00', completed: true, created_at: '' },
  ];

  const progress = calculateEnrolmentProgress(enrollment, lessons, activities);
  
  // Total required lessons = 2 (les-1, les-2). les-3 is optional.
  assert.equal(progress.total_required_lessons, 2);
  assert.equal(progress.total_optional_lessons, 1);
  // Only 1 distinct required lesson was completed (les-1), despite 3 duplicate records
  assert.equal(progress.distinct_required_completed, 1);
  assert.equal(progress.distinct_optional_completed, 1);
  // Progress = 1 / 2 * 100 = 50.0%
  assert.equal(progress.progress_percentage, 50.0);
  assert.equal(progress.progress_band, '50-74%');
  assert.equal(progress.is_fully_completed, false);
});

test('5. calculateEnrolmentProgress safely handles courses with 0 required lessons without division by zero', () => {
  const enrollment: Enrollment = {
    enrollment_id: 'e1',
    learner_id: 'l1',
    course_id: 'c-empty',
    status: 'enrolled',
    enrolled_at: '',
    updated_at: '',
  };

  const lessons: Lesson[] = [
    { lesson_id: 'les-opt', course_id: 'c-empty', lesson_name: 'Elective only', sequence_no: 1, is_required: false, created_at: '' }
  ];

  const activities: Activity[] = [];

  const progress = calculateEnrolmentProgress(enrollment, lessons, activities);
  assert.equal(progress.total_required_lessons, 0);
  assert.equal(progress.progress_percentage, 0.0);
  assert.equal(progress.is_fully_completed, false);
});

test('6. getInactivityAnalysis correctly categorizes active, inactive > 14 days, no history, and excluded', () => {
  const coursesMap = new Map<string, Course>([
    ['c1', { course_id: 'c1', course_name: 'Web Dev', category: 'Tech', created_at: '', updated_at: '', is_active: true }]
  ]);
  const learnersMap = new Map([
    ['l1', { display_name: 'Alice', roll_no: '001' }],
    ['l2', { display_name: 'Bob', roll_no: '002' }],
    ['l3', { display_name: 'Charlie', roll_no: '003' }],
    ['l4', { display_name: 'Diana', roll_no: '004' }],
  ]);

  const enrollments: Enrollment[] = [
    { enrollment_id: 'e1', learner_id: 'l1', course_id: 'c1', status: 'enrolled', enrolled_at: '', updated_at: '' }, // active 3 days ago
    { enrollment_id: 'e2', learner_id: 'l2', course_id: 'c1', status: 'enrolled', enrolled_at: '', updated_at: '' }, // inactive 20 days ago
    { enrollment_id: 'e3', learner_id: 'l3', course_id: 'c1', status: 'enrolled', enrolled_at: '', updated_at: '' }, // no activity history
    { enrollment_id: 'e4', learner_id: 'l4', course_id: 'c1', status: 'withdrawn', enrolled_at: '', updated_at: '' }, // excluded
  ];

  const refDate = new Date('2026-10-17T12:00:00Z');

  const activities: Activity[] = [
    { activity_id: 'a1', enrollment_id: 'e1', lesson_id: 'l1', activity_type: 'lesson_completed', activity_date: '2026-10-14T12:00:00Z', completed: true, created_at: '' }, // 3 days ago
    { activity_id: 'a2', enrollment_id: 'e2', lesson_id: 'l1', activity_type: 'lesson_completed', activity_date: '2026-09-27T12:00:00Z', completed: true, created_at: '' }, // 20 days ago
  ];

  const analysis = getInactivityAnalysis(enrollments, activities, coursesMap, learnersMap, 14, refDate);

  assert.equal(analysis.total_monitored, 4);
  assert.equal(analysis.active_in_window_count, 1);
  assert.equal(analysis.no_history_count, 1);
  assert.equal(analysis.excluded_count, 1);
  assert.equal(analysis.flagged_count, 2); // e2 (>14 days) and e3 (no history)

  const e1Record = analysis.records.find((r) => r.enrollment_id === 'e1')!;
  assert.equal(e1Record.inactivity_status, 'active_within_window');
  assert.equal(e1Record.is_flagged, false);
  assert.equal(e1Record.days_since_last_activity, 3);

  const e2Record = analysis.records.find((r) => r.enrollment_id === 'e2')!;
  assert.equal(e2Record.inactivity_status, 'no_activity_within_window');
  assert.equal(e2Record.is_flagged, true);
  assert.equal(e2Record.days_since_last_activity, 20);

  const e3Record = analysis.records.find((r) => r.enrollment_id === 'e3')!;
  assert.equal(e3Record.inactivity_status, 'no_activity_history');
  assert.equal(e3Record.is_flagged, true);

  const e4Record = analysis.records.find((r) => r.enrollment_id === 'e4')!;
  assert.equal(e4Record.inactivity_status, 'excluded_by_status');
  assert.equal(e4Record.is_flagged, false);
});

test('7. escapeCsvField prevents spreadsheet formula injection vulnerabilities', () => {
  assert.equal(escapeCsvField('=cmd|"/C calc"!A0'), '"\'=cmd|""/C calc""!A0"');
  assert.equal(escapeCsvField('+12345'), '"\'+12345"');
  assert.equal(escapeCsvField('-100'), '"\'-100"');
  assert.equal(escapeCsvField('@SUM(A1:A10)'), '"\'@SUM(A1:A10)"');
  assert.equal(escapeCsvField('Safe Course Title'), '"Safe Course Title"');
  assert.equal(escapeCsvField(null), '""');
});
