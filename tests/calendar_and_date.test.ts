/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../backend/src/app.ts';
import { 
  getTodayLocalDateString, 
  getTodayDisplayDate, 
  getNext30Days, 
  formatToReadableDate, 
  formatToDDMMYYYY, 
  formatToYYYYMMDD, 
  parseDateParts, 
  getWeekdayName, 
  getDaysInMonth, 
  isLeapYear, 
  getMsUntilNextMidnight,
  generateMonthCalendar,
  isSameDay,
  MONTH_NAMES
} from '../src/utils/dateUtils.ts';

function makeRequest(
  server: http.Server,
  path: string
): Promise<{ status: number; body: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        path,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed: any;
          try { parsed = JSON.parse(raw); } catch {}
          resolve({
            status: res.statusCode || 0,
            body: raw,
            json: parsed,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('Calendar Date Functionality & 30-Day Window Verification Suite', () => {
  let server: http.Server;

  test.beforeEach(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  test.afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('1. getTodayLocalDateString always uses live local system Date and never hardcodes fixed dates', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const actual = getTodayLocalDateString();
    
    assert.equal(actual, expected);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(actual));
    assert.notEqual(actual, '2026-10-17'); // Must not be the old hardcoded project creation date
  });

  test('2. getNext30Days returns exactly 30 consecutive calendar days starting with today', () => {
    const days = getNext30Days(new Date());
    assert.equal(days.length, 30, 'Must return exactly 30 days');

    // First day must be Today
    assert.equal(days[0].isToday, true);
    assert.equal(days[0].dayOffset, 0);
    assert.equal(days[0].relativeLabel, 'Today');
    assert.equal(days[0].dateStringYYYYMMDD, getTodayLocalDateString());

    // Second day must be Tomorrow
    assert.equal(days[1].isToday, false);
    assert.equal(days[1].dayOffset, 1);
    assert.equal(days[1].relativeLabel, 'Tomorrow');

    // Last day must be offset 29 (day 30)
    assert.equal(days[29].dayOffset, 29);
    assert.equal(days[29].relativeLabel, 'In 29 days');

    // Verify consecutive day sequence
    for (let i = 0; i < days.length - 1; i++) {
      const curTime = days[i].date.getTime();
      const nextTime = days[i + 1].date.getTime();
      const diffHours = (nextTime - curTime) / (1000 * 60 * 60);
      assert.ok(diffHours >= 23 && diffHours <= 25, `Step between day ${i} and ${i+1} must be ~24 hours`);
    }
  });

  test('3. Date formatting renders clear human readable format "DD Month YYYY" with correct weekdays', () => {
    // 24 October 2026 is Saturday
    const formatted = formatToReadableDate('2026-10-24');
    assert.equal(formatted, '24 October 2026');

    const weekday = getWeekdayName('2026-10-24');
    assert.equal(weekday, 'Saturday');

    // DD-MM-YYYY check
    assert.equal(formatToDDMMYYYY('2026-10-24'), '24-10-2026');
    assert.equal(formatToYYYYMMDD('24-10-2026'), '2026-10-24');
  });

  test('4. Correctly handles Month Boundaries across 30 consecutive days (e.g., Oct 25 -> Nov 23)', () => {
    const startOct25 = new Date(2026, 9, 25, 12, 0, 0); // October 25, 2026
    const window = getNext30Days(startOct25);
    
    assert.equal(window.length, 30);
    assert.equal(window[0].dateStringYYYYMMDD, '2026-10-25');
    assert.equal(window[6].dateStringYYYYMMDD, '2026-10-31');
    assert.equal(window[7].dateStringYYYYMMDD, '2026-11-01'); // Rolled into November
    assert.equal(window[7].monthName, 'November');
    assert.equal(window[29].dateStringYYYYMMDD, '2026-11-23');
  });

  test('5. Correctly handles Year Boundaries across 30 consecutive days (e.g., Dec 15 -> Jan 13)', () => {
    const startDec15 = new Date(2026, 11, 15, 12, 0, 0); // December 15, 2026
    const window = getNext30Days(startDec15);

    assert.equal(window.length, 30);
    assert.equal(window[0].dateStringYYYYMMDD, '2026-12-15');
    assert.equal(window[16].dateStringYYYYMMDD, '2026-12-31');
    assert.equal(window[17].dateStringYYYYMMDD, '2027-01-01'); // New Year 2027
    assert.equal(window[17].year, 2027);
    assert.equal(window[17].monthName, 'January');
    assert.equal(window[29].dateStringYYYYMMDD, '2027-01-13');
  });

  test('6. Correctly handles Leap Years vs Non-Leap Years in February', () => {
    // 2024 is a leap year (Feb 29 exists)
    assert.equal(isLeapYear(2024), true);
    assert.equal(getDaysInMonth(2024, 1), 29);

    const leapFeb = getNext30Days(new Date(2024, 1, 20, 12, 0, 0)); // Feb 20, 2024
    const feb29 = leapFeb.find(d => d.dateStringYYYYMMDD === '2024-02-29');
    assert.ok(feb29, 'Leap year 2024 must include February 29');
    assert.equal(feb29.weekdayName, 'Thursday');

    // 2026 is NOT a leap year (Feb has 28 days)
    assert.equal(isLeapYear(2026), false);
    assert.equal(getDaysInMonth(2026, 1), 28);

    const nonLeapFeb = getNext30Days(new Date(2026, 1, 20, 12, 0, 0)); // Feb 20, 2026
    const noFeb29 = nonLeapFeb.find(d => d.dateStringYYYYMMDD === '2026-02-29');
    assert.equal(noFeb29, undefined, 'Non-leap year 2026 must NOT have February 29');
    const march1 = nonLeapFeb.find(d => d.dateStringYYYYMMDD === '2026-03-01');
    assert.ok(march1, 'Must transition directly from Feb 28 to March 1');

    // Century leap year rules: 2000 was leap, 2100 is not
    assert.equal(isLeapYear(2000), true);
    assert.equal(isLeapYear(2100), false);
  });

  test('7. Correctly handles all standard month lengths: 28, 29, 30, and 31 days', () => {
    assert.equal(getDaysInMonth(2026, 0), 31); // Jan
    assert.equal(getDaysInMonth(2026, 1), 28); // Feb non-leap
    assert.equal(getDaysInMonth(2024, 1), 29); // Feb leap
    assert.equal(getDaysInMonth(2026, 2), 31); // Mar
    assert.equal(getDaysInMonth(2026, 3), 30); // Apr
    assert.equal(getDaysInMonth(2026, 4), 31); // May
    assert.equal(getDaysInMonth(2026, 5), 30); // Jun
    assert.equal(getDaysInMonth(2026, 6), 31); // Jul
    assert.equal(getDaysInMonth(2026, 7), 31); // Aug
    assert.equal(getDaysInMonth(2026, 8), 30); // Sep
    assert.equal(getDaysInMonth(2026, 9), 31); // Oct
    assert.equal(getDaysInMonth(2026, 10), 30); // Nov
    assert.equal(getDaysInMonth(2026, 11), 31); // Dec
  });

  test('8. Automatic midnight calculation accurately calculates milliseconds to upcoming midnight', () => {
    const ms = getMsUntilNextMidnight();
    assert.ok(ms > 0, 'Must be positive');
    assert.ok(ms <= 24 * 60 * 60 * 1000 + 100, 'Must be <= 24 hours');
  });

  test('9. Full Month Calendar Grid produces correct 7-day columns and weekday alignments', () => {
    // October 2026: 1st is Thursday (day of week 4)
    const cells = generateMonthCalendar(2026, 9, '2026-10-24', '2026-10-24');
    assert.equal(cells.length % 7, 0, 'Grid must be a multiple of 7 days');
    
    // Check day 1 of October
    const day1 = cells.find(c => c.isCurrentMonth && c.dayNumber === 1);
    assert.ok(day1);
    assert.equal(day1.dateStringYYYYMMDD, '2026-10-01');
    assert.equal(day1.weekdayName, 'Thursday');

    // Selected day check
    const selected = cells.find(c => c.isSelected);
    assert.ok(selected);
    assert.equal(selected.dateStringYYYYMMDD, '2026-10-24');
  });

  test('10. Backend API /api/analytics/overview supports dynamic reference date', async () => {
    // Query without ref_date (defaults to current live system date)
    const resDefault = await makeRequest(server, '/api/analytics/overview');
    assert.equal(resDefault.status, 200);
    assert.ok(resDefault.json.metrics);

    // Query with explicit ref_date
    const resExplicit = await makeRequest(server, '/api/analytics/overview?ref_date=2026-10-24');
    assert.equal(resExplicit.status, 200);
    assert.ok(resExplicit.json.metrics);
    assert.ok(typeof resExplicit.json.metrics.active_enrolments === 'number');
  });

  test('11. Backend API /api/analytics/inactive-enrollments calculates inactivity relative to specified date', async () => {
    const res = await makeRequest(server, '/api/analytics/inactive-enrollments?threshold=14&ref_date=2026-10-24');
    assert.equal(res.status, 200);
    assert.ok(res.json.data);
    assert.equal(res.json.data.inactivity_threshold_days, 14);
    assert.ok(res.json.data.records.length > 0);
  });
});
