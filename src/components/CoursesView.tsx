import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  ListOrdered, 
  FileEdit, 
  AlertCircle,
  Check,
  X,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
  Video,
  Layers,
  ChevronDown,
  ChevronRight,
  Tv,
  ExternalLink,
  Award
} from 'lucide-react';
import { CourseItem, CourseModule, ModuleVideo, UserRole } from '../types.ts';
import { api } from '../services/apiClient.ts';
import { CourseModulesSection } from './CourseModulesSection.tsx';
import { VideoPlayerModal } from './VideoPlayerModal.tsx';
import { EditVideoModal } from './EditVideoModal.tsx';

interface CoursesViewProps {
  courses: CourseItem[];
  role: UserRole;
  onRefresh: () => void;
  initialSearch?: string;
  highlightRecordId?: string | null;
}

type SortField = 'course_name' | 'category' | 'required_lessons' | 'enrolment_count' | 'is_active';

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  role,
  onRefresh,
  initialSearch = '',
  highlightRecordId = null,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('course_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isViewLessonsOpen, setIsViewLessonsOpen] = useState(false);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [selectedCourseForModules, setSelectedCourseForModules] = useState<CourseItem | null>(null);

  // Inline expandable modules per course
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set());
  const [courseModulesMap, setCourseModulesMap] = useState<Record<string, CourseModule[]>>({});
  const [loadingModulesMap, setLoadingModulesMap] = useState<Record<string, boolean>>({});

  // Video Player & Editor states
  const [activePlayingVideo, setActivePlayingVideo] = useState<ModuleVideo | null>(null);
  const [activePlayingCourse, setActivePlayingCourse] = useState<CourseItem | null>(null);
  const [isEditVideoOpen, setIsEditVideoOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ModuleVideo | null>(null);
  const [completedVideoIds, setCompletedVideoIds] = useState<Set<string>>(new Set());
  const [courseEnrollmentsMap, setCourseEnrollmentsMap] = useState<Record<string, any[]>>({});

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);

  // Form states
  const [courseName, setCourseName] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Lesson form
  const [lessonName, setLessonName] = useState('');
  const [sequenceNo, setSequenceNo] = useState(1);
  const [isRequired, setIsRequired] = useState(true);

  // Feedback & Loading
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [displayedCourses, setDisplayedCourses] = useState<CourseItem[]>(courses);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchReqIdRef = useRef(0);

  const categories = ['All', 'Computer Science', 'Data & AI', 'Cloud Architecture', 'Information Security', 'Design & Product', 'General Studies', 'Advanced Science'];

  // Update search if initialSearch changes
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Fetch function with stale response prevention
  const fetchCourses = async (searchQuery: string, cat = selectedCategory, activeOnly = showActiveOnly) => {
    const currentReqId = ++searchReqIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await api.getCourses({
        search: searchQuery.trim() || undefined,
        category: cat !== 'All' ? cat : undefined,
        is_active: activeOnly ? true : undefined,
      });

      if (currentReqId === searchReqIdRef.current) {
        setDisplayedCourses(res.data);
      }
    } catch (err: any) {
      if (currentReqId === searchReqIdRef.current) {
        setSearchError(err.message || 'Failed to search courses from database');
        // Fallback to local filter if network issue
        const q = searchQuery.trim().toLowerCase();
        setDisplayedCourses(
          courses.filter((c) => {
            const nameMatch = c.course_name.toLowerCase().includes(q);
            const catMatch = c.category.toLowerCase().includes(q);
            const idMatch = c.course_id.toLowerCase().includes(q);
            const filterCat = cat === 'All' || c.category === cat;
            const filterActive = !activeOnly || c.is_active;
            return (nameMatch || catMatch || idMatch || !q) && filterCat && filterActive;
          })
        );
      }
    } finally {
      if (currentReqId === searchReqIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  // Debounced backend search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(search, selectedCategory, showActiveOnly);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, showActiveOnly, courses]);

  // Handle Enter key for immediate search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchCourses(search, selectedCategory, showActiveOnly);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setCurrentPage(1);
    fetchCourses('', selectedCategory, showActiveOnly);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setShowActiveOnly(false);
    setCurrentPage(1);
    fetchCourses('', 'All', false);
  };

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const sortedCourses = useMemo(() => {
    return [...displayedCourses].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(String(valB));
        return sortOrder === 'asc' ? comp : -comp;
      }
      if (typeof valA === 'boolean') {
        valA = valA ? 1 : 0;
        valB = valB ? 1 : 0;
      }
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });
  }, [displayedCourses, sortField, sortOrder]);

  // Pagination calculation
  const totalItems = sortedCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedCourses = sortedCourses.slice(startIndex, startIndex + pageSize);

  const handleToggleStatus = async (course: CourseItem) => {
    if (role !== 'administrator') {
      setFeedback({ type: 'error', message: 'Analyst role is read-only. Switch to Administrator to activate/deactivate courses.' });
      return;
    }
    try {
      await api.toggleCourseStatus(course.course_id, !course.is_active);
      setFeedback({ type: 'success', message: `Course "${course.course_name}" ${!course.is_active ? 'activated' : 'deactivated'}.` });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      setFeedback({ type: 'error', message: 'Course name is required.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.createCourse({
        course_name: courseName.trim(),
        category,
        description: description.trim() || undefined,
        is_active: isActive,
      });
      setFeedback({ type: 'success', message: `Course "${courseName}" created successfully in persistent database.` });
      setIsCreateOpen(false);
      setCourseName('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (course: CourseItem) => {
    setSelectedCourse(course);
    setCourseName(course.course_name);
    setCategory(course.category);
    setDescription(course.description || '');
    setIsActive(course.is_active);
    setIsEditOpen(true);
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setSubmitting(true);
    try {
      await api.updateCourse(selectedCourse.course_id, {
        course_name: courseName.trim(),
        category,
        description: description.trim() || undefined,
        is_active: isActive,
      });
      setFeedback({ type: 'success', message: `Course "${courseName}" updated successfully.` });
      setIsEditOpen(false);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewLessons = async (course: CourseItem) => {
    setSelectedCourse(course);
    try {
      const res = await api.getCourseLessons(course.course_id);
      setCourseLessons(res.data);
      setIsViewLessonsOpen(true);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleOpenAddLesson = (course: CourseItem) => {
    setSelectedCourse(course);
    setLessonName('');
    setSequenceNo(course.total_lessons + 1);
    setIsRequired(true);
    setIsAddLessonOpen(true);
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !lessonName.trim()) return;
    setSubmitting(true);
    try {
      await api.createLesson(selectedCourse.course_id, {
        lesson_name: lessonName.trim(),
        sequence_no: sequenceNo,
        is_required: isRequired,
      });
      setFeedback({ type: 'success', message: `Lesson added to course "${selectedCourse.course_name}".` });
      setIsAddLessonOpen(false);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Load Modules for a course
  const loadModulesForCourse = async (courseId: string) => {
    if (courseModulesMap[courseId]) return courseModulesMap[courseId];
    setLoadingModulesMap((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await api.getCourseModules(courseId);
      setCourseModulesMap((prev) => ({ ...prev, [courseId]: res.data }));
      
      // Also fetch enrollments for course context
      if (!courseEnrollmentsMap[courseId]) {
        try {
          const enrRes = await api.getEnrollments({ course_id: courseId });
          setCourseEnrollmentsMap((prev) => ({ ...prev, [courseId]: enrRes.data }));
          if (enrRes.data.length > 0) {
            // Fetch completed video progress for the first active enrollment
            const progRes = await api.getEnrollmentVideoProgress(enrRes.data[0].enrollment_id);
            setCompletedVideoIds((prev) => new Set([...prev, ...progRes.data.completed_video_ids]));
          }
        } catch {
          // Non-blocking
        }
      }
      return res.data;
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Failed to load modules: ${err.message}` });
      return [];
    } finally {
      setLoadingModulesMap((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  // Toggle inline course expansion
  const handleToggleExpandCourse = async (course: CourseItem) => {
    const isExpanded = expandedCourseIds.has(course.course_id);
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(course.course_id);
      } else {
        next.add(course.course_id);
      }
      return next;
    });

    if (!isExpanded) {
      await loadModulesForCourse(course.course_id);
    }
  };

  // Open Modules Details Modal
  const handleOpenModulesModal = async (course: CourseItem) => {
    setSelectedCourseForModules(course);
    setIsModulesModalOpen(true);
    await loadModulesForCourse(course.course_id);
  };

  // Video Playing Experience
  const handlePlayVideo = async (video: ModuleVideo, course: CourseItem) => {
    setActivePlayingVideo(video);
    setActivePlayingCourse(course);

    // Record engagement activity (completed = false)
    const enrs = courseEnrollmentsMap[course.course_id] || [];
    const enrId = enrs.length > 0 ? enrs[0].enrollment_id : 'enr-preview';
    if (enrId && enrId !== 'enr-preview') {
      try {
        await api.watchVideo(video.video_id, enrId);
      } catch {
        // Non-blocking telemetry
      }
    }
  };

  // Toggle Video Completion (Explicit only!)
  const handleToggleCompleteVideo = async (video: ModuleVideo, customEnrId?: string) => {
    const isCompleted = completedVideoIds.has(video.video_id);
    const enrs = courseEnrollmentsMap[video.course_id] || [];
    const enrId = customEnrId || (enrs.length > 0 ? enrs[0].enrollment_id : 'enr-preview');

    if (isCompleted) {
      setCompletedVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(video.video_id);
        return next;
      });
      setFeedback({ type: 'success', message: `Marked "${video.title}" as incomplete.` });
    } else {
      if (enrId && enrId !== 'enr-preview') {
        await api.completeVideo(video.video_id, enrId);
      }
      setCompletedVideoIds((prev) => new Set([...prev, video.video_id]));
      setFeedback({ type: 'success', message: `Recorded completion for "${video.title}"!` });
    }
  };

  // Open Video Editor Modal
  const handleOpenEditVideo = (video: ModuleVideo) => {
    setEditingVideo(video);
    setIsEditVideoOpen(true);
  };

  // Save Video updates
  const handleSaveVideo = async (
    videoId: string,
    updates: { title: string; youtube_url: string; duration: string; description: string }
  ) => {
    await api.updateVideo(videoId, updates);
    if (editingVideo) {
      const courseId = editingVideo.course_id;
      const res = await api.getCourseModules(courseId);
      setCourseModulesMap((prev) => ({ ...prev, [courseId]: res.data }));
      if (activePlayingVideo && activePlayingVideo.video_id === videoId) {
        const updatedVideo = res.data.flatMap((m) => m.videos || []).find((v) => v.video_id === videoId);
        if (updatedVideo) setActivePlayingVideo(updatedVideo);
      }
    }
    setFeedback({ type: 'success', message: 'Video link and details updated successfully.' });
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="inline ml-1 h-3 w-3 text-[#64748B]/60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="inline ml-1 h-3 w-3 text-[#2563EB]" />
    ) : (
      <ArrowDown className="inline ml-1 h-3 w-3 text-[#2563EB]" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Course Management</h1>
          <p className="text-xs text-[#64748B]">
            Catalog of courses, curriculum lesson sequences, requirement flags, and lifecycle status.
          </p>
        </div>
        <div>
          {role === 'administrator' ? (
            <button
              onClick={() => {
                setCourseName('');
                setDescription('');
                setIsActive(true);
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Course</span>
            </button>
          ) : (
            <div className="rounded-lg bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#64748B] border border-[#DCE6F2]">
              Analyst Mode: Read-Only
            </div>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`flex items-center justify-between rounded-lg p-3 text-xs ${
          feedback.type === 'success' ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20' : 'bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/20'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search Error Alert */}
      {searchError && (
        <div className="flex items-center justify-between rounded-lg bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C] border border-[#B91C1C]/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{searchError}</span>
          </div>
          <button onClick={() => fetchCourses(search)} className="font-semibold underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Course Name & Category Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search course name or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={handleKeyDown}
              className="w-64 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-7 text-xs text-[#172B4D] placeholder-[#64748B] focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-[#2563EB]" />
            ) : search ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#172B4D]"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-[#172B4D] cursor-pointer pl-1">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => {
                setShowActiveOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-[#DCE6F2] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span>Active Only</span>
          </label>
        </div>

        <div className="text-xs text-[#64748B]">
          Showing <span className="font-semibold text-[#172B4D]">{totalItems}</span> matching {courses.length} courses
        </div>
      </div>

      {/* Course List Cards / Table */}
      <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
              <tr>
                <th 
                  onClick={() => handleSort('course_name')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Course Name & ID {renderSortIndicator('course_name')}
                </th>
                <th 
                  onClick={() => handleSort('category')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Category {renderSortIndicator('category')}
                </th>
                <th className="px-4 py-3 text-center">Modules & Videos</th>
                <th 
                  onClick={() => handleSort('required_lessons')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Required Lessons {renderSortIndicator('required_lessons')}
                </th>
                <th className="px-4 py-3 text-center">Optional</th>
                <th 
                  onClick={() => handleSort('enrolment_count')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Enrolments {renderSortIndicator('enrolment_count')}
                </th>
                <th 
                  onClick={() => handleSort('is_active')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Status {renderSortIndicator('is_active')}
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F2]">
              {paginatedCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#64748B]">
                    <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                    <p className="font-semibold text-[#172B4D]">No courses found</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {search ? `No courses match "${search}". Try adjusting your query or category filter.` : 'No courses match the selected filters.'}
                    </p>
                    {(search || selectedCategory !== 'All' || showActiveOnly) && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 rounded-md bg-[#2563EB]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
                      >
                        Reset Search & Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course) => {
                  const isHighlighted = highlightRecordId === course.course_id;
                  const isExpanded = expandedCourseIds.has(course.course_id);
                  return (
                    <React.Fragment key={course.course_id}>
                      <tr 
                        className={`transition-colors ${
                          isHighlighted 
                            ? 'bg-[#2563EB]/10 border-l-4 border-l-[#2563EB]' 
                            : isExpanded
                            ? 'bg-[#F5F8FF]'
                            : 'hover:bg-[#F5F8FF]/60'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleExpandCourse(course)}
                              className="mt-0.5 rounded p-1 text-[#2563EB] hover:bg-[#2563EB]/15 transition-colors"
                              title={isExpanded ? "Collapse Modules" : "Expand 5 Course Modules & Videos"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <div>
                              <div className="font-semibold text-[#172B4D] flex items-center gap-2">
                                <span 
                                  className="cursor-pointer hover:text-[#2563EB] transition-colors"
                                  onClick={() => handleToggleExpandCourse(course)}
                                >
                                  {course.course_name}
                                </span>
                                {isHighlighted && (
                                  <span className="rounded bg-[#2563EB] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                                    Target
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                                <span className="font-mono">ID: {course.course_id}</span>
                                <span>•</span>
                                <span>Created: {course.created_at.slice(0, 10)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-[#F5F8FF] px-2 py-0.5 font-medium text-[#2563EB] border border-[#DCE6F2]">
                            {course.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleExpandCourse(course)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE6F2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#172B4D] hover:bg-[#E8EFF8] hover:border-[#2563EB] transition-colors shadow-2xs"
                            title="Click to view course modules & educational videos"
                          >
                            <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
                            <span className="font-bold text-[#172B4D]">{course.total_modules || 5}</span>
                            <span className="text-[10px] text-[#64748B]">Mods</span>
                            <span className="text-[#DCE6F2]">|</span>
                            <Video className="h-3.5 w-3.5 text-[#2563EB]" />
                            <span className="font-bold text-[#2563EB]">{course.total_videos || 15}</span>
                            <span className="text-[10px] text-[#64748B]">Vids</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${course.required_lessons === 0 ? 'text-[#B45309]' : 'text-[#172B4D]'}`}>
                            {course.required_lessons}
                          </span>
                          {course.required_lessons === 0 && (
                            <span className="ml-1 text-[10px] text-[#B45309] block">(Elective only)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-[#64748B]">
                          {course.optional_lessons}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-[#172B4D]">
                          {course.enrolment_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(course)}
                            disabled={role !== 'administrator'}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                              course.is_active
                                ? 'bg-[#15803D]/10 text-[#15803D] hover:bg-[#15803D]/20'
                                : 'bg-[#64748B]/10 text-[#64748B] hover:bg-[#64748B]/20'
                            }`}
                            title={role === 'administrator' ? 'Click to toggle status' : 'Status'}
                          >
                            {course.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            <span>{course.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModulesModal(course)}
                              className="flex items-center gap-1 rounded-md border border-[#2563EB]/40 bg-[#2563EB]/10 px-2 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
                              title="Open Modules & Educational Videos"
                            >
                              <Layers className="h-3 w-3 text-[#2563EB]" />
                              <span>Modules & Videos</span>
                            </button>
                            <button
                              onClick={() => handleViewLessons(course)}
                              className="flex items-center gap-1 rounded-md border border-[#DCE6F2] px-2 py-1 text-[11px] text-[#172B4D] hover:bg-[#F5F8FF] hover:border-[#2563EB]"
                              title="View Curriculum Lessons"
                            >
                              <ListOrdered className="h-3 w-3 text-[#2563EB]" />
                              <span>Curriculum</span>
                            </button>
                            {role === 'administrator' && (
                              <>
                                <button
                                  onClick={() => handleOpenAddLesson(course)}
                                  className="flex items-center gap-1 rounded-md border border-[#DCE6F2] px-2 py-1 text-[11px] text-[#172B4D] hover:bg-[#F5F8FF] hover:border-[#2563EB]"
                                  title="Add Lesson"
                                >
                                  <Plus className="h-3 w-3 text-[#15803D]" />
                                  <span>+ Lesson</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(course)}
                                  className="rounded-md border border-[#DCE6F2] p-1 text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D]"
                                  title="Edit Course"
                                >
                                  <FileEdit className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F8FAFC]">
                          <td colSpan={8} className="p-4 border-b border-[#DCE6F2]">
                            {loadingModulesMap[course.course_id] ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#64748B]">
                                <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                                <span>Loading verified educational modules & video lectures...</span>
                              </div>
                            ) : (
                              <CourseModulesSection
                                course={course}
                                modules={courseModulesMap[course.course_id] || []}
                                role={role}
                                completedVideoIds={completedVideoIds}
                                onPlayVideo={(video) => handlePlayVideo(video, course)}
                                onToggleCompleteVideo={handleToggleCompleteVideo}
                                onEditVideo={handleOpenEditVideo}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#DCE6F2] px-4 py-3 bg-[#F5F8FF]/50 text-xs text-[#64748B]">
            <div>
              Showing <span className="font-semibold text-[#172B4D]">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-[#172B4D]">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
              <span className="font-semibold text-[#172B4D]">{totalItems}</span> courses
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage === 1}
                className="rounded-md border border-[#DCE6F2] bg-white px-2.5 py-1 text-xs font-medium text-[#172B4D] hover:bg-[#F5F8FF] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-[#123B73]">
                Page {validPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage === totalPages}
                className="rounded-md border border-[#DCE6F2] bg-white px-2.5 py-1 text-xs font-medium text-[#172B4D] hover:bg-[#F5F8FF] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Course */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <h2 className="text-base font-bold text-[#172B4D]">Create New Course</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D]">Course Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Distributed Systems"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Description</label>
                <textarea
                  rows={3}
                  placeholder="Syllabus scope and prerequisites..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#DCE6F2] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="create_is_active" className="font-medium text-[#172B4D]">Active and Open for Enrolments</label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-[#DCE6F2] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F5F8FF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Course */}
      {isEditOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <h2 className="text-base font-bold text-[#172B4D]">Edit Course: {selectedCourse.course_name}</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditCourse} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D]">Course Name</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#DCE6F2] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="edit_is_active" className="font-medium text-[#172B4D]">Active and Open for Enrolments</label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-[#DCE6F2] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F5F8FF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Update Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Curriculum Lessons */}
      {isViewLessonsOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">{selectedCourse.course_name}</h2>
                <span className="text-[11px] text-[#64748B]">Curriculum Lesson Sequence & Completion Rules</span>
              </div>
              <button onClick={() => setIsViewLessonsOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 max-h-80 overflow-y-auto">
              {courseLessons.length === 0 ? (
                <div className="p-6 text-center text-[#64748B]">
                  No lessons registered in this curriculum yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseLessons.map((l) => (
                    <div key={l.lesson_id} className="flex items-center justify-between rounded-lg border border-[#DCE6F2] p-2.5 bg-[#F5F8FF]/40 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123B73] text-[11px] font-bold text-white">
                          {l.sequence_no}
                        </span>
                        <div>
                          <div className="font-semibold text-[#172B4D]">{l.lesson_name}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">{l.lesson_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {l.is_required ? (
                          <span className="rounded-md bg-[#15803D]/10 px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">
                            Required for Completion
                          </span>
                        ) : (
                          <span className="rounded-md bg-[#B45309]/10 px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
                            Optional / Elective
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end border-t border-[#DCE6F2] pt-3">
              <button
                onClick={() => setIsViewLessonsOpen(false)}
                className="rounded-lg bg-[#123B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
              >
                Close Curriculum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Lesson */}
      {isAddLessonOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <h2 className="text-base font-bold text-[#172B4D]">Add Lesson to {selectedCourse.course_name}</h2>
              <button onClick={() => setIsAddLessonOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddLesson} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D]">Lesson Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asynchronous Microservices Architecture"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Sequence Number</label>
                <input
                  type="number"
                  min={1}
                  value={sequenceNo}
                  onChange={(e) => setSequenceNo(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lesson_is_required"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-[#DCE6F2] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="lesson_is_required" className="font-medium text-[#172B4D]">
                  Required for Course Completion Metric
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(false)}
                  className="rounded-lg border border-[#DCE6F2] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F5F8FF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Append Lesson</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Course Modules & Educational Videos */}
      {isModulesModalOpen && selectedCourseForModules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[#DCE6F2] bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#DCE6F2] px-6 py-4 bg-[#F5F8FF]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123B73] text-white shadow-xs">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#172B4D]">{selectedCourseForModules.course_name}</h2>
                    <span className="rounded-md bg-white border border-[#DCE6F2] px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                      {selectedCourseForModules.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Structured 5-Module Syllabus • ~15 Curated Video Lectures • Interactive Progress Tracking
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsModulesModalOpen(false);
                  setSelectedCourseForModules(null);
                }} 
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-white hover:text-[#172B4D] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingModulesMap[selectedCourseForModules.course_id] ? (
                <div className="flex flex-col items-center justify-center py-16 text-xs text-[#64748B]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2563EB] mb-2" />
                  <p className="font-semibold text-[#172B4D]">Loading course syllabus and verified video lectures...</p>
                </div>
              ) : (
                <CourseModulesSection
                  course={selectedCourseForModules}
                  modules={courseModulesMap[selectedCourseForModules.course_id] || []}
                  role={role}
                  completedVideoIds={completedVideoIds}
                  onPlayVideo={(video) => handlePlayVideo(video, selectedCourseForModules)}
                  onToggleCompleteVideo={handleToggleCompleteVideo}
                  onEditVideo={handleOpenEditVideo}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#DCE6F2] px-6 py-3.5 bg-[#F5F8FF]/80 text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#15803D]" />
                <span>Verified educational content with real YouTube video integration</span>
              </div>
              <button
                onClick={() => {
                  setIsModulesModalOpen(false);
                  setSelectedCourseForModules(null);
                }}
                className="rounded-lg bg-[#123B73] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors"
              >
                Close Syllabus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Interactive Video Player */}
      <VideoPlayerModal
        video={activePlayingVideo}
        course={activePlayingCourse}
        isOpen={activePlayingVideo !== null}
        onClose={() => setActivePlayingVideo(null)}
        isCompleted={activePlayingVideo ? completedVideoIds.has(activePlayingVideo.video_id) : false}
        onToggleComplete={handleToggleCompleteVideo}
        availableEnrollments={activePlayingCourse ? (courseEnrollmentsMap[activePlayingCourse.course_id] || []) : []}
        role={role}
        onEditVideo={handleOpenEditVideo}
      />

      {/* Modal: Edit / Replace Video URL */}
      <EditVideoModal
        video={editingVideo}
        isOpen={isEditVideoOpen}
        onClose={() => {
          setIsEditVideoOpen(false);
          setEditingVideo(null);
        }}
        onSave={handleSaveVideo}
      />
    </div>
  );
};
