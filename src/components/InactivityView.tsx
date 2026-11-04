import React, { useState } from 'react';
import { 
  ClockAlert, 
  Search, 
  Sliders, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Clock, 
  ShieldAlert,
  Info,
  Calendar
} from 'lucide-react';
import { InactivityItem } from '../types.ts';
import { formatToDDMMYYYY, formatToReadableDate } from '../utils/dateUtils.ts';
import { CalendarDatePicker } from './CalendarDatePicker.tsx';

interface InactivityViewProps {
  records: InactivityItem[];
  threshold: number;
  onThresholdChange: (newThreshold: number) => void;
  reportDate: string;
  onReportDateChange: (newDate: string) => void;
  onRefresh: () => void;
}

export const InactivityView: React.FC<InactivityViewProps> = ({
  records,
  threshold,
  onThresholdChange,
  reportDate,
  onReportDateChange,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = 
      r.learner_name.toLowerCase().includes(q) ||
      r.course_name.toLowerCase().includes(q) ||
      (r.roll_no && r.roll_no.toLowerCase().includes(q)) ||
      r.enrollment_id.toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter === 'flagged') matchesStatus = r.is_flagged;
    else if (statusFilter === 'active') matchesStatus = r.inactivity_status === 'active_within_window';
    else if (statusFilter === 'no_history') matchesStatus = r.inactivity_status === 'no_activity_history';
    else if (statusFilter === 'excluded') matchesStatus = r.inactivity_status === 'excluded_by_status';

    return matchesSearch && matchesStatus;
  });

  const flaggedCount = records.filter((r) => r.is_flagged).length;
  const activeCount = records.filter((r) => r.inactivity_status === 'active_within_window').length;
  const noHistoryCount = records.filter((r) => r.inactivity_status === 'no_activity_history').length;
  const excludedCount = records.filter((r) => r.inactivity_status === 'excluded_by_status').length;

  const getStatusBadge = (r: InactivityItem) => {
    switch (r.inactivity_status) {
      case 'active_within_window':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#15803D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
            <CheckCircle className="h-3 w-3" />
            <span>Active in Window</span>
          </span>
        );
      case 'no_activity_within_window':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#B45309]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
            <Clock className="h-3 w-3" />
            <span>&gt; {threshold} Days Inactive</span>
          </span>
        );
      case 'no_activity_history':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#B91C1C]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
            <AlertTriangle className="h-3 w-3" />
            <span>No Activity Ever</span>
          </span>
        );
      case 'completed_enrolment':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
            <CheckCircle className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#64748B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
            <ShieldAlert className="h-3 w-3" />
            <span>Excluded ({r.enrollment_status})</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">Inactivity Monitor</h1>
          <p className="text-xs text-[#64748B]">
            Configurable observation window to identify enrolments with no recent interaction events.
          </p>
        </div>
      </div>

      {/* Threshold Control Panel Card */}
      <div className="rounded-xl border border-[#DCE6F2] bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#172B4D]">Observation Window Threshold</h2>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Enrolments with no events within this window relative to reference date (<span className="font-semibold text-[#123B73]">{formatToReadableDate(reportDate)}</span> • <span className="font-mono text-[#64748B]">{formatToDDMMYYYY(reportDate)}</span>) are flagged.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Inline Calendar Date Picker */}
            <div className="flex items-center">
              <CalendarDatePicker
                value={reportDate}
                onChange={onReportDateChange}
              />
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-0.5 text-xs">
              {[7, 14, 21, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => onThresholdChange(days)}
                  className={`rounded-md px-3 py-1 font-semibold transition-colors ${
                    threshold === days
                      ? 'bg-[#123B73] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#172B4D]'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>

            {/* Threshold Slider and Display */}
            <div className="flex items-center gap-2 text-xs">
              <input
                type="range"
                min={3}
                max={60}
                value={threshold}
                onChange={(e) => onThresholdChange(Number(e.target.value))}
                className="w-24 accent-[#123B73]"
              />
              <span className="font-bold text-[#123B73] bg-[#F5F8FF] px-2 py-0.5 rounded border border-[#DCE6F2]">
                {threshold}d
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Limitation and Ethics Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-[#B45309]/30 bg-[#B45309]/5 p-3.5 text-xs text-[#172B4D]">
        <HelpCircle className="h-4 w-4 text-[#B45309] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-[#B45309]">Important Analytical Limitation</div>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            An inactivity flag is an operational indicator indicating absence of recorded platform events. It does <strong>not</strong> prove that a student has stopped learning or studying offline, nor does it measure intelligence or predict academic outcome.
          </p>
        </div>
      </div>

      {/* Status Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Total Flagged</div>
          <div className="mt-1 text-2xl font-bold text-[#B45309]">{flaggedCount}</div>
          <div className="text-[10px] text-[#64748B]">Requires follow-up</div>
        </div>

        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Active in Window</div>
          <div className="mt-1 text-2xl font-bold text-[#15803D]">{activeCount}</div>
          <div className="text-[10px] text-[#64748B]">Events within {threshold} days</div>
        </div>

        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Zero Activity History</div>
          <div className="mt-1 text-2xl font-bold text-[#B91C1C]">{noHistoryCount}</div>
          <div className="text-[10px] text-[#64748B]">Never logged an event</div>
        </div>

        <div className="rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-[#64748B]">Excluded by Status</div>
          <div className="mt-1 text-2xl font-bold text-[#64748B]">{excludedCount}</div>
          <div className="text-[10px] text-[#64748B]">Withdrawn or cancelled</div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search learner, roll number, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-60 rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] py-1.5 pl-8 pr-3 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] px-3 py-1.5 text-xs text-[#172B4D] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="flagged">Flagged Inactive Only</option>
              <option value="active">Active in Window</option>
              <option value="no_history">No Activity History</option>
              <option value="excluded">Excluded by Status</option>
            </select>
          </div>

          <div className="text-xs text-[#64748B]">
            Showing <span className="font-semibold text-[#172B4D]">{filtered.length}</span> of {records.length} enrolments
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#DCE6F2] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#DCE6F2] bg-[#F5F8FF] text-[11px] font-semibold text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Enrolment ID</th>
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status Assessment</th>
                  <th className="px-4 py-3 text-center">Days Inactive</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3">Reason for Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F2]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">
                      <Search className="mx-auto h-7 w-7 text-[#DCE6F2] mb-2" />
                      <p className="font-semibold text-[#172B4D]">No enrolment inactivity records found</p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {search || statusFilter !== 'All' 
                          ? 'No enrolments match the active search query or status filter.' 
                          : 'No enrolment records analyzed from database.'}
                      </p>
                      {(search || statusFilter !== 'All') && (
                        <button
                          onClick={() => {
                            setSearch('');
                            setStatusFilter('All');
                          }}
                          className="mt-3 rounded-md bg-[#2563EB]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.enrollment_id} className={`hover:bg-[#F5F8FF]/60 transition-colors ${
                      r.is_flagged ? 'bg-[#B45309]/5' : ''
                    }`}>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#64748B]">
                        {r.enrollment_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#172B4D]">
                        {r.learner_name}
                        {r.roll_no && <span className="ml-1 text-[10px] text-[#64748B]">({r.roll_no})</span>}
                      </td>
                      <td className="px-4 py-3 text-[#172B4D]">
                        {r.course_name}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(r)}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {r.days_since_last_activity !== null ? (
                          <span className={r.is_flagged ? 'text-[#B45309]' : 'text-[#15803D]'}>
                            {r.days_since_last_activity} days
                          </span>
                        ) : (
                          <span className="text-[#64748B] italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] text-[11px] whitespace-nowrap font-mono">
                        {r.last_recorded_activity ? formatToDDMMYYYY(r.last_recorded_activity) : 'None recorded'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#64748B] max-w-xs truncate" title={r.flag_reason}>
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
