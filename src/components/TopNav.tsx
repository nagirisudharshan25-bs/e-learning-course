import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Search, 
  Calendar, 
  ShieldCheck, 
  UserCheck, 
  Database,
  Menu,
  X,
  Loader2,
  BookOpen,
  Users,
  Activity,
  Layers,
  ChevronRight,
  AlertCircle,
  LogOut,
  Lock
} from 'lucide-react';
import { NavSection, UserRole, GlobalSearchResponse, SearchResultItem } from '../types.ts';
import { api, setCurrentRole } from '../services/apiClient.ts';
import { CalendarDatePicker } from './CalendarDatePicker.tsx';

interface TopNavProps {
  currentSection: NavSection;
  role: UserRole;
  onRoleChange: (newRole: UserRole) => void;
  reportDate: string;
  onReportDateChange: (newDate: string, isManual?: boolean) => void;
  onResetToToday?: () => void;
  isManualDateSelected?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleSidebar: () => void;
  onNavigateToSection?: (section: NavSection, recordId?: string) => void;
  onRequestAdminLogin?: () => void;
  onLogoutAdmin?: () => void;
  adminUsername?: string | null;
}

const sectionTitles: Record<NavSection, string> = {
  overview: 'Executive Analytics Overview',
  approvals: 'Admin Course Approvals & Workflow',
  analyst_dashboard: 'Analyst Activity & Proposal Center',
  audit_logs: 'Immutable System Audit Logs',
  courses: 'Course Management & Curriculum',
  learners: 'Learner Registry & Profiles',
  enrollments: 'Course Enrolments & Lifecycle',
  activity: 'Learning Activity Event Stream',
  progress: 'Required Lesson Progress Analytics',
  completion: 'Course Completion Rate Reports',
  inactivity: 'Inactivity Monitoring Engine',
  export: 'Data Export & Sanitized CSV',
  settings: 'System Architecture & Database Tools',
};

export const TopNav: React.FC<TopNavProps> = ({
  currentSection,
  role,
  onRoleChange,
  reportDate,
  onReportDateChange,
  onResetToToday,
  isManualDateSelected,
  searchQuery,
  onSearchChange,
  onToggleSidebar,
  onNavigateToSection,
  onRequestAdminLogin,
  onLogoutAdmin,
  adminUsername,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'learners' | 'enrollments' | 'activities'>('all');

  // Stale request guard
  const latestRequestIdRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect with stale response prevention
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const currentReqId = ++latestRequestIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await api.globalSearch(trimmed);
        // Prevent stale responses from overwriting newer query results
        if (currentReqId === latestRequestIdRef.current) {
          setSearchResults(res.data);
          setIsOpen(true);
        }
      } catch (err: any) {
        if (currentReqId === latestRequestIdRef.current) {
          setSearchError(err.message || 'Error executing search');
        }
      } finally {
        if (currentReqId === latestRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClear = () => {
    onSearchChange('');
    setSearchResults(null);
    setIsOpen(false);
    setSearchError(null);
  };

  const executeSearchImmediate = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const currentReqId = ++latestRequestIdRef.current;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await api.globalSearch(trimmed);
      if (currentReqId === latestRequestIdRef.current) {
        setSearchResults(res.data);
        setIsOpen(true);
      }
    } catch (err: any) {
      if (currentReqId === latestRequestIdRef.current) {
        setSearchError(err.message || 'Error executing search');
      }
    } finally {
      if (currentReqId === latestRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        executeSearchImmediate(searchQuery);
        setIsOpen(true);
      }
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    if (!onNavigateToSection) return;

    switch (item.type) {
      case 'course':
        onNavigateToSection('courses', item.id);
        break;
      case 'learner':
        onNavigateToSection('learners', item.id);
        break;
      case 'enrollment':
        onNavigateToSection('enrollments', item.id);
        break;
      case 'activity':
        onNavigateToSection('activity', item.id);
        break;
    }
  };

  // Grouped results counts
  const coursesCount = searchResults?.results.courses.length || 0;
  const learnersCount = searchResults?.results.learners.length || 0;
  const enrollmentsCount = searchResults?.results.enrollments.length || 0;
  const activitiesCount = searchResults?.results.activities.length || 0;
  const totalMatches = searchResults?.total_matches || 0;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#DCE6F2] bg-[#FFFFFF] px-4 py-2.5 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D] lg:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#123B73] text-white shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#123B73]">EduPulse Analytics</span>
              <span className="hidden rounded-full bg-[#F5F8FF] px-2 py-0.5 text-[11px] font-medium text-[#2563EB] sm:inline-block border border-[#DCE6F2]">
                v1.0 • MySQL 8 Architecture
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <span>Analytics</span>
              <span>/</span>
              <span className="font-medium text-[#172B4D]">{sectionTitles[currentSection]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Global Search Bar with Autocomplete Dropdown */}
        <div ref={containerRef} className="relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search courses, roll numbers, enrolments, activities..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim() && searchResults) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-64 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-8 text-xs text-[#172B4D] placeholder-[#64748B] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] lg:w-80"
            />
            {isSearching ? (
              <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-[#2563EB]" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#172B4D]"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* Search Results Popover Dropdown */}
          {isOpen && searchQuery.trim() && (
            <div className="absolute right-0 top-full mt-1.5 w-96 max-h-[28rem] overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-xl z-50 text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#DCE6F2] bg-[#F5F8FF] px-3.5 py-2">
                <span className="font-semibold text-[#123B73]">
                  Search Results ({totalMatches})
                </span>
                <span className="text-[10px] text-[#64748B]">Esc to close</span>
              </div>

              {/* Filter Tabs */}
              {totalMatches > 0 && (
                <div className="flex border-b border-[#DCE6F2] bg-white px-2 py-1 text-[11px] gap-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`rounded-md px-2 py-1 font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'bg-[#123B73] text-white'
                        : 'text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D]'
                    }`}
                  >
                    All ({totalMatches})
                  </button>
                  {coursesCount > 0 && (
                    <button
                      onClick={() => setActiveTab('courses')}
                      className={`rounded-md px-2 py-1 font-medium transition-colors ${
                        activeTab === 'courses'
                          ? 'bg-[#123B73] text-white'
                          : 'text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D]'
                      }`}
                    >
                      Courses ({coursesCount})
                    </button>
                  )}
                  {learnersCount > 0 && (
                    <button
                      onClick={() => setActiveTab('learners')}
                      className={`rounded-md px-2 py-1 font-medium transition-colors ${
                        activeTab === 'learners'
                          ? 'bg-[#123B73] text-white'
                          : 'text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D]'
                      }`}
                    >
                      Learners ({learnersCount})
                    </button>
                  )}
                  {enrollmentsCount > 0 && (
                    <button
                      onClick={() => setActiveTab('enrollments')}
                      className={`rounded-md px-2 py-1 font-medium transition-colors ${
                        activeTab === 'enrollments'
                          ? 'bg-[#123B73] text-white'
                          : 'text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D]'
                      }`}
                    >
                      Enrolments ({enrollmentsCount})
                    </button>
                  )}
                  {activitiesCount > 0 && (
                    <button
                      onClick={() => setActiveTab('activities')}
                      className={`rounded-md px-2 py-1 font-medium transition-colors ${
                        activeTab === 'activities'
                          ? 'bg-[#123B73] text-white'
                          : 'text-[#64748B] hover:bg-[#F5F8FF] hover:text-[#172B4D]'
                      }`}
                    >
                      Activities ({activitiesCount})
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#DCE6F2]">
                {searchError ? (
                  <div className="p-4 text-center text-[#B91C1C] flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{searchError}</span>
                  </div>
                ) : totalMatches === 0 && !isSearching ? (
                  <div className="p-6 text-center text-[#64748B]">
                    <Search className="mx-auto h-6 w-6 text-[#DCE6F2] mb-1.5" />
                    <p className="font-medium text-[#172B4D]">No matching records found</p>
                    <p className="text-[11px] mt-0.5">
                      No courses, learners, enrolments, or activities matched &quot;{searchQuery}&quot;.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Courses */}
                    {(activeTab === 'all' || activeTab === 'courses') &&
                      searchResults?.results.courses.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item)}
                          className="flex items-center justify-between p-2.5 hover:bg-[#F5F8FF] cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-md bg-[#2563EB]/10 p-1 text-[#2563EB]">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#172B4D]">{item.title}</span>
                                <span className="rounded bg-[#F5F8FF] px-1.5 py-0.2 text-[9px] font-bold uppercase text-[#2563EB] border border-[#DCE6F2]">
                                  Course
                                </span>
                              </div>
                              <div className="text-[11px] text-[#2563EB]">{item.subtitle}</div>
                              <div className="text-[10px] text-[#64748B]">{item.details}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                        </div>
                      ))}

                    {/* Learners */}
                    {(activeTab === 'all' || activeTab === 'learners') &&
                      searchResults?.results.learners.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item)}
                          className="flex items-center justify-between p-2.5 hover:bg-[#F5F8FF] cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-md bg-[#123B73]/10 p-1 text-[#123B73]">
                              <Users className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#172B4D]">{item.title}</span>
                                <span className="rounded bg-[#123B73]/10 px-1.5 py-0.2 text-[9px] font-bold uppercase text-[#123B73]">
                                  Learner
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-[#123B73]">{item.subtitle}</div>
                              <div className="text-[10px] text-[#64748B]">{item.details}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                        </div>
                      ))}

                    {/* Enrollments */}
                    {(activeTab === 'all' || activeTab === 'enrollments') &&
                      searchResults?.results.enrollments.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item)}
                          className="flex items-center justify-between p-2.5 hover:bg-[#F5F8FF] cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-md bg-[#15803D]/10 p-1 text-[#15803D]">
                              <Layers className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#172B4D]">{item.title}</span>
                                <span className="rounded bg-[#15803D]/10 px-1.5 py-0.2 text-[9px] font-bold uppercase text-[#15803D]">
                                  Enrolment
                                </span>
                              </div>
                              <div className="text-[11px] text-[#15803D]">{item.subtitle}</div>
                              <div className="text-[10px] text-[#64748B]">{item.details}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                        </div>
                      ))}

                    {/* Activities */}
                    {(activeTab === 'all' || activeTab === 'activities') &&
                      searchResults?.results.activities.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item)}
                          className="flex items-center justify-between p-2.5 hover:bg-[#F5F8FF] cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-md bg-[#B45309]/10 p-1 text-[#B45309]">
                              <Activity className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#172B4D]">{item.title}</span>
                                <span className="rounded bg-[#B45309]/10 px-1.5 py-0.2 text-[9px] font-bold uppercase text-[#B45309]">
                                  Activity
                                </span>
                              </div>
                              <div className="text-[11px] text-[#B45309]">{item.subtitle}</div>
                              <div className="text-[10px] text-[#64748B]">{item.details}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-[#64748B]" />
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reference Report Date Selector with Month Navigation & DD-MM-YYYY Display */}
        <div className="hidden sm:flex items-center">
          <CalendarDatePicker
            value={reportDate}
            onChange={(newDate, isManual) => onReportDateChange(newDate, isManual)}
            onResetToToday={onResetToToday}
            isManualSelection={isManualDateSelected}
          />
        </div>

        {/* Database Status Indicator */}
        <div className="hidden items-center gap-1.5 rounded-md border border-[#DCE6F2] bg-white px-2 py-1 text-xs sm:flex">
          <Database className="h-3.5 w-3.5 text-[#15803D]" />
          <span className="text-[11px] font-medium text-[#172B4D]">Relational DB Active</span>
        </div>

        {/* Download GitHub Codebase ZIP */}
        <a
          href="/E-Learning-Course-Analytics-System.zip"
          download="E-Learning-Course-Analytics-System.zip"
          className="flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#2563EB] px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#1D4ED8] transition-colors"
          title="Download entire project ZIP to upload to GitHub"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span className="hidden sm:inline">Download ZIP for GitHub</span>
          <span className="sm:hidden">ZIP</span>
        </a>

        {/* Role Switcher (Admin vs Analyst with Password Protection) */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-0.5 text-xs">
            {role === 'administrator' ? (
              <div
                className="flex items-center gap-1.5 rounded-md bg-[#123B73] px-2.5 py-1 font-semibold text-white shadow-xs"
                title={`Signed in as Administrator${adminUsername ? ` (${adminUsername})` : ''}`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#60A5FA]" />
                <span className="hidden sm:inline">Administrator</span>
                <span className="sm:hidden">Admin</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]" title="Authenticated" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onRequestAdminLogin) {
                    onRequestAdminLogin();
                  } else {
                    onRoleChange('administrator');
                  }
                }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-[#64748B] hover:text-[#172B4D] hover:bg-[#EBF2FC] transition-colors"
                title="Administrator access requires password authentication"
              >
                <Lock className="h-3.5 w-3.5 text-[#2563EB]" />
                <span className="hidden sm:inline">Administrator</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (role === 'administrator' && onLogoutAdmin) {
                  onLogoutAdmin();
                } else {
                  onRoleChange('analyst');
                  setCurrentRole('analyst');
                }
              }}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                role === 'analyst'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
              title="Analyst role provides read-only access to analytics and reports"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Analyst</span>
            </button>
          </div>

          {role === 'administrator' && (
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="flex items-center gap-1 rounded-lg border border-[#DCE6F2] bg-white px-2 py-1 text-xs font-medium text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#B91C1C] hover:border-[#FECACA] transition-colors shadow-2xs"
              title="Sign out of Administrator role"
            >
              <LogOut className="h-3.5 w-3.5 text-[#DC2626]" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
