import { Router, type Request, type Response, type NextFunction } from 'express';
import { dbStore } from '../repositories/db.ts';
import { authService } from '../services/authService.ts';
import { 
  calculateCompletionRates, 
  calculateEnrolmentProgress, 
  getWeeklyActivitySummary, 
  getInactivityAnalysis, 
  escapeCsvField 
} from '../services/analyticsLogic.ts';
import { 
  searchCourses, 
  searchLearners, 
  searchEnrollments, 
  searchActivities, 
  performGlobalSearch,
  sanitizeSearchQuery
} from '../services/searchService.ts';
import type { Course, Learner, Enrollment, Lesson, Activity, UserRole } from '../types/index.ts';

export const apiRouter = Router();

// Middleware: Extract Authentication Session or Role
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const session = authService.validateToken(authHeader);
    if (session) {
      (req as any).user = session;
      (req as any).userRole = 'administrator';
      return next();
    } else {
      (req as any).invalidToken = true;
    }
  }

  const roleHeader = (req.headers['x-user-role'] as string) || '';
  if (roleHeader.toLowerCase() === 'analyst') {
    (req as any).userRole = 'analyst';
  } else {
    (req as any).userRole = 'unauthenticated';
  }
  next();
});

// Guard helper: Enforce authenticated Administrator role
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).invalidToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired administrator token. Please log in again.'
    });
  }

  const user = (req as any).user;
  const role = (req as any).userRole;

  if (role === 'analyst') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Role "Administrator" is required to perform this action. Analysts have read-only access to analytics and exports.'
    });
  }

  if (!user || user.role !== 'administrator') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in as an Administrator with a valid password to perform this action.'
    });
  }

  next();
}

// ---------------------------------------------------------------------
// AUTHENTICATION API
// ---------------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Username and password are required.'
    });
  }

  const isValid = authService.verifyCredentials(String(username), String(password));
  if (!isValid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid administrator credentials. Please check your username and password.'
    });
  }

  const session = authService.createSession(String(username));
  res.json({
    message: 'Authentication successful',
    token: session.token,
    user: {
      username: session.username,
      role: session.role,
    },
    expiresAt: session.expiresAt,
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const session = authService.validateToken(authHeader);
  if (session) {
    return res.json({
      authenticated: true,
      user: {
        username: session.username,
        role: session.role,
      },
    });
  }

  res.json({
    authenticated: false,
    role: 'analyst',
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    authService.destroySession(authHeader);
  }
  res.json({ message: 'Logged out successfully' });
});

apiRouter.get('/auth/status', (_req: Request, res: Response) => {
  res.json({ data: authService.getStatus() });
});

// ---------------------------------------------------------------------
// GLOBAL SEARCH API
// ---------------------------------------------------------------------
apiRouter.get('/search', (req: Request, res: Response) => {
  const query = sanitizeSearchQuery(req.query.q || req.query.search || '');
  const result = dbStore.globalSearch(query);
  res.json({ data: result });
});

// ---------------------------------------------------------------------
// COURSES API
// ---------------------------------------------------------------------
apiRouter.get('/courses', (req: Request, res: Response) => {
  const searchQuery = req.query.search !== undefined ? sanitizeSearchQuery(req.query.search) : undefined;
  const category = req.query.category && req.query.category !== 'All' ? String(req.query.category) : undefined;
  const isActive = req.query.is_active !== undefined && req.query.is_active !== '' && req.query.is_active !== 'All'
    ? (req.query.is_active === 'true' || req.query.is_active === '1')
    : undefined;

  const courses = dbStore.searchCourses(searchQuery, category, isActive);

  // Include lesson, module, and video counts
  const enriched = courses.map((c) => {
    const cLessons = Array.from(dbStore.lessons.values()).filter((l) => l.course_id === c.course_id);
    const requiredCount = cLessons.filter((l) => l.is_required).length;
    const optionalCount = cLessons.filter((l) => !l.is_required).length;
    const cEnrs = Array.from(dbStore.enrollments.values()).filter((e) => e.course_id === c.course_id);
    const cModules = dbStore.getModulesByCourse(c.course_id);
    const totalVideos = cModules.reduce((acc, m) => acc + (m.videos?.length || 0), 0);
    return {
      ...c,
      total_lessons: cLessons.length,
      required_lessons: requiredCount,
      optional_lessons: optionalCount,
      enrolment_count: cEnrs.length,
      total_modules: cModules.length,
      total_videos: totalVideos,
    };
  });

  res.json({ data: enriched });
});

apiRouter.post('/courses', requireAdmin, (req: Request, res: Response) => {
  const { course_name, category, description, is_active } = req.body;

  if (!course_name || typeof course_name !== 'string' || !course_name.trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'course_name is required' });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'category is required' });
  }

  const course_id = `crs-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newCourse: Course = {
    course_id,
    course_name: course_name.trim(),
    category: category.trim(),
    description: description ? String(description).trim() : undefined,
    created_at: now,
    updated_at: now,
    is_active: is_active !== false,
  };

  dbStore.upsertCourse(newCourse);
  res.status(201).json({ message: 'Course created successfully', data: newCourse });
});

apiRouter.get('/courses/:id', (req: Request, res: Response) => {
  const course = dbStore.courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Not Found', message: `Course ${req.params.id} does not exist` });
  }
  const lessons = Array.from(dbStore.lessons.values())
    .filter((l) => l.course_id === course.course_id)
    .sort((a, b) => a.sequence_no - b.sequence_no);

  const modules = dbStore.getModulesByCourse(course.course_id);

  res.json({ data: { ...course, lessons, modules } });
});

apiRouter.get('/courses/:id/modules', (req: Request, res: Response) => {
  const course = dbStore.courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Not Found', message: `Course ${req.params.id} does not exist` });
  }
  const modules = dbStore.getModulesByCourse(course.course_id);
  res.json({ data: modules });
});

apiRouter.get('/modules/:moduleId/videos', (req: Request, res: Response) => {
  const videos = dbStore.getVideosByModule(req.params.moduleId);
  res.json({ data: videos });
});

apiRouter.get('/videos/:videoId', (req: Request, res: Response) => {
  const video = dbStore.getVideo(req.params.videoId);
  if (!video) {
    return res.status(404).json({ error: 'Not Found', message: `Video ${req.params.videoId} was not found` });
  }
  res.json({ data: video });
});

// Update video link / details (e.g. replace an unavailable YouTube video)
apiRouter.put('/videos/:videoId', (req: Request, res: Response) => {
  const { title, youtube_url, duration, description } = req.body;
  const existing = dbStore.getVideo(req.params.videoId);
  if (!existing) {
    return res.status(404).json({ error: 'Not Found', message: `Video ${req.params.videoId} was not found` });
  }

  let youtube_video_id = existing.youtube_video_id;
  let embed_url = existing.embed_url;
  let thumbnail_url = existing.thumbnail_url;

  if (youtube_url && typeof youtube_url === 'string') {
    // Extract YouTube video ID
    const match = youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (match && match[1]) {
      youtube_video_id = match[1];
      embed_url = `https://www.youtube-nocookie.com/embed/${youtube_video_id}`;
      thumbnail_url = `https://img.youtube.com/vi/${youtube_video_id}/hqdefault.jpg`;
    }
  }

  const updated = dbStore.updateVideo(req.params.videoId, {
    title: title ? String(title).trim() : existing.title,
    youtube_url: youtube_url ? String(youtube_url).trim() : existing.youtube_url,
    youtube_video_id,
    embed_url,
    thumbnail_url,
    duration: duration ? String(duration).trim() : existing.duration,
    description: description !== undefined ? String(description).trim() : existing.description,
  });

  res.json({ message: 'Video updated successfully', data: updated });
});

// Log video opened / watched engagement (completed = false)
apiRouter.post('/videos/:videoId/watch', (req: Request, res: Response) => {
  const video = dbStore.getVideo(req.params.videoId);
  if (!video) {
    return res.status(404).json({ error: 'Not Found', message: `Video ${req.params.videoId} not found` });
  }

  const { enrollment_id } = req.body;
  if (!enrollment_id) {
    return res.status(400).json({ error: 'Validation Error', message: 'enrollment_id is required' });
  }

  const enr = dbStore.enrollments.get(String(enrollment_id));
  if (!enr) {
    return res.status(404).json({ error: 'Not Found', message: `Enrollment ${enrollment_id} not found` });
  }

  const actId = `act-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const act: Activity = {
    activity_id: actId,
    enrollment_id: enr.enrollment_id,
    lesson_id: video.video_id,
    activity_type: 'video_watched',
    activity_date: now,
    completed: false, // Critical: Watching/opening does NOT mark as completed
    created_at: now,
  };

  dbStore.upsertActivity(act);
  res.json({ message: 'Video engagement recorded', data: act });
});

// Mark video completed (completed = true)
apiRouter.post('/videos/:videoId/complete', (req: Request, res: Response) => {
  const video = dbStore.getVideo(req.params.videoId);
  if (!video) {
    return res.status(404).json({ error: 'Not Found', message: `Video ${req.params.videoId} not found` });
  }

  const { enrollment_id } = req.body;
  if (!enrollment_id) {
    return res.status(400).json({ error: 'Validation Error', message: 'enrollment_id is required' });
  }

  const enr = dbStore.enrollments.get(String(enrollment_id));
  if (!enr) {
    return res.status(404).json({ error: 'Not Found', message: `Enrollment ${enrollment_id} not found` });
  }

  const actId = `act-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const act: Activity = {
    activity_id: actId,
    enrollment_id: enr.enrollment_id,
    lesson_id: video.video_id,
    activity_type: 'video_watched',
    activity_date: now,
    completed: true, // Explicitly completed
    created_at: now,
  };

  dbStore.upsertActivity(act);
  res.json({ message: 'Video marked as completed successfully', data: act });
});

// Get completed videos for an enrollment
apiRouter.get('/enrollments/:id/video-progress', (req: Request, res: Response) => {
  const enr = dbStore.enrollments.get(req.params.id);
  if (!enr) {
    return res.status(404).json({ error: 'Not Found', message: `Enrollment ${req.params.id} not found` });
  }

  const completedActivities = Array.from(dbStore.activities.values()).filter(
    (a) => a.enrollment_id === enr.enrollment_id && a.activity_type === 'video_watched' && a.completed
  );

  const completedVideoIds = Array.from(new Set(completedActivities.map((a) => a.lesson_id).filter(Boolean)));
  res.json({
    data: {
      enrollment_id: enr.enrollment_id,
      course_id: enr.course_id,
      completed_video_ids: completedVideoIds,
      total_completed: completedVideoIds.length,
    },
  });
});


apiRouter.put('/courses/:id', requireAdmin, (req: Request, res: Response) => {
  const course = dbStore.courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Not Found', message: `Course ${req.params.id} does not exist` });
  }

  const { course_name, category, description, is_active } = req.body;
  if (course_name !== undefined) course.course_name = String(course_name).trim();
  if (category !== undefined) course.category = String(category).trim();
  if (description !== undefined) course.description = String(description).trim();
  if (is_active !== undefined) course.is_active = Boolean(is_active);

  course.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  dbStore.upsertCourse(course);

  res.json({ message: 'Course updated successfully', data: course });
});

apiRouter.patch('/courses/:id/status', requireAdmin, (req: Request, res: Response) => {
  const course = dbStore.courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Not Found', message: `Course ${req.params.id} does not exist` });
  }
  const { is_active } = req.body;
  if (is_active === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'is_active boolean required' });
  }
  course.is_active = Boolean(is_active);
  course.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  dbStore.upsertCourse(course);
  res.json({ message: `Course ${course.is_active ? 'activated' : 'deactivated'}`, data: course });
});

// ---------------------------------------------------------------------
// LESSONS API
// ---------------------------------------------------------------------
apiRouter.get('/courses/:id/lessons', (req: Request, res: Response) => {
  const course = dbStore.courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Not Found', message: `Course ${req.params.id} does not exist` });
  }
  const lessons = Array.from(dbStore.lessons.values())
    .filter((l) => l.course_id === req.params.id)
    .sort((a, b) => a.sequence_no - b.sequence_no);
  res.json({ data: lessons });
});

apiRouter.post('/courses/:id/lessons', requireAdmin, (req: Request, res: Response) => {
  const course = dbStore.courses.get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Not Found', message: `Course ${req.params.id} does not exist` });
  }
  const { lesson_name, sequence_no, is_required } = req.body;
  if (!lesson_name || !String(lesson_name).trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'lesson_name is required' });
  }

  const existingLessons = Array.from(dbStore.lessons.values()).filter((l) => l.course_id === req.params.id);
  const nextSeq = sequence_no ? Number(sequence_no) : existingLessons.length + 1;

  const lesson_id = `les-${req.params.id.replace('crs-', '')}-${Date.now().toString().slice(-4)}`;
  const newLesson: Lesson = {
    lesson_id,
    course_id: req.params.id,
    lesson_name: String(lesson_name).trim(),
    sequence_no: nextSeq,
    is_required: is_required !== false,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  dbStore.upsertLesson(newLesson);
  res.status(201).json({ message: 'Lesson added successfully', data: newLesson });
});

apiRouter.put('/lessons/:id', requireAdmin, (req: Request, res: Response) => {
  const lesson = dbStore.lessons.get(req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Not Found', message: `Lesson ${req.params.id} does not exist` });
  }
  const { lesson_name, sequence_no, is_required } = req.body;
  if (lesson_name !== undefined) lesson.lesson_name = String(lesson_name).trim();
  if (sequence_no !== undefined) lesson.sequence_no = Number(sequence_no);
  if (is_required !== undefined) lesson.is_required = Boolean(is_required);

  dbStore.upsertLesson(lesson);
  res.json({ message: 'Lesson updated successfully', data: lesson });
});

// ---------------------------------------------------------------------
// LEARNERS API
// ---------------------------------------------------------------------
apiRouter.get('/learners', (req: Request, res: Response) => {
  const searchQuery = req.query.search !== undefined ? sanitizeSearchQuery(req.query.search) : undefined;
  const learners = dbStore.searchLearners(searchQuery);

  const enriched = learners.map((l) => {
    const enrs = Array.from(dbStore.enrollments.values()).filter((e) => e.learner_id === l.learner_id);
    return {
      ...l,
      enrolment_count: enrs.length,
      active_enrolments: enrs.filter((e) => e.status === 'enrolled').length,
      completed_enrolments: enrs.filter((e) => e.status === 'completed').length,
    };
  });

  res.json({ data: enriched });
});

apiRouter.post('/learners', requireAdmin, (req: Request, res: Response) => {
  const { display_name, roll_no } = req.body;
  if (!display_name || !String(display_name).trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'display_name is required' });
  }

  if (roll_no) {
    const duplicate = Array.from(dbStore.learners.values()).some((l) => l.roll_no === String(roll_no).trim());
    if (duplicate) {
      return res.status(400).json({ error: 'Validation Error', message: `Roll number "${roll_no}" already exists.` });
    }
  }

  const learner_id = `lrn-${Date.now().toString().slice(-5)}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newLearner: Learner = {
    learner_id,
    display_name: String(display_name).trim(),
    roll_no: roll_no ? String(roll_no).trim() : undefined,
    created_at: now,
    updated_at: now,
  };

  dbStore.upsertLearner(newLearner);
  res.status(201).json({ message: 'Learner registered successfully', data: newLearner });
});

apiRouter.get('/learners/:id', (req: Request, res: Response) => {
  const learner = dbStore.learners.get(req.params.id);
  if (!learner) {
    return res.status(404).json({ error: 'Not Found', message: `Learner ${req.params.id} not found` });
  }
  const enrs = Array.from(dbStore.enrollments.values()).filter((e) => e.learner_id === learner.learner_id);
  const lessons = Array.from(dbStore.lessons.values());
  const activities = Array.from(dbStore.activities.values());

  const progressList = enrs.map((e) => {
    const course = dbStore.courses.get(e.course_id);
    return calculateEnrolmentProgress(e, lessons, activities, course?.course_name, learner.display_name);
  });

  res.json({ data: { ...learner, enrollments: enrs, progress: progressList } });
});

apiRouter.put('/learners/:id', requireAdmin, (req: Request, res: Response) => {
  const learner = dbStore.learners.get(req.params.id);
  if (!learner) {
    return res.status(404).json({ error: 'Not Found', message: `Learner ${req.params.id} not found` });
  }
  const { display_name, roll_no } = req.body;
  if (display_name !== undefined) learner.display_name = String(display_name).trim();
  if (roll_no !== undefined) learner.roll_no = String(roll_no).trim();

  learner.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  dbStore.upsertLearner(learner);

  res.json({ message: 'Learner updated successfully', data: learner });
});

// ---------------------------------------------------------------------
// ENROLMENTS API
// ---------------------------------------------------------------------
apiRouter.get('/enrollments', (req: Request, res: Response) => {
  const searchQuery = req.query.search !== undefined ? sanitizeSearchQuery(req.query.search) : undefined;
  const courseId = req.query.course_id && req.query.course_id !== 'All' ? String(req.query.course_id) : undefined;
  const learnerId = req.query.learner_id && req.query.learner_id !== 'All' ? String(req.query.learner_id) : undefined;
  const status = req.query.status && req.query.status !== 'All' ? String(req.query.status) : undefined;

  const rawEnrollments = dbStore.searchEnrollments(searchQuery, courseId, learnerId, status);
  const lessons = Array.from(dbStore.lessons.values());
  const activities = Array.from(dbStore.activities.values());

  const enriched = rawEnrollments.map((e) => {
    const course = dbStore.courses.get(e.course_id);
    const learner = dbStore.learners.get(e.learner_id);
    const progress = calculateEnrolmentProgress(e, lessons, activities, course?.course_name, learner?.display_name);
    return {
      ...e,
      course_name: course ? course.course_name : (e.course_name || e.course_id),
      course_category: course?.category || e.course_category,
      learner_name: learner ? learner.display_name : (e.learner_name || e.learner_id),
      roll_no: learner?.roll_no || e.roll_no,
      progress,
    };
  });

  res.json({ data: enriched });
});

apiRouter.post('/enrollments', requireAdmin, (req: Request, res: Response) => {
  const { learner_id, course_id, status } = req.body;
  if (!learner_id || !course_id) {
    return res.status(400).json({ error: 'Validation Error', message: 'learner_id and course_id are required' });
  }

  // Validate Foreign Keys
  if (!dbStore.learners.has(learner_id)) {
    return res.status(400).json({ error: 'Foreign Key Violation', message: `Learner with ID "${learner_id}" does not exist.` });
  }
  if (!dbStore.courses.has(course_id)) {
    return res.status(400).json({ error: 'Foreign Key Violation', message: `Course with ID "${course_id}" does not exist.` });
  }

  // Check duplicate concurrent active enrolment
  const existingActive = Array.from(dbStore.enrollments.values()).find(
    (e) => e.learner_id === learner_id && e.course_id === course_id && e.status === 'enrolled'
  );
  if (existingActive) {
    return res.status(409).json({
      error: 'Conflict: Duplicate Active Enrolment',
      message: `Learner is already actively enrolled in this course (Enrolment ID: ${existingActive.enrollment_id}). Complete, withdraw, or cancel previous enrolment to re-enrol.`,
    });
  }

  const enrollment_id = `enr-${Date.now().toString().slice(-5)}`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newEnr: Enrollment = {
    enrollment_id,
    learner_id,
    course_id,
    enrolled_at: now,
    status: status || 'enrolled',
    updated_at: now,
  };

  dbStore.upsertEnrollment(newEnr);
  res.status(201).json({ message: 'Learner enrolled successfully', data: newEnr });
});

apiRouter.patch('/enrollments/:id/status', requireAdmin, (req: Request, res: Response) => {
  const enr = dbStore.enrollments.get(req.params.id);
  if (!enr) {
    return res.status(404).json({ error: 'Not Found', message: `Enrolment ${req.params.id} does not exist` });
  }
  const { status } = req.body;
  const validStatuses: Enrollment['status'][] = ['enrolled', 'completed', 'withdrawn', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid Status',
      message: `Status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  enr.status = status;
  enr.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  dbStore.upsertEnrollment(enr);

  res.json({ message: `Enrolment status updated to "${status}"`, data: enr });
});

// ---------------------------------------------------------------------
// ACTIVITIES API
// ---------------------------------------------------------------------
apiRouter.get('/activities', (req: Request, res: Response) => {
  const searchQuery = req.query.search !== undefined ? sanitizeSearchQuery(req.query.search) : undefined;
  const courseId = req.query.course_id && req.query.course_id !== 'All' ? String(req.query.course_id) : undefined;
  const enrollmentId = req.query.enrollment_id && req.query.enrollment_id !== 'All' ? String(req.query.enrollment_id) : undefined;
  const activityType = req.query.activity_type && req.query.activity_type !== 'All' ? String(req.query.activity_type) : undefined;

  let activities = dbStore.searchActivities(searchQuery, courseId, enrollmentId, activityType);

  if (req.query.start_date) {
    activities = activities.filter((a) => new Date(a.activity_date) >= new Date(String(req.query.start_date)));
  }
  if (req.query.end_date) {
    activities = activities.filter((a) => new Date(a.activity_date) <= new Date(String(req.query.end_date)));
  }

  res.json({ data: activities });
});

apiRouter.post('/activities', requireAdmin, (req: Request, res: Response) => {
  const { enrollment_id, lesson_id, activity_type, activity_date, completed } = req.body;
  if (!enrollment_id || !activity_type) {
    return res.status(400).json({ error: 'Validation Error', message: 'enrollment_id and activity_type are required' });
  }

  // Foreign Key Checks
  if (!dbStore.enrollments.has(enrollment_id)) {
    return res.status(400).json({ error: 'Foreign Key Violation', message: `Enrolment ID "${enrollment_id}" does not exist.` });
  }
  if (lesson_id && !dbStore.lessons.has(lesson_id)) {
    return res.status(400).json({ error: 'Foreign Key Violation', message: `Lesson ID "${lesson_id}" does not exist.` });
  }

  const validTypes: Activity['activity_type'][] = [
    'lesson_opened',
    'lesson_started',
    'lesson_completed',
    'video_watched',
    'resource_accessed',
  ];
  if (!validTypes.includes(activity_type)) {
    return res.status(400).json({ error: 'Validation Error', message: `activity_type must be one of: ${validTypes.join(', ')}` });
  }

  const activity_id = `act-${Date.now().toString().slice(-6)}`;
  const now = activity_date ? String(activity_date) : new Date().toISOString().replace('T', ' ').slice(0, 19);

  const isCompleted = completed !== undefined ? Boolean(completed) : activity_type === 'lesson_completed';

  const newActivity: Activity = {
    activity_id,
    enrollment_id,
    lesson_id: lesson_id || null,
    activity_type,
    activity_date: now,
    completed: isCompleted,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  dbStore.upsertActivity(newActivity);
  res.status(201).json({ message: 'Activity logged successfully', data: newActivity });
});

function parseReferenceDate(refDateStr?: string): Date {
  if (!refDateStr || refDateStr.trim() === '') {
    return new Date();
  }
  const trimmed = refDateStr.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// ---------------------------------------------------------------------
// ANALYTICS & METRICS API
// ---------------------------------------------------------------------
apiRouter.get('/analytics/overview', (req: Request, res: Response) => {
  const courses = Array.from(dbStore.courses.values());
  const learners = Array.from(dbStore.learners.values());
  const enrollments = Array.from(dbStore.enrollments.values());
  const lessons = Array.from(dbStore.lessons.values());
  const activities = Array.from(dbStore.activities.values());

  const performance = calculateCompletionRates(courses, enrollments);

  const totalCourses = courses.length;
  const totalLearners = learners.length;
  const totalEnrolments = enrollments.length;
  const eligibleEnrolments = enrollments.filter((e) => e.status === 'enrolled' || e.status === 'completed').length;
  const completedEnrolments = enrollments.filter((e) => e.status === 'completed').length;

  const overallCompletionRate = eligibleEnrolments > 0 
    ? Number(((completedEnrolments / eligibleEnrolments) * 100).toFixed(1))
    : 0.0;

  const refDateParam = req.query.ref_date ? String(req.query.ref_date) : undefined;
  const refDate = parseReferenceDate(refDateParam);
  const learnersMap = new Map(learners.map((l) => [l.learner_id, { display_name: l.display_name, roll_no: l.roll_no }]));
  const inactivity = getInactivityAnalysis(enrollments, activities, dbStore.courses, learnersMap, 14, refDate);

  res.json({
    metrics: {
      total_courses: totalCourses,
      total_learners: totalLearners,
      total_enrolments: totalEnrolments,
      eligible_enrolments: eligibleEnrolments,
      completed_enrolments: completedEnrolments,
      overall_completion_rate: overallCompletionRate,
      active_enrolments: inactivity.active_in_window_count,
      flagged_inactive_enrolments: inactivity.flagged_count,
    },
    course_performance: performance,
    denominator_note: 'Eligible enrolments = Enrolled + Completed. Excludes Withdrawn and Cancelled.',
  });
});

apiRouter.get('/analytics/courses', (req: Request, res: Response) => {
  const courses = Array.from(dbStore.courses.values());
  const enrollments = Array.from(dbStore.enrollments.values());
  const rates = calculateCompletionRates(courses, enrollments);
  res.json({ data: rates });
});

apiRouter.get('/analytics/completion', (req: Request, res: Response) => {
  const courses = Array.from(dbStore.courses.values());
  const enrollments = Array.from(dbStore.enrollments.values());
  const rates = calculateCompletionRates(courses, enrollments);

  const chartData = rates.map((r) => ({
    course_id: r.course_id,
    course_name: r.course_name,
    category: r.category,
    completion_rate_percent: r.completion_rate_percent,
    numerator: r.completed_enrolments,
    denominator: r.eligible_enrolments,
  }));

  res.json({ data: chartData });
});

apiRouter.get('/analytics/progress', (req: Request, res: Response) => {
  const enrollments = Array.from(dbStore.enrollments.values()).filter((e) => e.status === 'enrolled' || e.status === 'completed');
  const lessons = Array.from(dbStore.lessons.values());
  const activities = Array.from(dbStore.activities.values());

  const progressList = enrollments.map((e) => {
    const course = dbStore.courses.get(e.course_id);
    const learner = dbStore.learners.get(e.learner_id);
    return calculateEnrolmentProgress(e, lessons, activities, course?.course_name, learner?.display_name);
  });

  const bandsCount: Record<string, number> = {
    '0-24%': 0,
    '25-49%': 0,
    '50-74%': 0,
    '75-99%': 0,
    '100%': 0,
  };

  progressList.forEach((p) => {
    bandsCount[p.progress_band] = (bandsCount[p.progress_band] || 0) + 1;
  });

  const distribution = Object.entries(bandsCount).map(([band, count]) => ({
    band,
    count,
    percentage: progressList.length > 0 ? Number(((count / progressList.length) * 100).toFixed(1)) : 0,
  }));

  res.json({
    data: {
      distribution,
      total_analyzed: progressList.length,
      individual_progress: progressList,
    },
  });
});

apiRouter.get('/analytics/activity/weekly', (req: Request, res: Response) => {
  const activities = Array.from(dbStore.activities.values());
  const weekly = getWeeklyActivitySummary(activities, dbStore.enrollments);
  res.json({ data: weekly });
});

apiRouter.get('/analytics/inactive-enrollments', (req: Request, res: Response) => {
  const thresholdDays = req.query.threshold ? Number(req.query.threshold) : 14;
  const refDateParam = req.query.ref_date ? String(req.query.ref_date) : undefined;
  const refDate = parseReferenceDate(refDateParam);

  const enrollments = Array.from(dbStore.enrollments.values());
  const activities = Array.from(dbStore.activities.values());
  const learners = Array.from(dbStore.learners.values());
  const learnersMap = new Map(learners.map((l) => [l.learner_id, { display_name: l.display_name, roll_no: l.roll_no }]));

  const result = getInactivityAnalysis(enrollments, activities, dbStore.courses, learnersMap, thresholdDays, refDate);
  res.json({ data: result });
});

// ---------------------------------------------------------------------
// REPORTS & CSV EXPORTS API
// ---------------------------------------------------------------------
apiRouter.get('/reports/course-completion', (req: Request, res: Response) => {
  const format = req.query.format;
  const courses = Array.from(dbStore.courses.values());
  const enrollments = Array.from(dbStore.enrollments.values());
  const rates = calculateCompletionRates(courses, enrollments);

  if (format === 'csv') {
    const headers = ['Course ID', 'Course Name', 'Category', 'Status', 'Total Enrolments', 'Eligible Enrolments', 'Completed Enrolments', 'Completion Rate (%)', 'Formula'];
    const rows = rates.map((r) => [
      escapeCsvField(r.course_id),
      escapeCsvField(r.course_name),
      escapeCsvField(r.category),
      escapeCsvField(r.is_active ? 'Active' : 'Inactive'),
      r.total_enrolments,
      r.eligible_enrolments,
      r.completed_enrolments,
      r.completion_rate_percent,
      escapeCsvField(r.formula),
    ].join(','));

    const csvContent = [
      `# E-Learning Course Completion Report`,
      `# Generated: ${new Date().toISOString()}`,
      `# Policy: Only enrolled and completed statuses are included in eligible denominator.`,
      headers.join(','),
      ...rows,
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="course_completion_report.csv"');
    return res.send(csvContent);
  }

  res.json({ data: rates });
});

apiRouter.get('/reports/inactive-enrollments', (req: Request, res: Response) => {
  const format = req.query.format;
  const thresholdDays = req.query.threshold ? Number(req.query.threshold) : 14;
  const refDateParam = req.query.ref_date ? String(req.query.ref_date) : undefined;
  const refDate = parseReferenceDate(refDateParam);

  const enrollments = Array.from(dbStore.enrollments.values());
  const activities = Array.from(dbStore.activities.values());
  const learners = Array.from(dbStore.learners.values());
  const learnersMap = new Map(learners.map((l) => [l.learner_id, { display_name: l.display_name, roll_no: l.roll_no }]));

  const result = getInactivityAnalysis(enrollments, activities, dbStore.courses, learnersMap, thresholdDays, refDate);

  if (format === 'csv') {
    const headers = ['Enrolment ID', 'Learner ID', 'Learner Name', 'Roll No', 'Course ID', 'Course Name', 'Enrolment Status', 'Inactivity Flag', 'Days Since Last Activity', 'Last Activity Date', 'Reason'];
    const rows = result.records.map((r) => [
      escapeCsvField(r.enrollment_id),
      escapeCsvField(r.learner_id),
      escapeCsvField(r.learner_name),
      escapeCsvField(r.roll_no || ''),
      escapeCsvField(r.course_id),
      escapeCsvField(r.course_name),
      escapeCsvField(r.enrollment_status),
      r.is_flagged ? 'FLAGGED' : 'NORMAL',
      r.days_since_last_activity ?? 'N/A',
      escapeCsvField(r.last_recorded_activity || 'None'),
      escapeCsvField(r.flag_reason),
    ].join(','));

    const csvContent = [
      `# Inactivity Monitor Report (Threshold: ${thresholdDays} days)`,
      `# Reference Timestamp: ${result.reference_timestamp}`,
      `# Note: Inactivity is a rule-based flag and does not prove absence of learning.`,
      headers.join(','),
      ...rows,
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inactivity_report.csv"');
    return res.send(csvContent);
  }

  res.json({ data: result });
});

apiRouter.get('/reports/activity', (req: Request, res: Response) => {
  const format = req.query.format;
  const activities = Array.from(dbStore.activities.values());

  if (format === 'csv') {
    const headers = ['Activity ID', 'Enrolment ID', 'Course Name', 'Learner Name', 'Lesson ID', 'Activity Type', 'Timestamp', 'Completed'];
    const rows = activities.map((a) => {
      const enr = dbStore.enrollments.get(a.enrollment_id);
      const course = enr ? dbStore.courses.get(enr.course_id) : undefined;
      const learner = enr ? dbStore.learners.get(enr.learner_id) : undefined;

      return [
        escapeCsvField(a.activity_id),
        escapeCsvField(a.enrollment_id),
        escapeCsvField(course?.course_name || ''),
        escapeCsvField(learner?.display_name || ''),
        escapeCsvField(a.lesson_id || ''),
        escapeCsvField(a.activity_type),
        escapeCsvField(a.activity_date),
        a.completed ? 'YES' : 'NO',
      ].join(',');
    });

    const csvContent = [
      `# Learning Activity Log Report`,
      `# Generated: ${new Date().toISOString()}`,
      headers.join(','),
      ...rows,
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="activity_log.csv"');
    return res.send(csvContent);
  }

  res.json({ data: activities });
});

// ---------------------------------------------------------------------
// DATABASE TOOLS & SYSTEM API
// ---------------------------------------------------------------------
apiRouter.get('/health', (_req: Request, res: Response) => {
  const health = dbStore.getDatabaseHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json({
    status: health.status === 'healthy' ? 'ok' : 'degraded',
    service: 'EduPulse Analytics API',
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString(),
    database: health,
  });
});

apiRouter.get('/system/db-status', (_req: Request, res: Response) => {
  const health = dbStore.getDatabaseHealth();
  res.json({ data: health });
});

apiRouter.post('/system/reset', requireAdmin, (_req: Request, res: Response) => {
  dbStore.seed();
  res.json({
    message: 'Database successfully re-seeded with reproducible baseline dataset.',
    counts: {
      courses: dbStore.courses.size,
      learners: dbStore.learners.size,
      enrollments: dbStore.enrollments.size,
      lessons: dbStore.lessons.size,
      activities: dbStore.activities.size,
    },
  });
});

// ---------------------------------------------------------------------
// CATCH-ALL 404 FOR UNMATCHED /api ROUTES (NEVER RETURN HTML)
// ---------------------------------------------------------------------
apiRouter.all('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} is not recognized.`,
    statusCode: 404,
  });
});
