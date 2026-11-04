/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  CalendarDays,
  Grid,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  formatToDDMMYYYY, 
  formatToYYYYMMDD, 
  formatToReadableDate,
  getTodayLocalDateString, 
  getTodayDisplayDate, 
  generateMonthCalendar, 
  getNext30Days,
  parseDateParts, 
  getWeekdayName,
  MONTH_NAMES, 
  WEEKDAY_SHORT_NAMES,
  isSameDay
} from '../utils/dateUtils.ts';

interface CalendarDatePickerProps {
  value: string; // YYYY-MM-DD or DD-MM-YYYY
  onChange: (newDateIso: string, isManual: boolean) => void;
  onResetToToday?: () => void;
  isManualSelection?: boolean;
  className?: string;
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  value,
  onChange,
  onResetToToday,
  isManualSelection = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'30days' | 'month'>('30days');
  const containerRef = useRef<HTMLDivElement>(null);

  const todayIso = getTodayLocalDateString();
  const todayDisplay = getTodayDisplayDate();
  const currentIso = formatToYYYYMMDD(value) || todayIso;
  const currentReadable = formatToReadableDate(currentIso);
  const currentWeekday = getWeekdayName(currentIso);

  // View state for month navigation
  const dateParts = parseDateParts(currentIso) || parseDateParts(todayIso)!;
  const [viewYear, setViewYear] = useState<number>(dateParts.year);
  const [viewMonth, setViewMonth] = useState<number>(dateParts.month);

  // Sync month view when value changes or popover opens
  useEffect(() => {
    const parts = parseDateParts(currentIso);
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
  }, [currentIso, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (dateIso: string) => {
    const isToday = isSameDay(dateIso, todayIso);
    onChange(dateIso, !isToday);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = getTodayLocalDateString();
    if (onResetToToday) {
      onResetToToday();
    } else {
      onChange(today, false);
    }
    const todayParts = parseDateParts(today)!;
    setViewYear(todayParts.year);
    setViewMonth(todayParts.month);
    setIsOpen(false);
  };

  // Generate dynamic 30 days starting with today
  const next30Days = getNext30Days(new Date());
  const monthCells = generateMonthCalendar(viewYear, viewMonth, currentIso, todayIso);
  const isViewingToday = isSameDay(currentIso, todayIso);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button with Clear Format e.g. "24 October 2026 (Saturday)" */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Select reference date. Current date: ${currentReadable}, ${currentWeekday}`}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all shadow-2xs ${
          isOpen
            ? 'border-[#2563EB] bg-white ring-2 ring-[#2563EB]/20 text-[#123B73]'
            : isManualSelection
            ? 'border-[#3B82F6]/50 bg-[#EFF6FF] text-[#1E40AF] hover:bg-[#DBEAFE]'
            : 'border-[#DCE6F2] bg-[#F5F8FF] text-[#172B4D] hover:bg-white hover:border-[#CBD5E1]'
        }`}
        title={`Click to open calendar. Current date: ${currentReadable} (${currentWeekday})`}
      >
        <CalendarIcon className="h-4 w-4 text-[#2563EB] shrink-0" />
        <span className="text-[#64748B] hidden xl:inline">Date:</span>
        <span className="font-semibold text-[#123B73]">
          {currentReadable}
        </span>
        <span className="hidden sm:inline text-[11px] text-[#64748B]">
          ({currentWeekday})
        </span>

        {isViewingToday ? (
          <span className="inline-flex items-center rounded bg-[#16A34A]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#16A34A]">
            Today
          </span>
        ) : (
          <span className="inline-flex items-center rounded bg-[#2563EB]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#2563EB]">
            Manual
          </span>
        )}
      </button>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-[#DCE6F2] bg-white p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header with Title and Mode Switcher */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
            <div>
              <div className="text-xs font-bold text-[#123B73]">
                {currentReadable}
              </div>
              <div className="text-[11px] text-[#64748B]">
                {currentWeekday} • {formatToDDMMYYYY(currentIso)}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-[#DCE6F2] bg-[#F5F8FF] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('30days')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors ${
                  activeTab === '30days'
                    ? 'bg-[#123B73] text-white shadow-2xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Next 30 Days</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('month')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors ${
                  activeTab === 'month'
                    ? 'bg-[#123B73] text-white shadow-2xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Month Grid</span>
              </button>
            </div>
          </div>

          {/* TAB 1: 30 Consecutive Days (Today + Next 29 Days) */}
          {activeTab === '30days' && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-2 px-1">
                <span className="font-semibold text-[#172B4D]">Showing Today & Next 29 Days (30 Total):</span>
                <span className="text-[10px] text-[#2563EB]">Auto-shifts daily</span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#F1F5F9]">
                {next30Days.map((item) => {
                  const isSelected = isSameDay(item.dateStringYYYYMMDD, currentIso);
                  const isToday = item.isToday;

                  return (
                    <button
                      key={item.dateStringYYYYMMDD}
                      type="button"
                      onClick={() => handleSelectDate(item.dateStringYYYYMMDD)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-[#123B73] text-white shadow-xs font-semibold'
                          : isToday
                          ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                          : 'hover:bg-[#F8FAFC] text-[#1E293B]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex flex-col items-center justify-center h-8 w-8 rounded-md font-bold text-xs ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : isToday 
                            ? 'bg-[#2563EB] text-white' 
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}>
                          <span className="text-[9px] uppercase leading-none">{item.weekdayShort}</span>
                          <span className="text-xs leading-none font-bold mt-0.5">{item.dayNumber}</span>
                        </div>

                        <div>
                          <div className={`font-medium ${isSelected ? 'text-white' : 'text-[#0F172A]'}`}>
                            {item.formattedDisplay}
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}>
                            {item.weekdayName} • {item.dateStringDDMMYYYY}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isToday
                            ? 'bg-[#16A34A]/10 text-[#16A34A] font-bold'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}>
                          {item.relativeLabel}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Month Grid View with Prev/Next Navigation */}
          {activeTab === 'month' && (
            <div className="pt-2">
              {/* Navigation Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                  <span className="text-sm font-bold text-[#123B73]">
                    {MONTH_NAMES[viewMonth]}
                  </span>
                  <span className="text-sm font-semibold text-[#64748B]">
                    {viewYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 pt-2 text-center text-[11px] font-semibold text-[#64748B]">
                {WEEKDAY_SHORT_NAMES.map((name) => (
                  <div key={name} className="py-1">
                    {name}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {monthCells.map((cell) => {
                  const isSelected = cell.isSelected;
                  const isToday = cell.isToday;
                  const isCurrent = cell.isCurrentMonth;

                  return (
                    <button
                      key={cell.dateStringYYYYMMDD}
                      type="button"
                      onClick={() => handleSelectDate(cell.dateStringYYYYMMDD)}
                      title={`${cell.formattedDisplay} (${cell.weekdayName})${isToday ? ' • Today' : ''}${isSelected ? ' • Selected' : ''}`}
                      className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[#123B73] font-bold text-white shadow-xs'
                          : isToday
                          ? 'border border-[#2563EB] bg-[#EFF6FF] font-bold text-[#2563EB] hover:bg-[#DBEAFE]'
                          : isCurrent
                          ? 'text-[#1E293B] hover:bg-[#F1F5F9]'
                          : 'text-[#94A3B8] opacity-40 hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {cell.dayNumber}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#2563EB]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer with Today Action & Clear */}
          <div className="mt-3.5 flex items-center justify-between border-t border-[#E2E8F0] pt-2.5 text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="flex items-center gap-1.5 rounded-lg bg-[#F5F8FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB] border border-[#DCE6F2] hover:bg-[#EBF2FC] transition-colors"
              title="Return to today's local system date"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Today ({formatToReadableDate(todayIso)})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-2.5 py-1 font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
