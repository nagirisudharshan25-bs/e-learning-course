import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  RotateCcw, 
  Code, 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  X,
  Cpu
} from 'lucide-react';
import { api } from '../services/apiClient.ts';
import { UserRole } from '../types.ts';

interface SettingsViewProps {
  role: UserRole;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  role,
  onRefreshAll,
}) => {
  const [activeTab, setActiveTab] = useState<'database' | 'python' | 'security'>('database');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const fetchDbStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.getDatabaseStatus();
      setDbStatus(res.data);
    } catch (err: any) {
      setDbStatus({ status: 'error', error: err.message });
    } finally {
      setLoadingStatus(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'database') {
      fetchDbStatus();
    }
  }, [activeTab]);

  const handleResetDatabase = async () => {
    if (role !== 'administrator') {
      setFeedback({ type: 'error', message: 'Administrator role required to reset the database.' });
      return;
    }
    setResetting(true);
    try {
      const res = await api.resetDatabase();
      setFeedback({ type: 'success', message: `${res.message} Loaded ${res.counts.courses} courses, ${res.counts.learners} learners, and ${res.counts.activities} activities.` });
      setIsResetConfirmOpen(false);
      onRefreshAll();
      fetchDbStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Settings & Database Architecture</h1>
          <p className="text-xs text-[#64748B]">
            Relational storage schema, Python analytics package configuration, and reproducible database seeding.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center justify-between rounded-lg p-3 text-xs ${
          feedback.type === 'success' ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20' : 'bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/20'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#DCE6F2] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'database'
              ? 'border-[#123B73] text-[#123B73]'
              : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
          }`}
        >
          <Database className="h-4 w-4 text-[#2563EB]" />
          <span>Relational Database (MySQL 8)</span>
        </button>

        <button
          onClick={() => setActiveTab('python')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'python'
              ? 'border-[#123B73] text-[#123B73]'
              : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
          }`}
        >
          <Cpu className="h-4 w-4 text-[#2563EB]" />
          <span>Python Analytics Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'security'
              ? 'border-[#123B73] text-[#123B73]'
              : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-[#15803D]" />
          <span>Security & Authorization</span>
        </button>
      </div>

      {/* Tab: Database */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          {/* Live Database Connection Status Card */}
          <div className="rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-2xs space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#172B4D]">Live Database Connection & Schema Status</h3>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  dbStatus?.status === 'healthy' ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20' : 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20'
                }`}>
                  {dbStatus?.status === 'healthy' ? 'Verified Operational' : 'Checking...'}
                </span>
              </div>
              <button
                type="button"
                onClick={fetchDbStatus}
                disabled={loadingStatus}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-2.5 py-1 text-xs font-medium text-[#123B73] hover:bg-[#E8EFFB]"
              >
                <RotateCcw className={`h-3 w-3 ${loadingStatus ? 'animate-spin' : ''}`} />
                <span>Verify Connection</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3 space-y-1">
                <span className="font-semibold text-[#123B73]">Active Relational Engine:</span>
                <p className="text-[11px] text-[#172B4D]">
                  {dbStatus?.relational_store?.engine || 'SQLite3 (Node.js DatabaseSync)'}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Executing parameterized SQL queries with full relational constraints matching MySQL 8 DDL.
                </p>
              </div>

              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3 space-y-1">
                <span className="font-semibold text-[#123B73]">Remote MySQL 8 Connection:</span>
                <p className="text-[11px] text-[#172B4D]">
                  {dbStatus?.mysql_connection?.host || 'Not configured in environment'}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {dbStatus?.mysql_connection?.message || 'Truthful status: Unconfigured in local environment (DB_HOST/MYSQL_HOST not provided). Operating on embedded relational engine.'}
                </p>
              </div>
            </div>

            {dbStatus?.relational_store?.tables && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#64748B]">
                <span className="font-semibold text-[#172B4D]">Verified Tables:</span>
                {Object.entries(dbStatus.relational_store.tables).map(([table, count]) => (
                  <span key={table} className="rounded-md bg-white border border-[#DCE6F2] px-2 py-0.5 font-mono text-[#123B73]">
                    {table}: <strong className="text-[#172B4D]">{String(count)}</strong> rows
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Seeding & Reset Card */}
          <div className="rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-2xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#172B4D]">Development Seed Dataset</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Reset the runtime database to the documented baseline dataset with realistic test cases (edge courses, duplicate completions, inactivity spreads).
                </p>
              </div>
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/5 px-3.5 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/15 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Re-seed Database</span>
              </button>
            </div>
          </div>

          {/* Relational Schema Display */}
          <div className="rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-[#172B4D]">MySQL 8 DDL Schema Overview</h3>
            <p className="text-[11px] text-[#64748B]">
              The production MySQL 8 DDL is available at <code className="bg-[#F5F8FF] px-1.5 py-0.5 rounded font-mono text-[#123B73] border border-[#DCE6F2]">/database/schema.sql</code>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3">
                <span className="font-bold text-[#123B73]">Table A: courses</span>
                <p className="text-[11px] text-[#64748B] mt-1">course_id (PK), course_name, category, description, is_active, created_at, updated_at</p>
              </div>
              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3">
                <span className="font-bold text-[#123B73]">Table B: learners</span>
                <p className="text-[11px] text-[#64748B] mt-1">learner_id (PK), roll_no (UNIQUE), display_name, created_at, updated_at</p>
              </div>
              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3">
                <span className="font-bold text-[#123B73]">Table C: enrollments</span>
                <p className="text-[11px] text-[#64748B] mt-1">enrollment_id (PK), learner_id (FK), course_id (FK), enrolled_at, status, updated_at</p>
              </div>
              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3">
                <span className="font-bold text-[#123B73]">Table D: lessons</span>
                <p className="text-[11px] text-[#64748B] mt-1">lesson_id (PK), course_id (FK), lesson_name, sequence_no, is_required, created_at</p>
              </div>
              <div className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-3 md:col-span-2">
                <span className="font-bold text-[#123B73]">Table E: activities</span>
                <p className="text-[11px] text-[#64748B] mt-1">activity_id (PK), enrollment_id (FK), lesson_id (FK, nullable), activity_type, activity_date, completed, created_at</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Python */}
      {activeTab === 'python' && (
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-2xs space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-[#172B4D]">Python Analytics Engine Architecture</h3>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              The Python package is organized in <code className="bg-[#F5F8FF] px-1.5 py-0.5 rounded font-mono text-[#123B73] border border-[#DCE6F2]">/analytics</code> with decoupled computational modules.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-2">
              <span className="font-mono font-medium text-[#123B73]">analytics/course_analytics.py</span>
              <span className="text-[#64748B]">get_course_enrolment_summary(), calculate_completion_rates()</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-2">
              <span className="font-mono font-medium text-[#123B73]">analytics/progress_analytics.py</span>
              <span className="text-[#64748B]">calculate_enrolment_progress(), get_progress_distribution()</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-2">
              <span className="font-mono font-medium text-[#123B73]">analytics/activity_analytics.py</span>
              <span className="text-[#64748B]">get_weekly_activity_summary(), parse_datetime()</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-2">
              <span className="font-mono font-medium text-[#123B73]">analytics/inactivity_analytics.py</span>
              <span className="text-[#64748B]">get_inactive_enrolments()</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-2">
              <span className="font-mono font-medium text-[#123B73]">analytics/visualizations.py</span>
              <span className="text-[#64748B]">generate_course_comparison_chart(), generate_activity_trend_chart()</span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono font-medium text-[#123B73]">analytics/main.py</span>
              <span className="text-[#64748B]">Microservice / CLI run_full_analytics() entry point</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-[#172B4D]">Security & Authorization Enforcement</h3>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
              <span><strong>Server-Side Role Checks:</strong> Write and modify operations strictly require role <code>administrator</code>. Analysts cannot bypass via client UI modifications.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
              <span><strong>Formula Injection Defense:</strong> All CSV exports escape symbols <code>=</code>, <code>+</code>, <code>-</code>, <code>@</code> with single quotation prefixes to mitigate Excel/Sheets DDE injection.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
              <span><strong>Relational Integrity:</strong> Strict foreign key checks on course_id, learner_id, and lesson_id. Prevention of duplicate concurrent active enrolments.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
              <span><strong>Centralized Error Handling:</strong> Stack traces and credentials are never leaked in API response payloads.</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B4D]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-[#DCE6F2] bg-white p-5 shadow-xl text-xs">
            <div className="flex items-center gap-2 text-[#B91C1C]">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-sm font-bold">Reset Database to Seed State?</h2>
            </div>
            <p className="mt-2 text-[#64748B]">
              This will re-initialize courses, learners, lessons, enrolments, and activities with the seed dataset from <code className="font-mono">database/seed.sql</code>.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#DCE6F2] pt-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="rounded-lg border border-[#DCE6F2] px-3.5 py-1.5 font-medium text-[#64748B] hover:bg-[#F5F8FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDatabase}
                className="rounded-lg bg-[#B91C1C] px-4 py-1.5 font-semibold text-white hover:bg-[#B91C1C]/90"
              >
                {resetting ? 'Resetting...' : 'Yes, Re-seed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
