import React, { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  Info, 
  BookOpen, 
  Award,
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ProgressMetric } from '../types.ts';

interface ProgressViewProps {
  progressDistribution: any[];
  individualProgress: ProgressMetric[];
  totalAnalyzed: number;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  progressDistribution,
  individualProgress,
  totalAnalyzed,
}) => {
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState('All');

  const filtered = individualProgress.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = 
      (p.learner_name && p.learner_name.toLowerCase().includes(q)) ||
      (p.course_name && p.course_name.toLowerCase().includes(q)) ||
      p.enrollment_id.toLowerCase().includes(q);
    const matchesBand = bandFilter === 'All' || p.progress_band === bandFilter;
    return matchesSearch && matchesBand;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Progress Analytics</h1>
        <p className="text-xs text-[#64748B]">
          Measurement of completed required lessons per learner, segmented by distribution bands.
        </p>
      </div>

      {/* Formula Explanation Callout */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs text-xs text-[#172B4D]">
        <Info className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#123B73]">Progress Formula: Distinct Required Lessons Completed ÷ Total Required Lessons × 100</div>
          <ul className="list-disc pl-4 text-[#64748B] space-y-0.5 text-[11px]">
            <li><strong>Denominator Protection:</strong> Only mandatory curriculum lessons are included in the progress denominator. Elective/optional modules are excluded.</li>
            <li><strong>Deduplication Integrity:</strong> Duplicate lesson completion records for the same lesson do NOT inflate the completed count.</li>
            <li><strong>Zero Required Lessons:</strong> Courses with zero mandatory lessons safely yield 0.0% and are never automatically marked as complete.</li>
          </ul>
        </div>
      </div>

      {/* Progress Distribution Chart */}
      <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#172B4D]">Progress Distribution Across Eligible Enrolments</h2>
            <p className="text-[11px] text-[#64748B]">Analyzed {totalAnalyzed} eligible enrolments</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#15803D] font-semibold bg-[#15803D]/10 px-2.5 py-1 rounded-md">
            <Award className="h-3.5 w-3.5" />
            <span>100% Band: {progressDistribution.find((b) => b.band === '100%')?.count ?? 0} Completed</span>
          </div>
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE6F2" vertical={false} />
              <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#172B4D', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip
                formatter={(val: any, _name, item: any) => [
                  `${val} learners (${item.payload.percentage}%)`,
                  'Enrolment Count'
                ]}
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DCE6F2', borderRadius: '8px', fontSize: '11px' }}
              />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Progress Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search learner or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-60 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-3 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="All">All Progress Bands</option>
              <option value="0-24%">0-24%</option>
              <option value="25-49%">25-49%</option>
              <option value="50-74%">50-74%</option>
              <option value="75-99%">75-99%</option>
              <option value="100%">100%</option>
            </select>
          </div>

          <div className="text-xs text-[#64748B]">
            Showing <span className="font-semibold text-[#172B4D]">{filtered.length}</span> records
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3 text-center">Required Lessons Finished</th>
                  <th className="px-4 py-3 text-center">Optional Finished</th>
                  <th className="px-4 py-3 text-center">Band</th>
                  <th className="px-4 py-3 text-right">Progress (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F2]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#64748B]">
                      <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                      <p className="font-semibold text-[#172B4D]">No progress records found</p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {search || bandFilter !== 'All' 
                          ? 'No learners match the active search or band filters.' 
                          : 'No progress records analyzed from database.'}
                      </p>
                      {(search || bandFilter !== 'All') && (
                        <button
                          onClick={() => {
                            setSearch('');
                            setBandFilter('All');
                          }}
                          className="mt-3 rounded-md bg-[#2563EB]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.enrollment_id} className="hover:bg-[#F5F8FF]/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#172B4D]">
                        {item.learner_name || item.learner_id}
                      </td>
                      <td className="px-4 py-3 text-[#172B4D]">
                        {item.course_name || item.course_id}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-[#123B73]">
                          {item.distinct_required_completed}
                        </span>
                        <span className="text-[#64748B]"> / {item.total_required_lessons}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#64748B]">
                        {item.distinct_optional_completed}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-md bg-[#F5F8FF] px-2 py-0.5 font-semibold text-[#123B73] border border-[#DCE6F2]">
                          {item.progress_band}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-[#DCE6F2] overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                item.progress_percentage === 100 ? 'bg-[#15803D]' : 'bg-[#2563EB]'
                              }`}
                              style={{ width: `${item.progress_percentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#172B4D] w-12 text-right">
                            {item.progress_percentage}%
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
