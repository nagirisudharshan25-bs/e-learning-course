import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity as ActivityIcon, 
  Plus, 
  Search, 
  CheckCircle2, 
  PlayCircle, 
  BookOpen, 
  FileText, 
  Video, 
  Filter, 
  Check, 
  AlertCircle, 
  X, 
  Calendar,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ActivityItem, EnrollmentItem, CourseItem, UserRole } from '../types.ts';
import { api } from '../services/apiClient.ts';

interface ActivityViewProps {
  activities: ActivityItem[];
  enrollments: EnrollmentItem[];
  courses: CourseItem[];
  role: UserRole;
  onRefresh: () => void;
  initialSearch?: string;
  highlightRecordId?: string | null;
}

type SortField = 'activity_date' | 'activity_type' | 'enrollment_id' | 'course_name' | 'completed';

export const ActivityView: React.FC<ActivityViewProps> = ({
  activities,
  enrollments,
  courses,
  role,
  onRefresh,
  initialSearch = '',
  highlightRecordId = null,
}) => {
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [search, setSearch] = useState(initialSearch);
  const [displayedActivities, setDisplayedActivities] = useState<ActivityItem[]>(activities);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchReqIdRef = useRef(0);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('activity_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Log activity modal
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [targetEnrId, setTargetEnrId] = useState('');
  const [activityType, setActivityType] = useState('lesson_completed');
  const [targetLessonId, setTargetLessonId] = useState('');
  const [isCompleted, setIsCompleted] = useState(true);
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));

  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Fetch function with stale response guard - searches activity type and enrolment ID
  const fetchActivities = async (query: string, cFilter = selectedCourse, tFilter = selectedType) => {
    const currentReqId = ++searchReqIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await api.getActivities({
        search: query.trim() || undefined,
        course_id: cFilter !== 'All' ? cFilter : undefined,
        activity_type: tFilter !== 'All' ? tFilter : undefined,
      });

      if (currentReqId === searchReqIdRef.current) {
        setDisplayedActivities(res.data);
      }
    } catch (err: any) {
      if (currentReqId === searchReqIdRef.current) {
        setSearchError(err.message || 'Failed to search activities from database');
        // Fallback filter adhering to requirement: activity type and enrolment ID
        const q = query.trim().toLowerCase();
        setDisplayedActivities(
          activities.filter((a) => {
            const matchesType = tFilter === 'All' || a.activity_type === tFilter;
            const matchesCourse = cFilter === 'All' || a.course_id === cFilter;
            const rawType = a.activity_type.toLowerCase();
            const friendlyType = rawType.replace(/_/g, ' ');
            const typeMatch = rawType.includes(q) || friendlyType.includes(q);
            const enrMatch = a.enrollment_id.toLowerCase().includes(q);
            const actIdMatch = a.activity_id.toLowerCase().includes(q);
            const matchesSearch = typeMatch || enrMatch || actIdMatch;

            return (matchesSearch || !q) && matchesType && matchesCourse;
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
      fetchActivities(search, selectedCourse, selectedType);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, selectedCourse, selectedType, activities]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchActivities(search, selectedCourse, selectedType);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setCurrentPage(1);
    fetchActivities('', selectedCourse, selectedType);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCourse('All');
    setSelectedType('All');
    setCurrentPage(1);
    fetchActivities('', 'All', 'All');
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

  const sortedActivities = useMemo(() => {
    return [...displayedActivities].sort((a, b) => {
      if (sortField === 'completed') {
        const compA = a.completed ? 1 : 0;
        const compB = b.completed ? 1 : 0;
        return sortOrder === 'asc' ? compA - compB : compB - compA;
      }

      let valA: any = a[sortField];
      let valB: any = b[sortField];

      const strA = String(valA || '');
      const strB = String(valB || '');
      const comp = strA.localeCompare(strB);
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [displayedActivities, sortField, sortOrder]);

  // Pagination
  const totalItems = sortedActivities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedActivities = sortedActivities.slice(startIndex, startIndex + pageSize);

  const handleEnrolmentChange = async (enrId: string) => {
    setTargetEnrId(enrId);
    const enr = enrollments.find((e) => e.enrollment_id === enrId);
    if (enr) {
      try {
        const res = await api.getCourseLessons(enr.course_id);
        setCourseLessons(res.data);
        if (res.data.length > 0) {
          setTargetLessonId(res.data[0].lesson_id);
        } else {
          setTargetLessonId('');
        }
      } catch {
        setCourseLessons([]);
      }
    }
  };

  const handleOpenLogModal = () => {
    if (enrollments.length > 0) {
      handleEnrolmentChange(enrollments[0].enrollment_id);
    }
    setActivityType('lesson_completed');
    setIsCompleted(true);
    setActivityDate(new Date().toISOString().slice(0, 16));
    setIsLogOpen(true);
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEnrId) {
      setFeedback({ type: 'error', message: 'Enrolment is required.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.createActivity({
        enrollment_id: targetEnrId,
        lesson_id: targetLessonId || undefined,
        activity_type: activityType,
        completed: isCompleted,
        activity_date: activityDate ? activityDate.replace('T', ' ') + ':00' : undefined,
      });
      setFeedback({ type: 'success', message: 'Learning activity event recorded into database.' });
      setIsLogOpen(false);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#15803D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Lesson Completed</span>
          </span>
        );
      case 'lesson_started':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
            <PlayCircle className="h-3 w-3" />
            <span>Lesson Started</span>
          </span>
        );
      case 'lesson_opened':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#60A5FA]/15 px-2 py-0.5 text-[11px] font-semibold text-[#123B73]">
            <BookOpen className="h-3 w-3" />
            <span>Lesson Opened</span>
          </span>
        );
      case 'video_watched':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#123B73]/10 px-2 py-0.5 text-[11px] font-semibold text-[#123B73]">
            <Video className="h-3 w-3" />
            <span>Video Watched</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#64748B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
            <FileText className="h-3 w-3" />
            <span>Resource Accessed</span>
          </span>
        );
    }
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
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Learning Activity Stream</h1>
          <p className="text-xs text-[#64748B]">
            Immutable timestamped event logs for lesson interactions, completions, and study sessions.
          </p>
        </div>
        <div>
          {role === 'administrator' ? (
            <button
              onClick={handleOpenLogModal}
              className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Record Activity Event</span>
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

      {/* Error Alert */}
      {searchError && (
        <div className="flex items-center justify-between rounded-lg bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C] border border-[#B91C1C]/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{searchError}</span>
          </div>
          <button onClick={() => fetchActivities(search)} className="font-semibold underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* Filters and Search Bar (Page-specific: activity type and enrolment ID) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by activity type (e.g. lesson completed) or enrolment ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={handleKeyDown}
              className="w-80 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-7 text-xs text-[#172B4D] placeholder-[#64748B] focus:border-[#2563EB] focus:bg-white focus:outline-none"
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
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="All">All Event Types</option>
            <option value="lesson_opened">Lesson Opened</option>
            <option value="lesson_started">Lesson Started</option>
            <option value="lesson_completed">Lesson Completed</option>
            <option value="video_watched">Video Watched</option>
            <option value="resource_accessed">Resource Accessed</option>
          </select>

          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none max-w-xs truncate"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-[#64748B]">
          Showing <span className="font-semibold text-[#172B4D]">{totalItems}</span> matching {activities.length} recorded events
        </div>
      </div>

      {/* Activity Table */}
      <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
              <tr>
                <th 
                  onClick={() => handleSort('activity_type')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Event Type {renderSortIndicator('activity_type')}
                </th>
                <th 
                  onClick={() => handleSort('enrollment_id')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Enrolment & Learner {renderSortIndicator('enrollment_id')}
                </th>
                <th 
                  onClick={() => handleSort('course_name')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Course & Lesson {renderSortIndicator('course_name')}
                </th>
                <th 
                  onClick={() => handleSort('activity_date')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Timestamp {renderSortIndicator('activity_date')}
                </th>
                <th 
                  onClick={() => handleSort('completed')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Status {renderSortIndicator('completed')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F2]">
              {paginatedActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#64748B]">
                    <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                    <p className="font-semibold text-[#172B4D]">No activity events found</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {search ? `No activity events match "${search}". Search by activity type (e.g. lesson completed) or enrolment ID.` : 'No activity records match the selected filters.'}
                    </p>
                    {(search || selectedType !== 'All' || selectedCourse !== 'All') && (
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
                paginatedActivities.map((act) => {
                  const isHighlighted = highlightRecordId === act.activity_id || highlightRecordId === act.enrollment_id;
                  return (
                    <tr 
                      key={act.activity_id} 
                      className={`transition-colors ${
                        isHighlighted 
                          ? 'bg-[#2563EB]/10 border-l-4 border-l-[#2563EB]' 
                          : 'hover:bg-[#F5F8FF]/60'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeBadge(act.activity_type)}
                          {isHighlighted && (
                            <span className="rounded bg-[#2563EB] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                              Target
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono mt-1">
                          ID: {act.activity_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#172B4D]">{act.learner_name || 'Enrolled Student'}</div>
                        <div className="font-mono text-[11px] text-[#2563EB]">{act.enrollment_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#172B4D]">{act.course_name || 'General Course'}</div>
                        <div className="text-[11px] text-[#64748B]">{act.lesson_name || 'Curriculum Overview'}</div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
                          <span>{act.activity_date}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {act.completed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#15803D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
                            <Check className="h-3 w-3" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#64748B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
                            <span>Logged</span>
                          </span>
                        )}
                      </td>
                    </tr>
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
              <span className="font-semibold text-[#172B4D]">{totalItems}</span> recorded events
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

      {/* Modal: Log Activity Event */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <h2 className="text-base font-bold text-[#172B4D]">Record Learning Activity Event</h2>
              <button onClick={() => setIsLogOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLogActivity} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D]">Target Enrolment *</label>
                <select
                  value={targetEnrId}
                  onChange={(e) => handleEnrolmentChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  {enrollments.map((enr) => (
                    <option key={enr.enrollment_id} value={enr.enrollment_id}>
                      {enr.learner_name} in {enr.course_name} ({enr.enrollment_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D]">Activity Event Type *</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="lesson_completed">Lesson Completed (Progress Eligible)</option>
                  <option value="lesson_started">Lesson Started</option>
                  <option value="lesson_opened">Lesson Opened</option>
                  <option value="video_watched">Video Watched</option>
                  <option value="resource_accessed">Resource Accessed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D]">Curriculum Lesson (Optional)</label>
                <select
                  value={targetLessonId}
                  onChange={(e) => setTargetLessonId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">General Course Activity (No specific lesson)</option>
                  {courseLessons.map((l) => (
                    <option key={l.lesson_id} value={l.lesson_id}>
                      Lesson {l.sequence_no}: {l.lesson_name} {l.is_required ? '(Required)' : '(Optional)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D]">Activity Timestamp</label>
                <input
                  type="datetime-local"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="act_completed"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="rounded border-[#DCE6F2] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="act_completed" className="font-medium text-[#172B4D]">
                  Mark lesson as completed in enrolment progress
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
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
                  <span>Record Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
