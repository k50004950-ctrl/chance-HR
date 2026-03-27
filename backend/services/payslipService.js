import { query, get, run } from '../config/database.js';
import { generatePayslipPDF } from '../utils/pdfGenerator.js';
import { sendPayslipEmail, sendBulkPayslipEmails } from '../utils/emailSender.js';
import { sendPushToUser } from '../services/webPush.js';
import { logAudit } from '../utils/auditLog.js';
import { calculateMonthlyBasePay, parsePayrollLedger, parseNumber } from './salaryCalculationService.js';

// ── Slip queries ──────────────────────────────────────────────

const SLIP_DETAIL_SQL = `
  SELECT ss.*, u.name as employee_name,
         ed.position, ed.department,
         w.name as workplace_name, w.address as workplace_address,
         owner.name as owner_name, owner.business_number
  FROM salary_slips ss
  JOIN users u ON ss.user_id = u.id
  LEFT JOIN employee_details ed ON u.id = ed.user_id
  LEFT JOIN workplaces w ON ss.workplace_id = w.id
  LEFT JOIN users owner ON w.owner_id = owner.id
  WHERE ss.id = ?`;

const SLIP_EMAIL_SQL = `
  SELECT ss.*, u.name as employee_name, u.email,
         ed.position, ed.department,
         w.name as workplace_name,
         owner.name as owner_name, owner.business_number
  FROM salary_slips ss
  JOIN users u ON ss.user_id = u.id
  LEFT JOIN employee_details ed ON u.id = ed.user_id
  LEFT JOIN workplaces w ON ss.workplace_id = w.id
  LEFT JOIN users owner ON w.owner_id = owner.id
  WHERE ss.id = ?`;

// ── CRUD ──────────────────────────────────────────────────────

export const getMySlips = async (userId, month) => {
  const params = [userId, true, 1];
  let sql = 'SELECT * FROM salary_slips WHERE user_id = ? AND (published = ? OR published = ?)';
  if (month) {
    sql += ' AND payroll_month = ?';
    params.push(month);
  }
  sql += ' ORDER BY payroll_month DESC, pay_date DESC';
  return query(sql, params);
};

export const getWorkplaceSlips = async (workplaceId, month) => {
  const params = [workplaceId];
  let sql = 'SELECT * FROM salary_slips WHERE workplace_id = ?';
  if (month) {
    sql += ' AND payroll_month = ?';
    params.push(month);
  }
  sql += ' ORDER BY payroll_month DESC, pay_date DESC';
  return query(sql, params);
};

export const getEmployeeSlips = async (userId, month) => {
  const params = [userId];
  let sql = 'SELECT * FROM salary_slips WHERE user_id = ?';
  if (month) {
    sql += ' AND payroll_month = ?';
    params.push(month);
  }
  sql += ' ORDER BY payroll_month DESC, pay_date DESC';
  return query(sql, params);
};

export const createSlip = async (data) => {
  const {
    workplaceId, userId, payrollMonth, payDate, taxType,
    basePay, dependentsCount,
    nationalPension, healthInsurance, employmentInsurance, longTermCare,
    incomeTax, localIncomeTax,
    employerNationalPension, employerHealthInsurance, employerEmploymentInsurance, employerLongTermCare
  } = data;

  let totalDeductions = 0;
  let netPay = parseFloat(basePay) || 0;

  if (taxType === '3.3%') {
    totalDeductions = Math.round(netPay * 0.033);
    netPay = netPay - totalDeductions;
  } else {
    totalDeductions =
      (parseFloat(nationalPension) || 0) +
      (parseFloat(healthInsurance) || 0) +
      (parseFloat(employmentInsurance) || 0) +
      (parseFloat(longTermCare) || 0) +
      (parseFloat(incomeTax) || 0) +
      (parseFloat(localIncomeTax) || 0);
    netPay = netPay - totalDeductions;
  }

  const totalEmployerBurden =
    (parseFloat(employerNationalPension) || 0) +
    (parseFloat(employerHealthInsurance) || 0) +
    (parseFloat(employerEmploymentInsurance) || 0) +
    (parseFloat(employerLongTermCare) || 0);

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

  return result.lastID || result.insertId;
};

export const updateSlip = async (id, data) => {
  const {
    payrollMonth, payDate, taxType, basePay, dependentsCount,
    nationalPension, healthInsurance, employmentInsurance, longTermCare,
    incomeTax, localIncomeTax,
    employerNationalPension, employerHealthInsurance, employerEmploymentInsurance, employerLongTermCare
  } = data;

  let totalDeductions = 0;
  let netPay = parseFloat(basePay) || 0;

  if (taxType === '3.3%') {
    totalDeductions = Math.round(netPay * 0.033);
    netPay = netPay - totalDeductions;
  } else {
    totalDeductions =
      (parseFloat(nationalPension) || 0) +
      (parseFloat(healthInsurance) || 0) +
      (parseFloat(employmentInsurance) || 0) +
      (parseFloat(longTermCare) || 0) +
      (parseFloat(incomeTax) || 0) +
      (parseFloat(localIncomeTax) || 0);
    netPay = netPay - totalDeductions;
  }

  const totalEmployerBurden =
    (parseFloat(employerNationalPension) || 0) +
    (parseFloat(employerHealthInsurance) || 0) +
    (parseFloat(employerEmploymentInsurance) || 0) +
    (parseFloat(employerLongTermCare) || 0);

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
};

export const deleteSlip = async (id) => {
  await run('DELETE FROM salary_slips WHERE id = ?', [id]);
};

export const publishSlip = async (id, slip) => {
  await run('UPDATE salary_slips SET published = ? WHERE id = ?', [true, id]);
  sendPushToUser(slip.user_id, {
    title: '급여명세서 안내',
    body: `${slip.payroll_month} 급여명세서가 등록되었습니다.`,
    url: '/#/employee'
  }).catch(() => {});
};

// ── Payroll ledger ────────────────────────────────────────────

export const getPayrollLedger = async (workplaceId, payrollMonth) => {
  const slips = await query(
    `SELECT
      ss.*,
      u.name as employee_name,
      u.username as employee_username
    FROM salary_slips ss
    JOIN users u ON ss.user_id = u.id
    WHERE ss.workplace_id = ?
      AND ss.payroll_month = ?
    ORDER BY u.name`,
    [workplaceId, payrollMonth]
  );

  const totals = {
    total_base_pay: 0, total_national_pension: 0, total_health_insurance: 0,
    total_employment_insurance: 0, total_long_term_care: 0,
    total_income_tax: 0, total_local_income_tax: 0,
    total_deductions: 0, total_net_pay: 0,
    total_employer_national_pension: 0, total_employer_health_insurance: 0,
    total_employer_employment_insurance: 0, total_employer_long_term_care: 0,
    total_employer_burden: 0
  };

  slips.forEach(slip => {
    totals.total_base_pay += parseFloat(slip.base_pay) || 0;
    totals.total_national_pension += parseFloat(slip.national_pension) || 0;
    totals.total_health_insurance += parseFloat(slip.health_insurance) || 0;
    totals.total_employment_insurance += parseFloat(slip.employment_insurance) || 0;
    totals.total_long_term_care += parseFloat(slip.long_term_care) || 0;
    totals.total_income_tax += parseFloat(slip.income_tax) || 0;
    totals.total_local_income_tax += parseFloat(slip.local_income_tax) || 0;
    totals.total_deductions += parseFloat(slip.total_deductions) || 0;
    totals.total_net_pay += parseFloat(slip.net_pay) || 0;
    totals.total_employer_national_pension += parseFloat(slip.employer_national_pension) || 0;
    totals.total_employer_health_insurance += parseFloat(slip.employer_health_insurance) || 0;
    totals.total_employer_employment_insurance += parseFloat(slip.employer_employment_insurance) || 0;
    totals.total_employer_long_term_care += parseFloat(slip.employer_long_term_care) || 0;
    totals.total_employer_burden += parseFloat(slip.total_employer_burden) || 0;
  });

  return { slips, totals };
};

// ── PDF ───────────────────────────────────────────────────────

export const getSlipPdf = async (slipId) => {
  const slip = await get(SLIP_DETAIL_SQL, [slipId]);
  if (!slip) return null;

  const pdfBuffer = await generatePayslipPDF({
    slip,
    employee: { name: slip.employee_name, position: slip.position, department: slip.department },
    workplace: { name: slip.workplace_name, address: slip.workplace_address },
    owner: { name: slip.owner_name, business_number: slip.business_number }
  });

  return { slip, pdfBuffer };
};

// ── Email ─────────────────────────────────────────────────────

export const sendSlipEmail = async (slipId) => {
  const slip = await get(SLIP_EMAIL_SQL, [slipId]);
  if (!slip) return { error: 'not_found' };
  if (!slip.email) return { error: 'no_email' };

  const pdfBuffer = await generatePayslipPDF({
    slip,
    employee: { name: slip.employee_name, position: slip.position, department: slip.department },
    workplace: { name: slip.workplace_name },
    owner: { name: slip.owner_name, business_number: slip.business_number }
  });

  await sendPayslipEmail({
    to: slip.email,
    employeeName: slip.employee_name,
    month: slip.payroll_month,
    pdfBuffer,
    companyName: slip.workplace_name
  });

  return { slip };
};

export const sendBulkSlipEmails = async (workplaceId, payrollMonth) => {
  const slips = await query(
    `SELECT ss.*, u.name, u.email,
            ed.position, ed.department,
            w.name as workplace_name,
            owner.name as owner_name, owner.business_number
     FROM salary_slips ss
     JOIN users u ON ss.user_id = u.id
     LEFT JOIN employee_details ed ON u.id = ed.user_id
     LEFT JOIN workplaces w ON ss.workplace_id = w.id
     LEFT JOIN users owner ON w.owner_id = owner.id
     WHERE ss.workplace_id = ? AND ss.payroll_month = ? AND ss.published = true`,
    [workplaceId, payrollMonth]
  );

  if (slips.length === 0) return null;

  const results = await sendBulkPayslipEmails({
    slips,
    month: payrollMonth,
    companyName: slips[0].workplace_name,
    generatePdf: async (slip) => {
      return generatePayslipPDF({
        slip,
        employee: { name: slip.name, position: slip.position, department: slip.department },
        workplace: { name: slip.workplace_name },
        owner: { name: slip.owner_name, business_number: slip.business_number }
      });
    }
  });

  return results;
};

// ── Auto-generate slips ───────────────────────────────────────

export const generateMonthlySlips = async (workplaceId, payrollMonth, payDate) => {
  const [year, month] = payrollMonth.split('-');
  const startDate = `${year}-${month}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

  const employees = await query(
    "SELECT id, name FROM users WHERE workplace_id = ? AND role = 'employee' AND (employment_status IS NULL OR employment_status != 'resigned')",
    [workplaceId]
  );

  let created = 0;
  let skipped = 0;

  for (const employee of employees) {
    const existing = await get(
      'SELECT id FROM salary_slips WHERE user_id = ? AND payroll_month = ?',
      [employee.id, payrollMonth]
    );

    if (existing) {
      skipped++;
      continue;
    }

    const salaryInfo = await get('SELECT * FROM salary_info WHERE user_id = ?', [employee.id]);

    if (!salaryInfo) {
      console.log(`${employee.name} 급여 정보 없음, 기본값(0원)으로 생성`);
      await run(
        `INSERT INTO salary_slips (
          workplace_id, user_id, payroll_month, pay_date, tax_type,
          base_pay, total_deductions, net_pay, published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [workplaceId, employee.id, payrollMonth, payDate, '4대보험', 0, 0, 0, false]
      );
      created++;
      continue;
    }

    const attendanceRecords = await query(
      "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
      [employee.id, startDate, endDate]
    );

    const { basePay } = calculateMonthlyBasePay({ salaryInfo, attendanceRecords, startDate, endDate });

    const taxType = salaryInfo.tax_type || '4대보험';
    let totalDeductions = 0;
    let netPay = basePay;

    if (taxType === '3.3%') {
      totalDeductions = Math.round(basePay * 0.033);
      netPay = basePay - totalDeductions;
    }

    await run(
      `INSERT INTO salary_slips (
        workplace_id, user_id, payroll_month, pay_date, tax_type,
        base_pay, total_deductions, net_pay, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [workplaceId, employee.id, payrollMonth, payDate, taxType, basePay, totalDeductions, netPay, false]
    );

    created++;
  }

  return { created, skipped };
};

export const generateHistorySlips = async (userId, employee) => {
  const hireDate = new Date(employee.hire_date);
  const currentDate = new Date();

  let year = hireDate.getFullYear();
  let month = hireDate.getMonth() + 1;

  let created = 0;
  let skipped = 0;

  while (year < currentDate.getFullYear() || (year === currentDate.getFullYear() && month <= currentDate.getMonth() + 1)) {
    const payrollMonth = `${year}-${String(month).padStart(2, '0')}`;

    const existing = await get(
      'SELECT id FROM salary_slips WHERE user_id = ? AND payroll_month = ?',
      [userId, payrollMonth]
    );

    if (existing) {
      skipped++;
    } else {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const attendanceRecords = await query(
        "SELECT * FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? AND status = 'completed'",
        [userId, startDate, endDate]
      );

      const salaryInfo = {
        salary_type: employee.salary_type,
        amount: employee.amount,
        weekly_holiday_type: employee.weekly_holiday_type
      };

      const { basePay } = calculateMonthlyBasePay({ salaryInfo, attendanceRecords, startDate, endDate });

      const taxType = employee.tax_type || '4대보험';
      let totalDeductions = 0;
      let netPay = basePay;

      if (taxType === '3.3%') {
        totalDeductions = Math.round(basePay * 0.033);
        netPay = basePay - totalDeductions;
      }

      await run(
        `INSERT INTO salary_slips (
          workplace_id, user_id, payroll_month, pay_date, tax_type,
          base_pay, total_deductions, net_pay, published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee.workplace_id, userId, payrollMonth, null, taxType, basePay, totalDeductions, netPay, false]
      );

      created++;
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return { created, skipped };
};

// ── Finalize ──────────────────────────────────────────────────

export const finalizePayroll = async ({ workplaceId, payrollMonth, employees, userId }) => {
  const targetYyyyMm = payrollMonth.replace('-', '');

  const rates = await get(`
    SELECT * FROM rates_master
    WHERE effective_yyyymm <= ?
    ORDER BY effective_yyyymm DESC
    LIMIT 1
  `, [targetYyyyMm]);

  if (!rates) return null;

  for (const emp of employees) {
    const deductions = emp.deductions || {};
    const basePay = parseFloat(emp.basePay) || 0;
    const totalDeductions = parseFloat(emp.totalDeductions) || 0;
    const netPay = basePay - totalDeductions;

    await run(`
      DELETE FROM payroll_finalized
      WHERE workplace_id = ? AND payroll_month = ? AND employee_id = ?
    `, [workplaceId, payrollMonth, emp.employeeId]);

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
      basePay,
      JSON.stringify(deductions),
      JSON.stringify({
        totalPay: emp.totalPay || basePay,
        totalDeductions: totalDeductions,
        netPay: netPay
      }),
      emp.taxType || '4대보험',
      userId
    ]);

    const existingSlip = await get(`
      SELECT id FROM salary_slips
      WHERE workplace_id = ? AND payroll_month = ? AND user_id = ?
    `, [workplaceId, payrollMonth, emp.employeeId]);

    if (!existingSlip) {
      const employerNPS = parseFloat(deductions.employer_nps) || parseFloat(deductions.nps) || 0;
      const employerNHIS = parseFloat(deductions.employer_nhis) || parseFloat(deductions.nhis) || 0;
      const employerEI = parseFloat(deductions.employer_ei) || parseFloat(deductions.ei) || 0;
      const employerLTCI = parseFloat(deductions.employer_ltci) || parseFloat(deductions.ltci) || 0;
      const totalEmployerBurden = employerNPS + employerNHIS + employerEI + employerLTCI;

      await run(`
        INSERT INTO salary_slips (
          workplace_id, user_id, payroll_month, pay_date, tax_type,
          base_pay, dependents_count,
          national_pension, health_insurance, employment_insurance, long_term_care,
          income_tax, local_income_tax,
          total_deductions, net_pay,
          employer_national_pension, employer_health_insurance,
          employer_employment_insurance, employer_long_term_care,
          total_employer_burden,
          published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        workplaceId,
        emp.employeeId,
        payrollMonth,
        null,
        emp.taxType || '4대보험',
        basePay,
        1,
        parseFloat(deductions.nps) || 0,
        parseFloat(deductions.nhis) || 0,
        parseFloat(deductions.ei) || 0,
        parseFloat(deductions.ltci) || 0,
        parseFloat(deductions.income_tax) || 0,
        parseFloat(deductions.local_tax) || 0,
        totalDeductions,
        netPay,
        employerNPS,
        employerNHIS,
        employerEI,
        employerLTCI,
        totalEmployerBurden,
        0
      ]);
    }
  }

  return { appliedRateMonth: rates.effective_yyyymm };
};

// ── Ledger import ─────────────────────────────────────────────

export const importLedger = async (workplaceId, text) => {
  const parsed = parsePayrollLedger(text);
  if (!parsed.payrollMonth || parsed.employees.length === 0) {
    return null;
  }

  const unmatched = [];
  let imported = 0;

  for (const emp of parsed.employees) {
    const matchedUser = await get(
      "SELECT id FROM users WHERE workplace_id = ? AND role = 'employee' AND name = ?",
      [workplaceId, emp.name]
    );

    if (!matchedUser) {
      unmatched.push(emp.name);
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
        net_pay, source_text,
        employer_national_pension, employer_health_insurance,
        employer_employment_insurance, employer_long_term_care, total_employer_burden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workplaceId, matchedUser.id, parsed.payrollMonth, parsed.payDate,
        emp.basePay, emp.nationalPension, emp.healthInsurance, emp.employmentInsurance,
        emp.longTermCare, emp.incomeTax, emp.localIncomeTax, emp.totalDeductions,
        emp.netPay, text,
        emp.employerNationalPension || emp.nationalPension,
        emp.employerHealthInsurance || emp.healthInsurance,
        emp.employerEmploymentInsurance || emp.employmentInsurance,
        emp.employerLongTermCare || emp.longTermCare,
        (emp.employerNationalPension || emp.nationalPension) +
        (emp.employerHealthInsurance || emp.healthInsurance) +
        (emp.employerEmploymentInsurance || emp.employmentInsurance) +
        (emp.employerLongTermCare || emp.longTermCare)
      ]
    );
    imported += 1;
  }

  return { month: parsed.payrollMonth, payDate: parsed.payDate, imported, unmatched };
};

// ── Insurance calculation ─────────────────────────────────────

export const calculateInsurance = async (basePay, payrollMonth, taxType) => {
  let targetYyyyMm = new Date().toISOString().slice(0, 7).replace('-', '');
  if (payrollMonth && /^\d{4}-\d{2}$/.test(payrollMonth)) {
    targetYyyyMm = payrollMonth.replace('-', '');
  }

  const rates = await get(`
    SELECT * FROM rates_master
    WHERE effective_yyyymm <= ?
    ORDER BY effective_yyyymm DESC
    LIMIT 1
  `, [targetYyyyMm]);

  if (!rates) return { error: 'no_rates', targetYyyyMm };

  if (taxType === '3.3%') {
    const withholdingRate = parseFloat(rates.freelancer_withholding_rate_percent) / 100;
    const withholding = Math.floor(basePay * withholdingRate);
    const netPay = basePay - withholding;
    return {
      basePay, appliedRateMonth: rates.effective_yyyymm,
      taxType: '3.3%',
      withholdingRate: parseFloat(rates.freelancer_withholding_rate_percent),
      withholding, netPay,
      deductions: { freelancer_tax: withholding, nps: 0, nhis: 0, ltci: 0, ei: 0, income_tax: 0, local_tax: 0 },
      totalDeductions: withholding
    };
  }

  const npsRate = parseFloat(rates.nps_employee_rate_percent) / 100;
  const nhisRate = parseFloat(rates.nhis_employee_rate_percent) / 100;
  const ltciRate = parseFloat(rates.ltci_rate_of_nhis_percent) / 100;
  const eiRate = parseFloat(rates.ei_employee_rate_percent) / 100;

  const nationalPension = Math.floor(basePay * npsRate);
  const healthInsurance = Math.floor(basePay * nhisRate);
  const longTermCare = Math.floor(healthInsurance * ltciRate);
  const employmentInsurance = Math.floor(basePay * eiRate);
  const totalInsurance = nationalPension + healthInsurance + longTermCare + employmentInsurance;

  const npsEmployerRate = rates.nps_employer_rate_percent ? parseFloat(rates.nps_employer_rate_percent) / 100 : npsRate;
  const nhisEmployerRate = rates.nhis_employer_rate_percent ? parseFloat(rates.nhis_employer_rate_percent) / 100 : nhisRate;
  const eiEmployerRate = rates.ei_employer_rate_percent ? parseFloat(rates.ei_employer_rate_percent) / 100 : eiRate;

  const employerNationalPension = Math.floor(basePay * npsEmployerRate);
  const employerHealthInsurance = Math.floor(basePay * nhisEmployerRate);
  const employerLongTermCare = Math.floor(employerHealthInsurance * ltciRate);
  const employerEmploymentInsurance = Math.floor(basePay * eiEmployerRate);
  const totalEmployerBurden = employerNationalPension + employerHealthInsurance + employerLongTermCare + employerEmploymentInsurance;

  const incomeTax = Math.floor(basePay * 0.023);
  const localTax = Math.floor(incomeTax * 0.1);
  const totalDeductions = totalInsurance + incomeTax + localTax;
  const netPay = basePay - totalDeductions;

  return {
    basePay, appliedRateMonth: rates.effective_yyyymm,
    taxType: '4대보험',
    rates: {
      nationalPension: parseFloat(rates.nps_employee_rate_percent),
      healthInsurance: parseFloat(rates.nhis_employee_rate_percent),
      longTermCare: parseFloat(rates.ltci_rate_of_nhis_percent),
      employmentInsurance: parseFloat(rates.ei_employee_rate_percent)
    },
    deductions: { nps: nationalPension, nhis: healthInsurance, ltci: longTermCare, ei: employmentInsurance, income_tax: incomeTax, local_tax: localTax },
    totalDeductions, netPay,
    insurance: { nationalPension, healthInsurance, longTermCare, employmentInsurance, total: totalInsurance },
    employerBurden: {
      nationalPension: employerNationalPension, healthInsurance: employerHealthInsurance,
      longTermCare: employerLongTermCare, employmentInsurance: employerEmploymentInsurance,
      total: totalEmployerBurden
    }
  };
};
