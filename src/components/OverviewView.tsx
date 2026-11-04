import React from 'react';
import { 
  BookOpen, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  Percent, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { OverviewMetrics, CoursePerformanceItem, NavSection } from '../types.ts';

interface OverviewViewProps {
  metrics: OverviewMetrics | null;
  coursePerformance: CoursePerformanceItem[];
  weeklyActivity: any[];
  progressDistribution: any[];
  recentActivities: any[];
  inactiveRecords: any[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onNavigate: (section: NavSection) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  coursePerformance,
  weeklyActivity,
  progressDistribution,
  recentActivities,
  inactiveRecords,
  loading,
  error = null,
  onRefresh,
  onNavigate,
}) => {
  if (loading && !metrics) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-3 text-sm text-[#2563EB]">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="font-medium">Loading analytics from database...</span>
        </div>
        <p className="text-xs text-[#64748B]">Querying live course metrics, completion records, and active enrolments...</p>
      </div>
    );
  }

  if (!loading && !metrics) {
    return (
      <div className="rounded-xl border border-[#B91C1C]/20 bg-white p-8 text-center shadow-2xs">
        <AlertTriangle className="mx-auto h-10 w-10 text-[#B91C1C] mb-3" />
        <h2 className="text-base font-bold text-[#172B4D]">Unable to Load Analytics Overview</h2>
        <p className="mt-1 text-xs text-[#64748B] max-w-md mx-auto">
          {error || 'Database queries could not be completed or returned no records. Please verify database connectivity.'}
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Loading Analytics</span>
        </button>
      </div>
    );
  }

  // Activity by type calculation
  const activityTypeTotals: Record<string, number> = {};
  weeklyActivity.forEach((w) => {
    if (w.breakdown) {
      Object.entries(w.breakdown).forEach(([k, v]) => {
        activityTypeTotals[k] = (activityTypeTotals[k] || 0) + (v as number);
      });
    }
  });

  const typeChartData = Object.entries(activityTypeTotals).map(([key, val]) => ({
    name: key.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count: val,
  }));

  // Format Course Comparison Chart data
  const comparisonData = coursePerformance.map((c) => ({
    name: c.course_name.length > 20 ? c.course_name.slice(0, 18) + '...' : c.course_name,
    fullName: c.course_name,
    eligible: c.eligible_enrolments,
    completed: c.completed_enrolments,
    rate: c.completion_rate_percent,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Executive Analytics Overview</h1>
          <p className="text-xs text-[#64748B]">
            Real-time enrollment counts, progress aggregates, and learning activity trends from database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[#DCE6F2] bg-white px-3 py-1.5 text-xs font-medium text-[#172B4D] hover:bg-[#F5F8FF] hover:border-[#2563EB] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 7 KPI Dashboard Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {/* Card 1: Total Courses */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Total Courses</span>
            <BookOpen className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B4D]">
            {metrics?.total_courses ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#64748B]">
            <span className="text-[#15803D] font-medium">Active & Curated</span>
          </div>
        </div>

        {/* Card 2: Total Learners */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Total Learners</span>
            <Users className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B4D]">
            {metrics?.total_learners ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#64748B]">
            <span>Registered learners</span>
          </div>
        </div>

        {/* Card 3: Eligible Enrolments */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Eligible Enrolments</span>
            <UserCheck className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B4D]">
            {metrics?.eligible_enrolments ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]" title="Total minus withdrawn & cancelled">
            <span>Denominator pool</span>
          </div>
        </div>

        {/* Card 4: Completed Enrolments */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Completed Enrolments</span>
            <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#15803D]">
            {metrics?.completed_enrolments ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            <span>Required lessons finished</span>
          </div>
        </div>

        {/* Card 5: Overall Completion Rate */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Completion Rate</span>
            <Percent className="h-4 w-4 text-[#123B73]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#123B73]">
            {metrics?.overall_completion_rate ?? 0}%
          </div>
          <div className="mt-1 text-[10px] text-[#64748B]">
            <span>{metrics?.completed_enrolments ?? 0} / {metrics?.eligible_enrolments ?? 0} eligible</span>
          </div>
        </div>

        {/* Card 6: Recorded Active */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Active Enrolments</span>
            <Clock className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#2563EB]">
            {metrics?.active_enrolments ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">
            <span>Activity ≤ 14 days</span>
          </div>
        </div>

        {/* Card 7: Inactive Flagged */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-medium">Flagged Inactive</span>
            <AlertTriangle className="h-4 w-4 text-[#B45309]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#B45309]">
            {metrics?.flagged_inactive_enrolments ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-[#B45309]">
            <span>&gt; 14 days or no history</span>
          </div>
        </div>
      </div>

      {/* Analytical Documentation Callout */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 text-xs text-[#172B4D] shadow-2xs">
        <Info className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#123B73]">Documented Metric Standards: </span>
          <span>
            Completion Rate = (Completed Eligible Enrolments / Total Eligible Enrolments) × 100.
            Withdrawn ({metrics ? metrics.total_enrolments - metrics.eligible_enrolments : 0}) records are excluded from the denominator.
            Individual course progress excludes non-required lessons and deduplicates repeat lesson-completion events.
          </span>
        </div>
      </div>

      {/* Row of Charts 1 & 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: Course Comparison */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#172B4D]">Chart 1: Course Comparison</h2>
              <p className="text-[11px] text-[#64748B]">Eligible enrolments vs. completed enrolments per course</p>
            </div>
            <button 
              onClick={() => onNavigate('completion')}
              className="flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
            >
              <span>Details</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" vertical={false} />
                <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [val, name === 'eligible' ? 'Eligible Enrolments' : 'Completed Enrolments']}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                  formatter={(val) => val === 'eligible' ? 'Eligible Enrolments' : 'Completed Enrolments'}
                />
                <Bar dataKey="eligible" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#123B73" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Course Completion Rates */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#172B4D]">Chart 2: Course Completion Rates (%)</h2>
              <p className="text-[11px] text-[#64748B]">Percentage with explicit numerator and denominator</p>
            </div>
            <span className="rounded-full bg-[#F5F8FF] px-2 py-0.5 text-[11px] font-semibold text-[#123B73] border border-[#DCE6F2]">
              Eligible Policy
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical" margin={{ top: 10, right: 25, left: 35, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9.5, fill: '#172B4D' }} width={110} />
                <Tooltip
                  formatter={(val: any, _name, item: any) => [
                    `${val}% (${item.payload.completed} / ${item.payload.eligible} enrolments)`,
                    'Completion Rate'
                  ]}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="rate" fill="#15803D" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row of Charts 3, 4, 5 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CHART 3: Weekly Activity */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="border-b border-[#DCE6F2] pb-2">
            <h2 className="text-sm font-bold text-[#172B4D]">Chart 3: Weekly Activity Trend</h2>
            <p className="text-[11px] text-[#64748B]">Total events vs completed events by week</p>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" />
                <XAxis dataKey="week_label" tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="total_events" name="Total Events" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed_events" name="Completed Events" stroke="#15803D" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Activity Breakdown */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="border-b border-[#DCE6F2] pb-2">
            <h2 className="text-sm font-bold text-[#172B4D]">Chart 4: Activity by Type</h2>
            <p className="text-[11px] text-[#64748B]">Distribution of logged interaction events</p>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" vertical={false} />
                <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 9, fill: '#64748B' }} interval={0} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" name="Events Count" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 5: Course Progress Distribution */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="border-b border-[#DCE6F2] pb-2">
            <h2 className="text-sm font-bold text-[#172B4D]">Chart 5: Progress Bands</h2>
            <p className="text-[11px] text-[#64748B]">Distribution of learner completion percentages</p>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any, _name, item: any) => [`${val} enrolments (${item.payload.percentage}%)`, 'Count']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" name="Enrolments" fill="#123B73" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Summary Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Table 1: Course Performance Summary */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">Table 1: Course Performance Summary</h3>
              <p className="text-[11px] text-[#64748B]">Enrolments and completion rate with denominators</p>
            </div>
            <button 
              onClick={() => onNavigate('courses')}
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              Manage Courses
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
                <tr>
                  <th className="px-3 py-2">Course Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-center">Eligible</th>
                  <th className="px-3 py-2 text-center">Completed</th>
                  <th className="px-3 py-2 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F2]">
                {coursePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-[#64748B]">
                      No course performance records available from database.
                    </td>
                  </tr>
                ) : (
                  coursePerformance.slice(0, 5).map((c) => (
                    <tr key={c.course_id} className="hover:bg-[#F5F8FF]">
                      <td className="px-3 py-2 font-medium text-[#172B4D]">{c.course_name}</td>
                      <td className="px-3 py-2 text-[#64748B]">{c.category}</td>
                      <td className="px-3 py-2 text-center text-[#172B4D]">{c.eligible_enrolments}</td>
                      <td className="px-3 py-2 text-center font-semibold text-[#15803D]">{c.completed_enrolments}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#123B73]">{c.completion_rate_percent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Inactivity Flags Alert */}
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">Table 2: Flagged Inactivity Alerts</h3>
              <p className="text-[11px] text-[#64748B]">Enrolments with no recent activity (&gt;14 days or none)</p>
            </div>
            <button 
              onClick={() => onNavigate('inactivity')}
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              View Inactivity Engine
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
                <tr>
                  <th className="px-3 py-2">Learner</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Days Inactive</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F2]">
                {inactiveRecords.filter((r) => r.is_flagged).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-[#15803D] font-medium">
                      <CheckCircle2 className="mx-auto h-5 w-5 mb-1 text-[#15803D]" />
                      No inactive enrolments flagged. All active learners have recorded activity within the window.
                    </td>
                  </tr>
                ) : (
                  inactiveRecords.filter((r) => r.is_flagged).slice(0, 5).map((r) => (
                    <tr key={r.enrollment_id} className="hover:bg-[#F5F8FF]">
                      <td className="px-3 py-2 font-medium text-[#172B4D]">
                        {r.learner_name}
                        {r.roll_no && <span className="ml-1 text-[10px] text-[#64748B]">({r.roll_no})</span>}
                      </td>
                      <td className="px-3 py-2 text-[#64748B]">{r.course_name}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-md bg-[#B45309]/10 px-2 py-0.5 font-semibold text-[#B45309]">
                          {r.days_since_last_activity !== null ? `${r.days_since_last_activity} days` : 'No history'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[#64748B] max-w-xs truncate" title={r.flag_reason}>
                        {r.flag_reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
