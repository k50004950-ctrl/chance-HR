import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { query, run, get } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

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
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const workplaceId = req.params.workplaceId;

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

  const employees = await query(`
    SELECT 
      u.id, u.username, u.name, u.phone, u.email, u.ssn, u.address,
      u.emergency_contact, u.emergency_phone, u.employment_status,
      ed.hire_date, ed.position, ed.department, ed.contract_file, ed.resume_file,
      ed.work_start_time, ed.work_end_time, ed.work_days, ed.id_card_file, ed.family_cert_file,
      ed.resignation_date, ed.privacy_consent, ed.location_consent,
      si.salary_type, si.amount, si.weekly_holiday_pay, si.weekly_holiday_type, si.overtime_pay, si.tax_type
    FROM users u
    LEFT JOIN employee_details ed ON u.id = ed.user_id
    LEFT JOIN salary_info si ON u.id = si.user_id
    WHERE u.workplace_id = ? AND u.role = 'employee'
    ORDER BY u.created_at DESC
  `, [workplaceId]);

    res.json(employees);
  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 상세정보 조회
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employee = await get(`
      SELECT 
        u.id, u.username, u.name, u.phone, u.email, u.ssn, u.address,
        u.emergency_contact, u.emergency_phone, u.workplace_id, u.employment_status,
        ed.hire_date, ed.position, ed.department, ed.contract_file, ed.resume_file, ed.notes,
        ed.work_start_time, ed.work_end_time, ed.work_days, ed.id_card_file, ed.family_cert_file,
        ed.resignation_date, ed.privacy_consent, ed.location_consent,
        si.salary_type, si.amount, si.weekly_holiday_pay, si.weekly_holiday_type, si.overtime_pay, si.tax_type
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      LEFT JOIN salary_info si ON u.id = si.user_id
      WHERE u.id = ? AND u.role = 'employee'
    `, [req.params.id]);

    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    res.json(employee);
  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 개인정보/위치정보 동의 업데이트 (직원 본인)
router.put('/:id/consent', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.id;

    if (req.user.role !== 'employee' || req.user.id !== parseInt(employeeId, 10)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { privacy_consent, privacy_consent_date, location_consent, location_consent_date } = req.body;

    const privacyConsentValue = privacy_consent === true || privacy_consent === '1' || privacy_consent === 1;
    const locationConsentValue = location_consent === true || location_consent === '1' || location_consent === 1;

    if (!privacyConsentValue || !locationConsentValue) {
      return res.status(400).json({ message: '모든 동의 항목이 필요합니다.' });
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

    res.json({ message: '동의 기록이 저장되었습니다.' });
  } catch (error) {
    console.error('동의 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 등록
router.post('/', authenticate, authorizeRole('admin', 'owner'), uploadFiles, async (req, res) => {
  try {
    let {
      username, password, name, phone, email, ssn, address,
      emergency_contact, emergency_phone, workplace_id,
      hire_date, position, department, notes,
      work_start_time, work_end_time, work_days,
      salary_type, amount, weekly_holiday_pay, weekly_holiday_type, overtime_pay, tax_type,
      employment_status, resignation_date,
      privacy_consent, privacy_consent_date, location_consent, location_consent_date
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
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 등록
    const userResult = await run(
      'INSERT INTO users (username, password, name, role, phone, email, ssn, address, emergency_contact, emergency_phone, workplace_id, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, 'employee', phone, email, ssn, address, emergency_contact, emergency_phone, workplace_id, employment_status || 'active']
    );

    const userId = userResult.id;

    // 파일 처리
    const contractFile = req.files && req.files['contract_file'] ? req.files['contract_file'][0].filename : null;
    const resumeFile = req.files && req.files['resume_file'] ? req.files['resume_file'][0].filename : null;
    const idCardFile = req.files && req.files['id_card_file'] ? req.files['id_card_file'][0].filename : null;
    const familyCertFile = req.files && req.files['family_cert_file'] ? req.files['family_cert_file'][0].filename : null;

    // 직원 상세정보 등록 (동의는 직원이 직접 진행)
    await run(
      'INSERT INTO employee_details (user_id, workplace_id, hire_date, position, department, contract_file, resume_file, id_card_file, family_cert_file, notes, work_start_time, work_end_time, work_days, resignation_date, privacy_consent, privacy_consent_date, location_consent, location_consent_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, workplace_id, hire_date, position, department, contractFile, resumeFile, idCardFile, familyCertFile, notes, work_start_time, work_end_time, work_days, resignation_date || null, 0, null, 0, null]
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

    res.status(201).json({
      message: '직원이 등록되었습니다.',
      employeeId: userId
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
    }
    console.error('직원 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 정보 수정
router.put('/:id', authenticate, authorizeRole('admin', 'owner'), uploadFiles, async (req, res) => {
  try {
    const employeeId = req.params.id;
    
    console.log('=== 전체 req.body ===');
    console.log(req.body);
    console.log('=== 전체 req.files ===');
    console.log(req.files);
    
    let {
      name, phone, email, ssn, address, emergency_contact, emergency_phone,
      hire_date, position, department, notes,
      work_start_time, work_end_time, work_days,
      salary_type, amount, weekly_holiday_pay, weekly_holiday_type, overtime_pay, tax_type,
      employment_status, resignation_date
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
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
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
      userUpdateParams.push(ssn);
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

    // 직원 상세정보 수정
    let updateQuery = 'UPDATE employee_details SET hire_date = ?, position = ?, department = ?, notes = ?, work_start_time = ?, work_end_time = ?, work_days = ?, resignation_date = ?';
    let updateParams = [hire_date, position, department, notes, work_start_time, work_end_time, work_days, resignation_date || null];
    
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

    res.json({ message: '직원 정보가 수정되었습니다.' });
  } catch (error) {
    console.error('직원 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원 삭제
router.delete('/:id', authenticate, authorizeRole('admin', 'owner'), async (req, res) => {
  try {
    const employeeId = req.params.id;

    // 권한 확인
    const employee = await get("SELECT workplace_id FROM users WHERE id = ? AND role = 'employee'", [employeeId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 관련 데이터 삭제
    await run('DELETE FROM salary_info WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM employee_details WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM attendance WHERE user_id = ?', [employeeId]);
    await run('DELETE FROM users WHERE id = ?', [employeeId]);

    res.json({ message: '직원이 삭제되었습니다.' });
  } catch (error) {
    console.error('직원 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 재직증명서 정보 조회
router.get('/:id/employment-certificate', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.id;

    // 권한 확인 - 본인 또는 사업주만 조회 가능
    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 직원 정보 조회
    const employeeInfo = await get(
      `SELECT u.id, u.username, u.name, u.created_at, u.workplace_id,
              ed.ssn, ed.hire_date, ed.position, ed.department, ed.address,
              w.name as workplace_name, w.address as workplace_address, w.business_number,
              si.salary_type, si.amount
       FROM users u
       LEFT JOIN employee_details ed ON u.id = ed.user_id
       LEFT JOIN workplaces w ON u.workplace_id = w.id
       LEFT JOIN salary_info si ON u.id = si.user_id
       WHERE u.id = ? AND u.role = 'employee'`,
      [employeeId]
    );

    if (!employeeInfo) {
      return res.status(404).json({ message: '직원 정보를 찾을 수 없습니다.' });
    }

    // 사업주 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employeeInfo.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 주민등록번호 마스킹 (뒤 7자리)
    let maskedSSN = employeeInfo.ssn;
    if (maskedSSN && maskedSSN.length >= 7) {
      maskedSSN = maskedSSN.substring(0, maskedSSN.length - 7) + '*******';
    }

    res.json({
      employeeName: employeeInfo.name,
      ssn: maskedSSN,
      hireDate: employeeInfo.hire_date,
      position: employeeInfo.position || '직원',
      department: employeeInfo.department || '-',
      address: employeeInfo.address || '-',
      workplaceName: employeeInfo.workplace_name,
      workplaceAddress: employeeInfo.workplace_address,
      businessNumber: employeeInfo.business_number,
      salaryType: employeeInfo.salary_type,
      amount: employeeInfo.amount,
      issueDate: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('재직증명서 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
