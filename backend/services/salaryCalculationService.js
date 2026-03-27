import { query, get, run } from '../config/database.js';

/**
 * Salary calculation helper functions.
 * Extracted from routes/salary.js for testability.
 */

export const buildScheduledWorkdays = (startDate, endDate, workDays) => {
  const scheduleDays = workDays && workDays.length > 0
    ? workDays
    : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayMap[d.getDay()];
    if (scheduleDays.includes(key)) {
      count += 1;
    }
  }
  return count;
};

export const buildAttendanceDateSet = (records) => {
  const set = new Set();
  records.forEach((record) => {
    if (record?.date) {
      set.add(String(record.date));
    }
  });
  return set;
};

export const parseNumber = (value) => {
  if (!value) return 0;
  const numeric = String(value).replace(/,/g, '');
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Look up income tax from the simplified tax table.
 * @param {Function} dbGet - database get function
 * @param {number} monthlySalary
 * @param {number} dependentsCount
 * @returns {Promise<number>}
 */
export const getTaxFromTable = async (dbGet, monthlySalary, dependentsCount) => {
  try {
    const year = new Date().getFullYear();
    const dependents = Math.min(Math.max(1, Math.floor(Number(dependentsCount))), 11);
    const allowedColumns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    if (!allowedColumns.includes(dependents)) {
      return 0;
    }
    const columnName = `dependents_${dependents}`;

    const taxData = await dbGet(`
      SELECT ${columnName} as tax
      FROM tax_table
      WHERE year = ?
        AND salary_min <= ?
        AND salary_max > ?
      LIMIT 1
    `, [year, monthlySalary, monthlySalary]);

    if (taxData && taxData.tax) {
      return parseInt(taxData.tax);
    }

    const maxTax = await dbGet(`
      SELECT ${columnName} as tax
      FROM tax_table
      WHERE year = ?
      ORDER BY salary_max DESC
      LIMIT 1
    `, [year]);

    if (maxTax && maxTax.tax) {
      return parseInt(maxTax.tax);
    }

    return 0;
  } catch (error) {
    console.error('Tax table lookup error:', error);
    return 0;
  }
};

/**
 * Calculate salary based on type, amount, attendance, and period.
 */
export const calculateSalary = ({
  salaryType,
  amount,
  weeklyHolidayType = 'included',
  startDate,
  endDate,
  attendanceRecords = [],
  allAttendanceRecords = [],
  workDays = [],
  deductAbsence = false,
}) => {
  let calculatedSalary = 0;
  let totalWorkHours = 0;
  const totalWorkDays = attendanceRecords.length;

  // Hourly
  if (salaryType === 'hourly') {
    totalWorkHours = attendanceRecords.reduce(
      (sum, r) => sum + (parseFloat(r.work_hours) || 0), 0
    );
    calculatedSalary = totalWorkHours * amount;

    if (weeklyHolidayType === 'separate' && totalWorkHours >= 15) {
      const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
      const weeks = Math.ceil(days / 7);
      const avgWeeklyHours = totalWorkHours / (weeks || 1);
      const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8);
      const weeklyHolidayPay = weeklyHolidayHours * weeks * amount;
      calculatedSalary += weeklyHolidayPay;
    }
  }
  // Monthly
  else if (salaryType === 'monthly') {
    const startMonth = new Date(startDate);
    const endMonth = new Date(endDate);
    const months = (endMonth.getFullYear() - startMonth.getFullYear()) * 12
      + (endMonth.getMonth() - startMonth.getMonth()) + 1;
    calculatedSalary = amount * months;
  }
  // Annual
  else if (salaryType === 'annual') {
    const startMonth = new Date(startDate);
    const endMonth = new Date(endDate);
    const months = (endMonth.getFullYear() - startMonth.getFullYear()) * 12
      + (endMonth.getMonth() - startMonth.getMonth()) + 1;
    calculatedSalary = (amount / 12) * months;
  }

  // Absence deduction
  let absentDays = 0;
  let absenceDeduction = 0;
  if (deductAbsence) {
    const scheduledWorkdays = buildScheduledWorkdays(startDate, endDate, workDays);
    const attendanceDates = buildAttendanceDateSet(allAttendanceRecords);
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    let presentDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dayMap[d.getDay()];
      if (workDays.length > 0 && !workDays.includes(key)) continue;
      const dateKey = d.toISOString().slice(0, 10);
      if (attendanceDates.has(dateKey)) {
        presentDays += 1;
      }
    }
    absentDays = Math.max(scheduledWorkdays - presentDays, 0);
    if (absentDays > 0 && scheduledWorkdays > 0
        && (salaryType === 'monthly' || salaryType === 'annual')) {
      const perDay = calculatedSalary / scheduledWorkdays;
      absenceDeduction = Math.round(perDay * absentDays);
      calculatedSalary = Math.max(calculatedSalary - absenceDeduction, 0);
    }
  }

  return {
    calculatedSalary: Math.round(calculatedSalary),
    totalWorkHours,
    totalWorkDays,
    absentDays,
    absenceDeduction,
  };
};

/**
 * Parse payroll ledger text (PDF/Excel copy-paste) into structured data.
 */
export const parsePayrollLedger = (rawText) => {
  const text = String(rawText || '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
  const monthMatch = text.match(/귀속[:\s]*([0-9]{4})년\s*([0-9]{1,2})월/);
  const payMatch = text.match(/지급[:\s]*([0-9]{4})년\s*([0-9]{1,2})월\s*([0-9]{1,2})일/);
  const payrollMonth = monthMatch
    ? `${monthMatch[1]}-${String(monthMatch[2]).padStart(2, '0')}`
    : null;
  const payDate = payMatch
    ? `${payMatch[1]}-${String(payMatch[2]).padStart(2, '0')}-${String(payMatch[3]).padStart(2, '0')}`
    : null;

  const employeePattern = /(\d{1,4})\s*([가-힣A-Za-z]{2,})\s*([0-9]{1,3}(?:,[0-9]{3})+)/g;
  const matches = [...text.matchAll(employeePattern)];

  const employees = matches.map((match, index) => {
    const start = match.index || 0;
    const nextStart = matches[index + 1]?.index ?? text.length;
    const block = text.slice(start, nextStart);
    const name = match[2];
    const basePay = parseNumber(match[3]);
    const numbers = (block.match(/[0-9]{1,3}(?:,[0-9]{3})+/g) || []).map(parseNumber);

    const baseIndex = numbers.findIndex((value) => value === basePay);
    if (baseIndex !== -1) {
      numbers.splice(baseIndex, 1);
    }

    const nationalPension = numbers[0] || 0;
    const healthInsurance = numbers[1] || 0;
    const employmentInsurance = numbers[2] || 0;
    const longTermCare = numbers[3] || 0;
    const incomeTax = numbers[4] || 0;
    const localIncomeTax = numbers[5] || 0;
    const totalDeductions = nationalPension + healthInsurance + employmentInsurance + longTermCare + incomeTax + localIncomeTax;

    const remainder = numbers.slice(6);
    const explicitNet = remainder.find((value) => value === basePay - totalDeductions);
    const netPay = explicitNet ?? (remainder.length > 0 ? remainder[remainder.length - 1] : basePay - totalDeductions);

    return {
      name,
      basePay,
      nationalPension,
      healthInsurance,
      employmentInsurance,
      longTermCare,
      incomeTax,
      localIncomeTax,
      totalDeductions,
      netPay
    };
  }).filter((emp) => emp.name && emp.basePay > 0);

  return {
    payrollMonth,
    payDate,
    employees
  };
};

/**
 * Calculate base pay for a single month given salary info and attendance.
 * Used by slip generation routes.
 */
export const calculateMonthlyBasePay = ({ salaryInfo, attendanceRecords, startDate, endDate }) => {
  let basePay = 0;
  let totalWorkHours = 0;

  if (salaryInfo.salary_type === 'hourly') {
    totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
    basePay = totalWorkHours * salaryInfo.amount;

    const weeklyHolidayType = salaryInfo.weekly_holiday_type || 'included';
    if (weeklyHolidayType === 'separate' && totalWorkHours >= 15) {
      const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
      const weeks = Math.ceil(days / 7);
      const avgWeeklyHours = totalWorkHours / (weeks || 1);
      const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8);
      basePay += weeklyHolidayHours * weeks * salaryInfo.amount;
    }
  } else if (salaryInfo.salary_type === 'monthly') {
    basePay = salaryInfo.amount;
  } else if (salaryInfo.salary_type === 'annual') {
    basePay = salaryInfo.amount / 12;
  }

  return { basePay: Math.round(basePay), totalWorkHours };
};

/**
 * Full employee salary calculation with DB queries.
 * Consolidates the logic from /calculate/:employeeId route.
 */
export const calculateEmployeeSalary = async ({ employeeId, startDate, endDate }) => {
  const salaryInfo = await get('SELECT * FROM salary_info WHERE user_id = ?', [employeeId]);
  if (!salaryInfo) return null;

  const attendanceRecords = await query(
    "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
    [employeeId, startDate, endDate]
  );

  const allAttendanceRecords = await query(
    "SELECT date, status, leave_type FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?",
    [employeeId, startDate, endDate]
  );

  const pastPayrollRecords = await query(
    `SELECT amount FROM employee_past_payroll
     WHERE user_id = ? AND start_date <= ? AND end_date >= ?`,
    [employeeId, endDate, startDate]
  );
  const pastPayrollAmount = pastPayrollRecords.reduce(
    (sum, record) => sum + (Number(record.amount) || 0),
    0
  );

  const employeeDetails = await get(
    'SELECT work_days, deduct_absence, hire_date, pay_schedule_type, pay_day, pay_after_days FROM employee_details WHERE user_id = ?',
    [employeeId]
  );

  const workDays = employeeDetails?.work_days
    ? employeeDetails.work_days.split(',').map((day) => day.trim()).filter(Boolean)
    : [];

  const result = calculateSalary({
    salaryType: salaryInfo.salary_type,
    amount: salaryInfo.amount,
    weeklyHolidayType: salaryInfo.weekly_holiday_type || 'included',
    startDate,
    endDate,
    attendanceRecords,
    allAttendanceRecords,
    workDays,
    deductAbsence: !!employeeDetails?.deduct_absence,
  });

  // Weekly holiday pay breakdown (for workplace route)
  let weeklyHolidayPayAmount = 0;
  let baseSalaryAmount = 0;

  if (salaryInfo.salary_type === 'hourly') {
    baseSalaryAmount = result.totalWorkHours * salaryInfo.amount;
    const weeklyHolidayType = salaryInfo.weekly_holiday_type || 'included';
    if (weeklyHolidayType === 'separate' && result.totalWorkHours >= 15) {
      const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
      const weeks = Math.ceil(days / 7);
      const avgWeeklyHours = result.totalWorkHours / (weeks || 1);
      const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8);
      weeklyHolidayPayAmount = weeklyHolidayHours * weeks * salaryInfo.amount;
    }
  } else {
    baseSalaryAmount = result.calculatedSalary;
  }

  // Severance pay estimate
  let severancePay = 0;
  if (employeeDetails && employeeDetails.hire_date) {
    const hireDate = new Date(employeeDetails.hire_date);
    const today = new Date();
    const yearsOfService = (today - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsOfService >= 1) {
      let monthlyAvgWage = 0;
      if (salaryInfo.salary_type === 'monthly') {
        monthlyAvgWage = salaryInfo.amount;
      } else if (salaryInfo.salary_type === 'hourly') {
        monthlyAvgWage = salaryInfo.amount * 209;
      } else if (salaryInfo.salary_type === 'annual') {
        monthlyAvgWage = salaryInfo.amount / 12;
      }
      severancePay = Math.round(monthlyAvgWage * yearsOfService);
    }
  }

  const totalPay = Math.round(baseSalaryAmount + weeklyHolidayPayAmount);

  return {
    salaryInfo,
    attendanceRecords,
    pastPayrollAmount,
    employeeDetails,
    ...result,
    weeklyHolidayPayAmount: Math.round(weeklyHolidayPayAmount),
    baseSalaryAmount: Math.round(baseSalaryAmount),
    severancePay,
    totalPay,
  };
};

/**
 * Calculate severance pay for an employee.
 */
export const calculateSeverance = async (employeeId) => {
  const employee = await get(
    `SELECT u.id, u.workplace_id, ed.hire_date, u.name
     FROM users u
     LEFT JOIN employee_details ed ON u.id = ed.user_id
     WHERE u.id = ? AND u.role = 'employee'`,
    [employeeId]
  );

  if (!employee) return { error: 'not_found' };
  if (!employee.hire_date) return { error: 'no_hire_date', employee };

  const hireDate = new Date(employee.hire_date);
  const currentDate = new Date();
  const daysWorked = Math.floor((currentDate - hireDate) / (1000 * 60 * 60 * 24));
  const yearsWorked = daysWorked / 365;

  if (yearsWorked < 1) {
    return {
      eligible: false,
      employee,
      yearsWorked: yearsWorked.toFixed(2),
    };
  }

  const salaryInfo = await get('SELECT * FROM salary_info WHERE user_id = ?', [employeeId]);
  if (!salaryInfo) return { error: 'no_salary', employee };

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
  const currentDateStr = currentDate.toISOString().split('T')[0];

  let averageDailyWage = 0;

  if (salaryInfo.salary_type === 'hourly') {
    const attendanceRecords = await query(
      "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
      [employeeId, threeMonthsAgoStr, currentDateStr]
    );
    const totalWorkHours = attendanceRecords.reduce((sum, r) => sum + (parseFloat(r.work_hours) || 0), 0);
    averageDailyWage = (totalWorkHours * salaryInfo.amount) / 90;
  } else if (salaryInfo.salary_type === 'monthly') {
    averageDailyWage = (salaryInfo.amount * 3) / 90;
  } else if (salaryInfo.salary_type === 'annual') {
    averageDailyWage = salaryInfo.amount / 365;
  }

  const severancePay = (averageDailyWage * daysWorked / 365) * 30;

  return {
    eligible: true,
    employee,
    yearsWorked: yearsWorked.toFixed(2),
    daysWorked,
    averageDailyWage: Math.round(averageDailyWage),
    severancePay: Math.round(severancePay),
    salaryType: salaryInfo.salary_type,
  };
};
