import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { query, run, get } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { encryptSSN, decryptSSN } from '../utils/crypto.js';
import { validateEmployeeCreate, validateIdParam } from '../middleware/validate.js';
import { logAudit } from '../utils/auditLog.js';
import { requirePremium, checkEmployeeLimit } from '../middleware/planCheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('허용되지 않는 파일 형식입니다.'));
  }
});

// 여러 파일 업로드 (근로계약서, 이력서, 신분증, 등본)
const uploadFiles = upload.fields([
  { name: 'contract_file', maxCount: 1 },
  { name: 'resume_file', maxCount: 1 },
  { name: 'id_card_file', maxCount: 1 },
  { name: 'family_cert_file', maxCount: 1 }
]);

// 사업장의 직원 목록 조회
/**
 * @swagger
 * /api/employees/workplace/{workplaceId}:
 *   get:
 *     summary: 사업장별 직원 목록 조회
 *     description: 지정된 사업장에 소속된 모든 직원의 정보를 조회합니다.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workplaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사업장 ID
 *     responses:
 *       200:
 *         description: 직원 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: 권한 없음
 */
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const workplaceId = req.params.workplaceId;

    // 권한 확인 (모든 역할)
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    } else if (req.user.role === 'employee') {
      // 직원은 본인 사업장만 조회 가능
      if (parseInt(workplaceId, 10) !== req.user.workplace_id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

  const employees = await query(`
    SELECT
      u.id, u.username, u.name, u.phone, u.email, u.ssn, u.address,
      u.emergency_contact, u.emergency_phone, u.employment_status,
      ed.hire_date, ed.gender, ed.birth_date, ed.career, ed.job_type,
      ed.employment_renewal_date, ed.contract_start_date, ed.contract_end_date,
      ed.employment_notes, ed.separation_type, ed.separation_reason,
      ed.position, ed.department, ed.contract_file, ed.resume_file,
      ed.work_start_time, ed.work_end_time, ed.work_days, ed.id_card_file, ed.family_cert_file,
      ed.resignation_date, ed.privacy_consent, ed.privacy_consent_date, ed.location_consent, ed.location_consent_date,
      ed.pay_schedule_type, ed.pay_day, ed.pay_after_days, ed.payroll_period_start_day, ed.payroll_period_end_day,
      ed.last_pay_notice_date, ed.deduct_absence,
      ed.nationality, ed.visa_type, ed.visa_expiry_date, ed.foreign_worker_id,
      si.salary_type, si.amount, si.weekly_holiday_pay, si.weekly_holiday_type, si.overtime_pay, si.tax_type
    FROM users u
    LEFT JOIN employee_details ed ON u.id = ed.user_id
    LEFT JOIN salary_info si ON u.id = si.user_id
    WHERE u.workplace_id = ? AND u.role = 'employee'
    ORDER BY u.created_at DESC
  `, [workplaceId]);

    // Decrypt SSN for each employee
    const decryptedEmployees = employees.map(emp => ({
      ...emp,
      ssn: decryptSSN(emp.ssn)
    }));

    res.json({ success: true, data: decryptedEmployees });
  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 상세정보 조회
router.get('/:id', authenticate, async (req, res, next) => {
  // 숫자가 아닌 경로는 다음 라우트로 넘김 (excel-template 등)
  if (isNaN(req.params.id)) return next();
  try {
    const employee = await get(`
      SELECT
        u.id, u.username, u.name, u.phone, u.email, u.ssn, u.address,
        u.emergency_contact, u.emergency_phone, u.workplace_id, u.employment_status,
        ed.hire_date, ed.gender, ed.birth_date, ed.career, ed.job_type,
        ed.employment_renewal_date, ed.contract_start_date, ed.contract_end_date,
        ed.employment_notes, ed.separation_type, ed.separation_reason,
        ed.position, ed.department, ed.contract_file, ed.resume_file, ed.notes,
        ed.work_start_time, ed.work_end_time, ed.work_days, ed.id_card_file, ed.family_cert_file,
        ed.resignation_date, ed.privacy_consent, ed.location_consent,
        ed.pay_schedule_type, ed.pay_day, ed.pay_after_days, ed.payroll_period_start_day, ed.payroll_period_end_day,
        ed.last_pay_notice_date, ed.deduct_absence,
        ed.nationality, ed.visa_type, ed.visa_expiry_date, ed.foreign_worker_id,
        si.salary_type, si.amount, si.weekly_holiday_pay, si.weekly_holiday_type, si.overtime_pay, si.tax_type
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      LEFT JOIN salary_info si ON u.id = si.user_id
      WHERE u.id = ? AND u.role = 'employee'
    `, [req.params.id]);

    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    } else if (req.user.role === 'employee') {
      if (req.user.id !== parseInt(req.params.id, 10)) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    // Decrypt SSN
    employee.ssn = decryptSSN(employee.ssn);

    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 개인정보/위치정보 동의 업데이트 (직원 본인)
router.put('/:id/consent', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.id;

    if (req.user.role !== 'employee' || req.user.id !== parseInt(employeeId, 10)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    const { privacy_consent, privacy_consent_date, location_consent, location_consent_date } = req.body;

    const privacyConsentValue = privacy_consent === true || privacy_consent === '1' || privacy_consent === 1;
    const locationConsentValue = location_consent === true || location_consent === '1' || location_consent === 1;

    if (!privacyConsentValue || !locationConsentValue) {
      return res.status(400).json({ success: false, message: '모든 동의 항목이 필요합니다.' });
    }

    await run(
      `UPDATE employee_details 
       SET privacy_consent = ?, privacy_consent_date = ?, location_consent = ?, location_consent_date = ?
       WHERE user_id = ?`,
      [
        privacyConsentValue ? 1 : 0,
        privacy_consent_date || new Date().toISOString(),
        locationConsentValue ? 1 : 0,
        location_consent_date || new Date().toISOString(),
        employeeId
      ]
    );

    res.json({ success: true, message: '동의 기록이 저장되었습니다.' });
  } catch (error) {
    console.error('동의 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 수기 직원 등록 (계정 생성 없이 급여 계산용)
router.post('/manual', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  try {
    const {
      name, phone, workplace_id,
      hire_date, position, department, job_type,
      work_start_time, work_end_time, work_days,
      salary_type, amount, overtime_pay, tax_type,
      weekly_holiday_type, deduct_absence,
      pay_schedule_type, pay_day, pay_after_days,
      payroll_period_start_day, payroll_period_end_day,
      flexible_hours,
      nationality, visa_type, visa_expiry_date, foreign_worker_id
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '이름은 필수 항목입니다.' });
    }
    if (!workplace_id) {
      return res.status(400).json({ success: false, message: '사업장 정보가 필요합니다.' });
    }

    // Generate a unique placeholder username (not for login - just for DB uniqueness)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const placeholderUsername = `manual_${timestamp}_${randomSuffix}`;
    // Use a random password hash (account is not usable for login)
    const bcryptModule = await import('bcryptjs');
    const placeholderPassword = await bcryptModule.default.hash(`disabled_${timestamp}`, 10);

    // Create user with is_manual flag
    const userResult = await run(
      `INSERT INTO users (username, password, name, role, phone, workplace_id, employment_status, is_manual)
       VALUES (?, ?, ?, 'employee', ?, ?, 'active', 1)`,
      [placeholderUsername, placeholderPassword, name, phone || null, workplace_id]
    );

    const userId = userResult.id;

    // Create employee details
    await run(
      `INSERT INTO employee_details (
        user_id, workplace_id, hire_date, position, department, job_type,
        work_start_time, work_end_time, work_days,
        pay_schedule_type, pay_day, pay_after_days,
        payroll_period_start_day, payroll_period_end_day,
        deduct_absence, flexible_hours,
        nationality, visa_type, visa_expiry_date, foreign_worker_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, workplace_id,
        hire_date || new Date().toISOString().split('T')[0],
        position || null, department || null, job_type || null,
        work_start_time || null, work_end_time || null,
        work_days ? (typeof work_days === 'string' ? work_days : JSON.stringify(work_days)) : null,
        pay_schedule_type || null,
        pay_day !== undefined && pay_day !== '' ? Number(pay_day) : null,
        pay_after_days !== undefined && pay_after_days !== '' ? Number(pay_after_days) : null,
        payroll_period_start_day !== undefined ? Number(payroll_period_start_day) : null,
        payroll_period_end_day !== undefined ? Number(payroll_period_end_day) : null,
        deduct_absence ? 1 : 0,
        flexible_hours ? 1 : 0,
        nationality || '대한민국',
        visa_type || null,
        visa_expiry_date || null,
        foreign_worker_id || null
      ]
    );

    // Create salary info if provided
    if (salary_type && amount) {
      await run(
        `INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, overtime_pay, weekly_holiday_type, tax_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, workplace_id, salary_type, amount, overtime_pay || 0, weekly_holiday_type || 'included', tax_type || '4대보험']
      );
    }

    logAudit(req, { action: 'CREATE', entityType: 'employee', entityId: userId, details: { name, manual: true } });

    res.status(201).json({
      success: true,
      message: '직원이 수기 등록되었습니다.',
      employeeId: userId
    });
  } catch (error) {
    console.error('수기 직원 등록 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 엑셀 업로드용 multer
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('엑셀 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 엑셀 템플릿 다운로드
router.get('/excel-template', authenticate, (req, res) => {
  const wb = xlsx.utils.book_new();
  const templateData = [
    ['이름*', '급여형태*', '금액*', '핸드폰', '입사일', '직위', '부서', '국적', '비자유형', '비자만료일', '메모'],
    ['홍길동', '시급', '10320', '01012345678', '2025-03-01', '직원', '매장', '대한민국', '', '', ''],
    ['John Smith', '월급', '2500000', '01098765432', '2024-06-15', '매니저', '사무실', 'USA', 'E-7', '2027-12-31', '영어 가능'],
    ['응웬티란', '시급', '10320', '01055551234', '2026-01-10', '직원', '주방', '베트남', 'E-9', '2027-06-30', ''],
  ];
  const ws = xlsx.utils.aoa_to_sheet(templateData);

  // 컬럼 너비 설정
  ws['!cols'] = [
    {wch:12},{wch:10},{wch:12},{wch:14},{wch:12},{wch:10},{wch:10},{wch:12},{wch:10},{wch:12},{wch:20}
  ];

  xlsx.utils.book_append_sheet(wb, ws, '직원목록');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
  res.send(buffer);
});

// 엑셀 대량 업로드
router.post('/excel-import', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), requirePremium('excel_import'), excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '파일을 업로드해주세요.' });
    }

    const workplaceId = req.body.workplace_id;
    if (!workplaceId) {
      return res.status(400).json({ success: false, message: '사업장을 선택해주세요.' });
    }

    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '엑셀에 데이터가 없습니다.' });
    }
    if (rows.length > 200) {
      return res.status(400).json({ success: false, message: '최대 200명까지 업로드 가능합니다.' });
    }

    const results = { success: 0, failed: 0, errors: [] };
    const salaryTypeMap = { '시급': 'hourly', '일급': 'daily', '월급': 'monthly', 'hourly': 'hourly', 'daily': 'daily', 'monthly': 'monthly' };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 헤더가 1행

      // 필수 필드 검증
      const name = String(row['이름*'] || row['이름'] || row['name'] || '').trim();
      const salaryTypeRaw = String(row['급여형태*'] || row['급여형태'] || row['salary_type'] || '').trim();
      const amount = parseFloat(row['금액*'] || row['금액'] || row['amount'] || 0);

      if (!name) { results.failed++; results.errors.push(`${rowNum}행: 이름 없음`); continue; }
      if (!salaryTypeRaw) { results.failed++; results.errors.push(`${rowNum}행: 급여형태 없음`); continue; }
      if (!amount) { results.failed++; results.errors.push(`${rowNum}행: 금액 없음`); continue; }

      const salaryType = salaryTypeMap[salaryTypeRaw];
      if (!salaryType) { results.failed++; results.errors.push(`${rowNum}행: 급여형태 '${salaryTypeRaw}' 무효 (시급/일급/월급)`); continue; }

      // 선택 필드
      const phone = String(row['핸드폰'] || row['phone'] || '').replace(/[^0-9]/g, '');
      const hireDate = row['입사일'] || row['hire_date'] || null;
      const position = String(row['직위'] || row['position'] || '').trim();
      const department = String(row['부서'] || row['department'] || '').trim();
      const nationality = String(row['국적'] || row['nationality'] || '대한민국').trim();
      const visaType = String(row['비자유형'] || row['visa_type'] || '').trim();
      const visaExpiry = row['비자만료일'] || row['visa_expiry_date'] || null;
      const notes = String(row['메모'] || row['notes'] || '').trim();

      try {
        // 수기 등록 직원으로 저장 (로그인 불가 계정)
        const username = `manual_${Date.now()}_${i}`;
        const hashedPw = await bcrypt.hash(`manual_${Date.now()}`, 10);

        // users 테이블에 등록
        const userResult = await run(
          `INSERT INTO users (username, password, name, phone, role, workplace_id, is_manual)
           VALUES (?, ?, ?, ?, 'employee', ?, 1)`,
          [username, hashedPw, name, phone || null, workplaceId]
        );
        const userId = userResult.lastID || userResult.id;

        // employee_details 등록
        await run(
          `INSERT INTO employee_details (user_id, workplace_id, hire_date, position, department, nationality, visa_type, visa_expiry_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, workplaceId, hireDate, position || null, department || null, nationality, visaType || null, visaExpiry || null, notes || null]
        );

        // salary_info 등록
        await run(
          `INSERT INTO salary_info (user_id, type, amount, workplace_id)
           VALUES (?, ?, ?, ?)`,
          [userId, salaryType, amount, workplaceId]
        );

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${rowNum}행 (${name}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `${results.success}명 등록 완료, ${results.failed}명 실패`,
      data: results
    });
  } catch (error) {
    console.error('엑셀 업로드 오류:', error);
    res.status(500).json({ success: false, message: '엑셀 처리에 실패했습니다.' });
  }
});

// 직원 등록
router.post('/', authenticate, authorizeRole(['admin', 'super_admin', 'owner']), checkEmployeeLimit, uploadFiles, async (req, res) => {
  try {
    let {
      username, password, name, phone, email, ssn, address,
      emergency_contact, emergency_phone, workplace_id,
      hire_date, gender, birth_date, career, job_type, employment_renewal_date,
      contract_start_date, contract_end_date, employment_notes, separation_type, separation_reason,
      position, department, notes,
      work_start_time, work_end_time, work_days,
      pay_schedule_type, pay_day, pay_after_days, payroll_period_start_day, payroll_period_end_day,
      deduct_absence,
      salary_type, amount, weekly_holiday_pay, weekly_holiday_type, overtime_pay, tax_type,
      employment_status, resignation_date,
      privacy_consent, privacy_consent_date, location_consent, location_consent_date,
      nationality, visa_type, visa_expiry_date, foreign_worker_id
    } = req.body;

    // work_days가 JSON 문자열이면 파싱
    if (typeof work_days === 'string' && work_days.startsWith('[')) {
      try {
        work_days = JSON.parse(work_days);
        work_days = Array.isArray(work_days) ? work_days.join(',') : work_days;
      } catch (e) {
        // 파싱 실패 시 그대로 사용
      }
    }

    if (!username || !password || !name || !workplace_id) {
      return res.status(400).json({ success: false, message: '필수 정보를 입력해주세요.' });
    }

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedSSN = encryptSSN(ssn);

    // 사용자 등록
    const userResult = await run(
      'INSERT INTO users (username, password, name, role, phone, email, ssn, address, emergency_contact, emergency_phone, workplace_id, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, 'employee', phone, email, encryptedSSN, address, emergency_contact, emergency_phone, workplace_id, employment_status || 'active']
    );

    const userId = userResult.id;

    // 파일 처리
    const contractFile = req.files && req.files['contract_file'] ? req.files['contract_file'][0].filename : null;
    const resumeFile = req.files && req.files['resume_file'] ? req.files['resume_file'][0].filename : null;
    const idCardFile = req.files && req.files['id_card_file'] ? req.files['id_card_file'][0].filename : null;
    const familyCertFile = req.files && req.files['family_cert_file'] ? req.files['family_cert_file'][0].filename : null;

    // 직원 상세정보 등록 (동의는 직원이 직접 진행)
    await run(
      `INSERT INTO employee_details (
        user_id, workplace_id, hire_date, gender, birth_date, career, job_type,
        employment_renewal_date, contract_start_date, contract_end_date,
        employment_notes, separation_type, separation_reason,
        position, department, contract_file, resume_file, id_card_file, family_cert_file,
        notes, work_start_time, work_end_time, work_days, resignation_date,
      pay_schedule_type, pay_day, pay_after_days, payroll_period_start_day, payroll_period_end_day,
      deduct_absence,
      privacy_consent, privacy_consent_date, location_consent, location_consent_date,
      nationality, visa_type, visa_expiry_date, foreign_worker_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, workplace_id, hire_date, gender, birth_date, career, job_type,
        employment_renewal_date, contract_start_date, contract_end_date,
        employment_notes, separation_type, separation_reason,
        position, department, contractFile, resumeFile, idCardFile, familyCertFile,
        notes, work_start_time, work_end_time, work_days, resignation_date || null,
        pay_schedule_type || null,
        pay_day !== undefined && pay_day !== '' ? Number(pay_day) : null,
        pay_after_days !== undefined && pay_after_days !== '' ? Number(pay_after_days) : null,
        payroll_period_start_day !== undefined && payroll_period_start_day !== '' ? Number(payroll_period_start_day) : null,
        payroll_period_end_day !== undefined && payroll_period_end_day !== '' ? Number(payroll_period_end_day) : null,
        deduct_absence === '1' || deduct_absence === 1 || deduct_absence === true ? 1 : 0,
        0, null, 0, null,
        nationality || '대한민국',
        visa_type || null,
        visa_expiry_date || null,
        foreign_worker_id || null
      ]
    );

    // 급여 정보 등록
    if (salary_type && amount) {
      const weeklyHolidayPayValue = weekly_holiday_pay === true || weekly_holiday_pay === 'true' || weekly_holiday_pay === 1 ? 1 : 0;
      const weeklyHolidayTypeValue = weekly_holiday_type || 'included'; // 'included', 'separate', 'none'
      
      await run(
        'INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, weekly_holiday_pay, weekly_holiday_type, overtime_pay, tax_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, workplace_id, salary_type, amount, weeklyHolidayPayValue, weeklyHolidayTypeValue, overtime_pay || 0, tax_type || '4대보험']
      );
    }

    logAudit(req, { action: 'CREATE', entityType: 'employee', entityId: userId, details: { name, workplace_id } });

    res.status(201).json({
      success: true,
      message: '직원이 등록되었습니다.',
      employeeId: userId
    });
  } catch (error) {
    if (
      error.message.includes('UNIQUE constraint failed') ||
      error.message.includes('duplicate key value')
    ) {
      return res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' });
    }
    console.error('직원 등록 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 정보 수정
router.put('/:id', authenticate, authorizeRole(['admin', 'super_admin', 'owner']), uploadFiles, async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    console.log('=== 전체 req.body ===');
    console.log(req.body);
    console.log('=== 전체 req.files ===');
    console.log(req.files);
    
    let {
      name, phone, email, ssn, address, emergency_contact, emergency_phone,
      hire_date, gender, birth_date, career, job_type, employment_renewal_date,
      contract_start_date, contract_end_date, employment_notes, separation_type, separation_reason,
      position, department, notes,
      work_start_time, work_end_time, work_days,
      pay_schedule_type, pay_day, pay_after_days, payroll_period_start_day, payroll_period_end_day,
      deduct_absence,
      salary_type, amount, weekly_holiday_pay, weekly_holiday_type, overtime_pay, tax_type,
      employment_status, resignation_date,
      privacy_consent, privacy_consent_date, location_consent, location_consent_date,
      nationality, visa_type, visa_expiry_date, foreign_worker_id
    } = req.body;

    // work_days가 JSON 문자열이면 파싱
    if (typeof work_days === 'string' && work_days.startsWith('[')) {
      try {
        work_days = JSON.parse(work_days);
        work_days = Array.isArray(work_days) ? work_days.join(',') : work_days;
      } catch (e) {
        // 파싱 실패 시 그대로 사용
      }
    }

    console.log('받은 데이터:', { salary_type, amount, tax_type, weekly_holiday_pay, weekly_holiday_type, overtime_pay });

    // 권한 확인
    const employee = await get("SELECT workplace_id FROM users WHERE id = ? AND role = 'employee'", [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }

    // 사용자 정보 수정 (빈 값이 아닌 경우만 업데이트)
    let userUpdateQuery = 'UPDATE users SET';
    let userUpdateParams = [];
    let userUpdateFields = [];
    
    if (name) {
      userUpdateFields.push(' name = ?');
      userUpdateParams.push(name);
    }
    if (phone !== undefined) {
      userUpdateFields.push(' phone = ?');
      userUpdateParams.push(phone);
    }
    if (email !== undefined) {
      userUpdateFields.push(' email = ?');
      userUpdateParams.push(email);
    }
    if (ssn !== undefined) {
      userUpdateFields.push(' ssn = ?');
      userUpdateParams.push(encryptSSN(ssn));
    }
    if (address !== undefined) {
      userUpdateFields.push(' address = ?');
      userUpdateParams.push(address);
    }
    if (emergency_contact !== undefined) {
      userUpdateFields.push(' emergency_contact = ?');
      userUpdateParams.push(emergency_contact);
    }
    if (emergency_phone !== undefined) {
      userUpdateFields.push(' emergency_phone = ?');
      userUpdateParams.push(emergency_phone);
    }
    if (employment_status !== undefined) {
      userUpdateFields.push(' employment_status = ?');
      userUpdateParams.push(employment_status);
    }
    
    if (userUpdateFields.length > 0) {
      userUpdateQuery += userUpdateFields.join(',');
      userUpdateQuery += ' WHERE id = ?';
      userUpdateParams.push(employeeId);
      await run(userUpdateQuery, userUpdateParams);
    }

    // 파일 처리
    const contractFile = req.files && req.files['contract_file'] ? req.files['contract_file'][0].filename : undefined;
    const resumeFile = req.files && req.files['resume_file'] ? req.files['resume_file'][0].filename : undefined;
    const idCardFile = req.files && req.files['id_card_file'] ? req.files['id_card_file'][0].filename : undefined;
    const familyCertFile = req.files && req.files['family_cert_file'] ? req.files['family_cert_file'][0].filename : undefined;

    // 직원 상세정보 기존 값 조회 (부분 업데이트 시 값 보존)
    const existingDetails = await get('SELECT * FROM employee_details WHERE user_id = ?', [employeeId]);

    const resolvedHireDate = hire_date !== undefined ? hire_date : existingDetails?.hire_date;
    const resolvedGender = gender !== undefined ? gender : existingDetails?.gender;
    const resolvedBirthDate = birth_date !== undefined ? birth_date : existingDetails?.birth_date;
    const resolvedCareer = career !== undefined ? career : existingDetails?.career;
    const resolvedJobType = job_type !== undefined ? job_type : existingDetails?.job_type;
    const resolvedEmploymentRenewalDate = employment_renewal_date !== undefined ? employment_renewal_date : existingDetails?.employment_renewal_date;
    const resolvedContractStartDate = contract_start_date !== undefined ? contract_start_date : existingDetails?.contract_start_date;
    const resolvedContractEndDate = contract_end_date !== undefined ? contract_end_date : existingDetails?.contract_end_date;
    const resolvedEmploymentNotes = employment_notes !== undefined ? employment_notes : existingDetails?.employment_notes;
    const resolvedSeparationType = separation_type !== undefined ? separation_type : existingDetails?.separation_type;
    const resolvedSeparationReason = separation_reason !== undefined ? separation_reason : existingDetails?.separation_reason;
    const resolvedPosition = position !== undefined ? position : existingDetails?.position;
    const resolvedDepartment = department !== undefined ? department : existingDetails?.department;
    const resolvedNotes = notes !== undefined ? notes : existingDetails?.notes;
    const resolvedWorkStartTime = work_start_time !== undefined ? work_start_time : existingDetails?.work_start_time;
    const resolvedWorkEndTime = work_end_time !== undefined ? work_end_time : existingDetails?.work_end_time;
    const resolvedWorkDays = work_days !== undefined ? work_days : existingDetails?.work_days;
    const resolvedResignationDate = resignation_date !== undefined ? resignation_date : existingDetails?.resignation_date;
    const resolvedPayScheduleType = pay_schedule_type !== undefined ? pay_schedule_type : existingDetails?.pay_schedule_type;
    const resolvedPayDay = pay_day !== undefined && pay_day !== '' ? Number(pay_day) : existingDetails?.pay_day;
    const resolvedPayAfterDays = pay_after_days !== undefined && pay_after_days !== '' ? Number(pay_after_days) : existingDetails?.pay_after_days;
    const resolvedPayrollStart = payroll_period_start_day !== undefined && payroll_period_start_day !== '' ? Number(payroll_period_start_day) : existingDetails?.payroll_period_start_day;
    const resolvedPayrollEnd = payroll_period_end_day !== undefined && payroll_period_end_day !== '' ? Number(payroll_period_end_day) : existingDetails?.payroll_period_end_day;
    const resolvedDeductAbsence = deduct_absence !== undefined
      ? (deduct_absence === '1' || deduct_absence === 1 || deduct_absence === true ? 1 : 0)
      : existingDetails?.deduct_absence;
    const resolvedNationality = nationality !== undefined ? nationality : existingDetails?.nationality;
    const resolvedVisaType = visa_type !== undefined ? visa_type : existingDetails?.visa_type;
    const resolvedVisaExpiryDate = visa_expiry_date !== undefined ? visa_expiry_date : existingDetails?.visa_expiry_date;
    const resolvedForeignWorkerId = foreign_worker_id !== undefined ? foreign_worker_id : existingDetails?.foreign_worker_id;

    // 직원 상세정보 수정
    let updateQuery = `UPDATE employee_details SET
      hire_date = ?, gender = ?, birth_date = ?, career = ?, job_type = ?,
      employment_renewal_date = ?, contract_start_date = ?, contract_end_date = ?,
      employment_notes = ?, separation_type = ?, separation_reason = ?,
      position = ?, department = ?, notes = ?, work_start_time = ?, work_end_time = ?, work_days = ?, resignation_date = ?,
      pay_schedule_type = ?, pay_day = ?, pay_after_days = ?, payroll_period_start_day = ?, payroll_period_end_day = ?,
      deduct_absence = ?,
      nationality = ?, visa_type = ?, visa_expiry_date = ?, foreign_worker_id = ?`;
    let updateParams = [
      resolvedHireDate, resolvedGender, resolvedBirthDate, resolvedCareer, resolvedJobType,
      resolvedEmploymentRenewalDate, resolvedContractStartDate, resolvedContractEndDate,
      resolvedEmploymentNotes, resolvedSeparationType, resolvedSeparationReason,
      resolvedPosition, resolvedDepartment, resolvedNotes, resolvedWorkStartTime, resolvedWorkEndTime, resolvedWorkDays,
      resolvedResignationDate || null,
      resolvedPayScheduleType || null,
      resolvedPayDay ?? null,
      resolvedPayAfterDays ?? null,
      resolvedPayrollStart ?? null,
      resolvedPayrollEnd ?? null,
      resolvedDeductAbsence ?? 0,
      resolvedNationality || '대한민국',
      resolvedVisaType || null,
      resolvedVisaExpiryDate || null,
      resolvedForeignWorkerId || null
    ];
    
    if (contractFile) {
      updateQuery += ', contract_file = ?';
      updateParams.push(contractFile);
    }
    
    if (resumeFile) {
      updateQuery += ', resume_file = ?';
      updateParams.push(resumeFile);
    }
    
    if (idCardFile) {
      updateQuery += ', id_card_file = ?';
      updateParams.push(idCardFile);
    }
    
    if (familyCertFile) {
      updateQuery += ', family_cert_file = ?';
      updateParams.push(familyCertFile);
    }
    
    // 동의 정보 업데이트 (직원이 직접 동의한 경우)
    if (privacy_consent !== undefined) {
      updateQuery += ', privacy_consent = ?';
      updateParams.push(privacy_consent);
    }
    
    if (privacy_consent_date !== undefined) {
      updateQuery += ', privacy_consent_date = ?';
      updateParams.push(privacy_consent_date);
    }
    
    if (location_consent !== undefined) {
      updateQuery += ', location_consent = ?';
      updateParams.push(location_consent);
    }
    
    if (location_consent_date !== undefined) {
      updateQuery += ', location_consent_date = ?';
      updateParams.push(location_consent_date);
    }
    
    updateQuery += ' WHERE user_id = ?';
    updateParams.push(employeeId);
    
    await run(updateQuery, updateParams);

    // 급여 정보 수정
    const existingSalary = await get('SELECT * FROM salary_info WHERE user_id = ?', [employeeId]);
    
    if (existingSalary) {
      // 급여 변경 이력 저장 (금액이나 유형이 변경된 경우)
      const salaryChanged = (salary_type && salary_type !== existingSalary.salary_type) || 
                           (amount && parseFloat(amount) !== parseFloat(existingSalary.amount));
      
      if (salaryChanged) {
        const today = new Date().toISOString().split('T')[0];
        await run(
          `INSERT INTO salary_history (user_id, old_salary_type, old_amount, new_salary_type, new_amount, change_date, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            employeeId,
            existingSalary.salary_type,
            existingSalary.amount,
            salary_type || existingSalary.salary_type,
            amount || existingSalary.amount,
            today,
            '급여 정보 변경'
          ]
        );
      }
      
      // 기존 급여 정보가 있으면 업데이트
      let salaryUpdateQuery = 'UPDATE salary_info SET';
      let salaryUpdateParams = [];
      let salaryUpdateFields = [];
      
      if (salary_type) {
        salaryUpdateFields.push(' salary_type = ?');
        salaryUpdateParams.push(salary_type);
      }
      
      if (amount) {
        salaryUpdateFields.push(' amount = ?');
        salaryUpdateParams.push(amount);
      }
      
      if (weekly_holiday_pay !== undefined) {
        salaryUpdateFields.push(' weekly_holiday_pay = ?');
        salaryUpdateParams.push(weekly_holiday_pay === true || weekly_holiday_pay === 'true' || weekly_holiday_pay === 1 ? 1 : 0);
      }
      
      if (weekly_holiday_type) {
        salaryUpdateFields.push(' weekly_holiday_type = ?');
        salaryUpdateParams.push(weekly_holiday_type);
      }
      
      if (overtime_pay !== undefined) {
        salaryUpdateFields.push(' overtime_pay = ?');
        salaryUpdateParams.push(overtime_pay || 0);
      }
      
      if (tax_type) {
        salaryUpdateFields.push(' tax_type = ?');
        salaryUpdateParams.push(tax_type);
      }
      
      if (salaryUpdateFields.length > 0) {
        salaryUpdateQuery += salaryUpdateFields.join(',');
        salaryUpdateQuery += ' WHERE user_id = ?';
        salaryUpdateParams.push(employeeId);
        await run(salaryUpdateQuery, salaryUpdateParams);
      }
    } else if (salary_type && amount) {
      // 기존 급여 정보가 없고 새로운 급여 정보가 제공된 경우에만 INSERT
      const weeklyHolidayPayValue = weekly_holiday_pay === true || weekly_holiday_pay === 'true' || weekly_holiday_pay === 1 ? 1 : 0;
      const weeklyHolidayTypeValue = weekly_holiday_type || 'included';
      
      await run(
        'INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, weekly_holiday_pay, weekly_holiday_type, overtime_pay, tax_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [employeeId, employee.workplace_id, salary_type, amount, weeklyHolidayPayValue, weeklyHolidayTypeValue, overtime_pay || 0, tax_type || '4대보험']
      );
    }

    // V2 호환: employment_status가 resigned로 변경되면 company_employee_relations도 동기화
    if (employment_status === 'resigned') {
      try {
        await run(
          `UPDATE company_employee_relations SET status = 'resigned', end_date = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND status = 'active'`,
          [resignation_date || new Date().toISOString().split('T')[0], employeeId]
        );
      } catch (e) { /* V2 테이블이 없으면 무시 */ }
    }
    // employment_status가 active로 변경되면 (재입사) company_employee_relations도 동기화
    if (employment_status === 'active') {
      try {
        await run(
          `UPDATE company_employee_relations SET status = 'active', end_date = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND status = 'resigned'`,
          [employeeId]
        );
      } catch (e) { /* V2 테이블이 없으면 무시 */ }
    }

    logAudit(req, { action: 'UPDATE', entityType: 'employee', entityId: employeeId });

    res.json({ success: true, message: '직원 정보가 수정되었습니다.' });
  } catch (error) {
    console.error('직원 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 삭제
router.delete('/:id', authenticate, authorizeRole(['admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const employeeId = req.params.id;

    // 권한 확인
    const employee = await get("SELECT workplace_id FROM users WHERE id = ? AND role = 'employee'", [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }

    // 관련 데이터 삭제 (FK 제약 순서)
    await run('DELETE FROM salary_slips WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM salary_history WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM employee_past_payroll WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM push_subscriptions WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM salary_info WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM attendance WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM employee_details WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM users WHERE id = ?', [employeeId]);

    logAudit(req, { action: 'DELETE', entityType: 'employee', entityId: employeeId });

    res.json({ success: true, message: '직원이 삭제되었습니다.' });
  } catch (error) {
    console.error('직원 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 재직증명서 정보 조회
router.get('/:id/employment-certificate', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.id;

    // 권한 확인 - 본인 또는 사업주만 조회 가능
    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    // 직원 정보 조회
    const employeeInfo = await get(
      `SELECT u.id, u.username, u.name, u.created_at, u.workplace_id,
              u.ssn, u.address, ed.hire_date, ed.position, ed.department,
              w.name as workplace_name, w.address as workplace_address,
              owner.name as owner_name, owner.business_number as business_number,
              si.salary_type, si.amount
       FROM users u
       LEFT JOIN employee_details ed ON u.id = ed.user_id
       LEFT JOIN workplaces w ON u.workplace_id = w.id
       LEFT JOIN users owner ON w.owner_id = owner.id
       LEFT JOIN salary_info si ON u.id = si.user_id
       WHERE u.id = ? AND u.role = 'employee'`,
      [employeeId]
    );

    if (!employeeInfo) {
      return res.status(404).json({ success: false, message: '직원 정보를 찾을 수 없습니다.' });
    }

    // 사업주 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employeeInfo.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
    }

    // 주민등록번호 복호화 후 마스킹 (뒤 7자리)
    const rawSSN = decryptSSN(employeeInfo.ssn);
    let maskedSSN = rawSSN ? String(rawSSN) : null;
    if (maskedSSN && maskedSSN.length >= 7) {
      maskedSSN = maskedSSN.substring(0, maskedSSN.length - 7) + '*******';
    }

    // 날짜 형식 변환 (ISO -> YYYY-MM-DD)
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      // ISO 형식이면 날짜 부분만 추출
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
      return dateStr;
    };

    const formatDateKorean = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}년 ${month}월 ${day}일`;
    };

    const hireDate = formatDateKorean(employeeInfo.hire_date);
    const issueDate = formatDateKorean(new Date());

    res.json({
      success: true,
      data: {
        employeeName: employeeInfo.name,
        ssn: maskedSSN,
        hireDate,
        position: employeeInfo.position || '직원',
        department: employeeInfo.department || '-',
        address: employeeInfo.address || '-',
        workplaceName: employeeInfo.workplace_name,
        workplaceAddress: employeeInfo.workplace_address,
        businessNumber: employeeInfo.business_number,
        salaryType: employeeInfo.salary_type,
        amount: employeeInfo.amount,
        ownerName: employeeInfo.owner_name || null,
        issueDate
      }
    });
  } catch (error) {
    console.error('재직증명서 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
