import express from 'express';
import { query, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requirePremium } from '../middleware/planCheck.js';
import { logAudit } from '../utils/auditLog.js';
import {
  getTaxFromTable,
  calculateEmployeeSalary,
  calculateSeverance,
} from '../services/salaryCalculationService.js';
import {
  getMySlips,
  getWorkplaceSlips,
  getEmployeeSlips,
  createSlip,
  updateSlip,
  deleteSlip,
  publishSlip,
  getPayrollLedger,
  getSlipPdf,
  sendSlipEmail,
  sendBulkSlipEmails,
  generateMonthlySlips,
  generateHistorySlips,
  finalizePayroll,
  importLedger,
  calculateInsurance,
} from '../services/payslipService.js';

const router = express.Router();

// 급여 계산
router.get('/calculate/:employeeId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.params.employeeId;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '시작일과 종료일을 입력해주세요.' });
    }
    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }
    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }
    const result = await calculateEmployeeSalary({ employeeId, startDate, endDate });
    if (!result) {
      return res.status(404).json({ success: false, message: '급여 정보가 등록되지 않았습니다.' });
    }

    const employeeInfo = await get('SELECT name, username FROM users WHERE id = ?', [employeeId]);
    res.json({
      success: true,
      employee: employeeInfo,
      salaryInfo: {
        type: result.salaryInfo.salary_type,
        baseAmount: result.salaryInfo.amount,
        weeklyHolidayPay: result.salaryInfo.weekly_holiday_pay,
        taxType: result.salaryInfo.tax_type
      },
      period: { startDate, endDate },
      workData: {
        totalWorkDays: result.totalWorkDays,
        totalWorkHours: result.totalWorkHours.toFixed(2)
      },
      calculatedSalary: result.calculatedSalary,
      pastPayrollAmount: result.pastPayrollAmount,
      totalPay: result.calculatedSalary,
      absence: {
        absentDays: result.absentDays,
        deduction: result.absenceDeduction
      }
    });
  } catch (error) {
    console.error('급여 계산 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업장 전체 급여 계산
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workplaceId = req.params.workplaceId;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '시작일과 종료일을 입력해주세요.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }

    const employees = await query(
      "SELECT id, name, username FROM users WHERE workplace_id = ? AND role = 'employee'",
      [workplaceId]
    );

    const salaryResults = [];
    let totalSalary = 0;

    for (const emp of employees) {
      const result = await calculateEmployeeSalary({ employeeId: emp.id, startDate, endDate });
      if (!result) continue;

      totalSalary += result.totalPay;

      salaryResults.push({
        employeeId: emp.id,
        employeeName: emp.name,
        username: emp.username,
        salaryType: result.salaryInfo.salary_type,
        baseAmount: result.salaryInfo.amount,
        taxType: result.salaryInfo.tax_type,
        totalWorkDays: result.totalWorkDays,
        totalWorkHours: result.totalWorkHours.toFixed(2),
        calculatedSalary: result.calculatedSalary,
        baseSalary: result.calculatedSalary,
        weeklyHolidayPay: result.salaryInfo.weekly_holiday_pay || 0,
        weeklyHolidayPayAmount: result.weeklyHolidayPayAmount,
        pastPayrollAmount: Math.round(result.pastPayrollAmount),
        baseSalaryAmount: result.baseSalaryAmount,
        severancePay: result.severancePay,
        totalPay: result.totalPay,
        payScheduleType: result.employeeDetails?.pay_schedule_type || 'monthly',
        payDay: result.employeeDetails?.pay_day,
        payAfterDays: result.employeeDetails?.pay_after_days,
        absence: {
          absentDays: result.absentDays,
          deduction: result.absenceDeduction
        }
      });
    }

    res.json({
      success: true,
      workplaceId,
      period: { startDate, endDate },
      employees: salaryResults,
      totalSalary
    });
  } catch (error) {
    console.error('사업장 급여 계산 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 퇴직금 계산
router.get('/severance/:employeeId', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const result = await calculateSeverance(employeeId);

    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [result.employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }

    if (result.error === 'no_hire_date') {
      return res.status(400).json({ success: false, message: '입사일 정보가 없습니다.' });
    }
    if (result.error === 'no_salary') {
      return res.status(404).json({ success: false, message: '급여 정보가 등록되지 않았습니다.' });
    }

    if (!result.eligible) {
      return res.json({
        success: true, eligible: false,
        yearsWorked: result.yearsWorked,
        message: '1년 이상 근무해야 퇴직금이 발생합니다.'
      });
    }

    res.json({
      success: true, eligible: true,
      employeeName: result.employee.name,
      hireDate: result.employee.hire_date,
      yearsWorked: result.yearsWorked,
      daysWorked: result.daysWorked,
      averageDailyWage: result.averageDailyWage,
      severancePay: result.severancePay,
      salaryType: result.salaryType
    });
  } catch (error) {
    console.error('퇴직금 계산 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 급여대장(PDF/엑셀 텍스트) 가져오기
router.post('/ledger/import', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { workplaceId, text } = req.body;
    if (!workplaceId || !text) {
      return res.status(400).json({ success: false, message: '사업장과 급여대장 텍스트를 입력해주세요.' });
    }
    const workplace = await get('SELECT id, owner_id FROM workplaces WHERE id = ?', [workplaceId]);
    if (!workplace || workplace.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const result = await importLedger(workplaceId, text);
    if (!result) {
      return res.status(400).json({ success: false, message: '급여대장 내용을 인식하지 못했습니다. 텍스트를 확인해주세요.' });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('급여대장 가져오기 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 급여명세서 조회
router.get('/slips/my', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const slips = await getMySlips(req.user.id, req.query.month);
    res.json({ success: true, data: slips });
  } catch (error) {
    console.error('급여명세서 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 사업장의 모든 급여명세서 조회
router.get('/slips/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const { workplaceId } = req.params;
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const slips = await getWorkplaceSlips(workplaceId, req.query.month);
    res.json({ success: true, data: slips });
  } catch (error) {
    console.error('사업장 급여명세서 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 특정 직원의 급여명세서 조회
router.get('/slips/employee/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [userId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [employee.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const slips = await getEmployeeSlips(userId, req.query.month);
    res.json({ success: true, data: slips });
  } catch (error) {
    console.error('급여명세서 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 세액 자동 계산
router.post('/calculate-tax', authenticate, async (req, res) => {
  try {
    const { basePay, dependentsCount } = req.body;
    if (basePay === undefined || basePay === null || basePay < 0) {
      return res.status(400).json({ success: false, message: '과세대상 급여액을 입력해주세요.' });
    }
    const dependents = parseInt(dependentsCount) || 1;
    const incomeTax = await getTaxFromTable(get, basePay, dependents);
    const localIncomeTax = Math.floor(incomeTax * 0.1);

    res.json({
      success: true, basePay, dependentsCount: dependents,
      incomeTax, localIncomeTax, totalTax: incomeTax + localIncomeTax
    });
  } catch (error) {
    console.error('세액 계산 오류:', error);
    res.status(500).json({ success: false, message: '세액 계산 중 오류가 발생했습니다.' });
  }
});

// 4대보험료 자동 계산
/**
 * @swagger
 * /api/salary/calculate-insurance:
 *   post:
 *     summary: 4대보험료 계산
 *     description: 과세대상 급여액을 기반으로 4대보험료를 계산합니다.
 *     tags: [Salary]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - basePay
 *             properties:
 *               basePay:
 *                 type: number
 *                 description: 과세대상 급여액
 *                 example: 3000000
 *               payrollMonth:
 *                 type: string
 *                 description: 귀속 월 (YYYY-MM)
 *                 example: "2026-03"
 *               taxType:
 *                 type: string
 *                 description: 과세 유형
 *     responses:
 *       200:
 *         description: 4대보험료 계산 결과
 *       400:
 *         description: 잘못된 입력
 *       404:
 *         description: 적용 가능한 요율 없음
 */
router.post('/calculate-insurance', authenticate, async (req, res) => {
  try {
    const { basePay, payrollMonth, taxType } = req.body;
    if (basePay === undefined || basePay === null || basePay < 0) {
      return res.status(400).json({ success: false, message: '과세대상 급여액을 입력해주세요.' });
    }
    const result = await calculateInsurance(basePay, payrollMonth, taxType);
    if (result.error === 'no_rates') {
      return res.status(404).json({ success: false, message: `적용 가능한 요율을 찾을 수 없습니다. (귀속월: ${result.targetYyyyMm})` });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('4대보험료 계산 오류:', error);
    res.status(500).json({ success: false, message: '4대보험료 계산 중 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 작성
router.post('/slips', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { workplaceId, userId } = req.body;
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const employee = await get('SELECT * FROM users WHERE id = ? AND workplace_id = ?', [userId, workplaceId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }
    const slipId = await createSlip(req.body);
    res.json({ success: true, message: '급여명세서가 저장되었습니다.', slipId });
  } catch (error) {
    console.error('급여명세서 저장 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 수정
router.put('/slips/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const slip = await get('SELECT * FROM salary_slips WHERE id = ?', [req.params.id]);
    if (!slip) {
      return res.status(404).json({ success: false, message: '급여명세서를 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [slip.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    await updateSlip(req.params.id, req.body);
    res.json({ success: true, message: '급여명세서가 수정되었습니다.' });
  } catch (error) {
    console.error('급여명세서 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 삭제
router.delete('/slips/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const slip = await get('SELECT * FROM salary_slips WHERE id = ?', [req.params.id]);
    if (!slip) {
      return res.status(404).json({ success: false, message: '급여명세서를 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [slip.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    await deleteSlip(req.params.id);
    res.json({ success: true, message: '급여명세서가 삭제되었습니다.' });
  } catch (error) {
    console.error('급여명세서 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 월별 급여대장 전체보기
router.get('/payroll-ledger/:workplaceId/:payrollMonth', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { workplaceId, payrollMonth } = req.params;
    if (!payrollMonth || !/^\d{4}-\d{2}$/.test(payrollMonth)) {
      return res.status(400).json({ success: false, message: '급여 월 형식이 올바르지 않습니다. (예: 2026-01)' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { slips, totals } = await getPayrollLedger(workplaceId, payrollMonth);
    res.json({ success: true, slips, totals });
  } catch (error) {
    console.error('급여대장 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 급여명세서 배포
router.put('/slips/:id/publish', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const slip = await get('SELECT * FROM salary_slips WHERE id = ?', [req.params.id]);
    if (!slip) {
      return res.status(404).json({ success: false, message: '급여명세서를 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [slip.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    await publishSlip(req.params.id, slip);
    res.json({ success: true, message: '급여명세서가 배포되었습니다.' });
  } catch (error) {
    console.error('급여명세서 배포 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 급여명세서 PDF 다운로드
router.get('/slip/:slipId/pdf', authenticate, async (req, res) => {
  try {
    const result = await getSlipPdf(req.params.slipId);
    if (!result) {
      return res.status(404).json({ success: false, message: '급여명세서를 찾을 수 없습니다.' });
    }
    if (req.user.role === 'employee' && result.slip.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${result.slip.payroll_month}_${result.slip.employee_name}.pdf`);
    res.send(result.pdfBuffer);
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({ success: false, message: 'PDF 생성에 실패했습니다.' });
  }
});

// 급여명세서 이메일 발송 (개별)
router.post('/slip/:slipId/email', authenticate, requirePremium('email'), async (req, res) => {
  try {
    if (!['owner', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const result = await sendSlipEmail(req.params.slipId);
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, message: '급여명세서를 찾을 수 없습니다.' });
    }
    if (result.error === 'no_email') {
      return res.status(400).json({ success: false, message: '직원 이메일이 등록되지 않았습니다.' });
    }
    res.json({ success: true, message: `${result.slip.employee_name}님에게 이메일이 발송되었습니다.` });
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({ success: false, message: error.message || '이메일 발송에 실패했습니다.' });
  }
});

// 급여명세서 일괄 이메일 발송
router.post('/slips/bulk-email', authenticate, requirePremium('email'), async (req, res) => {
  try {
    if (!['owner', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { workplace_id, payroll_month } = req.body;
    if (!workplace_id || !payroll_month) {
      return res.status(400).json({ success: false, message: '사업장과 급여월을 입력해주세요.' });
    }
    const results = await sendBulkSlipEmails(workplace_id, payroll_month);
    if (!results) {
      return res.status(404).json({ success: false, message: '발송할 급여명세서가 없습니다.' });
    }
    res.json({ success: true, message: `${results.sent}명 발송 완료, ${results.failed}명 실패`, data: results });
  } catch (error) {
    console.error('일괄 이메일 발송 오류:', error);
    res.status(500).json({ success: false, message: '이메일 발송에 실패했습니다.' });
  }
});

// 사업주: 월별 급여명세서 자동 생성
router.post('/slips/generate/:workplaceId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { workplaceId } = req.params;
    const { payrollMonth, payDate } = req.body;
    if (!payrollMonth) {
      return res.status(400).json({ success: false, message: '귀속월을 입력해주세요.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { created, skipped } = await generateMonthlySlips(workplaceId, payrollMonth, payDate);
    logAudit(req, { action: 'CREATE', entityType: 'salary_slip', details: { month: payrollMonth, employeeCount: created } });
    res.json({ success: true, message: '급여명세서가 생성되었습니다.', created, skipped });
  } catch (error) {
    console.error('급여명세서 자동 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 특정 직원의 입사일부터 현재까지 급여명세서 일괄 생성
router.post('/slips/generate-history/:userId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { userId } = req.params;

    const employee = await get(
      `SELECT u.*, ed.hire_date, si.salary_type, si.amount, si.tax_type, si.weekly_holiday_type
       FROM users u
       LEFT JOIN employee_details ed ON u.id = ed.user_id
       LEFT JOIN salary_info si ON u.id = si.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT * FROM workplaces WHERE id = ? AND owner_id = ?', [employee.workplace_id, req.user.id]);
    if (!workplace) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    if (!employee.hire_date) {
      return res.status(400).json({ success: false, message: '입사일 정보가 없습니다.' });
    }
    if (!employee.salary_type) {
      return res.status(400).json({ success: false, message: '급여 정보가 없습니다.' });
    }

    const { created, skipped } = await generateHistorySlips(userId, employee);

    res.json({
      success: true, message: '과거 급여명세서가 생성되었습니다.',
      created, skipped,
      employee: { name: employee.name, hireDate: employee.hire_date }
    });
  } catch (error) {
    console.error('과거 급여명세서 일괄 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 급여 확정 (스냅샷 저장)
router.post('/finalize', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const { workplaceId, payrollMonth, employees } = req.body;
    if (!workplaceId || !payrollMonth || !employees || employees.length === 0) {
      return res.status(400).json({ success: false, message: '필수 데이터가 누락되었습니다.' });
    }

    const result = await finalizePayroll({ workplaceId, payrollMonth, employees, userId: req.user.id });
    if (!result) {
      return res.status(404).json({ success: false, message: '적용 가능한 요율을 찾을 수 없습니다.' });
    }

    logAudit(req, { action: 'FINALIZE', entityType: 'salary', details: { month: payrollMonth } });

    res.json({
      success: true, message: '급여가 확정되었습니다.',
      appliedRateMonth: result.appliedRateMonth,
      finalizedCount: employees.length
    });
  } catch (error) {
    console.error('급여 확정 오류:', error);
    res.status(500).json({ success: false, message: '급여 확정 중 오류가 발생했습니다.' });
  }
});

export default router;
