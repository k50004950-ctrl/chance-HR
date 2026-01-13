import express from 'express';
import { query, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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

    let calculatedSalary = 0;
    let totalWorkHours = 0;
    let totalWorkDays = attendanceRecords.length;

    // 시급 계산
    if (salaryInfo.salary_type === 'hourly') {
      totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
      calculatedSalary = totalWorkHours * salaryInfo.amount;

      // 주휴수당 계산 (주 15시간 이상 근무 시)
      if (salaryInfo.weekly_holiday_pay && totalWorkHours >= 15) {
        const weeks = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7));
        const weeklyHolidayPay = (totalWorkHours / (weeks || 1)) * salaryInfo.amount * 0.2; // 주당 근무시간의 20%
        calculatedSalary += weeklyHolidayPay;
      }
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

    res.json({
      employee: employeeInfo,
      salaryInfo: {
        type: salaryInfo.salary_type,
        baseAmount: salaryInfo.amount,
        weeklyHolidayPay: salaryInfo.weekly_holiday_pay
      },
      period: {
        startDate,
        endDate
      },
      workData: {
        totalWorkDays,
        totalWorkHours: totalWorkHours.toFixed(2)
      },
      calculatedSalary: Math.round(calculatedSalary)
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

      let calculatedSalary = 0;
      let totalWorkHours = 0;

      if (salaryInfo.salary_type === 'hourly') {
        totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.work_hours) || 0), 0);
        calculatedSalary = totalWorkHours * salaryInfo.amount;

        if (salaryInfo.weekly_holiday_pay && totalWorkHours >= 15) {
          const weeks = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7));
          const weeklyHolidayPay = (totalWorkHours / (weeks || 1)) * salaryInfo.amount * 0.2;
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

      const roundedSalary = Math.round(calculatedSalary);
      totalSalary += roundedSalary;

      // 주휴수당 계산
      let weeklyHolidayPayAmount = 0;
      let baseSalaryAmount = 0;
      
      if (salaryInfo.salary_type === 'hourly') {
        baseSalaryAmount = totalWorkHours * salaryInfo.amount;
        if (salaryInfo.weekly_holiday_pay && totalWorkHours >= 15) {
          const weeks = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7));
          weeklyHolidayPayAmount = (totalWorkHours / (weeks || 1)) * salaryInfo.amount * 0.2;
        }
      } else {
        baseSalaryAmount = roundedSalary;
      }

      salaryResults.push({
        employeeId: employee.id,
        employeeName: employee.name,
        username: employee.username,
        salaryType: salaryInfo.salary_type,
        baseAmount: salaryInfo.amount,
        totalWorkDays: attendanceRecords.length,
        totalWorkHours: totalWorkHours.toFixed(2),
        calculatedSalary: roundedSalary,
        weeklyHolidayPay: salaryInfo.weekly_holiday_pay || 0,
        weeklyHolidayPayAmount: Math.round(weeklyHolidayPayAmount),
        baseSalaryAmount: Math.round(baseSalaryAmount)
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

export default router;
