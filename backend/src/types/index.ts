export type CourseCategory = 
  | 'Computer Science' 
  | 'Data & AI' 
  | 'Cloud Architecture' 
  | 'Information Security' 
  | 'Design & Product' 
  | 'General Studies'
  | 'Advanced Science';

export interface Course {
  course_id: string;
  course_name: string;
  category: CourseCategory | string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Learner {
  learner_id: string;
  roll_no?: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export type EnrollmentStatus = 'enrolled' | 'completed' | 'withdrawn' | 'cancelled';

export interface Enrollment {
  enrollment_id: string;
  learner_id: string;
  course_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  updated_at: string;
}

export interface Lesson {
  lesson_id: string;
  course_id: string;
  lesson_name: string;
  sequence_no: number;
  is_required: boolean;
  created_at: string;
}

export interface ModuleVideo {
  video_id: string;
  module_id: string;
  course_id: string;
  title: string;
  youtube_video_id: string;
  youtube_url: string;
  embed_url: string;
  thumbnail_url?: string;
  duration: string;
  duration_seconds: number;
  channel_name?: string;
  description?: string;
  sequence_no: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  module_id: string;
  course_id: string;
  module_name: string;
  title?: string;
  description?: string;
  sequence_no: number;
  created_at: string;
  updated_at: string;
  video_count?: number;
  videos?: ModuleVideo[];
}


export type ActivityType = 
  | 'lesson_opened' 
  | 'lesson_started' 
  | 'lesson_completed' 
  | 'video_watched' 
  | 'resource_accessed';

export interface Activity {
  activity_id: string;
  enrollment_id: string;
  lesson_id?: string | null;
  activity_type: ActivityType;
  activity_date: string;
  completed: boolean;
  created_at: string;
}

export type UserRole = 'administrator' | 'analyst';

export interface CoursePerformanceMetric {
  course_id: string;
  course_name: string;
  category: string;
  is_active: boolean;
  total_enrolments: number;
  eligible_enrolments: number;
  completed_enrolments: number;
  withdrawn_enrolments: number;
  cancelled_enrolments: number;
  completion_rate_percent: number;
  formula: string;
  denominator_definition: string;
}

export interface ProgressMetric {
  enrollment_id: string;
  learner_id: string;
  learner_name?: string;
  course_id: string;
  course_name?: string;
  status: EnrollmentStatus;
  total_required_lessons: number;
  total_optional_lessons: number;
  distinct_required_completed: number;
  distinct_optional_completed: number;
  progress_percentage: number;
  progress_band: '0-24%' | '25-49%' | '50-74%' | '75-99%' | '100%';
  is_fully_completed: boolean;
}

export type InactivityStatus = 
  | 'active_within_window' 
  | 'no_activity_within_window' 
  | 'no_activity_history' 
  | 'excluded_by_status'
  | 'completed_enrolment';

export interface InactivityRecord {
  enrollment_id: string;
  learner_id: string;
  learner_name: string;
  roll_no?: string;
  course_id: string;
  course_name: string;
  enrollment_status: EnrollmentStatus;
  inactivity_status: InactivityStatus;
  is_flagged: boolean;
  last_recorded_activity: string | null;
  days_since_last_activity: number | null;
  configured_threshold_days: number;
  flag_reason: string;
}

export interface WeeklyActivityMetric {
  week_key: string;
  week_label: string;
  total_events: number;
  completed_events: number;
  distinct_active_enrollments: number;
  distinct_active_learners: number;
  breakdown: Record<string, number>;
}

// ---------------------------------------------------------------------
// AUTHENTICATION & USER MANAGEMENT
// ---------------------------------------------------------------------
export interface User {
  user_id: string;
  email: string;
  password_hash: string;
  salt: string;
  display_name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------
// COURSE CREATION APPROVAL WORKFLOW
// ---------------------------------------------------------------------
export type CourseRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProposedLesson {
  lesson_name: string;
  sequence_no: number;
  is_required: boolean;
}

export interface CourseRequest {
  request_id: string;
  analyst_id: string;
  analyst_name: string;
  analyst_email: string;
  course_name: string;
  category: CourseCategory | string;
  description?: string;
  lessons: ProposedLesson[];
  status: CourseRequestStatus;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  review_notes?: string | null;
  rejection_reason?: string | null;
  published_course_id?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

// ---------------------------------------------------------------------
// AUDIT LOGGING & ACTIVITY MONITORING
// ---------------------------------------------------------------------
export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'COURSE_REQUEST_CREATED'
  | 'COURSE_REQUEST_APPROVED'
  | 'COURSE_REQUEST_REJECTED'
  | 'COURSE_PUBLISHED'
  | 'COURSE_UPDATED'
  | 'COURSE_STATUS_TOGGLED'
  | 'LEARNER_REGISTERED'
  | 'ENROLLMENT_CREATED'
  | 'ACTIVITY_LOGGED'
  | 'SYSTEM_RESET';

export type AuditEntityType =
  | 'course_request'
  | 'course'
  | 'learner'
  | 'enrollment'
  | 'activity'
  | 'auth'
  | 'system';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'REJECTED';

export interface AuditLog {
  audit_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole | 'system';
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string;
  related_request_id?: string | null;
  outcome: AuditOutcome;
  metadata?: Record<string, any>;
  created_at: string;
}

// ---------------------------------------------------------------------
// DASHBOARD & ANALYTICS METRICS
// ---------------------------------------------------------------------
export interface AdminDashboardMetrics {
  total_analysts: number;
  published_courses: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_requests: number;
  approval_rate_percent: number;
  requests_over_time: { date: string; pending: number; approved: number; rejected: number; total: number }[];
  status_distribution: { name: string; value: number; color: string }[];
  analyst_activity_stats: {
    analyst_id: string;
    analyst_name: string;
    analyst_email: string;
    department?: string;
    total_requests: number;
    approved: number;
    pending: number;
    rejected: number;
    last_active: string | null;
  }[];
  recent_audit_events: AuditLog[];
}

export interface AnalystDashboardMetrics {
  analyst_id: string;
  analyst_name: string;
  total_personal_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  published_courses_count: number;
  recent_personal_requests: CourseRequest[];
  personal_activity_history: AuditLog[];
}
