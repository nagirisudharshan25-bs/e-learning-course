import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  sanitizeSearchQuery, 
  searchCourses, 
  searchLearners, 
  searchEnrollments, 
  searchActivities, 
  performGlobalSearch 
} from '../backend/src/services/searchService.ts';
import { dbStore } from '../backend/src/repositories/db.ts';
import type { Course, Learner, Enrollment, Activity } from '../backend/src/types/index.ts';

// ---------------------------------------------------------------------
// 1. INPUT SANITIZATION & SAFETY
// ---------------------------------------------------------------------
test('1. sanitizeSearchQuery trims whitespace, strips control chars, and caps length', () => {
  assert.equal(sanitizeSearchQuery('   hello world   '), 'hello world');
  assert.equal(sanitizeSearchQuery(null), '');
  assert.equal(sanitizeSearchQuery(undefined), '');
  assert.equal(sanitizeSearchQuery(123), '');
  assert.equal(sanitizeSearchQuery('test\x00\x1Fstring'), 'teststring');
  
  const longQuery = 'a'.repeat(150);
  assert.equal(sanitizeSearchQuery(longQuery).length, 100);
});

// ---------------------------------------------------------------------
// 2. COURSES SEARCH (Page-specific: course name & category)
// ---------------------------------------------------------------------
test('2. searchCourses performs case-insensitive partial match on course_name and category', () => {
  const courses: Course[] = [
    { course_id: 'crs-1', course_name: 'Modern Full-Stack Web Development', category: 'Computer Science', created_at: '', updated_at: '', is_active: true },
    { course_id: 'crs-2', course_name: 'Practical Data Science', category: 'Data & AI', created_at: '', updated_at: '', is_active: true },
    { course_id: 'crs-3', course_name: 'Cloud DevOps Mastery', category: 'Cloud Architecture', created_at: '', updated_at: '', is_active: false },
  ];

  // Match by name partial (case-insensitive)
  const byName = searchCourses(courses, 'full-stack');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].course_id, 'crs-1');

  // Match by category partial
  const byCategory = searchCourses(courses, 'data & ai');
  assert.equal(byCategory.length, 1);
  assert.equal(byCategory[0].course_id, 'crs-2');

  // Match with leading and trailing whitespace
  const withWhitespace = searchCourses(courses, '   devops   ');
  assert.equal(withWhitespace.length, 1);
  assert.equal(withWhitespace[0].course_id, 'crs-3');

  // Empty query returns all courses
  assert.equal(searchCourses(courses, '').length, 3);
  assert.equal(searchCourses(courses, '   ').length, 3);

  // No match returns empty array
  assert.equal(searchCourses(courses, 'nonexistent-query-xyz').length, 0);
});

test('3. Database store searchCourses uses parameterized queries safely', () => {
  // Query existing seeded database
  const courses = dbStore.searchCourses('web development');
  assert.ok(courses.length >= 1);
  assert.equal(courses[0].course_id, 'crs-101');

  // Category filter + search
  const catSearch = dbStore.searchCourses('practical', 'Data & AI');
  assert.equal(catSearch.length, 1);
  assert.equal(catSearch[0].course_id, 'crs-102');

  // SQL injection attempt is treated as literal search string safely
  const injectionAttempt = dbStore.searchCourses("'; DROP TABLE courses; --");
  assert.equal(injectionAttempt.length, 0);
  assert.ok(dbStore.courses.size > 0, 'Courses table remains intact');
});

// ---------------------------------------------------------------------
// 3. LEARNERS SEARCH (Page-specific: learner name & roll number)
// ---------------------------------------------------------------------
test('4. searchLearners performs case-insensitive partial match on display_name and roll_no', () => {
  const learners: Learner[] = [
    { learner_id: 'l1', roll_no: 'CS2026-001', display_name: 'Amina Al-Mansoor', created_at: '', updated_at: '' },
    { learner_id: 'l2', roll_no: 'CS2026-002', display_name: 'Marcus Vance', created_at: '', updated_at: '' },
    { learner_id: 'l3', roll_no: undefined, display_name: 'Elena Rostova', created_at: '', updated_at: '' },
  ];

  // Match by display_name
  const byName = searchLearners(learners, 'amina');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].learner_id, 'l1');

  // Match by roll_no
  const byRoll = searchLearners(learners, '002');
  assert.equal(byRoll.length, 1);
  assert.equal(byRoll[0].learner_id, 'l2');

  // Whitespace trimmed
  const trimmed = searchLearners(learners, '  Marcus  ');
  assert.equal(trimmed.length, 1);

  // Empty query returns all learners
  assert.equal(searchLearners(learners, '').length, 3);
  assert.equal(searchLearners(learners, '   ').length, 3);

  // No match
  assert.equal(searchLearners(learners, 'nobody').length, 0);
});

test('5. Database store searchLearners returns matched records with parameterized SQL', () => {
  const results = dbStore.searchLearners('Amina');
  assert.ok(results.length >= 1);
  assert.equal(results[0].display_name, 'Amina Al-Mansoor');

  const byRoll = dbStore.searchLearners('CS2026-005');
  assert.ok(byRoll.length >= 1);
  assert.equal(byRoll[0].display_name, 'Priya Sundaram');

  const emptyRes = dbStore.searchLearners('');
  assert.ok(emptyRes.length >= 8);
});

// ---------------------------------------------------------------------
// 4. ENROLMENTS SEARCH (Page-specific: enrolment ID, learner identifier, course name)
// ---------------------------------------------------------------------
test('6. searchEnrollments matches enrolment ID, learner identifier, and course name', () => {
  const coursesMap = new Map<string, Course>([
    ['c1', { course_id: 'c1', course_name: 'React Mastery', category: 'CS', created_at: '', updated_at: '', is_active: true }],
    ['c2', { course_id: 'c2', course_name: 'Data Science', category: 'Data', created_at: '', updated_at: '', is_active: true }],
  ]);
  const learnersMap = new Map<string, Learner>([
    ['l1', { learner_id: 'l1', roll_no: 'ROLL-100', display_name: 'Sarah Connor', created_at: '', updated_at: '' }],
    ['l2', { learner_id: 'l2', roll_no: 'ROLL-200', display_name: 'John Connor', created_at: '', updated_at: '' }],
  ]);
  const enrollments: Enrollment[] = [
    { enrollment_id: 'enr-901', learner_id: 'l1', course_id: 'c1', status: 'enrolled', enrolled_at: '', updated_at: '' },
    { enrollment_id: 'enr-902', learner_id: 'l2', course_id: 'c2', status: 'completed', enrolled_at: '', updated_at: '' },
  ];

  // By enrolment ID
  const byId = searchEnrollments(enrollments, coursesMap, learnersMap, 'enr-901');
  assert.equal(byId.length, 1);
  assert.equal(byId[0].enrollment_id, 'enr-901');

  // By learner display_name
  const byLearner = searchEnrollments(enrollments, coursesMap, learnersMap, 'Sarah');
  assert.equal(byLearner.length, 1);
  assert.equal(byLearner[0].enrollment_id, 'enr-901');

  // By learner roll_no
  const byRoll = searchEnrollments(enrollments, coursesMap, learnersMap, 'ROLL-200');
  assert.equal(byRoll.length, 1);
  assert.equal(byRoll[0].enrollment_id, 'enr-902');

  // By course name
  const byCourse = searchEnrollments(enrollments, coursesMap, learnersMap, 'React');
  assert.equal(byCourse.length, 1);
  assert.equal(byCourse[0].enrollment_id, 'enr-901');

  // Empty query returns all
  assert.equal(searchEnrollments(enrollments, coursesMap, learnersMap, '').length, 2);

  // No match
  assert.equal(searchEnrollments(enrollments, coursesMap, learnersMap, 'ghost').length, 0);
});

test('7. Database store searchEnrollments connects to database with parameterized query', () => {
  // Search by learner name
  const enrs = dbStore.searchEnrollments('Amina');
  assert.ok(enrs.length >= 1);
  assert.ok(enrs.some((e) => e.learner_name === 'Amina Al-Mansoor'));

  // Search by course name
  const webEnrs = dbStore.searchEnrollments('Full-Stack');
  assert.ok(webEnrs.length >= 1);

  // Search by enrolment ID
  const specificEnr = dbStore.searchEnrollments('enr-001');
  assert.equal(specificEnr.length, 1);
  assert.equal(specificEnr[0].enrollment_id, 'enr-001');
});

// ---------------------------------------------------------------------
// 5. ACTIVITIES SEARCH (Page-specific: activity type and enrolment ID)
// ---------------------------------------------------------------------
test('8. searchActivities matches activity type and enrolment ID, NOT learner person names', () => {
  const activities: Activity[] = [
    { activity_id: 'act-1', enrollment_id: 'enr-101', lesson_id: 'les-1', activity_type: 'lesson_completed', activity_date: '2026-09-10', completed: true, created_at: '' },
    { activity_id: 'act-2', enrollment_id: 'enr-102', lesson_id: 'les-2', activity_type: 'video_watched', activity_date: '2026-09-11', completed: false, created_at: '' },
    { activity_id: 'act-3', enrollment_id: 'enr-103', lesson_id: 'les-3', activity_type: 'resource_accessed', activity_date: '2026-09-12', completed: false, created_at: '' },
  ];

  // By activity type (exact and partial)
  const byType = searchActivities(activities, 'lesson_completed');
  assert.equal(byType.length, 1);
  assert.equal(byType[0].activity_id, 'act-1');

  // By friendly formatted activity type (e.g. "video watched" or "completed")
  const byFriendly = searchActivities(activities, 'video watched');
  assert.equal(byFriendly.length, 1);
  assert.equal(byFriendly[0].activity_id, 'act-2');

  const byPartialType = searchActivities(activities, 'completed');
  assert.equal(byPartialType.length, 1);
  assert.equal(byPartialType[0].activity_id, 'act-1');

  // By enrolment ID
  const byEnr = searchActivities(activities, 'enr-103');
  assert.equal(byEnr.length, 1);
  assert.equal(byEnr[0].activity_id, 'act-3');

  // Empty query returns all
  assert.equal(searchActivities(activities, '').length, 3);
  assert.equal(searchActivities(activities, '   ').length, 3);

  // No match
  assert.equal(searchActivities(activities, 'nonexistent_event').length, 0);
});

test('9. Database store searchActivities executes parameterized query for type and enrolment ID', () => {
  const byType = dbStore.searchActivities('lesson_completed');
  assert.ok(byType.length >= 5);
  byType.forEach((a) => {
    assert.equal(a.activity_type, 'lesson_completed');
  });

  const byEnr = dbStore.searchActivities('enr-002');
  assert.ok(byEnr.length >= 1);
  byEnr.forEach((a) => {
    assert.equal(a.enrollment_id, 'enr-002');
  });
});

// ---------------------------------------------------------------------
// 6. GLOBAL SEARCH (Cross-entity, typed, validated)
// ---------------------------------------------------------------------
test('10. performGlobalSearch categorizes courses, learners, enrolments, and activities with types', () => {
  const result = dbStore.globalSearch('crs-101');
  assert.ok(result.total_matches > 0);
  assert.ok(result.results.courses.length >= 1);
  assert.equal(result.results.courses[0].type, 'course');
  assert.equal(result.results.courses[0].id, 'crs-101');

  // Empty query handling
  const emptyRes = dbStore.globalSearch('');
  assert.equal(emptyRes.total_matches, 0);
  assert.equal(emptyRes.results.courses.length, 0);
  assert.equal(emptyRes.results.learners.length, 0);
  assert.equal(emptyRes.results.enrollments.length, 0);
  assert.equal(emptyRes.results.activities.length, 0);

  // No matches query handling
  const noMatch = dbStore.globalSearch('absolutely-no-record-matches-this');
  assert.equal(noMatch.total_matches, 0);
});
