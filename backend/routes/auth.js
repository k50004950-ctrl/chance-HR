import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run, query } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-2026';

// 사용자명 중복 확인
router.get('/username-check', async (req, res) => {
  try {
    const username = (req.query.username || '').trim();
    if (!username) {
      return res.status(400).json({ message: '사용자명을 입력해주세요.' });
    }

    const user = await get('SELECT id FROM users WHERE username = ?', [username]);
    return res.json({ available: !user });
  } catch (error) {
    console.error('사용자명 확인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '사용자명과 비밀번호를 입력해주세요.' });
    }

    const user = await get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 승인 상태 확인 (관리자/총관리자는 제외)
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.approval_status === 'pending') {
      return res.status(403).json({ message: '관리자 승인 대기 중입니다. 승인 후 로그인하실 수 있습니다.' });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.approval_status === 'rejected') {
      return res.status(403).json({ message: '가입이 거부되었습니다. 관리자에게 문의하세요.' });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.approval_status === 'suspended') {
      return res.status(403).json({ message: '계정이 일시 중지되었습니다. 관리자에게 문의하세요.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        workplace_id: user.workplace_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        workplace_id: user.workplace_id
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 대표자 회원가입 (누구나 접근 가능)
router.post('/signup', async (req, res) => {
  try {
    const { 
      username, password, name, phone, email, address,
      business_name, business_number, additional_info, sales_rep, tax_office_name,
      latitude, longitude, radius, marketing_consent, service_consent
    } = req.body;

    if (!username || !password || !name || !business_name || !business_number || !phone) {
      return res.status(400).json({ message: '필수 정보를 모두 입력해주세요.' });
    }
    if (!address || !latitude || !longitude) {
      return res.status(400).json({ message: '사업장 주소와 좌표를 입력해주세요.' });
    }
    if (!service_consent) {
      return res.status(400).json({ message: '서비스 이용 동의가 필요합니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      `INSERT INTO users (
        username, password, name, role, phone, email, address,
        business_name, business_number, additional_info, sales_rep, tax_office_name, approval_status,
        marketing_consent, marketing_consent_date, service_consent, service_consent_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, name, 'owner', phone, email, address, 
       business_name, business_number, additional_info, sales_rep, tax_office_name, 'approved',
       !!marketing_consent, marketing_consent ? new Date().toISOString() : null,
       true, new Date().toISOString()]
    );

    try {
      await run(
        'INSERT INTO workplaces (name, address, latitude, longitude, radius, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
        [business_name, address, latitude, longitude, radius || 100, result.id]
      );
    } catch (workplaceError) {
      await run('DELETE FROM users WHERE id = ?', [result.id]);
      throw workplaceError;
    }

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      userId: result.id
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
    }
    console.error('회원가입 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 등록 (관리자/사업주만 가능)
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, phone, email, workplace_id } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      'INSERT INTO users (username, password, name, role, phone, email, workplace_id, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, phone, email, workplace_id, 'approved']
    );

    res.status(201).json({
      message: '사용자가 등록되었습니다.',
      userId: result.id
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
    }
    console.error('사용자 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주 목록 조회 (관리자만)
router.get('/owners', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const owners = await query(`
      SELECT 
        u.id, u.username, u.name, u.phone, u.email, u.address,
        u.business_name, u.business_number, u.additional_info, u.sales_rep,
        u.approval_status, u.created_at, u.service_consent, u.service_consent_date,
        COUNT(DISTINCT w.id) as workplace_count,
        COUNT(DISTINCT e.id) as employee_count
      FROM users u
      LEFT JOIN workplaces w ON u.id = w.owner_id
      LEFT JOIN users e ON e.workplace_id = w.id AND e.role = 'employee'
      WHERE u.role = 'owner'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(owners);
  } catch (error) {
    console.error('사업주 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 승인 대기 중인 대표자 목록 조회 (관리자만)
router.get('/pending-owners', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const pendingOwners = await query(`
      SELECT 
        id, username, name, phone, email, address,
        business_name, business_number, additional_info, sales_rep, created_at
      FROM users
      WHERE role = 'owner' AND approval_status = 'pending'
      ORDER BY created_at DESC
    `);
    res.json(pendingOwners);
  } catch (error) {
    console.error('승인 대기 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 대표자 승인/거부 (관리자만)
router.post('/approve-owner/:id', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const ownerId = req.params.id;
    const { action } = req.body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '유효하지 않은 액션입니다.' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    await run(
      'UPDATE users SET approval_status = ? WHERE id = ? AND role = ?',
      [status, ownerId, 'owner']
    );

    res.json({ 
      message: action === 'approve' ? '승인되었습니다.' : '거부되었습니다.' 
    });
  } catch (error) {
    console.error('승인/거부 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주 계정 활성화/비활성화 (관리자만)
router.put('/owners/:id/toggle-status', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const ownerId = req.params.id;

    // 현재 상태 조회
    const owner = await get('SELECT approval_status FROM users WHERE id = ? AND role = ?', [ownerId, 'owner']);

    if (!owner) {
      return res.status(404).json({ message: '사업주를 찾을 수 없습니다.' });
    }

    // 상태 토글
    const newStatus = owner.approval_status === 'approved' ? 'suspended' : 'approved';

    await run(
      'UPDATE users SET approval_status = ? WHERE id = ? AND role = ?',
      [newStatus, ownerId, 'owner']
    );

    const message = newStatus === 'suspended' 
      ? '사업주 계정이 일시 중지되었습니다.' 
      : '사업주 계정이 활성화되었습니다.';

    res.json({ message, newStatus });
  } catch (error) {
    console.error('계정 상태 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주 계정 삭제 (관리자만)
router.delete('/owners/:id', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const ownerId = req.params.id;

    const owner = await get('SELECT id FROM users WHERE id = ? AND role = ?', [ownerId, 'owner']);
    if (!owner) {
      return res.status(404).json({ message: '사업주를 찾을 수 없습니다.' });
    }

    const workplaces = await query('SELECT id FROM workplaces WHERE owner_id = ?', [ownerId]);
    const workplaceIds = workplaces.map((workplace) => workplace.id);

    if (workplaceIds.length > 0) {
      const workplacePlaceholders = workplaceIds.map(() => '?').join(',');
      const employees = await query(
        `SELECT id FROM users WHERE role = ? AND workplace_id IN (${workplacePlaceholders})`,
        ['employee', ...workplaceIds]
      );
      const employeeIds = employees.map((employee) => employee.id);

      if (employeeIds.length > 0) {
        const employeePlaceholders = employeeIds.map(() => '?').join(',');
        await run(`DELETE FROM attendance WHERE user_id IN (${employeePlaceholders})`, employeeIds);
        await run(`DELETE FROM salary_history WHERE user_id IN (${employeePlaceholders})`, employeeIds);
        await run(`DELETE FROM employee_past_payroll WHERE user_id IN (${employeePlaceholders})`, employeeIds);
        await run(`DELETE FROM salary_info WHERE user_id IN (${employeePlaceholders})`, employeeIds);
        await run(`DELETE FROM employee_details WHERE user_id IN (${employeePlaceholders})`, employeeIds);
        await run(`DELETE FROM users WHERE id IN (${employeePlaceholders})`, employeeIds);
      }

      await run(`DELETE FROM past_employees WHERE workplace_id IN (${workplacePlaceholders})`, workplaceIds);
      await run(`DELETE FROM attendance WHERE workplace_id IN (${workplacePlaceholders})`, workplaceIds);
      await run(`DELETE FROM salary_info WHERE workplace_id IN (${workplacePlaceholders})`, workplaceIds);
      await run(`DELETE FROM employee_details WHERE workplace_id IN (${workplacePlaceholders})`, workplaceIds);
      await run(`DELETE FROM workplaces WHERE id IN (${workplacePlaceholders})`, workplaceIds);
    }

    await run('DELETE FROM users WHERE id = ? AND role = ?', [ownerId, 'owner']);

    res.json({ message: '사업주 계정과 관련 데이터가 삭제되었습니다.' });
  } catch (error) {
    console.error('사업주 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 비밀번호 변경
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // 현재 사용자 정보 조회
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주: 소속 직원 비밀번호 초기화
router.put('/owner/reset-employee-password', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ message: '아이디와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: '새 비밀번호는 최소 4자 이상이어야 합니다.' });
    }

    // 직원이 사업주의 사업장에 소속되어 있는지 확인
    const employee = await get(
      "SELECT id, username, role, workplace_id FROM users WHERE username = ? AND role = 'employee'",
      [username]
    );

    if (!employee) {
      return res.status(404).json({ message: '해당 아이디의 근로자를 찾을 수 없습니다.' });
    }

    // 사업주 본인 사업장 소속 확인
    if (req.user.role === 'owner' && employee.workplace_id !== req.user.workplace_id) {
      return res.status(403).json({ message: '본인 사업장 소속 직원만 초기화할 수 있습니다.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, employee.id]);

    res.json({ message: `${username} 직원의 비밀번호가 초기화되었습니다.` });
  } catch (error) {
    console.error('직원 비밀번호 초기화 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 비밀번호 초기화
router.put('/reset-password', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ message: '사용자명과 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: '새 비밀번호는 최소 4자 이상이어야 합니다.' });
    }

    const user = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    res.json({ message: '비밀번호가 초기화되었습니다.' });
  } catch (error) {
    console.error('비밀번호 초기화 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자: 테스트 계정 생성
router.post('/create-test-workers', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const workplaceId = req.user.workplace_id;

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash('1234', 10);

    const results = [];

    // 1. 월급 근로자 (김월급)
    let monthlyUser = await get("SELECT id FROM users WHERE username = 'test_monthly' AND workplace_id = ?", [workplaceId]);
    
    if (monthlyUser) {
      await run("DELETE FROM attendance WHERE user_id = ?", [monthlyUser.id]);
      await run("DELETE FROM salary_info WHERE user_id = ?", [monthlyUser.id]);
      await run("DELETE FROM employee_details WHERE user_id = ?", [monthlyUser.id]);
      await run("DELETE FROM users WHERE id = ?", [monthlyUser.id]);
    }

    const monthlyResult = await run(
      `INSERT INTO users (username, password, name, role, workplace_id, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['test_monthly', hashedPassword, '김월급', 'employee', workplaceId, '010-1111-1111']
    );

    let monthlyUserId = monthlyResult.lastID || monthlyResult.insertId;
    if (!monthlyUserId) {
      const user = await get("SELECT id FROM users WHERE username = 'test_monthly' AND workplace_id = ?", [workplaceId]);
      monthlyUserId = user.id;
    }

    await run(
      `INSERT INTO employee_details (user_id, hire_date, work_days, work_start_time, work_end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [monthlyUserId, '2026-01-01', 'mon,tue,wed,thu,fri', '09:00', '18:00']
    );

    await run(
      `INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, tax_type, weekly_holiday_type, weekly_holiday_pay)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [monthlyUserId, workplaceId, 'monthly', 2000000, '4대보험', 'included', 1]
    );

    results.push({ name: '김월급', username: 'test_monthly', id: monthlyUserId });

    // 2. 시급 근로자 (박시급)
    let hourlyUser = await get("SELECT id FROM users WHERE username = 'test_hourly' AND workplace_id = ?", [workplaceId]);
    
    if (hourlyUser) {
      await run("DELETE FROM attendance WHERE user_id = ?", [hourlyUser.id]);
      await run("DELETE FROM salary_info WHERE user_id = ?", [hourlyUser.id]);
      await run("DELETE FROM employee_details WHERE user_id = ?", [hourlyUser.id]);
      await run("DELETE FROM users WHERE id = ?", [hourlyUser.id]);
    }

    const hourlyResult = await run(
      `INSERT INTO users (username, password, name, role, workplace_id, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['test_hourly', hashedPassword, '박시급', 'employee', workplaceId, '010-2222-2222']
    );

    let hourlyUserId = hourlyResult.lastID || hourlyResult.insertId;
    if (!hourlyUserId) {
      const user = await get("SELECT id FROM users WHERE username = 'test_hourly' AND workplace_id = ?", [workplaceId]);
      hourlyUserId = user.id;
    }

    await run(
      `INSERT INTO employee_details (user_id, hire_date, work_days, work_start_time, work_end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [hourlyUserId, '2026-01-01', 'mon,tue,wed,thu,fri', '09:00', '18:00']
    );

    await run(
      `INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, tax_type, weekly_holiday_type, weekly_holiday_pay)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hourlyUserId, workplaceId, 'hourly', 10000, '4대보험', 'separate', 1]
    );

    results.push({ name: '박시급', username: 'test_hourly', id: hourlyUserId });

    // 3. 2026년 1월 출퇴근 기록 생성
    const year = 2026;
    const month = 1;
    
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 월급 근로자 출근 기록
      let monthlyStatus = 'completed';
      let monthlyCheckIn = `${dateStr} 09:00:00`;
      let monthlyCheckOut = `${dateStr} 18:00:00`;
      let monthlyWorkHours = 8.0;

      if (day === 7 || day === 21) {
        monthlyStatus = 'absent';
        monthlyCheckIn = null;
        monthlyCheckOut = null;
        monthlyWorkHours = 0;
      } else if (day === 3 || day === 13 || day === 27) {
        monthlyCheckIn = `${dateStr} 09:35:00`;
      }

      if (monthlyCheckIn) {
        await run(
          `INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_out_time, work_hours, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [monthlyUserId, workplaceId, dateStr, monthlyCheckIn, monthlyCheckOut, monthlyWorkHours, monthlyStatus, monthlyCheckIn]
        );
      }

      // 시급 근로자 출근 기록
      let hourlyStatus = 'completed';
      let hourlyCheckIn = `${dateStr} 09:00:00`;
      let hourlyCheckOut = `${dateStr} 18:00:00`;
      let hourlyWorkHours = 8.0;

      if (day === 10 || day === 24) {
        hourlyStatus = 'absent';
        hourlyCheckIn = null;
        hourlyCheckOut = null;
        hourlyWorkHours = 0;
      } else if (day === 5 || day === 15 || day === 28) {
        hourlyCheckIn = `${dateStr} 09:45:00`;
      } else if (day === 8 || day === 22) {
        hourlyCheckOut = `${dateStr} 17:00:00`;
        hourlyWorkHours = 7.0;
      }

      if (hourlyCheckIn) {
        await run(
          `INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_out_time, work_hours, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [hourlyUserId, workplaceId, dateStr, hourlyCheckIn, hourlyCheckOut, hourlyWorkHours, hourlyStatus, hourlyCheckIn]
        );
      }
    }

    res.json({
      message: '테스트 계정이 생성되었습니다.',
      accounts: results,
      info: {
        monthly: {
          name: '김월급',
          username: 'test_monthly',
          password: '1234',
          salary: '월급 2,000,000원 (4대보험)'
        },
        hourly: {
          name: '박시급',
          username: 'test_hourly',
          password: '1234',
          salary: '시급 10,000원 (4대보험, 주휴수당 별도)'
        }
      }
    });
  } catch (error) {
    console.error('테스트 계정 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
});

// 총관리자 전용: 계정 완전 삭제
router.delete('/delete-user/:userId', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔐 삭제 요청 - 요청자: ${req.user?.username} (role: ${req.user?.role}), 대상 ID: ${userId}`);

    // 자기 자신은 삭제 불가
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: '자신의 계정은 삭제할 수 없습니다.' });
    }

    // 삭제할 사용자 확인
    const userToDelete = await get('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!userToDelete) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 관련된 모든 데이터 삭제 (순서 중요: 외래키 제약조건 고려)
    console.log(`🗑️ 사용자 삭제 시작: ${userToDelete.username} (ID: ${userId})`);

    // 1. 출퇴근 기록 삭제
    await run('DELETE FROM attendance WHERE user_id = ?', [userId]);
    console.log('  ✅ 출퇴근 기록 삭제 완료');

    // 2. 급여 정보 삭제
    await run('DELETE FROM salary_info WHERE user_id = ?', [userId]);
    console.log('  ✅ 급여 정보 삭제 완료');

    // 3. 급여 명세서 삭제
    await run('DELETE FROM salary_slips WHERE user_id = ?', [userId]);
    console.log('  ✅ 급여 명세서 삭제 완료');

    // 4. 확정된 급여 기록 삭제
    await run('DELETE FROM payroll_finalized WHERE employee_id = ?', [userId]);
    console.log('  ✅ 확정 급여 기록 삭제 완료');

    // 5. 직원 상세정보 삭제
    await run('DELETE FROM employee_details WHERE user_id = ?', [userId]);
    console.log('  ✅ 직원 상세정보 삭제 완료');

    // 6. 공지사항 읽음 상태 삭제
    await run('DELETE FROM user_announcements WHERE user_id = ?', [userId]);
    console.log('  ✅ 공지사항 읽음 상태 삭제 완료');

    // 7. Push 알림 구독 삭제
    await run('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
    console.log('  ✅ Push 알림 구독 삭제 완료');

    // 8. 작성한 공지사항 삭제 (사업주/관리자인 경우)
    await run('DELETE FROM announcements WHERE created_by = ?', [userId]);
    console.log('  ✅ 작성한 공지사항 삭제 완료');

    // 9. 소유한 회사(company) 삭제 (사업주인 경우)
    if (userToDelete.role === 'owner' || userToDelete.role === 'super_admin') {
      try {
        const companies = await query('SELECT id, name FROM companies WHERE id IN (SELECT company_id FROM users WHERE id = ?)', [userId]);
        if (companies.length > 0) {
          console.log(`  🏢 ${companies.length}개 회사 발견`);
          for (const company of companies) {
            await run('DELETE FROM companies WHERE id = ?', [company.id]);
            console.log(`    ✅ 회사 "${company.name}" 삭제`);
          }
        }
      } catch (error) {
        console.error('  ❌ 회사 삭제 중 오류:', error.message);
        // 회사 삭제는 실패해도 계속 진행
      }
    }

    // 10. 소유한 사업장 삭제 (사업주인 경우)
    if (userToDelete.role === 'owner' || userToDelete.role === 'super_admin') {
      try {
        const workplaces = await query('SELECT id FROM workplaces WHERE owner_id = ?', [userId]);
        console.log(`  📍 ${workplaces.length}개 사업장 발견`);
        
        for (const workplace of workplaces) {
          console.log(`  🏢 사업장 ${workplace.id} 삭제 중...`);
          // 사업장 관련 데이터 삭제 (순서 중요: 외래키 제약조건 고려)
          await run('DELETE FROM employee_details WHERE workplace_id = ?', [workplace.id]);
          console.log(`    ✅ 직원 상세정보 삭제`);
          
          await run('DELETE FROM attendance WHERE user_id IN (SELECT id FROM users WHERE workplace_id = ?)', [workplace.id]);
          console.log(`    ✅ 출퇴근 기록 삭제`);
          
          await run('DELETE FROM salary_info WHERE workplace_id = ?', [workplace.id]);
          console.log(`    ✅ 급여 정보 삭제`);
          
          await run('DELETE FROM salary_slips WHERE workplace_id = ?', [workplace.id]);
          console.log(`    ✅ 급여 명세서 삭제`);
          
          await run('DELETE FROM payroll_finalized WHERE workplace_id = ?', [workplace.id]);
          console.log(`    ✅ 확정 급여 삭제`);
          
          // 사업장 소속 직원들의 workplace_id를 NULL로 설정
          await run('UPDATE users SET workplace_id = NULL WHERE workplace_id = ?', [workplace.id]);
          console.log(`    ✅ 직원 연결 해제`);
          
          // 사업장 삭제
          await run('DELETE FROM workplaces WHERE id = ?', [workplace.id]);
          console.log(`  ✅ 사업장 ${workplace.id} 삭제 완료`);
        }
        console.log('  ✅ 소유 사업장 삭제 완료');
      } catch (error) {
        console.error('  ❌ 사업장 삭제 중 오류:', error.message);
        throw error;
      }
    }

    // 11. 사용자 계정 삭제
    await run('DELETE FROM users WHERE id = ?', [userId]);
    console.log('  ✅ 사용자 계정 삭제 완료');

    console.log(`🎉 사용자 삭제 완료: ${userToDelete.username}`);

    res.json({ 
      message: '사용자가 완전히 삭제되었습니다.',
      deletedUser: {
        id: userToDelete.id,
        username: userToDelete.username,
        name: userToDelete.name,
        role: userToDelete.role
      }
    });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ message: '사용자 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
