import express from 'express';
import { query, get, run } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const buildScheduledWorkdays = (startDate, endDate, workDays) => {
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

const buildAttendanceDateSet = (records) => {
  const set = new Set();
  records.forEach((record) => {
    if (record?.date) {
      set.add(String(record.date));
    }
  });
  return set;
};

const parseNumber = (value) => {
  if (!value) return 0;
  const numeric = String(value).replace(/,/g, '');
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePayrollLedger = (rawText) => {
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

// 급여 계산
router.get('/calculate/:employeeId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.params.employeeId;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '시작일과 종료일을 입력해주세요.' });
    }

    // 권한 확인
    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 급여 정보 조회
    const salaryInfo = await get(
      'SELECT * FROM salary_info WHERE user_id = ?',
      [employeeId]
    );

    if (!salaryInfo) {
      return res.status(404).json({ message: '급여 정보가 등록되지 않았습니다.' });
    }

    // 출퇴근 기록 조회
    const attendanceRecords = await query(
      "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
      [employeeId, startDate, endDate]
    );

    const allAttendanceRecords = await query(
      "SELECT date, status, leave_type FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?",
      [employeeId, startDate, endDate]
    );

    // 과거 급여 기록 조회 (기간 겹침)
    const pastPayrollRecords = await query(
      `SELECT amount FROM employee_past_payroll
       WHERE user_id = ? AND start_date <= ? AND end_date >= ?`,
      [employeeId, endDate, startDate]
    );
    const pastPayrollAmount = pastPayrollRecords.reduce(
      (sum, record) => sum + (Number(record.amount) || 0),
      0
    );

    let calculatedSalary = 0;
    let totalWorkHours = 0;
    let totalWorkDays = attendanceRecords.length;

    // 시급 계산
    if (salaryInfo.salary_type === 'hourly') {
      totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
      calculatedSalary = totalWorkHours * salaryInfo.amount;

      // 주휴수당 계산 (주 15시간 이상 근무 시)
      const weeklyHolidayType = salaryInfo.weekly_holiday_type || 'included';
      
      if (weeklyHolidayType === 'separate' && totalWorkHours >= 15) {
        // 주휴수당 별도 계산: 주당 평균 근무시간의 1일치 (8시간 기준)
        const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
        const weeks = Math.ceil(days / 7);
        const avgWeeklyHours = totalWorkHours / (weeks || 1);
        const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8); // 주당 근무일수 5일 기준, 최대 8시간
        const weeklyHolidayPay = weeklyHolidayHours * weeks * salaryInfo.amount;
        calculatedSalary += weeklyHolidayPay;
      }
      // 'included': 시급에 이미 포함되어 있으므로 별도 계산 안함
      // 'none': 주휴수당 미적용
    }
    // 월급 계산
    else if (salaryInfo.salary_type === 'monthly') {
      const startMonth = new Date(startDate);
      const endMonth = new Date(endDate);
      const months = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;
      calculatedSalary = salaryInfo.amount * months;
    }
    // 연봉 계산 (월할 계산)
    else if (salaryInfo.salary_type === 'annual') {
      const startMonth = new Date(startDate);
      const endMonth = new Date(endDate);
      const months = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;
      calculatedSalary = (salaryInfo.amount / 12) * months;
    }

    // 직원 정보
    const employeeInfo = await get(
      'SELECT name, username FROM users WHERE id = ?',
      [employeeId]
    );

    const employeeDetails = await get(
      'SELECT work_days, deduct_absence FROM employee_details WHERE user_id = ?',
      [employeeId]
    );

    let absentDays = 0;
    let absenceDeduction = 0;
    if (employeeDetails?.deduct_absence) {
      const workDays = employeeDetails.work_days
        ? employeeDetails.work_days.split(',').map((day) => day.trim()).filter(Boolean)
        : [];
      const scheduledWorkdays = buildScheduledWorkdays(startDate, endDate, workDays);
      const attendanceDates = buildAttendanceDateSet(allAttendanceRecords);
      let presentDays = 0;
      const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dayMap[d.getDay()];
        if (workDays.length > 0 && !workDays.includes(key)) continue;
        const dateKey = d.toISOString().slice(0, 10);
        if (attendanceDates.has(dateKey)) {
          presentDays += 1;
        }
      }
      absentDays = Math.max(scheduledWorkdays - presentDays, 0);
      if (absentDays > 0 && scheduledWorkdays > 0 && (salaryInfo.salary_type === 'monthly' || salaryInfo.salary_type === 'annual')) {
        const perDay = calculatedSalary / scheduledWorkdays;
        absenceDeduction = Math.round(perDay * absentDays);
        calculatedSalary = Math.max(calculatedSalary - absenceDeduction, 0);
      }
    }

    res.json({
      employee: employeeInfo,
      salaryInfo: {
        type: salaryInfo.salary_type,
        baseAmount: salaryInfo.amount,
        weeklyHolidayPay: salaryInfo.weekly_holiday_pay,
        taxType: salaryInfo.tax_type
      },
      period: {
        startDate,
        endDate
      },
      workData: {
        totalWorkDays,
        totalWorkHours: totalWorkHours.toFixed(2)
      },
      calculatedSalary: Math.round(calculatedSalary),
      pastPayrollAmount,
      totalPay: Math.round(calculatedSalary),
      absence: {
        absentDays,
        deduction: absenceDeduction
      }
    });
  } catch (error) {
    console.error('급여 계산 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업장 전체 급여 계산
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workplaceId = req.params.workplaceId;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '시작일과 종료일을 입력해주세요.' });
    }

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 사업장의 모든 직원 조회
    const employees = await query(
      "SELECT id, name, username FROM users WHERE workplace_id = ? AND role = 'employee'",
      [workplaceId]
    );

    const salaryResults = [];
    let totalSalary = 0;

    for (const employee of employees) {
      const salaryInfo = await get(
        'SELECT * FROM salary_info WHERE user_id = ?',
        [employee.id]
      );

      if (!salaryInfo) continue;

      const attendanceRecords = await query(
        "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
        [employee.id, startDate, endDate]
      );

      const allAttendanceRecords = await query(
        "SELECT date, status, leave_type FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?",
        [employee.id, startDate, endDate]
      );

      const pastPayrollRecords = await query(
        `SELECT amount FROM employee_past_payroll
         WHERE user_id = ? AND start_date <= ? AND end_date >= ?`,
        [employee.id, endDate, startDate]
      );
      const pastPayrollAmount = pastPayrollRecords.reduce(
        (sum, record) => sum + (Number(record.amount) || 0),
        0
      );

      let calculatedSalary = 0;
      let totalWorkHours = 0;

      if (salaryInfo.salary_type === 'hourly') {
        totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
        calculatedSalary = totalWorkHours * salaryInfo.amount;

        const weeklyHolidayType = salaryInfo.weekly_holiday_type || 'included';
        
        if (weeklyHolidayType === 'separate' && totalWorkHours >= 15) {
          const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
          const weeks = Math.ceil(days / 7);
          const avgWeeklyHours = totalWorkHours / (weeks || 1);
          const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8);
          const weeklyHolidayPay = weeklyHolidayHours * weeks * salaryInfo.amount;
          calculatedSalary += weeklyHolidayPay;
        }
      } else if (salaryInfo.salary_type === 'monthly') {
        const startMonth = new Date(startDate);
        const endMonth = new Date(endDate);
        const months = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;
        calculatedSalary = salaryInfo.amount * months;
      } else if (salaryInfo.salary_type === 'annual') {
        const startMonth = new Date(startDate);
        const endMonth = new Date(endDate);
        const months = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;
        calculatedSalary = (salaryInfo.amount / 12) * months;
      }

      const detailsForAbsence = await get(
        'SELECT work_days, deduct_absence, hire_date, pay_schedule_type, pay_day, pay_after_days FROM employee_details WHERE user_id = ?',
        [employee.id]
      );

      let absentDays = 0;
      let absenceDeduction = 0;
      if (detailsForAbsence?.deduct_absence) {
        const workDays = detailsForAbsence.work_days
          ? detailsForAbsence.work_days.split(',').map((day) => day.trim()).filter(Boolean)
          : [];
        const scheduledWorkdays = buildScheduledWorkdays(startDate, endDate, workDays);
        const attendanceDates = buildAttendanceDateSet(allAttendanceRecords);
        let presentDays = 0;
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = dayMap[d.getDay()];
          if (workDays.length > 0 && !workDays.includes(key)) continue;
          const dateKey = d.toISOString().slice(0, 10);
          if (attendanceDates.has(dateKey)) {
            presentDays += 1;
          }
        }
        absentDays = Math.max(scheduledWorkdays - presentDays, 0);
        if (absentDays > 0 && scheduledWorkdays > 0 && (salaryInfo.salary_type === 'monthly' || salaryInfo.salary_type === 'annual')) {
          const perDay = calculatedSalary / scheduledWorkdays;
          absenceDeduction = Math.round(perDay * absentDays);
          calculatedSalary = Math.max(calculatedSalary - absenceDeduction, 0);
        }
      }

      const roundedSalary = Math.round(calculatedSalary);

      // 주휴수당 계산
      let weeklyHolidayPayAmount = 0;
      let baseSalaryAmount = 0;
      
      if (salaryInfo.salary_type === 'hourly') {
        baseSalaryAmount = totalWorkHours * salaryInfo.amount;
        const weeklyHolidayType = salaryInfo.weekly_holiday_type || 'included';
        
        if (weeklyHolidayType === 'separate' && totalWorkHours >= 15) {
          const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
          const weeks = Math.ceil(days / 7);
          const avgWeeklyHours = totalWorkHours / (weeks || 1);
          const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8);
          weeklyHolidayPayAmount = weeklyHolidayHours * weeks * salaryInfo.amount;
        }
      } else {
        baseSalaryAmount = roundedSalary;
      }

      // 당일 퇴사 시 지급해야 할 퇴직금 계산 (1년 이상 근무자)
      let severancePay = 0;
      const employeeDetails = detailsForAbsence || await get(
        'SELECT hire_date FROM employee_details WHERE user_id = ?',
        [employee.id]
      );
      
      if (employeeDetails && employeeDetails.hire_date) {
        const hireDate = new Date(employeeDetails.hire_date);
        const today = new Date();
        const yearsOfService = (today - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
        
        if (yearsOfService >= 1) {
          // 월 평균임금 계산
          let monthlyAvgWage = 0;
          if (salaryInfo.salary_type === 'monthly') {
            monthlyAvgWage = salaryInfo.amount;
          } else if (salaryInfo.salary_type === 'hourly') {
            monthlyAvgWage = salaryInfo.amount * 209; // 월 209시간 기준
          } else if (salaryInfo.salary_type === 'annual') {
            monthlyAvgWage = salaryInfo.amount / 12;
          }

          // 당일 퇴사 시 지급 퇴직금 = 월평균임금 × 근속연수
          severancePay = Math.round(monthlyAvgWage * yearsOfService);
        }
      }

      const totalPay = roundedSalary;

      // 퇴직금/수기 과거 급여는 별도 표시 (총 급여에 포함하지 않음)
      totalSalary += totalPay;

      salaryResults.push({
        employeeId: employee.id,
        employeeName: employee.name,
        username: employee.username,
        salaryType: salaryInfo.salary_type,
        baseAmount: salaryInfo.amount,
        taxType: salaryInfo.tax_type,
        totalWorkDays: attendanceRecords.length,
        totalWorkHours: totalWorkHours.toFixed(2),
        calculatedSalary: roundedSalary,
        baseSalary: roundedSalary,
        weeklyHolidayPay: salaryInfo.weekly_holiday_pay || 0,
        weeklyHolidayPayAmount: Math.round(weeklyHolidayPayAmount),
        pastPayrollAmount: Math.round(pastPayrollAmount),
        baseSalaryAmount: Math.round(baseSalaryAmount),
        severancePay: severancePay,
        totalPay: Math.round(totalPay),
        payScheduleType: detailsForAbsence?.pay_schedule_type || 'monthly',
        payDay: detailsForAbsence?.pay_day,
        payAfterDays: detailsForAbsence?.pay_after_days,
        absence: {
          absentDays,
          deduction: absenceDeduction
        }
      });
    }

    res.json({
      workplaceId,
      period: {
        startDate,
        endDate
      },
      employees: salaryResults,
      totalSalary
    });
  } catch (error) {
    console.error('사업장 급여 계산 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 퇴직금 계산
router.get('/severance/:employeeId', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    // 권한 확인
    const employee = await get(
      `SELECT u.id, u.workplace_id, ed.hire_date, u.name
       FROM users u
       LEFT JOIN employee_details ed ON u.id = ed.user_id
       WHERE u.id = ? AND u.role = 'employee'`,
      [employeeId]
    );

    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 입사일 확인
    if (!employee.hire_date) {
      return res.status(400).json({ message: '입사일 정보가 없습니다.' });
    }

    const hireDate = new Date(employee.hire_date);
    const currentDate = new Date();
    
    // 재직 기간 계산 (일 단위)
    const daysWorked = Math.floor((currentDate - hireDate) / (1000 * 60 * 60 * 24));
    const yearsWorked = daysWorked / 365;

    // 1년 미만 근무자는 퇴직금 없음
    if (yearsWorked < 1) {
      return res.json({
        eligible: false,
        yearsWorked: yearsWorked.toFixed(2),
        message: '1년 이상 근무해야 퇴직금이 발생합니다.'
      });
    }

    // 급여 정보 조회
    const salaryInfo = await get(
      'SELECT * FROM salary_info WHERE user_id = ?',
      [employeeId]
    );

    if (!salaryInfo) {
      return res.status(404).json({ message: '급여 정보가 등록되지 않았습니다.' });
    }

    // 최근 3개월 급여 계산
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    const currentDateStr = currentDate.toISOString().split('T')[0];

    let averageDailyWage = 0;

    if (salaryInfo.salary_type === 'hourly') {
      // 시급제: 최근 3개월 근무 시간 기반 계산
      const attendanceRecords = await query(
        "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
        [employeeId, threeMonthsAgoStr, currentDateStr]
      );

      const totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
      const threeMonthsSalary = totalWorkHours * salaryInfo.amount;
      
      // 3개월 = 약 90일
      averageDailyWage = threeMonthsSalary / 90;
    } else if (salaryInfo.salary_type === 'monthly') {
      // 월급제: 월급 * 3개월 / 90일
      averageDailyWage = (salaryInfo.amount * 3) / 90;
    } else if (salaryInfo.salary_type === 'annual') {
      // 연봉제: 연봉 / 365일
      averageDailyWage = salaryInfo.amount / 365;
    }

    // 퇴직금 = (1일 평균임금) × (재직일수) / 365 × 30일
    const severancePay = (averageDailyWage * daysWorked / 365) * 30;

    res.json({
      eligible: true,
      employeeName: employee.name,
      hireDate: employee.hire_date,
      yearsWorked: yearsWorked.toFixed(2),
      daysWorked,
      averageDailyWage: Math.round(averageDailyWage),
      severancePay: Math.round(severancePay),
      salaryType: salaryInfo.salary_type
    });
  } catch (error) {
    console.error('퇴직금 계산 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 급여대장(PDF/엑셀 텍스트) 가져오기
router.post('/ledger/import', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { workplaceId, text } = req.body;
    if (!workplaceId || !text) {
      return res.status(400).json({ message: '사업장과 급여대장 텍스트를 입력해주세요.' });
    }

    const workplace = await get('SELECT id, owner_id FROM workplaces WHERE id = ?', [workplaceId]);
    if (!workplace || workplace.owner_id !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const parsed = parsePayrollLedger(text);
    if (!parsed.payrollMonth || parsed.employees.length === 0) {
      return res.status(400).json({ message: '급여대장 내용을 인식하지 못했습니다. 텍스트를 확인해주세요.' });
    }

    const unmatched = [];
    let imported = 0;

    for (const employee of parsed.employees) {
      const matchedUser = await get(
        "SELECT id FROM users WHERE workplace_id = ? AND role = 'employee' AND name = ?",
        [workplaceId, employee.name]
      );

      if (!matchedUser) {
        unmatched.push(employee.name);
        continue;
      }

      await run(
        `DELETE FROM salary_slips WHERE workplace_id = ? AND user_id = ? AND payroll_month = ?`,
        [workplaceId, matchedUser.id, parsed.payrollMonth]
      );

      await run(
        `INSERT INTO salary_slips (
          workplace_id, user_id, payroll_month, pay_date,
          base_pay, national_pension, health_insurance, employment_insurance,
          long_term_care, income_tax, local_income_tax, total_deductions,
          net_pay, source_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workplaceId,
          matchedUser.id,
          parsed.payrollMonth,
          parsed.payDate,
          employee.basePay,
          employee.nationalPension,
          employee.healthInsurance,
          employee.employmentInsurance,
          employee.longTermCare,
          employee.incomeTax,
          employee.localIncomeTax,
          employee.totalDeductions,
          employee.netPay,
          text
        ]
      );
      imported += 1;
    }

    res.json({
      month: parsed.payrollMonth,
      payDate: parsed.payDate,
      imported,
      unmatched
    });
  } catch (error) {
    console.error('급여대장 가져오기 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 급여명세서 조회
router.get('/slips/my', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { month } = req.query;
    const params = [req.user.id];
    let sql = 'SELECT * FROM salary_slips WHERE user_id = ? AND (published = ? OR published = ?)';
    params.push(true, 1); // PostgreSQL boolean과 SQLite integer 모두 처리
    if (month) {
      sql += ' AND payroll_month = ?';
      params.push(month);
    }
    sql += ' ORDER BY payroll_month DESC, pay_date DESC';

    const slips = await query(sql, params);
    res.json(slips);
  } catch (error) {
    console.error('급여명세서 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 특정 직원의 급여명세서 조회
router.get('/slips/employee/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month } = req.query;

    // 사업주 권한 확인
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 직원의 workplace 확인
    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [userId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    // 사업주의 사업장 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [employee.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const params = [userId];
    let sql = 'SELECT * FROM salary_slips WHERE user_id = ?';
    if (month) {
      sql += ' AND payroll_month = ?';
      params.push(month);
    }
    sql += ' ORDER BY payroll_month DESC, pay_date DESC';

    const slips = await query(sql, params);
    res.json(slips);
  } catch (error) {
    console.error('급여명세서 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 작성
router.post('/slips', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const {
      workplaceId,
      userId,
      payrollMonth,
      payDate,
      taxType,
      basePay,
      nationalPension,
      healthInsurance,
      employmentInsurance,
      longTermCare,
      incomeTax,
      localIncomeTax
    } = req.body;

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 직원 확인
    const employee = await get('SELECT * FROM users WHERE id = ? AND workplace_id = ?', [userId, workplaceId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    // 총 공제액 및 실수령액 계산
    let totalDeductions = 0;
    let netPay = parseFloat(basePay) || 0;

    if (taxType === '3.3%') {
      // 프리랜서: 원천징수 3.3%
      totalDeductions = Math.round(netPay * 0.033);
      netPay = netPay - totalDeductions;
    } else {
      // 4대보험
      totalDeductions = 
        (parseFloat(nationalPension) || 0) +
        (parseFloat(healthInsurance) || 0) +
        (parseFloat(employmentInsurance) || 0) +
        (parseFloat(longTermCare) || 0) +
        (parseFloat(incomeTax) || 0) +
        (parseFloat(localIncomeTax) || 0);
      netPay = netPay - totalDeductions;
    }

    // 급여명세서 저장
    const result = await run(
      `INSERT INTO salary_slips (
        workplace_id, user_id, payroll_month, pay_date, tax_type,
        base_pay, national_pension, health_insurance, employment_insurance,
        long_term_care, income_tax, local_income_tax, total_deductions, net_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workplaceId, userId, payrollMonth, payDate, taxType || '4대보험',
        basePay, nationalPension || 0, healthInsurance || 0, employmentInsurance || 0,
        longTermCare || 0, incomeTax || 0, localIncomeTax || 0, totalDeductions, netPay
      ]
    );

    res.json({
      message: '급여명세서가 저장되었습니다.',
      slipId: result.lastID || result.insertId
    });
  } catch (error) {
    console.error('급여명세서 저장 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 수정
router.put('/slips/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { id } = req.params;
    const {
      payrollMonth,
      payDate,
      taxType,
      basePay,
      nationalPension,
      healthInsurance,
      employmentInsurance,
      longTermCare,
      incomeTax,
      localIncomeTax
    } = req.body;

    // 급여명세서 존재 확인
    const slip = await get('SELECT * FROM salary_slips WHERE id = ?', [id]);
    if (!slip) {
      return res.status(404).json({ message: '급여명세서를 찾을 수 없습니다.' });
    }

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [slip.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 총 공제액 및 실수령액 계산
    let totalDeductions = 0;
    let netPay = parseFloat(basePay) || 0;

    if (taxType === '3.3%') {
      // 프리랜서: 원천징수 3.3%
      totalDeductions = Math.round(netPay * 0.033);
      netPay = netPay - totalDeductions;
    } else {
      // 4대보험
      totalDeductions = 
        (parseFloat(nationalPension) || 0) +
        (parseFloat(healthInsurance) || 0) +
        (parseFloat(employmentInsurance) || 0) +
        (parseFloat(longTermCare) || 0) +
        (parseFloat(incomeTax) || 0) +
        (parseFloat(localIncomeTax) || 0);
      netPay = netPay - totalDeductions;
    }

    // 급여명세서 수정
    await run(
      `UPDATE salary_slips SET
        payroll_month = ?, pay_date = ?, tax_type = ?,
        base_pay = ?, national_pension = ?, health_insurance = ?, employment_insurance = ?,
        long_term_care = ?, income_tax = ?, local_income_tax = ?, 
        total_deductions = ?, net_pay = ?
      WHERE id = ?`,
      [
        payrollMonth, payDate, taxType || '4대보험',
        basePay, nationalPension || 0, healthInsurance || 0, employmentInsurance || 0,
        longTermCare || 0, incomeTax || 0, localIncomeTax || 0,
        totalDeductions, netPay, id
      ]
    );

    res.json({ message: '급여명세서가 수정되었습니다.' });
  } catch (error) {
    console.error('급여명세서 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 삭제
router.delete('/slips/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { id } = req.params;

    // 급여명세서 존재 확인
    const slip = await get('SELECT * FROM salary_slips WHERE id = ?', [id]);
    if (!slip) {
      return res.status(404).json({ message: '급여명세서를 찾을 수 없습니다.' });
    }

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [slip.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await run('DELETE FROM salary_slips WHERE id = ?', [id]);

    res.json({ message: '급여명세서가 삭제되었습니다.' });
  } catch (error) {
    console.error('급여명세서 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 배포
router.put('/slips/:id/publish', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { id } = req.params;

    // 급여명세서 존재 확인
    const slip = await get('SELECT * FROM salary_slips WHERE id = ?', [id]);
    if (!slip) {
      return res.status(404).json({ message: '급여명세서를 찾을 수 없습니다.' });
    }

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [slip.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await run('UPDATE salary_slips SET published = ? WHERE id = ?', [true, id]);

    res.json({ message: '급여명세서가 배포되었습니다.' });
  } catch (error) {
    console.error('급여명세서 배포 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 월별 급여명세서 자동 생성
router.post('/slips/generate/:workplaceId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { workplaceId } = req.params;
    const { payrollMonth, payDate } = req.body;

    if (!payrollMonth) {
      return res.status(400).json({ message: '귀속월을 입력해주세요.' });
    }

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 해당 월의 시작일과 종료일 계산
    const [year, month] = payrollMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    // 사업장의 모든 직원 조회
    const employees = await query(
      "SELECT id, name FROM users WHERE workplace_id = ? AND role = 'employee' AND (employment_status IS NULL OR employment_status != 'resigned')",
      [workplaceId]
    );

    let created = 0;
    let skipped = 0;

    for (const employee of employees) {
      // 이미 해당 월 급여명세서가 있는지 확인
      const existing = await get(
        'SELECT id FROM salary_slips WHERE user_id = ? AND payroll_month = ?',
        [employee.id, payrollMonth]
      );

      if (existing) {
        skipped++;
        continue;
      }

      // 급여 정보 조회
      const salaryInfo = await get('SELECT * FROM salary_info WHERE user_id = ?', [employee.id]);
      if (!salaryInfo) {
        skipped++;
        continue;
      }

      // 출근 기록 조회
      const attendanceRecords = await query(
        "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
        [employee.id, startDate, endDate]
      );

      let basePay = 0;
      let totalWorkHours = 0;

      if (salaryInfo.salary_type === 'hourly') {
        totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
        basePay = totalWorkHours * salaryInfo.amount;

        // 주휴수당 계산
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

      basePay = Math.round(basePay);

      // 세금 타입 결정
      const taxType = salaryInfo.tax_type || '4대보험';
      let totalDeductions = 0;
      let netPay = basePay;

      if (taxType === '3.3%') {
        totalDeductions = Math.round(basePay * 0.033);
        netPay = basePay - totalDeductions;
      }

      // 급여명세서 생성
      await run(
        `INSERT INTO salary_slips (
          workplace_id, user_id, payroll_month, pay_date, tax_type,
          base_pay, total_deductions, net_pay, published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [workplaceId, employee.id, payrollMonth, payDate, taxType, basePay, totalDeductions, netPay, false]
      );

      created++;
    }

    res.json({
      message: '급여명세서가 생성되었습니다.',
      created,
      skipped
    });
  } catch (error) {
    console.error('급여명세서 자동 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
