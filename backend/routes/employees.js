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

// 여러 파일 업로드 (근로계약서, 이력서)
const uploadFiles = upload.fields([
  { name: 'contract_file', maxCount: 1 },
  { name: 'resume_file', maxCount: 1 }
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
      u.emergency_contact, u.emergency_phone,
      ed.hire_date, ed.position, ed.department, ed.contract_file, ed.resume_file,
      ed.work_start_time, ed.work_end_time, ed.work_days,
      si.salary_type, si.amount, si.weekly_holiday_pay, si.tax_type
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
        u.emergency_contact, u.emergency_phone, u.workplace_id,
        ed.hire_date, ed.position, ed.department, ed.contract_file, ed.resume_file, ed.notes,
        ed.work_start_time, ed.work_end_time, ed.work_days,
        si.salary_type, si.amount, si.weekly_holiday_pay, si.tax_type
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

// 직원 등록
router.post('/', authenticate, authorizeRole('admin', 'owner'), uploadFiles, async (req, res) => {
  try {
    const {
      username, password, name, phone, email, ssn, address,
      emergency_contact, emergency_phone, workplace_id,
      hire_date, position, department, notes,
      work_start_time, work_end_time, work_days,
      salary_type, amount, weekly_holiday_pay, tax_type
    } = req.body;

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
      'INSERT INTO users (username, password, name, role, phone, email, ssn, address, emergency_contact, emergency_phone, workplace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, 'employee', phone, email, ssn, address, emergency_contact, emergency_phone, workplace_id]
    );

    const userId = userResult.id;

    // 파일 처리
    const contractFile = req.files && req.files['contract_file'] ? req.files['contract_file'][0].filename : null;
    const resumeFile = req.files && req.files['resume_file'] ? req.files['resume_file'][0].filename : null;

    // 직원 상세정보 등록
    await run(
      'INSERT INTO employee_details (user_id, workplace_id, hire_date, position, department, contract_file, resume_file, notes, work_start_time, work_end_time, work_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, workplace_id, hire_date, position, department, contractFile, resumeFile, notes, work_start_time, work_end_time, work_days]
    );

    // 급여 정보 등록
    if (salary_type && amount) {
      await run(
        'INSERT INTO salary_info (user_id, salary_type, amount, weekly_holiday_pay, tax_type) VALUES (?, ?, ?, ?, ?)',
        [userId, salary_type, amount, weekly_holiday_pay || 0, tax_type || '4대보험']
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
    const {
      name, phone, email, ssn, address, emergency_contact, emergency_phone,
      hire_date, position, department, notes,
      work_start_time, work_end_time, work_days,
      salary_type, amount, weekly_holiday_pay, tax_type
    } = req.body;

    // 권한 확인
    const employee = await get('SELECT workplace_id FROM users WHERE id = ? AND role = "employee"', [employeeId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 사용자 정보 수정
    await run(
      'UPDATE users SET name = ?, phone = ?, email = ?, ssn = ?, address = ?, emergency_contact = ?, emergency_phone = ? WHERE id = ?',
      [name, phone, email, ssn, address, emergency_contact, emergency_phone, employeeId]
    );

    // 파일 처리
    const contractFile = req.files && req.files['contract_file'] ? req.files['contract_file'][0].filename : undefined;
    const resumeFile = req.files && req.files['resume_file'] ? req.files['resume_file'][0].filename : undefined;

    // 직원 상세정보 수정
    let updateQuery = 'UPDATE employee_details SET hire_date = ?, position = ?, department = ?, notes = ?, work_start_time = ?, work_end_time = ?, work_days = ?';
    let updateParams = [hire_date, position, department, notes, work_start_time, work_end_time, work_days];
    
    if (contractFile) {
      updateQuery += ', contract_file = ?';
      updateParams.push(contractFile);
    }
    
    if (resumeFile) {
      updateQuery += ', resume_file = ?';
      updateParams.push(resumeFile);
    }
    
    updateQuery += ' WHERE user_id = ?';
    updateParams.push(employeeId);
    
    await run(updateQuery, updateParams);

    // 급여 정보 수정
    if (salary_type && amount) {
      const existingSalary = await get('SELECT id FROM salary_info WHERE user_id = ?', [employeeId]);
      if (existingSalary) {
        await run(
          'UPDATE salary_info SET salary_type = ?, amount = ?, weekly_holiday_pay = ?, tax_type = ? WHERE user_id = ?',
          [salary_type, amount, weekly_holiday_pay, tax_type || '4대보험', employeeId]
        );
      } else {
        await run(
          'INSERT INTO salary_info (user_id, salary_type, amount, weekly_holiday_pay, tax_type) VALUES (?, ?, ?, ?, ?)',
          [employeeId, salary_type, amount, weekly_holiday_pay || 0, tax_type || '4대보험']
        );
      }
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
    const employee = await get('SELECT workplace_id FROM users WHERE id = ? AND role = "employee"', [employeeId]);
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

export default router;
