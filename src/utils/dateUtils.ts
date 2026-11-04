/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Robust date and calendar utility functions for EduPulse Analytics.
 * Enforces local timezone safety, prevents off-by-one UTC conversion errors,
 * dynamically generates 30-day forward rolling windows from current system date,
 * and supports perpetual calendar navigation across all month lengths and leap years.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const WEEKDAY_SHORT_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const WEEKDAY_FULL_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns total days in a given month (0 = January, 1 = February, ..., 11 = December).
 * Correctly accounts for leap years (29 days) and standard Februaries (28 days).
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Returns today's date formatted as YYYY-MM-DD using the user's local timezone.
 * Avoids toISOString() which introduces off-by-one errors in negative UTC offsets.
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date formatted as DD-MM-YYYY using the user's local timezone.
 */
export function getTodayDisplayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${d}-${m}-${y}`;
}

/**
 * Formats any date input into a human-friendly format, e.g. "24 October 2026".
 */
export function formatToReadableDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const parts = parseDateParts(dateInput);
  if (!parts) return String(dateInput);
  return `${parts.day} ${MONTH_NAMES[parts.month]} ${parts.year}`;
}

/**
 * Formats any date input into DD-MM-YYYY format.
 * Accepts: YYYY-MM-DD, DD-MM-YYYY, Date instances, or ISO timestamp strings.
 */
export function formatToDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  const str = String(dateInput).trim();
  // Already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}-${m}-${y}`;
  }

  const parts = parseDateParts(str);
  if (parts) {
    const mStr = String(parts.month + 1).padStart(2, '0');
    const dStr = String(parts.day).padStart(2, '0');
    return `${dStr}-${mStr}-${parts.year}`;
  }

  return str;
}

/**
 * Formats any date input into YYYY-MM-DD format for database and API queries.
 */
export function formatToYYYYMMDD(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-');
    return `${y}-${m}-${d}`;
  }

  const parts = parseDateParts(str);
  if (parts) {
    const mStr = String(parts.month + 1).padStart(2, '0');
    const dStr = String(parts.day).padStart(2, '0');
    return `${parts.year}-${mStr}-${dStr}`;
  }

  return str;
}

/**
 * Safely parses a date string or Date object into year, month (0-11), and day.
 * Always resolves using local components to guarantee timezone safety.
 */
export function parseDateParts(dateInput: string | Date | null | undefined): { year: number; month: number; day: number } | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return {
      year: dateInput.getFullYear(),
      month: dateInput.getMonth(),
      day: dateInput.getDate(),
    };
  }
  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    const [d, m, y] = str.slice(0, 10).split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: parsed.getDate(),
    };
  }
  return null;
}

/**
 * Returns the weekday name (e.g. "Saturday") for any given date.
 */
export function getWeekdayName(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const parts = parseDateParts(dateInput);
  if (!parts) return '';
  const d = new Date(parts.year, parts.month, parts.day, 12, 0, 0);
  return WEEKDAY_FULL_NAMES[d.getDay()] || '';
}

/**
 * Calculates milliseconds remaining until the upcoming local midnight (00:00:00.050).
 */
export function getMsUntilNextMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
  return Math.max(100, nextMidnight.getTime() - now.getTime());
}

/**
 * Check whether two date strings or Date objects represent the same calendar day.
 */
export function isSameDay(d1: string | Date | null | undefined, d2: string | Date | null | undefined): boolean {
  if (!d1 || !d2) return false;
  return formatToYYYYMMDD(d1) === formatToYYYYMMDD(d2);
}

export interface Rolling30DayItem {
  date: Date;
  dateStringYYYYMMDD: string;
  dateStringDDMMYYYY: string;
  formattedDisplay: string; // e.g. "24 October 2026"
  weekdayName: string; // e.g. "Saturday"
  weekdayShort: string; // e.g. "Sat"
  dayNumber: number; // e.g. 24
  monthName: string; // e.g. "October"
  monthShort: string; // e.g. "Oct"
  year: number; // e.g. 2026
  isToday: boolean;
  dayOffset: number; // 0 = Today, 1 = Tomorrow, ..., 29
  relativeLabel: string; // "Today", "Tomorrow", "In 2 days", etc.
}

/**
 * Returns exactly 30 consecutive calendar days: today's date and the following 29 days.
 * Dynamically shifts forward every single day as new Date() changes.
 * Handles month boundaries, year boundaries, leap years, and daylight saving transitions seamlessly.
 */
export function getNext30Days(baseDate: Date = new Date()): Rolling30DayItem[] {
  const days: Rolling30DayItem[] = [];
  const startYear = baseDate.getFullYear();
  const startMonth = baseDate.getMonth();
  const startDay = baseDate.getDate();

  for (let offset = 0; offset < 30; offset++) {
    // Hour 12:00:00 ensures local day arithmetic without DST midnight jitter
    const d = new Date(startYear, startMonth, startDay + offset, 12, 0, 0);
    const y = d.getFullYear();
    const m = d.getMonth();
    const dayNum = d.getDate();
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dmy = `${String(dayNum).padStart(2, '0')}-${String(m + 1).padStart(2, '0')}-${y}`;
    const formattedDisplay = `${dayNum} ${MONTH_NAMES[m]} ${y}`;
    const weekdayName = WEEKDAY_FULL_NAMES[d.getDay()];
    const weekdayShort = WEEKDAY_SHORT_NAMES[d.getDay()];

    let relativeLabel = `In ${offset} days`;
    if (offset === 0) relativeLabel = 'Today';
    else if (offset === 1) relativeLabel = 'Tomorrow';

    days.push({
      date: d,
      dateStringYYYYMMDD: iso,
      dateStringDDMMYYYY: dmy,
      formattedDisplay,
      weekdayName,
      weekdayShort,
      dayNumber: dayNum,
      monthName: MONTH_NAMES[m],
      monthShort: MONTH_SHORT_NAMES[m],
      year: y,
      isToday: offset === 0,
      dayOffset: offset,
      relativeLabel,
    });
  }

  return days;
}

export interface CalendarDayCell {
  dateStringYYYYMMDD: string;
  dateStringDDMMYYYY: string;
  formattedDisplay: string;
  weekdayName: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Generates the full 7-column calendar grid for a given year and month (0-indexed).
 * Includes padding days from previous and subsequent months for a complete visual calendar.
 */
export function generateMonthCalendar(
  viewYear: number,
  viewMonth: number,
  selectedDateStr: string,
  todayDateStr: string = getTodayLocalDateString()
): CalendarDayCell[] {
  const cells: CalendarDayCell[] = [];
  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  
  // Day of week of the 1st of this month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Previous month padding days
  const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonthIndex);

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const mStr = String(prevMonthIndex + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const iso = `${prevYear}-${mStr}-${dStr}`;
    const d = new Date(prevYear, prevMonthIndex, day, 12, 0, 0);
    cells.push({
      dateStringYYYYMMDD: iso,
      dateStringDDMMYYYY: `${dStr}-${mStr}-${prevYear}`,
      formattedDisplay: `${day} ${MONTH_NAMES[prevMonthIndex]} ${prevYear}`,
      weekdayName: WEEKDAY_FULL_NAMES[d.getDay()],
      dayNumber: day,
      isCurrentMonth: false,
      isToday: isSameDay(iso, todayDateStr),
      isSelected: isSameDay(iso, selectedDateStr),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mStr}-${dStr}`;
    const d = new Date(viewYear, viewMonth, day, 12, 0, 0);
    cells.push({
      dateStringYYYYMMDD: iso,
      dateStringDDMMYYYY: `${dStr}-${mStr}-${viewYear}`,
      formattedDisplay: `${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`,
      weekdayName: WEEKDAY_FULL_NAMES[d.getDay()],
      dayNumber: day,
      isCurrentMonth: true,
      isToday: isSameDay(iso, todayDateStr),
      isSelected: isSameDay(iso, selectedDateStr),
    });
  }

  // Next month padding days to complete standard 35 or 42 grid cells
  const remainingCells = (7 - (cells.length % 7)) % 7;
  const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  for (let day = 1; day <= remainingCells; day++) {
    const mStr = String(nextMonthIndex + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const iso = `${nextYear}-${mStr}-${dStr}`;
    const d = new Date(nextYear, nextMonthIndex, day, 12, 0, 0);
    cells.push({
      dateStringYYYYMMDD: iso,
      dateStringDDMMYYYY: `${dStr}-${mStr}-${nextYear}`,
      formattedDisplay: `${day} ${MONTH_NAMES[nextMonthIndex]} ${nextYear}`,
      weekdayName: WEEKDAY_FULL_NAMES[d.getDay()],
      dayNumber: day,
      isCurrentMonth: false,
      isToday: isSameDay(iso, todayDateStr),
      isSelected: isSameDay(iso, selectedDateStr),
    });
  }

  return cells;
}
