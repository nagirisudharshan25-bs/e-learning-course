import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Check, 
  X,
  TrendingUp,
  Filter,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { EnrollmentItem, CourseItem, LearnerItem, UserRole } from '../types.ts';
import { api } from '../services/apiClient.ts';
import { formatToDDMMYYYY } from '../utils/dateUtils.ts';

interface EnrollmentsViewProps {
  enrollments: EnrollmentItem[];
  courses: CourseItem[];
  learners: LearnerItem[];
  role: UserRole;
  onRefresh: () => void;
  initialSearch?: string;
  highlightRecordId?: string | null;
}

type SortField = 'enrollment_id' | 'learner_name' | 'course_name' | 'status' | 'progress' | 'enrolled_at';

export const EnrollmentsView: React.FC<EnrollmentsViewProps> = ({
  enrollments,
  courses,
  learners,
  role,
  onRefresh,
  initialSearch = '',
  highlightRecordId = null,
}) => {
  const [courseFilter, setCourseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState(initialSearch);
  const [displayedEnrollments, setDisplayedEnrollments] = useState<EnrollmentItem[]>(enrollments);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchReqIdRef = useRef(0);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals
  const [isEnrolOpen, setIsEnrolOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedEnr, setSelectedEnr] = useState<EnrollmentItem | null>(null);

  // Forms
  const [targetLearnerId, setTargetLearnerId] = useState('');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [newStatus, setNewStatus] = useState<string>('enrolled');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Fetch function with stale response guard
  const fetchEnrollments = async (query: string, cFilter = courseFilter, sFilter = statusFilter) => {
    const currentReqId = ++searchReqIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await api.getEnrollments({
        search: query.trim() || undefined,
        course_id: cFilter !== 'All' ? cFilter : undefined,
        status: sFilter !== 'All' ? sFilter : undefined,
      });

      if (currentReqId === searchReqIdRef.current) {
        setDisplayedEnrollments(res.data);
      }
    } catch (err: any) {
      if (currentReqId === searchReqIdRef.current) {
        setSearchError(err.message || 'Failed to search enrolments from database');
        // Fallback to local filter
        const q = query.trim().toLowerCase();
        setDisplayedEnrollments(
          enrollments.filter((e) => {
            const matchesCourse = cFilter === 'All' || e.course_id === cFilter;
            const matchesStatus = sFilter === 'All' || e.status === sFilter;
            const matchesSearch = 
              e.learner_name.toLowerCase().includes(q) || 
              e.course_name.toLowerCase().includes(q) || 
              (e.roll_no && e.roll_no.toLowerCase().includes(q)) ||
              e.enrollment_id.toLowerCase().includes(q);
            return (matchesSearch || !q) && matchesCourse && matchesStatus;
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
      fetchEnrollments(search, courseFilter, statusFilter);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, courseFilter, statusFilter, enrollments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchEnrollments(search, courseFilter, statusFilter);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setCurrentPage(1);
    fetchEnrollments('', courseFilter, statusFilter);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCourseFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
    fetchEnrollments('', 'All', 'All');
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

  const sortedEnrollments = useMemo(() => {
    return [...displayedEnrollments].sort((a, b) => {
      if (sortField === 'progress') {
        const progA = a.progress?.progress_percentage ?? 0;
        const progB = b.progress?.progress_percentage ?? 0;
        return sortOrder === 'asc' ? progA - progB : progB - progA;
      }

      let valA: any = a[sortField];
      let valB: any = b[sortField];

      const strA = String(valA || '');
      const strB = String(valB || '');
      const comp = strA.localeCompare(strB);
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [displayedEnrollments, sortField, sortOrder]);

  // Pagination
  const totalItems = sortedEnrollments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedEnrollments = sortedEnrollments.slice(startIndex, startIndex + pageSize);

  const handleCreateEnrolment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLearnerId || !targetCourseId) {
      setFeedback({ type: 'error', message: 'Please select both a learner and a course.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.createEnrollment({
        learner_id: targetLearnerId,
        course_id: targetCourseId,
        status: 'enrolled',
      });
      setFeedback({ type: 'success', message: 'Learner enrolled successfully.' });
      setIsEnrolOpen(false);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenStatusModal = (enr: EnrollmentItem) => {
    setSelectedEnr(enr);
    setNewStatus(enr.status);
    setIsStatusOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnr) return;
    setSubmitting(true);
    try {
      await api.updateEnrollmentStatus(selectedEnr.enrollment_id, newStatus);
      setFeedback({ type: 'success', message: `Status updated to "${newStatus}" for enrolment ${selectedEnr.enrollment_id}.` });
      setIsStatusOpen(false);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#15803D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      case 'enrolled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
            <Clock className="h-3 w-3" />
            <span>Active Enrolled</span>
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#B45309]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
            <XCircle className="h-3 w-3" />
            <span>Withdrawn</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#64748B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
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
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Course Enrolments</h1>
          <p className="text-xs text-[#64748B]">
            Learner-to-course relationships, lifecycle statuses, and measured completion progress.
          </p>
        </div>
        <div>
          {role === 'administrator' ? (
            <button
              onClick={() => {
                if (learners.length > 0) setTargetLearnerId(learners[0].learner_id);
                if (courses.length > 0) setTargetCourseId(courses[0].course_id);
                setIsEnrolOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Enrol Learner</span>
            </button>
          ) : (
            <div className="rounded-lg bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#64748B] border border-[#DCE6F2]">
              Analyst Mode: Read-Only
            </div>
          )}
        </div>
      </div>

      {/* Feedback alert */}
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
          <button onClick={() => fetchEnrollments(search)} className="font-semibold underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* Filters and Search Bar (Page-specific: enrolment ID, learner identifier, course name) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by learner, course, or enrolment ID..."
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
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none max-w-xs truncate"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="enrolled">Enrolled (Active)</option>
            <option value="completed">Completed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-[#64748B]">
          Showing <span className="font-semibold text-[#172B4D]">{totalItems}</span> matching {enrollments.length} enrolments
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
              <tr>
                <th 
                  onClick={() => handleSort('enrollment_id')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Enrolment ID {renderSortIndicator('enrollment_id')}
                </th>
                <th 
                  onClick={() => handleSort('learner_name')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Learner {renderSortIndicator('learner_name')}
                </th>
                <th 
                  onClick={() => handleSort('course_name')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Course {renderSortIndicator('course_name')}
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Status {renderSortIndicator('status')}
                </th>
                <th 
                  onClick={() => handleSort('progress')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Required Progress {renderSortIndicator('progress')}
                </th>
                <th 
                  onClick={() => handleSort('enrolled_at')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Enrolled At {renderSortIndicator('enrolled_at')}
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F2]">
              {paginatedEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">
                    <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                    <p className="font-semibold text-[#172B4D]">No enrolments found</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {search ? `No enrolments match "${search}". Try checking the enrolment ID, learner name, or course.` : 'No enrolments found for the selected filters.'}
                    </p>
                    {(search || courseFilter !== 'All' || statusFilter !== 'All') && (
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
                paginatedEnrollments.map((enr) => {
                  const progressPct = enr.progress?.progress_percentage ?? 0;
                  const isHighlighted = highlightRecordId === enr.enrollment_id;
                  return (
                    <tr 
                      key={enr.enrollment_id} 
                      className={`transition-colors ${
                        isHighlighted 
                          ? 'bg-[#2563EB]/10 border-l-4 border-l-[#2563EB]' 
                          : 'hover:bg-[#F5F8FF]/60'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-[#172B4D]">
                        {enr.enrollment_id}
                        {isHighlighted && (
                          <span className="ml-2 rounded bg-[#2563EB] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                            Target
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#172B4D]">{enr.learner_name}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {enr.roll_no ? `Roll: ${enr.roll_no}` : enr.learner_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#172B4D]">{enr.course_name}</div>
                        <div className="text-[11px] text-[#64748B]">{enr.course_id}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(enr.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#DCE6F2]">
                            <div
                              className="h-full rounded-full bg-[#2563EB]"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-semibold text-[#123B73]">{progressPct.toFixed(0)}%</span>
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          {enr.progress?.distinct_required_completed ?? 0} / {enr.progress?.total_required_lessons ?? 0} lessons
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B] font-mono text-[11px]">
                        {formatToDDMMYYYY(enr.enrolled_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {role === 'administrator' ? (
                          <button
                            onClick={() => handleOpenStatusModal(enr)}
                            className="rounded-md border border-[#DCE6F2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#123B73] hover:bg-[#F5F8FF] hover:border-[#2563EB]"
                          >
                            Update Status
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#64748B] italic">Read-only</span>
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
              <span className="font-semibold text-[#172B4D]">{totalItems}</span> enrolments
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

      {/* Modal: Enrol Learner */}
      {isEnrolOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <h2 className="text-base font-bold text-[#172B4D]">Enrol Learner in Course</h2>
              <button onClick={() => setIsEnrolOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEnrolment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D]">Select Learner</label>
                <select
                  value={targetLearnerId}
                  onChange={(e) => setTargetLearnerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  {learners.map((l) => (
                    <option key={l.learner_id} value={l.learner_id}>
                      {l.display_name} ({l.roll_no || l.learner_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Select Course</label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg bg-[#F5F8FF] p-2.5 text-[11px] text-[#64748B] border border-[#DCE6F2]">
                Enrolment will initialize with status &apos;enrolled&apos; and track required lessons completion progress.
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsEnrolOpen(false)}
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
                  <span>Confirm Enrolment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Status */}
      {isStatusOpen && selectedEnr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">Update Lifecycle Status</h2>
                <span className="text-[11px] text-[#64748B]">Enrolment ID: {selectedEnr.enrollment_id}</span>
              </div>
              <button onClick={() => setIsStatusOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-lg bg-[#F5F8FF] p-2.5 border border-[#DCE6F2] space-y-1">
                <div><span className="font-semibold text-[#172B4D]">Learner:</span> {selectedEnr.learner_name}</div>
                <div><span className="font-semibold text-[#172B4D]">Course:</span> {selectedEnr.course_name}</div>
                <div><span className="font-semibold text-[#172B4D]">Current Status:</span> <span className="uppercase font-bold text-[#2563EB]">{selectedEnr.status}</span></div>
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">New Status Transition</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="enrolled">Enrolled (Active Participation)</option>
                  <option value="completed">Completed (Curriculum Finished)</option>
                  <option value="withdrawn">Withdrawn (Student Dropped)</option>
                  <option value="cancelled">Cancelled (Administrative Cancellation)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsStatusOpen(false)}
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
                  <span>Save Transition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
