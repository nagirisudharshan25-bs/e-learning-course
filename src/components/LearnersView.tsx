import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  X, 
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { LearnerItem, UserRole } from '../types.ts';
import { api } from '../services/apiClient.ts';

interface LearnersViewProps {
  learners: LearnerItem[];
  role: UserRole;
  onRefresh: () => void;
  initialSearch?: string;
  highlightRecordId?: string | null;
}

type SortField = 'learner_id' | 'display_name' | 'roll_no' | 'enrolment_count' | 'active_enrolments' | 'completed_enrolments';

export const LearnersView: React.FC<LearnersViewProps> = ({
  learners,
  role,
  onRefresh,
  initialSearch = '',
  highlightRecordId = null,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [displayedLearners, setDisplayedLearners] = useState<LearnerItem[]>(learners);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchReqIdRef = useRef(0);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('display_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState<any | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Fetch function with stale response guard
  const fetchLearners = async (query: string) => {
    const currentReqId = ++searchReqIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await api.getLearners(query.trim() || undefined);
      if (currentReqId === searchReqIdRef.current) {
        setDisplayedLearners(res.data);
      }
    } catch (err: any) {
      if (currentReqId === searchReqIdRef.current) {
        setSearchError(err.message || 'Failed to search learners from database');
        // Fallback to local filter
        const q = query.trim().toLowerCase();
        setDisplayedLearners(
          learners.filter((l) => {
            const nameMatch = l.display_name.toLowerCase().includes(q);
            const rollMatch = l.roll_no ? l.roll_no.toLowerCase().includes(q) : false;
            const idMatch = l.learner_id.toLowerCase().includes(q);
            return nameMatch || rollMatch || idMatch || !q;
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
      fetchLearners(search);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, learners]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchLearners(search);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setCurrentPage(1);
    fetchLearners('');
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

  const sortedLearners = useMemo(() => {
    return [...displayedLearners].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string' || typeof valB === 'string') {
        const strA = String(valA || '');
        const strB = String(valB || '');
        const comp = strA.localeCompare(strB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });
  }, [displayedLearners, sortField, sortOrder]);

  // Pagination
  const totalItems = sortedLearners.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedLearners = sortedLearners.slice(startIndex, startIndex + pageSize);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setFeedback({ type: 'error', message: 'Learner name is required.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.createLearner({
        display_name: displayName.trim(),
        roll_no: rollNo.trim() || undefined,
      });
      setFeedback({ type: 'success', message: `Learner "${displayName}" registered successfully.` });
      setIsRegisterOpen(false);
      setDisplayName('');
      setRollNo('');
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (learnerId: string) => {
    try {
      const res = await api.getLearner(learnerId);
      setSelectedLearner(res.data);
      setIsDetailOpen(true);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
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
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Learner Registry</h1>
          <p className="text-xs text-[#64748B]">
            Enrolled student directory, roll identifiers, and individual curriculum progress tracking.
          </p>
        </div>
        <div>
          {role === 'administrator' ? (
            <button
              onClick={() => {
                setDisplayName('');
                setRollNo('');
                setIsRegisterOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#123B73] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register New Learner</span>
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
          <button onClick={() => fetchLearners(search)} className="font-semibold underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* Search and Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search by learner name or roll number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            onKeyDown={handleKeyDown}
            className="w-72 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-7 text-xs text-[#172B4D] placeholder-[#64748B] focus:border-[#2563EB] focus:bg-white focus:outline-none"
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
        <div className="text-xs text-[#64748B]">
          Showing <span className="font-semibold text-[#172B4D]">{totalItems}</span> matching {learners.length} learners
        </div>
      </div>

      {/* Learners Table */}
      <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
              <tr>
                <th 
                  onClick={() => handleSort('learner_id')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Learner ID {renderSortIndicator('learner_id')}
                </th>
                <th 
                  onClick={() => handleSort('display_name')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Display Name {renderSortIndicator('display_name')}
                </th>
                <th 
                  onClick={() => handleSort('roll_no')}
                  className="px-4 py-3 cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Roll Number {renderSortIndicator('roll_no')}
                </th>
                <th 
                  onClick={() => handleSort('enrolment_count')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Enrolments {renderSortIndicator('enrolment_count')}
                </th>
                <th 
                  onClick={() => handleSort('active_enrolments')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Active {renderSortIndicator('active_enrolments')}
                </th>
                <th 
                  onClick={() => handleSort('completed_enrolments')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-[#E8EFF8] transition-colors"
                >
                  Completed {renderSortIndicator('completed_enrolments')}
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F2]">
              {paginatedLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">
                    <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                    <p className="font-semibold text-[#172B4D]">No learners found</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {search ? `No learners matched "${search}". Try checking the spelling or roll number.` : 'No learners registered yet.'}
                    </p>
                    {search && (
                      <button
                        onClick={handleClearSearch}
                        className="mt-3 rounded-md bg-[#2563EB]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLearners.map((learner) => {
                  const isHighlighted = highlightRecordId === learner.learner_id;
                  return (
                    <tr 
                      key={learner.learner_id} 
                      className={`transition-colors ${
                        isHighlighted 
                          ? 'bg-[#2563EB]/10 border-l-4 border-l-[#2563EB]' 
                          : 'hover:bg-[#F5F8FF]/60'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#64748B]">
                        {learner.learner_id}
                        {isHighlighted && (
                          <span className="ml-2 rounded bg-[#2563EB] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                            Target
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#172B4D]">
                        {learner.display_name}
                      </td>
                      <td className="px-4 py-3">
                        {learner.roll_no ? (
                          <span className="rounded-md bg-[#F5F8FF] px-2 py-0.5 font-medium text-[#123B73] border border-[#DCE6F2]">
                            {learner.roll_no}
                          </span>
                        ) : (
                          <span className="text-[#64748B] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-[#172B4D]">
                        {learner.enrolment_count}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-[#2563EB]">
                        {learner.active_enrolments}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#15803D]">
                        {learner.completed_enrolments}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewDetails(learner.learner_id)}
                          className="rounded-md border border-[#DCE6F2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#123B73] hover:bg-[#F5F8FF] hover:border-[#2563EB]"
                        >
                          View Enrolments & Progress
                        </button>
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
              <span className="font-semibold text-[#172B4D]">{totalItems}</span> learners
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

      {/* Modal: Register Learner */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <h2 className="text-base font-bold text-[#172B4D]">Register New Learner</h2>
              <button onClick={() => setIsRegisterOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D]">Full Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D]">Institutional Roll Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CS2026-042"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE6F2] px-3 py-2 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Must be unique if provided. Enforced by database constraint.
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
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
                  <span>Register Learner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Learner Progress Details */}
      {isDetailOpen && selectedLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">{selectedLearner.display_name}</h2>
                <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                  <span className="font-mono">ID: {selectedLearner.learner_id}</span>
                  <span>•</span>
                  <span>Roll: {selectedLearner.roll_no || 'Unassigned'}</span>
                  <span>•</span>
                  <span>Joined: {selectedLearner.created_at.slice(0, 10)}</span>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-[#64748B] hover:text-[#172B4D]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
              <h3 className="text-xs font-bold text-[#123B73] uppercase tracking-wider">Course Enrolments & Progress</h3>
              {(!selectedLearner.progress || selectedLearner.progress.length === 0) ? (
                <div className="p-6 text-center text-xs text-[#64748B]">
                  Learner is not enrolled in any course yet.
                </div>
              ) : (
                selectedLearner.progress.map((prog: any) => (
                  <div key={prog.enrollment_id} className="rounded-lg border border-[#DCE6F2] p-3 bg-[#F5F8FF]/40 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[#172B4D]">{prog.course_name}</span>
                        <div className="text-[10px] text-[#64748B] font-mono mt-0.5">Enrolment: {prog.enrollment_id}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        prog.status === 'completed'
                          ? 'bg-[#15803D]/10 text-[#15803D]'
                          : prog.status === 'enrolled'
                          ? 'bg-[#2563EB]/10 text-[#2563EB]'
                          : 'bg-[#64748B]/10 text-[#64748B]'
                      }`}>
                        {prog.status}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#64748B]">
                          Completed: {prog.distinct_required_completed} of {prog.total_required_lessons} required lessons
                        </span>
                        <span className="font-bold text-[#123B73]">{prog.progress_percentage.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#DCE6F2]">
                        <div
                          className="h-full rounded-full bg-[#2563EB] transition-all"
                          style={{ width: `${prog.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-[#DCE6F2] pt-3">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg bg-[#123B73] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
