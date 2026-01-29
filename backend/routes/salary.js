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

// 근로소득 간이세액표에서 소득세 조회
const getTaxFromTable = async (monthlySalary, dependentsCount) => {
  try {
    const year = new Date().getFullYear();
    const dependents = Math.min(Math.max(1, dependentsCount), 11); // 1~11 범위 제한
    const columnName = `dependents_${dependents}`;
    
    const taxData = await get(`
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
    
    // 세액표에 없으면 최고 구간 세액 반환 (간이세액표 범위 초과)
    const maxTax = await get(`
      SELECT ${columnName} as tax
      FROM tax_table
      WHERE year = ?
      ORDER BY salary_max DESC
      LIMIT 1
    `, [year]);
    
    if (maxTax && maxTax.tax) {
      // 초과분에 대해서는 간단한 추정 (실제로는 더 복잡한 계산 필요)
      return parseInt(maxTax.tax);
    }
    
    // 기본값 0 반환
    return 0;
  } catch (error) {
    console.error('세액표 조회 오류:', error);
    return 0;
  }
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

// 세액 자동 계산 (간이세액표 기반)
router.post('/calculate-tax', authenticate, async (req, res) => {
  try {
    const { basePay, dependentsCount } = req.body;
    
    if (!basePay || basePay < 0) {
      return res.status(400).json({ message: '과세대상 급여액을 입력해주세요.' });
    }
    
    // 부양가족 수 (기본값 1)
    const dependents = parseInt(dependentsCount) || 1;
    
    // 간이세액표에서 소득세 조회
    const incomeTax = await getTaxFromTable(basePay, dependents);
    
    // 지방소득세 (소득세의 10%)
    const localIncomeTax = Math.floor(incomeTax * 0.1);
    
    res.json({
      basePay,
      dependentsCount: dependents,
      incomeTax,
      localIncomeTax,
      totalTax: incomeTax + localIncomeTax
    });
  } catch (error) {
    console.error('세액 계산 오류:', error);
    res.status(500).json({ message: '세액 계산 중 오류가 발생했습니다.' });
  }
});

// 4대보험료 자동 계산
router.post('/calculate-insurance', authenticate, async (req, res) => {
  try {
    const { basePay, payrollMonth, taxType } = req.body;
    
    if (!basePay || basePay < 0) {
      return res.status(400).json({ message: '과세대상 급여액을 입력해주세요.' });
    }
    
    // 귀속월을 YYYYMM 형식으로 변환 (예: "2026-01" -> "202601")
    let targetYyyyMm = new Date().toISOString().slice(0, 7).replace('-', '');
    if (payrollMonth && /^\d{4}-\d{2}$/.test(payrollMonth)) {
      targetYyyyMm = payrollMonth.replace('-', '');
    }
    
    console.log(`📅 귀속월: ${payrollMonth || '현재'} -> ${targetYyyyMm}`);
    
    // rates_master에서 effective_yyyymm <= 귀속월 중 가장 최신 요율 조회
    let rates = await get(`
      SELECT * FROM rates_master 
      WHERE effective_yyyymm <= ?
      ORDER BY effective_yyyymm DESC
      LIMIT 1
    `, [targetYyyyMm]);
    
    if (!rates) {
      return res.status(404).json({ 
        message: `적용 가능한 요율을 찾을 수 없습니다. (귀속월: ${targetYyyyMm})` 
      });
    }
    
    console.log(`✅ 적용 요율: ${rates.effective_yyyymm}`);
    
    // 3.3% (프리랜서) 계산
    if (taxType === '3.3%') {
      const withholdingRate = parseFloat(rates.freelancer_withholding_rate_percent) / 100;
      const withholding = Math.floor(basePay * withholdingRate);
      const netPay = basePay - withholding;
      
      return res.json({
        basePay,
        appliedRateMonth: rates.effective_yyyymm,
        taxType: '3.3%',
        withholdingRate: parseFloat(rates.freelancer_withholding_rate_percent),
        withholding,
        netPay,
        // 프론트엔드 호환성을 위한 deductions 형식
        deductions: {
          freelancer_tax: withholding,
          nps: 0,
          nhis: 0,
          ltci: 0,
          ei: 0,
          income_tax: 0,
          local_tax: 0
        },
        totalDeductions: withholding
      });
    }
    
    // 4대보험 계산
    // 기준소득월액 (상한/하한 적용 - 추후 rates_master에 추가 가능)
    const pensionBase = basePay; // 현재는 상한/하한 미적용
    const healthBase = basePay;
    
    // 요율을 %에서 소수로 변환
    const npsRate = parseFloat(rates.nps_employee_rate_percent) / 100;
    const nhisRate = parseFloat(rates.nhis_employee_rate_percent) / 100;
    const ltciRate = parseFloat(rates.ltci_rate_of_nhis_percent) / 100;
    const eiRate = parseFloat(rates.ei_employee_rate_percent) / 100;
    
    // 4대보험료 계산 (근로자 부담분) - 원단위 절사
    const nationalPension = Math.floor(pensionBase * npsRate);
    const healthInsurance = Math.floor(healthBase * nhisRate);
    const longTermCare = Math.floor(healthInsurance * ltciRate);
    const employmentInsurance = Math.floor(basePay * eiRate);
    
    const totalInsurance = nationalPension + healthInsurance + longTermCare + employmentInsurance;
    
    // 사업주 부담금 계산 (rates_master에 사업주 요율이 있으면 사용, 없으면 근로자와 동일)
    const npsEmployerRate = rates.nps_employer_rate_percent ? parseFloat(rates.nps_employer_rate_percent) / 100 : npsRate;
    const nhisEmployerRate = rates.nhis_employer_rate_percent ? parseFloat(rates.nhis_employer_rate_percent) / 100 : nhisRate;
    const eiEmployerRate = rates.ei_employer_rate_percent ? parseFloat(rates.ei_employer_rate_percent) / 100 : eiRate;
    
    const employerNationalPension = Math.floor(pensionBase * npsEmployerRate);
    const employerHealthInsurance = Math.floor(healthBase * nhisEmployerRate);
    const employerLongTermCare = Math.floor(employerHealthInsurance * ltciRate);
    const employerEmploymentInsurance = Math.floor(basePay * eiEmployerRate);
    
    const totalEmployerBurden = employerNationalPension + employerHealthInsurance + employerLongTermCare + employerEmploymentInsurance;
    
    // 소득세 및 지방소득세 계산 (간이세액 기준)
    const incomeTax = Math.floor(basePay * 0.023); // 간이세액 예시 (실제로는 tax_table 사용 권장)
    const localTax = Math.floor(incomeTax * 0.1);
    
    const totalDeductions = totalInsurance + incomeTax + localTax;
    const netPay = basePay - totalDeductions;
    
    res.json({
      basePay,
      appliedRateMonth: rates.effective_yyyymm,
      taxType: '4대보험',
      rates: {
        nationalPension: parseFloat(rates.nps_employee_rate_percent),
        healthInsurance: parseFloat(rates.nhis_employee_rate_percent),
        longTermCare: parseFloat(rates.ltci_rate_of_nhis_percent),
        employmentInsurance: parseFloat(rates.ei_employee_rate_percent)
      },
      // 프론트엔드 호환성을 위한 deductions 형식
      deductions: {
        nps: nationalPension,
        nhis: healthInsurance,
        ltci: longTermCare,
        ei: employmentInsurance,
        income_tax: incomeTax,
        local_tax: localTax
      },
      totalDeductions,
      netPay,
      // 기존 형식도 유지 (호환성)
      insurance: {
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        total: totalInsurance
      },
      employerBurden: {
        nationalPension: employerNationalPension,
        healthInsurance: employerHealthInsurance,
        longTermCare: employerLongTermCare,
        employmentInsurance: employerEmploymentInsurance,
        total: totalEmployerBurden
      }
    });
  } catch (error) {
    console.error('4대보험료 계산 오류:', error);
    res.status(500).json({ message: '4대보험료 계산 중 오류가 발생했습니다.', error: error.message });
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
      dependentsCount,
      nationalPension,
      healthInsurance,
      employmentInsurance,
      longTermCare,
      incomeTax,
      localIncomeTax,
      employerNationalPension,
      employerHealthInsurance,
      employerEmploymentInsurance,
      employerLongTermCare
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

    // 사업주 총 부담금 계산
    const totalEmployerBurden = 
      (parseFloat(employerNationalPension) || 0) +
      (parseFloat(employerHealthInsurance) || 0) +
      (parseFloat(employerEmploymentInsurance) || 0) +
      (parseFloat(employerLongTermCare) || 0);

    // 급여명세서 저장
    const result = await run(
      `INSERT INTO salary_slips (
        workplace_id, user_id, payroll_month, pay_date, tax_type,
        base_pay, dependents_count, national_pension, health_insurance, employment_insurance,
        long_term_care, income_tax, local_income_tax, total_deductions, net_pay,
        employer_national_pension, employer_health_insurance, employer_employment_insurance,
        employer_long_term_care, total_employer_burden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workplaceId, userId, payrollMonth, payDate, taxType || '4대보험',
        basePay, dependentsCount || 1, nationalPension || 0, healthInsurance || 0, employmentInsurance || 0,
        longTermCare || 0, incomeTax || 0, localIncomeTax || 0, totalDeductions, netPay,
        employerNationalPension || 0, employerHealthInsurance || 0, employerEmploymentInsurance || 0,
        employerLongTermCare || 0, totalEmployerBurden
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
      dependentsCount,
      nationalPension,
      healthInsurance,
      employmentInsurance,
      longTermCare,
      incomeTax,
      localIncomeTax,
      employerNationalPension,
      employerHealthInsurance,
      employerEmploymentInsurance,
      employerLongTermCare
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

    // 사업주 총 부담금 계산
    const totalEmployerBurden = 
      (parseFloat(employerNationalPension) || 0) +
      (parseFloat(employerHealthInsurance) || 0) +
      (parseFloat(employerEmploymentInsurance) || 0) +
      (parseFloat(employerLongTermCare) || 0);

    // 급여명세서 수정
    await run(
      `UPDATE salary_slips SET
        payroll_month = ?, pay_date = ?, tax_type = ?,
        base_pay = ?, dependents_count = ?, national_pension = ?, health_insurance = ?, employment_insurance = ?,
        long_term_care = ?, income_tax = ?, local_income_tax = ?, 
        total_deductions = ?, net_pay = ?,
        employer_national_pension = ?, employer_health_insurance = ?, employer_employment_insurance = ?,
        employer_long_term_care = ?, total_employer_burden = ?
      WHERE id = ?`,
      [
        payrollMonth, payDate, taxType || '4대보험',
        basePay, dependentsCount || 1, nationalPension || 0, healthInsurance || 0, employmentInsurance || 0,
        longTermCare || 0, incomeTax || 0, localIncomeTax || 0,
        totalDeductions, netPay,
        employerNationalPension || 0, employerHealthInsurance || 0, employerEmploymentInsurance || 0,
        employerLongTermCare || 0, totalEmployerBurden, id
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

// 사업주: 월별 급여대장 전체보기
router.get('/payroll-ledger/:workplaceId/:payrollMonth', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { workplaceId, payrollMonth } = req.params;

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 해당 월의 모든 급여명세서 조회 (확정된 급여 포함, 퇴사자 필터링)
    const slips = await query(
      `SELECT 
        ss.*,
        u.name as employee_name,
        u.username as employee_username,
        ed.resignation_date,
        'slip' as source
      FROM salary_slips ss
      JOIN users u ON ss.user_id = u.id
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      WHERE ss.workplace_id = ? AND ss.payroll_month = ?
      AND (
        ed.resignation_date IS NULL 
        OR ed.resignation_date >= (ss.payroll_month || '-01')::date
      )
      
      UNION ALL
      
      SELECT 
        pf.id,
        pf.workplace_id,
        pf.payroll_month,
        pf.employee_id as user_id,
        NULL as pay_date,
        pf.tax_type,
        pf.base_pay,
        1 as dependents_count,
        CAST((pf.deductions_json::json->>'nps') AS NUMERIC) as national_pension,
        CAST((pf.deductions_json::json->>'nhis') AS NUMERIC) as health_insurance,
        CAST((pf.deductions_json::json->>'ei') AS NUMERIC) as employment_insurance,
        CAST((pf.deductions_json::json->>'ltci') AS NUMERIC) as long_term_care,
        CAST((pf.deductions_json::json->>'income_tax') AS NUMERIC) as income_tax,
        CAST((pf.deductions_json::json->>'local_tax') AS NUMERIC) as local_tax,
        CAST((pf.totals_json::json->>'totalDeductions') AS NUMERIC) as total_deductions,
        CAST((pf.totals_json::json->>'netPay') AS NUMERIC) as net_pay,
        NULL as bonus,
        NULL as deductions,
        NULL as notes,
        NULL as published,
        pf.created_at,
        u.name as employee_name,
        u.username as employee_username,
        ed.resignation_date,
        'finalized' as source
      FROM payroll_finalized pf
      JOIN users u ON pf.employee_id = u.id
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      WHERE pf.workplace_id = ? AND pf.payroll_month = ?
      AND (
        ed.resignation_date IS NULL 
        OR ed.resignation_date >= (pf.payroll_month || '-01')::date
      )
      AND NOT EXISTS (
        SELECT 1 FROM salary_slips ss2 
        WHERE ss2.workplace_id = pf.workplace_id 
        AND ss2.payroll_month = pf.payroll_month 
        AND ss2.user_id = pf.employee_id
      )
      
      ORDER BY employee_name`,
      [workplaceId, payrollMonth, workplaceId, payrollMonth]
    );

    // 합계 계산
    const totals = {
      basePay: 0,
      nationalPension: 0,
      healthInsurance: 0,
      employmentInsurance: 0,
      longTermCare: 0,
      incomeTax: 0,
      localIncomeTax: 0,
      totalDeductions: 0,
      netPay: 0,
      employerNationalPension: 0,
      employerHealthInsurance: 0,
      employerEmploymentInsurance: 0,
      employerLongTermCare: 0,
      totalEmployerBurden: 0
    };

    slips.forEach(slip => {
      totals.basePay += parseFloat(slip.base_pay) || 0;
      totals.nationalPension += parseFloat(slip.national_pension) || 0;
      totals.healthInsurance += parseFloat(slip.health_insurance) || 0;
      totals.employmentInsurance += parseFloat(slip.employment_insurance) || 0;
      totals.longTermCare += parseFloat(slip.long_term_care) || 0;
      totals.incomeTax += parseFloat(slip.income_tax) || 0;
      totals.localIncomeTax += parseFloat(slip.local_income_tax) || 0;
      totals.totalDeductions += parseFloat(slip.total_deductions) || 0;
      totals.netPay += parseFloat(slip.net_pay) || 0;
      totals.employerNationalPension += parseFloat(slip.employer_national_pension) || 0;
      totals.employerHealthInsurance += parseFloat(slip.employer_health_insurance) || 0;
      totals.employerEmploymentInsurance += parseFloat(slip.employer_employment_insurance) || 0;
      totals.employerLongTermCare += parseFloat(slip.employer_long_term_care) || 0;
      totals.totalEmployerBurden += parseFloat(slip.total_employer_burden) || 0;
    });

    res.json({ slips, totals });
  } catch (error) {
    console.error('급여대장 조회 오류:', error);
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

// 사업주: 특정 직원의 입사일부터 현재까지 급여명세서 일괄 생성
router.post('/slips/generate-history/:userId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { userId } = req.params;

    // 직원 정보 조회
    const employee = await get(
      `SELECT u.*, ed.hire_date, si.salary_type, si.amount, si.tax_type, si.weekly_holiday_type
       FROM users u
       LEFT JOIN employee_details ed ON u.id = ed.user_id
       LEFT JOIN salary_info si ON u.id = si.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    // 사업장 권한 확인
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [employee.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (!employee.hire_date) {
      return res.status(400).json({ message: '입사일 정보가 없습니다.' });
    }

    if (!employee.salary_type) {
      return res.status(400).json({ message: '급여 정보가 없습니다.' });
    }

    // 입사일부터 현재까지 월 목록 생성
    const hireDate = new Date(employee.hire_date);
    const currentDate = new Date();
    
    let year = hireDate.getFullYear();
    let month = hireDate.getMonth() + 1;
    
    let created = 0;
    let skipped = 0;

    while (year < currentDate.getFullYear() || (year === currentDate.getFullYear() && month <= currentDate.getMonth() + 1)) {
      const payrollMonth = `${year}-${String(month).padStart(2, '0')}`;
      
      // 이미 해당 월 급여명세서가 있는지 확인
      const existing = await get(
        'SELECT id FROM salary_slips WHERE user_id = ? AND payroll_month = ?',
        [userId, payrollMonth]
      );

      if (existing) {
        skipped++;
      } else {
        // 해당 월의 시작일과 종료일
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        // 출근 기록 조회
        const attendanceRecords = await query(
          "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
          [userId, startDate, endDate]
        );

        let basePay = 0;
        let totalWorkHours = 0;

        if (employee.salary_type === 'hourly') {
          totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
          basePay = totalWorkHours * employee.amount;

          // 주휴수당 계산
          const weeklyHolidayType = employee.weekly_holiday_type || 'included';
          if (weeklyHolidayType === 'separate' && totalWorkHours >= 15) {
            const days = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
            const weeks = Math.ceil(days / 7);
            const avgWeeklyHours = totalWorkHours / (weeks || 1);
            const weeklyHolidayHours = Math.min(avgWeeklyHours / 5, 8);
            basePay += weeklyHolidayHours * weeks * employee.amount;
          }
        } else if (employee.salary_type === 'monthly') {
          basePay = employee.amount;
        } else if (employee.salary_type === 'annual') {
          basePay = employee.amount / 12;
        }

        basePay = Math.round(basePay);

        // 세금 타입 결정
        const taxType = employee.tax_type || '4대보험';
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
          [employee.workplace_id, userId, payrollMonth, null, taxType, basePay, totalDeductions, netPay, false]
        );

        created++;
      }

      // 다음 월로
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    res.json({
      message: '과거 급여명세서가 생성되었습니다.',
      created,
      skipped,
      employee: {
        name: employee.name,
        hireDate: employee.hire_date
      }
    });
  } catch (error) {
    console.error('과거 급여명세서 일괄 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 급여 확정 (스냅샷 저장)
router.post('/finalize', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    const { workplaceId, payrollMonth, employees } = req.body;
    
    if (!workplaceId || !payrollMonth || !employees || employees.length === 0) {
      return res.status(400).json({ message: '필수 데이터가 누락되었습니다.' });
    }
    
    // 귀속월을 YYYYMM 형식으로 변환
    const targetYyyyMm = payrollMonth.replace('-', '');
    
    // 해당 귀속월에 적용된 요율 조회
    const rates = await get(`
      SELECT * FROM rates_master 
      WHERE effective_yyyymm <= ?
      ORDER BY effective_yyyymm DESC
      LIMIT 1
    `, [targetYyyyMm]);
    
    if (!rates) {
      return res.status(404).json({ message: '적용 가능한 요율을 찾을 수 없습니다.' });
    }
    
    // 모든 직원의 급여 확정 스냅샷 저장
    try {
      for (const emp of employees) {
        // 기존 확정 데이터가 있으면 삭제 (재확정)
        await run(`
          DELETE FROM payroll_finalized 
          WHERE workplace_id = ? AND payroll_month = ? AND employee_id = ?
        `, [workplaceId, payrollMonth, emp.employeeId]);
        
        // 스냅샷 저장
        await run(`
          INSERT INTO payroll_finalized (
            workplace_id, payroll_month, employee_id,
            applied_effective_yyyymm, applied_rates_json,
            base_pay, deductions_json, totals_json,
            tax_type, finalized_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          workplaceId,
          payrollMonth,
          emp.employeeId,
          rates.effective_yyyymm,
          JSON.stringify({
            nps_employee_rate_percent: rates.nps_employee_rate_percent,
            nhis_employee_rate_percent: rates.nhis_employee_rate_percent,
            ltci_rate_of_nhis_percent: rates.ltci_rate_of_nhis_percent,
            ei_employee_rate_percent: rates.ei_employee_rate_percent,
            freelancer_withholding_rate_percent: rates.freelancer_withholding_rate_percent
          }),
          emp.basePay || 0,
          JSON.stringify(emp.deductions || {}),
          JSON.stringify({
            totalPay: emp.totalPay || emp.basePay || 0,
            totalDeductions: emp.totalDeductions || 0,
            netPay: emp.netPay || emp.basePay || 0
          }),
          emp.taxType || '4대보험',
          req.user.id
        ]);
      }
      
      res.json({ 
        message: '급여가 확정되었습니다.', 
        appliedRateMonth: rates.effective_yyyymm,
        finalizedCount: employees.length
      });
    } catch (innerError) {
      console.error('급여 확정 저장 오류:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('급여 확정 오류:', error);
    res.status(500).json({ message: '급여 확정 중 오류가 발생했습니다.', error: error.message });
  }
});

export default router;
