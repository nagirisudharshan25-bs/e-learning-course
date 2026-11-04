import { UserRole } from '../types.ts';

let adminToken: string | null = null;
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    adminToken = sessionStorage.getItem('edupulse_admin_token');
  }
} catch {
  // Ignore sessionStorage errors (e.g. sandbox restriction)
}

let currentRole: UserRole = adminToken ? 'administrator' : 'analyst';

export function setCurrentRole(role: UserRole) {
  currentRole = role;
}

export function getCurrentRole(): UserRole {
  return currentRole;
}

export function setAdminToken(token: string | null) {
  adminToken = token;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (token) {
        sessionStorage.setItem('edupulse_admin_token', token);
      } else {
        sessionStorage.removeItem('edupulse_admin_token');
      }
    }
  } catch {
    // Ignore
  }
  if (token) {
    currentRole = 'administrator';
  } else {
    currentRole = 'analyst';
  }
}

export function getAdminToken(): string | null {
  return adminToken;
}

export function isAdministratorAuthenticated(): boolean {
  return Boolean(adminToken);
}

/**
 * Robust HTTP client that safely handles JSON responses, detects unexpected HTML
 * error pages (e.g. from Vite SPA fallbacks or proxy gateways), and provides
 * clear, actionable error messages with HTTP status codes.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('x-user-role', currentRole);
  if (adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new Error(
      `Network connection error when calling "${endpoint}": ${networkErr.message || 'Server unreachable'}. Check backend service status.`
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const rawText = await response.text();
  const trimmed = rawText.trim();
  const looksLikeHtml = trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<');

  // Handle Non-2xx HTTP responses
  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/api/auth/login') {
      // Clear expired or invalidated session token
      setAdminToken(null);
    }
    let errMessage = `HTTP ${response.status} (${response.statusText || 'Error'}) from ${endpoint}`;
    
    if (isJson && trimmed) {
      try {
        const errJson = JSON.parse(rawText);
        if (errJson.message) {
          errMessage = errJson.message;
        } else if (errJson.error) {
          errMessage = `${errJson.error}${errJson.details ? `: ${errJson.details}` : ''}`;
        }
      } catch {
        // Fall back to HTTP status message
      }
    } else if (looksLikeHtml || contentType.includes('text/html')) {
      errMessage = `Server returned an unexpected HTML response (HTTP ${response.status}) instead of JSON for "${endpoint}". The API route may be missing or unhandled.`;
    } else if (trimmed) {
      errMessage = trimmed.slice(0, 200);
    }
    
    throw new Error(errMessage);
  }

  // Handle 200 OK responses that returned HTML instead of expected JSON (e.g., SPA router fallback)
  if (!isJson && (looksLikeHtml || contentType.includes('text/html'))) {
    throw new Error(
      `API endpoint "${endpoint}" returned HTML (Vite/SPA page) instead of valid JSON. Verify the backend route is registered and responding on port 3000.`
    );
  }

  // Parse JSON with defensive error handling
  try {
    return JSON.parse(rawText) as T;
  } catch (parseErr: any) {
    throw new Error(
      `Failed to parse response from "${endpoint}" as JSON: ${parseErr.message}. Response preview: "${trimmed.slice(0, 100)}..."`
    );
  }
}

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // Courses
  getCourses: (params?: { search?: string; category?: string; is_active?: boolean }) => {
    const qs = buildQueryString({
      search: params?.search,
      category: params?.category && params.category !== 'All' ? params.category : undefined,
      is_active: params?.is_active,
    });
    return request<{ data: any[] }>(`/api/courses${qs}`);
  },
  getCourse: (id: string) => request<{ data: any }>(`/api/courses/${encodeURIComponent(id)}`),
  createCourse: (data: { course_name: string; category: string; description?: string; is_active?: boolean }) =>
    request<{ message: string; data: any }>('/api/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: Partial<{ course_name: string; category: string; description: string; is_active: boolean }>) =>
    request<{ message: string; data: any }>(`/api/courses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleCourseStatus: (id: string, is_active: boolean) =>
    request<{ message: string; data: any }>(`/api/courses/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),

  // Lessons
  getCourseLessons: (courseId: string) => request<{ data: any[] }>(`/api/courses/${encodeURIComponent(courseId)}/lessons`),
  createLesson: (courseId: string, data: { lesson_name: string; sequence_no?: number; is_required?: boolean }) =>
    request<{ message: string; data: any }>(`/api/courses/${encodeURIComponent(courseId)}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (lessonId: string, data: { lesson_name?: string; sequence_no?: number; is_required?: boolean }) =>
    request<{ message: string; data: any }>(`/api/lessons/${encodeURIComponent(lessonId)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Modules & Educational Videos
  getCourseModules: (courseId: string) =>
    request<{ data: any[] }>(`/api/courses/${encodeURIComponent(courseId)}/modules`),
  getModuleVideos: (moduleId: string) =>
    request<{ data: any[] }>(`/api/modules/${encodeURIComponent(moduleId)}/videos`),
  getVideo: (videoId: string) =>
    request<{ data: any }>(`/api/videos/${encodeURIComponent(videoId)}`),
  updateVideo: (videoId: string, data: { title?: string; youtube_url?: string; duration?: string; description?: string }) =>
    request<{ message: string; data: any }>(`/api/videos/${encodeURIComponent(videoId)}`, { method: 'PUT', body: JSON.stringify(data) }),
  watchVideo: (videoId: string, enrollmentId: string) =>
    request<{ message: string; data: any }>(`/api/videos/${encodeURIComponent(videoId)}/watch`, { method: 'POST', body: JSON.stringify({ enrollment_id: enrollmentId }) }),
  completeVideo: (videoId: string, enrollmentId: string) =>
    request<{ message: string; data: any }>(`/api/videos/${encodeURIComponent(videoId)}/complete`, { method: 'POST', body: JSON.stringify({ enrollment_id: enrollmentId }) }),
  getEnrollmentVideoProgress: (enrollmentId: string) =>
    request<{ data: { enrollment_id: string; course_id: string; completed_video_ids: string[]; total_completed: number } }>(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/video-progress`
    ),


  // Learners
  getLearners: (search?: string) => {
    const qs = buildQueryString({ search });
    return request<{ data: any[] }>(`/api/learners${qs}`);
  },
  getLearner: (id: string) => request<{ data: any }>(`/api/learners/${encodeURIComponent(id)}`),
  createLearner: (data: { display_name: string; roll_no?: string }) =>
    request<{ message: string; data: any }>('/api/learners', { method: 'POST', body: JSON.stringify(data) }),
  updateLearner: (id: string, data: { display_name?: string; roll_no?: string }) =>
    request<{ message: string; data: any }>(`/api/learners/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Enrollments
  getEnrollments: (params?: { search?: string; course_id?: string; learner_id?: string; status?: string }) => {
    const qs = buildQueryString({
      search: params?.search,
      course_id: params?.course_id && params.course_id !== 'All' ? params.course_id : undefined,
      learner_id: params?.learner_id && params.learner_id !== 'All' ? params.learner_id : undefined,
      status: params?.status && params.status !== 'All' ? params.status : undefined,
    });
    return request<{ data: any[] }>(`/api/enrollments${qs}`);
  },
  createEnrollment: (data: { learner_id: string; course_id: string; status?: string }) =>
    request<{ message: string; data: any }>('/api/enrollments', { method: 'POST', body: JSON.stringify(data) }),
  updateEnrollmentStatus: (id: string, status: string) =>
    request<{ message: string; data: any }>(`/api/enrollments/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Activities
  getActivities: (params?: { search?: string; course_id?: string; enrollment_id?: string; activity_type?: string; start_date?: string; end_date?: string }) => {
    const qs = buildQueryString({
      search: params?.search,
      course_id: params?.course_id && params.course_id !== 'All' ? params.course_id : undefined,
      enrollment_id: params?.enrollment_id && params.enrollment_id !== 'All' ? params.enrollment_id : undefined,
      activity_type: params?.activity_type && params.activity_type !== 'All' ? params.activity_type : undefined,
      start_date: params?.start_date,
      end_date: params?.end_date,
    });
    return request<{ data: any[] }>(`/api/activities${qs}`);
  },
  createActivity: (data: { enrollment_id: string; lesson_id?: string; activity_type: string; completed?: boolean; activity_date?: string }) =>
    request<{ message: string; data: any }>('/api/activities', { method: 'POST', body: JSON.stringify(data) }),

  // Global Search
  globalSearch: (query: string) => {
    const qs = buildQueryString({ q: query.trim() });
    return request<{ data: any }>(`/api/search${qs}`);
  },

  // Analytics
  getOverview: (refDate?: string) => {
    const qs = buildQueryString({ ref_date: refDate });
    return request<{ metrics: any; course_performance: any[]; denominator_note: string }>(`/api/analytics/overview${qs}`);
  },
  getCourseAnalytics: () => request<{ data: any[] }>('/api/analytics/courses'),
  getCompletionAnalytics: () => request<{ data: any[] }>('/api/analytics/completion'),
  getProgressAnalytics: () => request<{ data: { distribution: any[]; total_analyzed: number; individual_progress: any[] } }>('/api/analytics/progress'),
  getWeeklyActivity: () => request<{ data: any[] }>('/api/analytics/activity/weekly'),
  getInactiveEnrollments: (threshold = 14, refDate?: string) => {
    const qs = buildQueryString({ threshold, ref_date: refDate });
    return request<{ data: { records: any[]; reference_timestamp: string; inactivity_threshold_days: number; flagged_count: number; active_in_window_count: number; no_history_count: number; excluded_count: number; limitation_statement: string } }>(
      `/api/analytics/inactive-enrollments${qs}`
    );
  },

  // System & Health Check
  getHealth: () => request<{ status: string; service: string; uptime_seconds: number; timestamp: string; database: any }>('/api/health'),
  getDatabaseStatus: () => request<{ data: any }>('/api/system/db-status'),
  resetDatabase: () => request<{ message: string; counts: any }>('/api/system/reset', { method: 'POST' }),

  // Authentication API
  login: async (username: string, password: string) => {
    const res = await request<{ message: string; token: string; user: { username: string; role: UserRole }; expiresAt: number }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
    if (res.token) {
      setAdminToken(res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await request<{ message: string }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      setAdminToken(null);
    }
  },
  getMe: () => request<{ authenticated: boolean; user?: { username: string; role: UserRole }; role?: string }>('/api/auth/me'),
  getAuthStatus: () => request<{ data: { username: string; activeSessionsCount: number; hasCustomPasswordEnv: boolean; defaultDemoHint?: string } }>('/api/auth/status'),
};
