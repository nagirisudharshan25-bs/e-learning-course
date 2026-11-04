import type { 
  Course, 
  Enrollment, 
  Lesson, 
  Activity, 
  CoursePerformanceMetric, 
  ProgressMetric, 
  InactivityRecord, 
  InactivityStatus, 
  WeeklyActivityMetric 
} from '../types/index.ts';

/**
 * Calculates course completion rates using strictly documented numerators and denominators.
 * Policy: 'enrolled_and_completed'
 * Excludes 'withdrawn' and 'cancelled' enrolments from the denominator.
 */
export function calculateCompletionRates(
  courses: Course[],
  enrollments: Enrollment[],
  eligibilityPolicy = 'enrolled_and_completed'
): CoursePerformanceMetric[] {
  return courses.map((course) => {
    const cEnrs = enrollments.filter((e) => e.course_id === course.course_id);
    const eligibleEnrs = cEnrs.filter((e) => e.status === 'enrolled' || e.status === 'completed');
    const completedEnrs = eligibleEnrs.filter((e) => e.status === 'completed');

    const totalEligible = eligibleEnrs.length;
    const completedCount = completedEnrs.length;
    const withdrawnCount = cEnrs.filter((e) => e.status === 'withdrawn').length;
    const cancelledCount = cEnrs.filter((e) => e.status === 'cancelled').length;

    // Safe rate calculation protecting against division by zero
    const completionRate = totalEligible > 0 ? Number(((completedCount / totalEligible) * 100).toFixed(1)) : 0.0;

    return {
      course_id: course.course_id,
      course_name: course.course_name,
      category: course.category,
      is_active: course.is_active,
      total_enrolments: cEnrs.length,
      eligible_enrolments: totalEligible,
      completed_enrolments: completedCount,
      withdrawn_enrolments: withdrawnCount,
      cancelled_enrolments: cancelledCount,
      completion_rate_percent: completionRate,
      formula: 'completed_enrolments / eligible_enrolments * 100',
      denominator_definition: 'Count of distinct enrolments with status in ("enrolled", "completed")',
    };
  });
}

/**
 * Calculates progress for an individual enrolment.
 * Denominator is strictly distinct REQUIRED lessons in the course.
 * Duplicate lesson completion records do NOT inflate the count.
 * Non-required lessons are excluded from the progress denominator.
 * Courses with zero required lessons safely yield 0.0%.
 */
export function calculateEnrolmentProgress(
  enrollment: Enrollment,
  lessons: Lesson[],
  activities: Activity[],
  courseName?: string,
  learnerName?: string
): ProgressMetric {
  const courseLessons = lessons.filter((l) => l.course_id === enrollment.course_id);
  const requiredLessons = courseLessons.filter((l) => l.is_required);
  const optionalLessons = courseLessons.filter((l) => !l.is_required);

  const requiredLessonIds = new Set(requiredLessons.map((l) => l.lesson_id));
  const optionalLessonIds = new Set(optionalLessons.map((l) => l.lesson_id));

  // Find all distinct completed lesson IDs for this enrolment
  const enrActivities = activities.filter((a) => a.enrollment_id === enrollment.enrollment_id);
  const completedLessonIds = new Set<string>();

  for (const act of enrActivities) {
    if (act.completed && act.lesson_id) {
      completedLessonIds.add(act.lesson_id);
    }
  }

  let distinctRequiredCompleted = 0;
  for (const id of completedLessonIds) {
    if (requiredLessonIds.has(id)) {
      distinctRequiredCompleted++;
    }
  }

  let distinctOptionalCompleted = 0;
  for (const id of completedLessonIds) {
    if (optionalLessonIds.has(id)) {
      distinctOptionalCompleted++;
    }
  }

  const totalRequired = requiredLessons.length;
  let progressPercentage = 0.0;

  if (totalRequired > 0) {
    progressPercentage = Number(Math.min(100.0, (distinctRequiredCompleted / totalRequired) * 100).toFixed(1));
  } else {
    // Zero required lessons: safe fallback to 0.0
    progressPercentage = 0.0;
  }

  const isFullyCompleted = totalRequired > 0 && distinctRequiredCompleted === totalRequired;

  let progressBand: ProgressMetric['progress_band'] = '0-24%';
  if (progressPercentage === 100.0) progressBand = '100%';
  else if (progressPercentage >= 75.0) progressBand = '75-99%';
  else if (progressPercentage >= 50.0) progressBand = '50-74%';
  else if (progressPercentage >= 25.0) progressBand = '25-49%';

  return {
    enrollment_id: enrollment.enrollment_id,
    learner_id: enrollment.learner_id,
    learner_name: learnerName,
    course_id: enrollment.course_id,
    course_name: courseName,
    status: enrollment.status,
    total_required_lessons: totalRequired,
    total_optional_lessons: optionalLessons.length,
    distinct_required_completed: distinctRequiredCompleted,
    distinct_optional_completed: distinctOptionalCompleted,
    progress_percentage: progressPercentage,
    progress_band: progressBand,
    is_fully_completed: isFullyCompleted,
  };
}

/**
 * Aggregates activities by calendar week (Monday start).
 */
export function getWeeklyActivitySummary(
  activities: Activity[],
  enrollmentsMap: Map<string, Enrollment> = new Map()
): WeeklyActivityMetric[] {
  const weeksMap = new Map<string, {
    week_label: string;
    total_events: number;
    completed_events: number;
    active_enrolments: Set<string>;
    active_learners: Set<string>;
    breakdown: Record<string, number>;
  }>();

  for (const act of activities) {
    const d = new Date(act.activity_date);
    if (isNaN(d.getTime())) continue;

    // ISO week calculation
    const tempDate = new Date(d.valueOf());
    const dayNr = (d.getUTCDay() + 6) % 7;
    tempDate.setUTCDate(tempDate.getUTCDate() - dayNr + 3);
    const firstThursday = tempDate.valueOf();
    tempDate.setUTCMonth(0, 1);
    if (tempDate.getUTCDay() !== 4) {
      tempDate.setUTCMonth(0, 1 + ((4 - tempDate.getUTCDay() + 7) % 7));
    }
    const weekNumber = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
    const year = tempDate.getUTCFullYear();
    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, {
        week_label: `W${weekNumber} (${year})`,
        total_events: 0,
        completed_events: 0,
        active_enrolments: new Set(),
        active_learners: new Set(),
        breakdown: {},
      });
    }

    const entry = weeksMap.get(weekKey)!;
    entry.total_events++;
    if (act.completed) entry.completed_events++;

    if (act.enrollment_id) {
      entry.active_enrolments.add(act.enrollment_id);
      const enr = enrollmentsMap.get(act.enrollment_id);
      if (enr) entry.active_learners.add(enr.learner_id);
    }

    const typeKey = act.activity_type || 'other';
    entry.breakdown[typeKey] = (entry.breakdown[typeKey] || 0) + 1;
  }

  const sortedKeys = Array.from(weeksMap.keys()).sort();
  return sortedKeys.map((key) => {
    const item = weeksMap.get(key)!;
    return {
      week_key: key,
      week_label: item.week_label,
      total_events: item.total_events,
      completed_events: item.completed_events,
      distinct_active_enrollments: item.active_enrolments.size,
      distinct_active_learners: item.active_learners.size,
      breakdown: item.breakdown,
    };
  });
}

/**
 * Inactivity monitor evaluating inactivity relative to a reference date.
 * Explicit statuses and disclaimer that inactivity is a rule-based flag, not a judgment.
 */
export function getInactivityAnalysis(
  enrollments: Enrollment[],
  activities: Activity[],
  coursesMap: Map<string, Course>,
  learnersMap: Map<string, { display_name: string; roll_no?: string }>,
  inactivityThresholdDays = 14,
  referenceTimestamp = new Date()
): {
  reference_timestamp: string;
  inactivity_threshold_days: number;
  total_monitored: number;
  flagged_count: number;
  active_in_window_count: number;
  no_history_count: number;
  excluded_count: number;
  records: InactivityRecord[];
} {
  const enrActivities = new Map<string, Activity[]>();
  for (const act of activities) {
    if (!enrActivities.has(act.enrollment_id)) {
      enrActivities.set(act.enrollment_id, []);
    }
    enrActivities.get(act.enrollment_id)!.push(act);
  }

  const records: InactivityRecord[] = [];
  let flaggedCount = 0;
  let activeCount = 0;
  let noHistoryCount = 0;
  let excludedCount = 0;

  for (const enr of enrollments) {
    const course = coursesMap.get(enr.course_id);
    const learner = learnersMap.get(enr.learner_id);
    const courseName = course ? course.course_name : enr.course_id;
    const learnerName = learner ? learner.display_name : enr.learner_id;
    const rollNo = learner?.roll_no;

    const acts = enrActivities.get(enr.enrollment_id) || [];

    let inactivityStatus: InactivityStatus;
    let isFlagged = false;
    let flagReason = '';
    let daysSinceLast: number | null = null;
    let lastRecordedActivity: string | null = null;

    if (enr.status === 'withdrawn' || enr.status === 'cancelled') {
      inactivityStatus = 'excluded_by_status';
      flagReason = `Enrolment is ${enr.status}; excluded from inactivity monitoring.`;
      excludedCount++;
    } else if (enr.status === 'completed') {
      inactivityStatus = 'completed_enrolment';
      flagReason = 'Enrolment has already been completed.';
    } else if (acts.length === 0) {
      inactivityStatus = 'no_activity_history';
      flagReason = 'No learning activity has ever been recorded for this enrolment.';
      isFlagged = true;
      flaggedCount++;
      noHistoryCount++;
    } else {
      // Find latest activity date
      let latestTime = 0;
      for (const a of acts) {
        const t = new Date(a.activity_date).getTime();
        if (t > latestTime) {
          latestTime = t;
        }
      }

      if (latestTime > 0) {
        const diffMs = referenceTimestamp.getTime() - latestTime;
        daysSinceLast = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        lastRecordedActivity = new Date(latestTime).toISOString().replace('T', ' ').slice(0, 19);

        if (daysSinceLast > inactivityThresholdDays) {
          inactivityStatus = 'no_activity_within_window';
          flagReason = `No activity recorded in the past ${daysSinceLast} days (threshold: ${inactivityThresholdDays} days).`;
          isFlagged = true;
          flaggedCount++;
        } else {
          inactivityStatus = 'active_within_window';
          flagReason = `Active ${daysSinceLast} days ago (within ${inactivityThresholdDays}-day window).`;
          activeCount++;
        }
      } else {
        inactivityStatus = 'no_activity_history';
        flagReason = 'Activity timestamps could not be validated.';
        isFlagged = true;
        flaggedCount++;
        noHistoryCount++;
      }
    }

    records.push({
      enrollment_id: enr.enrollment_id,
      learner_id: enr.learner_id,
      learner_name: learnerName,
      roll_no: rollNo,
      course_id: enr.course_id,
      course_name: courseName,
      enrollment_status: enr.status,
      inactivity_status: inactivityStatus,
      is_flagged: isFlagged,
      last_recorded_activity: lastRecordedActivity,
      days_since_last_activity: daysSinceLast,
      configured_threshold_days: inactivityThresholdDays,
      flag_reason: flagReason,
    });
  }

  return {
    reference_timestamp: referenceTimestamp.toISOString(),
    inactivity_threshold_days: inactivityThresholdDays,
    total_monitored: enrollments.length,
    flagged_count: flaggedCount,
    active_in_window_count: activeCount,
    no_history_count: noHistoryCount,
    excluded_count: excludedCount,
    records,
  };
}

/**
 * Escapes CSV values to prevent spreadsheet formula injection vulnerabilities.
 * Prefixes strings starting with =, +, -, @, \t, \r with single quote.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // Guard against CSV formula injection
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = "'" + str;
  }

  // Double quotes escape
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}
