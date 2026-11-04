import type { Course, Learner, Enrollment, Lesson, Activity } from '../types/index.ts';

export interface SearchResultItem {
  id: string;
  type: 'course' | 'learner' | 'enrollment' | 'activity';
  title: string;
  subtitle: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface GlobalSearchResponse {
  query: string;
  total_matches: number;
  results: {
    courses: SearchResultItem[];
    learners: SearchResultItem[];
    enrollments: SearchResultItem[];
    activities: SearchResultItem[];
  };
}

/**
 * Sanitizes and validates search input.
 * Trims whitespace, limits length to 100 characters, and removes dangerous control characters.
 */
export function sanitizeSearchQuery(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, 100)
    .replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Searches courses by course_name, category, or course_id.
 * Case-insensitive partial matching with trimmed whitespace input.
 * Handles empty queries by returning the complete list.
 */
export function searchCourses(courses: Course[], query: string): Course[] {
  const cleanQuery = sanitizeSearchQuery(query).toLowerCase();
  if (!cleanQuery) return courses;

  return courses.filter((c) => {
    const nameMatch = c.course_name.toLowerCase().includes(cleanQuery);
    const categoryMatch = c.category.toLowerCase().includes(cleanQuery);
    const idMatch = c.course_id.toLowerCase().includes(cleanQuery);
    return nameMatch || categoryMatch || idMatch;
  });
}

/**
 * Searches learners by display_name, roll_no, or learner_id.
 * Case-insensitive partial matching with trimmed whitespace input.
 * Handles empty queries by returning the complete list.
 */
export function searchLearners(learners: Learner[], query: string): Learner[] {
  const cleanQuery = sanitizeSearchQuery(query).toLowerCase();
  if (!cleanQuery) return learners;

  return learners.filter((l) => {
    const nameMatch = l.display_name.toLowerCase().includes(cleanQuery);
    const rollMatch = l.roll_no ? l.roll_no.toLowerCase().includes(cleanQuery) : false;
    const idMatch = l.learner_id.toLowerCase().includes(cleanQuery);
    return nameMatch || rollMatch || idMatch;
  });
}

/**
 * Searches enrolments by enrolment ID, learner identifier (name, roll_no, ID), or course name.
 * Case-insensitive partial matching with trimmed whitespace input.
 * Handles empty queries by returning the complete list.
 */
export function searchEnrollments(
  enrollments: Enrollment[],
  coursesMap: Map<string, Course>,
  learnersMap: Map<string, Learner>,
  query: string
): Enrollment[] {
  const cleanQuery = sanitizeSearchQuery(query).toLowerCase();
  if (!cleanQuery) return enrollments;

  return enrollments.filter((e) => {
    const idMatch = e.enrollment_id.toLowerCase().includes(cleanQuery);
    const learner = learnersMap.get(e.learner_id);
    const course = coursesMap.get(e.course_id);

    const learnerNameMatch = learner ? learner.display_name.toLowerCase().includes(cleanQuery) : false;
    const rollNoMatch = learner?.roll_no ? learner.roll_no.toLowerCase().includes(cleanQuery) : false;
    const learnerIdMatch = e.learner_id.toLowerCase().includes(cleanQuery);
    const courseNameMatch = course ? course.course_name.toLowerCase().includes(cleanQuery) : false;
    const courseIdMatch = e.course_id.toLowerCase().includes(cleanQuery);

    return idMatch || learnerNameMatch || rollNoMatch || learnerIdMatch || courseNameMatch || courseIdMatch;
  });
}

/**
 * Searches activities specifically by activity_type and enrolment ID.
 * Supports friendly spaced representations (e.g. "lesson completed" matches "lesson_completed").
 * Case-insensitive partial matching with trimmed whitespace input.
 * Handles empty queries by returning the complete list.
 */
export function searchActivities(
  activities: Activity[],
  query: string
): Activity[] {
  const cleanQuery = sanitizeSearchQuery(query).toLowerCase();
  if (!cleanQuery) return activities;

  return activities.filter((a) => {
    const rawType = a.activity_type.toLowerCase();
    const friendlyType = rawType.replace(/_/g, ' ');
    const typeMatch = rawType.includes(cleanQuery) || friendlyType.includes(cleanQuery);

    const enrIdMatch = a.enrollment_id.toLowerCase().includes(cleanQuery);
    const actIdMatch = a.activity_id.toLowerCase().includes(cleanQuery);

    return typeMatch || enrIdMatch || actIdMatch;
  });
}

/**
 * Global search across all database entities.
 * Returns categorized, type-labeled results with relevant metadata.
 */
export function performGlobalSearch(
  query: string,
  store: {
    courses: Map<string, Course>;
    learners: Map<string, Learner>;
    enrollments: Map<string, Enrollment>;
    lessons: Map<string, Lesson>;
    activities: Map<string, Activity>;
    globalSearch?: (q: string) => GlobalSearchResponse;
  }
): GlobalSearchResponse {
  if (typeof store.globalSearch === 'function') {
    return store.globalSearch(query);
  }

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

  const coursesList = Array.from(store.courses.values());
  const learnersList = Array.from(store.learners.values());
  const enrollmentsList = Array.from(store.enrollments.values());
  const activitiesList = Array.from(store.activities.values());

  const matchedCourses = searchCourses(coursesList, cleanQuery);
  const matchedLearners = searchLearners(learnersList, cleanQuery);
  const matchedEnrollments = searchEnrollments(enrollmentsList, store.courses, store.learners, cleanQuery);
  const matchedActivities = searchActivities(activitiesList, cleanQuery);

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

  const formattedEnrollments: SearchResultItem[] = matchedEnrollments.map((e) => {
    const course = store.courses.get(e.course_id);
    const learner = store.learners.get(e.learner_id);
    return {
      id: e.enrollment_id,
      type: 'enrollment',
      title: `${learner?.display_name || e.learner_id} in ${course?.course_name || e.course_id}`,
      subtitle: `Enrolment ID: ${e.enrollment_id} • Status: ${e.status.toUpperCase()}`,
      details: `Enrolled on ${e.enrolled_at.slice(0, 10)}`,
      metadata: {
        status: e.status,
        course_id: e.course_id,
        learner_id: e.learner_id,
      },
    };
  });

  const formattedActivities: SearchResultItem[] = matchedActivities.map((a) => {
    const enr = store.enrollments.get(a.enrollment_id);
    const course = enr ? store.courses.get(enr.course_id) : undefined;
    const learner = enr ? store.learners.get(enr.learner_id) : undefined;
    const lesson = a.lesson_id ? store.lessons.get(a.lesson_id) : undefined;

    const friendlyType = a.activity_type.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

    return {
      id: a.activity_id,
      type: 'activity',
      title: `${friendlyType} (${a.completed ? 'Completed' : 'Logged'})`,
      subtitle: `Enrolment: ${a.enrollment_id} • ${learner?.display_name || 'Learner'}`,
      details: `${course?.course_name || 'Course'} • ${lesson?.lesson_name || 'General resource'} • ${a.activity_date}`,
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
