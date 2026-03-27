import { jest } from '@jest/globals';
import {
  buildScheduledWorkdays,
  buildAttendanceDateSet,
  parseNumber,
  getTaxFromTable,
  calculateSalary,
} from '../services/salaryCalculationService.js';

/**
 * Helper: generate the ISO date key the same way calculateSalary does internally.
 * This ensures tests pass regardless of the host timezone.
 */
const toDateKey = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/**
 * Helper: generate weekday date keys in a range (matching calculateSalary's loop).
 */
const weekdayDateKeys = (startDate, endDate, workDays = ['mon', 'tue', 'wed', 'thu', 'fri']) => {
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const keys = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayMap[d.getDay()];
    if (workDays.includes(key)) {
      keys.push(d.toISOString().slice(0, 10));
    }
  }
  return keys;
};

// ─── buildScheduledWorkdays ─────────────────────────────────────────────────

describe('buildScheduledWorkdays', () => {
  test('counts normal weekdays (Mon-Fri) in a week', () => {
    // 2026-03-02 (Mon) ~ 2026-03-06 (Fri) = 5 weekdays
    const count = buildScheduledWorkdays('2026-03-02', '2026-03-06', ['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(count).toBe(5);
  });

  test('excludes weekends when work days are Mon-Fri', () => {
    // 2026-03-02 (Mon) ~ 2026-03-08 (Sun) = full week, but only 5 workdays
    const count = buildScheduledWorkdays('2026-03-02', '2026-03-08', ['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(count).toBe(5);
  });

  test('custom work days Mon-Sat counts 6 days in a full week', () => {
    // 2026-03-02 (Mon) ~ 2026-03-08 (Sun) = Mon-Sat = 6 work days
    const count = buildScheduledWorkdays('2026-03-02', '2026-03-08', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    expect(count).toBe(6);
  });

  test('same start and end date returns 1 if that day is a work day', () => {
    // 2026-03-02 is Monday
    const count = buildScheduledWorkdays('2026-03-02', '2026-03-02', ['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(count).toBe(1);
  });

  test('same start and end date returns 0 if that day is not a work day', () => {
    // 2026-03-07 is Saturday
    const count = buildScheduledWorkdays('2026-03-07', '2026-03-07', ['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(count).toBe(0);
  });

  test('empty workDays array defaults to all 7 days', () => {
    // 2026-03-02 (Mon) ~ 2026-03-08 (Sun) = 7 days
    const count = buildScheduledWorkdays('2026-03-02', '2026-03-08', []);
    expect(count).toBe(7);
  });
});

// ─── buildAttendanceDateSet ─────────────────────────────────────────────────

describe('buildAttendanceDateSet', () => {
  test('builds a set from normal attendance records', () => {
    const records = [
      { date: '2026-03-02' },
      { date: '2026-03-03' },
      { date: '2026-03-04' },
    ];
    const set = buildAttendanceDateSet(records);
    expect(set.size).toBe(3);
    expect(set.has('2026-03-02')).toBe(true);
    expect(set.has('2026-03-04')).toBe(true);
  });

  test('returns empty set for empty records', () => {
    const set = buildAttendanceDateSet([]);
    expect(set.size).toBe(0);
  });

  test('deduplicates records with the same date', () => {
    const records = [
      { date: '2026-03-02' },
      { date: '2026-03-02' },
      { date: '2026-03-03' },
    ];
    const set = buildAttendanceDateSet(records);
    expect(set.size).toBe(2);
  });

  test('skips records without a date field', () => {
    const records = [
      { date: '2026-03-02' },
      { date: null },
      {},
    ];
    const set = buildAttendanceDateSet(records);
    expect(set.size).toBe(1);
  });
});

// ─── parseNumber ────────────────────────────────────────────────────────────

describe('parseNumber', () => {
  test('parses a normal number string', () => {
    expect(parseNumber('5000')).toBe(5000);
  });

  test('parses a comma-separated number string', () => {
    expect(parseNumber('1,000,000')).toBe(1000000);
  });

  test('returns 0 for null or undefined', () => {
    expect(parseNumber(null)).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
  });

  test('returns the number directly if already a number', () => {
    expect(parseNumber(3500)).toBe(3500);
  });

  test('returns 0 for empty string', () => {
    expect(parseNumber('')).toBe(0);
  });

  test('returns 0 for non-numeric string', () => {
    expect(parseNumber('abc')).toBe(0);
  });
});

// ─── getTaxFromTable (mocked DB) ────────────────────────────────────────────

describe('getTaxFromTable', () => {
  const year = new Date().getFullYear();

  test('returns tax for a normal salary lookup', async () => {
    const mockGet = jest.fn()
      .mockResolvedValueOnce({ tax: '85000' }); // first query matches

    const tax = await getTaxFromTable(mockGet, 3000000, 1);
    expect(tax).toBe(85000);
    expect(mockGet).toHaveBeenCalledTimes(1);
    // Verify query includes correct year and salary params
    expect(mockGet.mock.calls[0][1]).toEqual([year, 3000000, 3000000]);
  });

  test('falls back to highest bracket when salary exceeds table max', async () => {
    const mockGet = jest.fn()
      .mockResolvedValueOnce(null)            // first query: no match
      .mockResolvedValueOnce({ tax: '500000' }); // fallback: max bracket

    const tax = await getTaxFromTable(mockGet, 99000000, 1);
    expect(tax).toBe(500000);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  test('returns 0 when no match and no max bracket found', async () => {
    const mockGet = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const tax = await getTaxFromTable(mockGet, 100000, 1);
    expect(tax).toBe(0);
  });

  test('returns 0 when database throws an error', async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error('DB connection failed'));

    const tax = await getTaxFromTable(mockGet, 3000000, 1);
    expect(tax).toBe(0);
  });

  test('clamps dependents to 1-11 range', async () => {
    const mockGet = jest.fn().mockResolvedValueOnce({ tax: '50000' });

    await getTaxFromTable(mockGet, 3000000, 0); // 0 clamped to 1
    const query = mockGet.mock.calls[0][0];
    expect(query).toContain('dependents_1');
  });
});

// ─── Salary calculation logic (calculateSalary) ────────────────────────────

describe('calculateSalary', () => {
  test('hourly salary basic calculation', () => {
    const result = calculateSalary({
      salaryType: 'hourly',
      amount: 10000,
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      attendanceRecords: [
        { work_hours: 8 },
        { work_hours: 8 },
        { work_hours: 8 },
        { work_hours: 8 },
        { work_hours: 8 },
      ],
    });
    // 40 hours * 10,000 = 400,000
    expect(result.totalWorkHours).toBe(40);
    expect(result.calculatedSalary).toBe(400000);
    expect(result.totalWorkDays).toBe(5);
  });

  test('hourly with weekly holiday pay when hours >= 15 and type is separate', () => {
    // 1 week period: Mon-Fri, 40 hours total
    const result = calculateSalary({
      salaryType: 'hourly',
      amount: 10000,
      weeklyHolidayType: 'separate',
      startDate: '2026-03-02', // Mon
      endDate: '2026-03-06',   // Fri
      attendanceRecords: [
        { work_hours: 8 },
        { work_hours: 8 },
        { work_hours: 8 },
        { work_hours: 8 },
        { work_hours: 8 },
      ],
    });
    // days = 4, weeks = ceil(4/7) = 1
    // avgWeeklyHours = 40/1 = 40
    // weeklyHolidayHours = min(40/5, 8) = 8
    // weeklyHolidayPay = 8 * 1 * 10000 = 80,000
    // total = 400,000 + 80,000 = 480,000
    expect(result.calculatedSalary).toBe(480000);
  });

  test('hourly: no weekly holiday pay when hours < 15', () => {
    const result = calculateSalary({
      salaryType: 'hourly',
      amount: 10000,
      weeklyHolidayType: 'separate',
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      attendanceRecords: [
        { work_hours: 4 },
        { work_hours: 4 },
        { work_hours: 4 },
      ],
    });
    // 12 hours < 15 => no holiday pay
    expect(result.totalWorkHours).toBe(12);
    expect(result.calculatedSalary).toBe(120000);
  });

  test('monthly salary with proration (single month)', () => {
    const result = calculateSalary({
      salaryType: 'monthly',
      amount: 3000000,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      attendanceRecords: [],
    });
    // 1 month * 3,000,000 = 3,000,000
    expect(result.calculatedSalary).toBe(3000000);
  });

  test('monthly salary spanning multiple months', () => {
    const result = calculateSalary({
      salaryType: 'monthly',
      amount: 3000000,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      attendanceRecords: [],
    });
    // 3 months * 3,000,000 = 9,000,000
    expect(result.calculatedSalary).toBe(9000000);
  });

  test('annual salary with monthly conversion', () => {
    const result = calculateSalary({
      salaryType: 'annual',
      amount: 36000000,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      attendanceRecords: [],
    });
    // 36,000,000 / 12 * 1 month = 3,000,000
    expect(result.calculatedSalary).toBe(3000000);
  });

  test('annual salary over 3 months', () => {
    const result = calculateSalary({
      salaryType: 'annual',
      amount: 36000000,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      attendanceRecords: [],
    });
    // 36,000,000 / 12 * 3 = 9,000,000
    expect(result.calculatedSalary).toBe(9000000);
  });

  test('absence deduction for monthly salary', () => {
    // 2026-03-02 (Mon) to 2026-03-06 (Fri) = 5 weekdays
    // Employee attended only first 3 work days => 2 absent
    const allKeys = weekdayDateKeys('2026-03-02', '2026-03-06');
    const presentKeys = allKeys.slice(0, 3); // first 3 of 5

    const result = calculateSalary({
      salaryType: 'monthly',
      amount: 3000000,
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      attendanceRecords: [],
      allAttendanceRecords: presentKeys.map((d) => ({ date: d })),
      workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      deductAbsence: true,
    });

    expect(result.absentDays).toBe(2);
    expect(result.absenceDeduction).toBeGreaterThan(0);
    const expectedDeduction = Math.round((3000000 / 5) * 2);
    expect(result.absenceDeduction).toBe(expectedDeduction);
    expect(result.calculatedSalary).toBe(3000000 - expectedDeduction);
  });

  test('zero work hours edge case for hourly', () => {
    const result = calculateSalary({
      salaryType: 'hourly',
      amount: 10000,
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      attendanceRecords: [],
    });
    expect(result.totalWorkHours).toBe(0);
    expect(result.calculatedSalary).toBe(0);
    expect(result.totalWorkDays).toBe(0);
  });

  test('no absence deduction for hourly salary type', () => {
    // Even with deductAbsence = true, hourly salary should not get absence deduction
    // (The code only deducts for monthly/annual)
    const firstDay = weekdayDateKeys('2026-03-02', '2026-03-02')[0];
    const result = calculateSalary({
      salaryType: 'hourly',
      amount: 10000,
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      attendanceRecords: [{ work_hours: 8 }],
      allAttendanceRecords: [{ date: firstDay }],
      workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      deductAbsence: true,
    });
    // 4 absent days but salary type is hourly, so no deduction
    expect(result.absenceDeduction).toBe(0);
    expect(result.calculatedSalary).toBe(80000);
  });

  test('full attendance means zero absence deduction', () => {
    const allKeys = weekdayDateKeys('2026-03-02', '2026-03-06');
    const result = calculateSalary({
      salaryType: 'monthly',
      amount: 3000000,
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      attendanceRecords: [],
      allAttendanceRecords: allKeys.map((d) => ({ date: d })),
      workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      deductAbsence: true,
    });
    expect(result.absentDays).toBe(0);
    expect(result.absenceDeduction).toBe(0);
    expect(result.calculatedSalary).toBe(3000000);
  });
});
