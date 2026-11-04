/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavSection, UserRole, OverviewMetrics, CourseItem, LearnerItem, EnrollmentItem, ActivityItem, CoursePerformanceItem, InactivityItem } from './types.ts';
import { api, setCurrentRole, isAdministratorAuthenticated } from './services/apiClient.ts';
import { TopNav } from './components/TopNav.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { CoursesView } from './components/CoursesView.tsx';
import { LearnersView } from './components/LearnersView.tsx';
import { EnrollmentsView } from './components/EnrollmentsView.tsx';
import { ActivityView } from './components/ActivityView.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import { CompletionView } from './components/CompletionView.tsx';
import { InactivityView } from './components/InactivityView.tsx';
import { ExportView } from './components/ExportView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getTodayLocalDateString, getMsUntilNextMidnight, isSameDay } from './utils/dateUtils.ts';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [role, setRole] = useState<UserRole>(isAdministratorAuthenticated() ? 'administrator' : 'analyst');
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  
  // Default date is always the current local system date (never hardcoded)
  const [reportDate, setReportDate] = useState<string>(getTodayLocalDateString);
  const [isManualDateSelected, setIsManualDateSelected] = useState<boolean>(false);
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(14);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState<boolean>(false);

  // Application Data States
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformanceItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [learners, setLearners] = useState<LearnerItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [progressDistribution, setProgressDistribution] = useState<any[]>([]);
  const [individualProgress, setIndividualProgress] = useState<any[]>([]);
  const [totalAnalyzed, setTotalAnalyzed] = useState<number>(0);
  const [inactiveRecords, setInactiveRecords] = useState<InactivityItem[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewResult,
        coursesResult,
        learnersResult,
        enrollmentsResult,
        activitiesResult,
        progressResult,
        weeklyResult,
        inactiveResult
      ] = await Promise.allSettled([
        api.getOverview(reportDate),
        api.getCourses(),
        api.getLearners(),
        api.getEnrollments(),
        api.getActivities(),
        api.getProgressAnalytics(),
        api.getWeeklyActivity(),
        api.getInactiveEnrollments(inactivityThreshold, reportDate),
      ]);

      const failedModules: string[] = [];

      if (overviewResult.status === 'fulfilled') {
        setMetrics(overviewResult.value.metrics);
        setCoursePerformance(overviewResult.value.course_performance);
      } else {
        failedModules.push(`Overview analytics (${overviewResult.reason?.message || 'Error'})`);
      }

      if (coursesResult.status === 'fulfilled') {
        setCourses(coursesResult.value.data);
      } else {
        failedModules.push(`Courses (${coursesResult.reason?.message || 'Error'})`);
      }

      if (learnersResult.status === 'fulfilled') {
        setLearners(learnersResult.value.data);
      } else {
        failedModules.push(`Learners (${learnersResult.reason?.message || 'Error'})`);
      }

      if (enrollmentsResult.status === 'fulfilled') {
        setEnrollments(enrollmentsResult.value.data);
      } else {
        failedModules.push(`Enrolments (${enrollmentsResult.reason?.message || 'Error'})`);
      }

      if (activitiesResult.status === 'fulfilled') {
        setActivities(activitiesResult.value.data);
      } else {
        failedModules.push(`Activities (${activitiesResult.reason?.message || 'Error'})`);
      }

      if (progressResult.status === 'fulfilled') {
        setProgressDistribution(progressResult.value.data.distribution);
        setIndividualProgress(progressResult.value.data.individual_progress);
        setTotalAnalyzed(progressResult.value.data.total_analyzed);
      } else {
        failedModules.push(`Progress analytics (${progressResult.reason?.message || 'Error'})`);
      }

      if (weeklyResult.status === 'fulfilled') {
        setWeeklyActivity(weeklyResult.value.data);
      } else {
        failedModules.push(`Weekly activity (${weeklyResult.reason?.message || 'Error'})`);
      }

      if (inactiveResult.status === 'fulfilled') {
        setInactiveRecords(inactiveResult.value.data.records);
      } else {
        failedModules.push(`Inactivity monitor (${inactiveResult.reason?.message || 'Error'})`);
      }

      if (failedModules.length > 0) {
        setError(`Failed to retrieve: ${failedModules.join('; ')}. Check backend database connection.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with analytics backend');
    } finally {
      setLoading(false);
    }
  }, [inactivityThreshold, reportDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Automatic midnight rollover effect & sleep/wake synchronization
  useEffect(() => {
    let midnightTimer: any;

    const scheduleMidnightTimer = () => {
      const ms = getMsUntilNextMidnight();
      midnightTimer = setTimeout(() => {
        // If user hasn't explicitly locked a manual past/future date, advance to new local date
        setIsManualDateSelected((prevManual) => {
          if (!prevManual) {
            setReportDate(getTodayLocalDateString());
          }
          return prevManual;
        });
        // Schedule next midnight
        scheduleMidnightTimer();
      }, ms);
    };

    scheduleMidnightTimer();

    // Check periodically (every 15s) and on tab visibility/focus to catch wake-from-sleep or day transitions
    const handleSyncDate = () => {
      setIsManualDateSelected((prevManual) => {
        if (!prevManual) {
          const currentSystemDate = getTodayLocalDateString();
          setReportDate((cur) => (cur !== currentSystemDate ? currentSystemDate : cur));
        }
        return prevManual;
      });
    };

    const intervalId = setInterval(handleSyncDate, 15000);
    window.addEventListener('focus', handleSyncDate);
    document.addEventListener('visibilitychange', handleSyncDate);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleSyncDate);
      document.removeEventListener('visibilitychange', handleSyncDate);
    };
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    api.getMe()
      .then((res) => {
        if (res.authenticated && res.user) {
          setRole('administrator');
          setCurrentRole('administrator');
          setAdminUsername(res.user.username);
        } else {
          setRole('analyst');
          setCurrentRole('analyst');
          setAdminUsername(null);
        }
      })
      .catch(() => {
        setRole('analyst');
        setCurrentRole('analyst');
      });
  }, []);

  const [highlightRecordId, setHighlightRecordId] = useState<string | null>(null);
  const [initialSearchTerm, setInitialSearchTerm] = useState<string>('');

  const handleNavigateToSection = (section: NavSection, recordId?: string) => {
    setCurrentSection(section);
    if (recordId) {
      setHighlightRecordId(recordId);
      setInitialSearchTerm(recordId);
    } else {
      setHighlightRecordId(null);
      setInitialSearchTerm('');
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === 'administrator' && !isAdministratorAuthenticated()) {
      setIsLoginModalOpen(true);
      return;
    }
    setRole(newRole);
    setCurrentRole(newRole);
  };

  const handleRequestAdminLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (username: string) => {
    setRole('administrator');
    setCurrentRole('administrator');
    setAdminUsername(username);
    setIsLoginModalOpen(false);
    loadData();
  };

  const handleLogoutAdmin = async () => {
    await api.logout();
    setRole('analyst');
    setCurrentRole('analyst');
    setAdminUsername(null);
  };

  const handleThresholdChange = (newThreshold: number) => {
    setInactivityThreshold(newThreshold);
  };

  const handleReportDateChange = (newDate: string, isManual = true) => {
    setReportDate(newDate);
    const today = getTodayLocalDateString();
    if (isSameDay(newDate, today)) {
      setIsManualDateSelected(false);
    } else {
      setIsManualDateSelected(isManual);
    }
  };

  const handleResetToToday = () => {
    const today = getTodayLocalDateString();
    setReportDate(today);
    setIsManualDateSelected(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F5F8FF] text-[#172B4D] font-sans">
      {/* Administrator Authentication Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
          setHighlightRecordId(null);
          setInitialSearchTerm('');
        }}
        isOpenMobile={sidebarOpenMobile}
        onCloseMobile={() => setSidebarOpenMobile(false)}
        role={role}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <TopNav
          currentSection={currentSection}
          role={role}
          onRoleChange={handleRoleChange}
          reportDate={reportDate}
          onReportDateChange={handleReportDateChange}
          onResetToToday={handleResetToToday}
          isManualDateSelected={isManualDateSelected}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleSidebar={() => setSidebarOpenMobile(!sidebarOpenMobile)}
          onNavigateToSection={handleNavigateToSection}
          onRequestAdminLogin={handleRequestAdminLogin}
          onLogoutAdmin={handleLogoutAdmin}
          adminUsername={adminUsername}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-[#B91C1C]/20 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 rounded font-semibold underline hover:opacity-80"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* View Routing */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {currentSection === 'overview' && (
              <OverviewView
                metrics={metrics}
                coursePerformance={coursePerformance}
                weeklyActivity={weeklyActivity}
                progressDistribution={progressDistribution}
                recentActivities={activities}
                inactiveRecords={inactiveRecords}
                loading={loading}
                error={error}
                onRefresh={loadData}
                onNavigate={(sec) => setCurrentSection(sec)}
              />
            )}

            {currentSection === 'courses' && (
              <CoursesView
                courses={courses}
                role={role}
                onRefresh={loadData}
                initialSearch={currentSection === 'courses' ? initialSearchTerm : ''}
                highlightRecordId={currentSection === 'courses' ? highlightRecordId : null}
              />
            )}

            {currentSection === 'learners' && (
              <LearnersView
                learners={learners}
                role={role}
                onRefresh={loadData}
                initialSearch={currentSection === 'learners' ? initialSearchTerm : ''}
                highlightRecordId={currentSection === 'learners' ? highlightRecordId : null}
              />
            )}

            {currentSection === 'enrollments' && (
              <EnrollmentsView
                enrollments={enrollments}
                courses={courses}
                learners={learners}
                role={role}
                onRefresh={loadData}
                initialSearch={currentSection === 'enrollments' ? initialSearchTerm : ''}
                highlightRecordId={currentSection === 'enrollments' ? highlightRecordId : null}
              />
            )}

            {currentSection === 'activity' && (
              <ActivityView
                activities={activities}
                enrollments={enrollments}
                courses={courses}
                role={role}
                onRefresh={loadData}
                initialSearch={currentSection === 'activity' ? initialSearchTerm : ''}
                highlightRecordId={currentSection === 'activity' ? highlightRecordId : null}
              />
            )}

            {currentSection === 'progress' && (
              <ProgressView
                progressDistribution={progressDistribution}
                individualProgress={individualProgress}
                totalAnalyzed={totalAnalyzed}
              />
            )}

            {currentSection === 'completion' && (
              <CompletionView
                coursePerformance={coursePerformance}
                onNavigateToExport={() => setCurrentSection('export')}
              />
            )}

            {currentSection === 'inactivity' && (
              <InactivityView
                records={inactiveRecords}
                threshold={inactivityThreshold}
                onThresholdChange={handleThresholdChange}
                reportDate={reportDate}
                onReportDateChange={handleReportDateChange}
                onRefresh={loadData}
              />
            )}

            {currentSection === 'export' && (
              <ExportView
                threshold={inactivityThreshold}
              />
            )}

            {currentSection === 'settings' && (
              <SettingsView
                role={role}
                onRefreshAll={loadData}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
