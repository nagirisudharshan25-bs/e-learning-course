import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Info, 
  Download, 
  Layers, 
  BarChart3,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { CoursePerformanceItem, NavSection } from '../types.ts';

interface CompletionViewProps {
  coursePerformance: CoursePerformanceItem[];
  onNavigateToExport: () => void;
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  coursePerformance,
  onNavigateToExport,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(coursePerformance.map((c) => c.category)))];

  const filtered = coursePerformance.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = c.course_name.toLowerCase().includes(q) || c.course_id.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const chartData = filtered.map((c) => ({
    name: c.course_name.length > 20 ? c.course_name.slice(0, 18) + '...' : c.course_name,
    fullName: c.course_name,
    eligible: c.eligible_enrolments,
    completed: c.completed_enrolments,
    rate: c.completion_rate_percent,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Course Completion Reports</h1>
          <p className="text-xs text-[#64748B]">
            Transparent completion rate metrics with strictly documented numerators and denominators.
          </p>
        </div>
        <button
          onClick={onNavigateToExport}
          className="flex items-center gap-1.5 rounded-lg border border-[#DCE6F2] bg-white px-3 py-1.5 text-xs font-semibold text-[#123B73] hover:bg-[#F5F8FF] hover:border-[#2563EB] shadow-2xs"
        >
          <Download className="h-4 w-4 text-[#2563EB]" />
          <span>Export Report CSV</span>
        </button>
      </div>

      {/* Denominator Standard Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE6F2] bg-[#FFFFFF] p-4 shadow-2xs text-xs text-[#172B4D]">
        <Info className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#123B73]">Standard Course Completion Policy</div>
          <p className="text-[#64748B] text-[11px] leading-relaxed">
            Eligible enrolments form the official denominator: <code className="bg-[#F5F8FF] px-1.5 py-0.5 rounded text-[#123B73] font-semibold border border-[#DCE6F2]">enrolled + completed</code>.
            Learners who have <span className="font-semibold text-[#B45309]">withdrawn</span> or whose enrolments were <span className="font-semibold text-[#B91C1C]">cancelled</span> are administrative status changes and are excluded from the completion rate denominator so courses are not penalized.
          </p>
        </div>
      </div>

      {/* Grouped Comparison Chart */}
      <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
        <div className="border-b border-[#DCE6F2] pb-3">
          <h2 className="text-sm font-bold text-[#172B4D]">Eligible Enrolments vs Completed Enrolments</h2>
          <p className="text-[11px] text-[#64748B]">Side-by-side comparison across courses</p>
        </div>
        {chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-[#64748B]">
            No course performance data available to plot
          </div>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" vertical={false} />
                <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [val, name === 'eligible' ? 'Eligible Enrolments' : 'Completed Enrolments']}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(val) => val === 'eligible' ? 'Eligible Enrolments (Denominator)' : 'Completed Enrolments (Numerator)'}
                />
                <Bar dataKey="eligible" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#123B73" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search course name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-60 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-3 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-[#64748B]">
            Showing <span className="font-semibold text-[#172B4D]">{filtered.length}</span> courses
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Course Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Total Enrolments</th>
                  <th className="px-4 py-3 text-center">Eligible (Denominator)</th>
                  <th className="px-4 py-3 text-center">Completed (Numerator)</th>
                  <th className="px-4 py-3 text-center">Withdrawn / Cancelled</th>
                  <th className="px-4 py-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F2]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">
                      <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                      <p className="font-semibold text-[#172B4D]">No course completion records found</p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {search || categoryFilter !== 'All' 
                          ? 'No courses match the active search or category filters.' 
                          : 'No course completion data loaded from database.'}
                      </p>
                      {(search || categoryFilter !== 'All') && (
                        <button
                          onClick={() => {
                            setSearch('');
                            setCategoryFilter('All');
                          }}
                          className="mt-3 rounded-md bg-[#2563EB]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.course_id} className="hover:bg-[#F5F8FF]/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#172B4D]">{c.course_name}</div>
                        <div className="text-[10px] text-[#64748B]">ID: {c.course_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[#F5F8FF] px-2 py-0.5 text-[11px] font-medium text-[#2563EB] border border-[#DCE6F2]">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-[#172B4D]">
                        {c.total_enrolments}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-[#123B73]">
                        {c.eligible_enrolments}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-[#15803D]">
                        {c.completed_enrolments}
                      </td>
                      <td className="px-4 py-3 text-center text-[#64748B]">
                        {c.withdrawn_enrolments} / {c.cancelled_enrolments}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] text-[#64748B]">
                            ({c.completed_enrolments}/{c.eligible_enrolments})
                          </span>
                          <span className="font-extrabold text-[#123B73] text-sm">
                            {c.completion_rate_percent}%
                          </span>
                        </div>
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
