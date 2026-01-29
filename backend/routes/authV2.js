import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, get, all } from '../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================
// 1. 독립 회원가입 (사업주 / 근로자 공통)
// ============================================
router.post('/signup', async (req, res) => {
  const {
    username,
    password,
    name,
    phone,
    role,  // 'owner' 또는 'employee'
    business_number  // 사업주는 필수, 근로자는 선택
  } = req.body;

  try {
    // 입력 검증
    if (!username || !password || !name || !phone || !role) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    if (!['owner', 'employee'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 역할입니다.' 
      });
    }

    // 사업주인 경우 사업자등록번호 필수
    if (role === 'owner' && !business_number) {
      return res.status(400).json({ 
        success: false, 
        message: '사업자등록번호를 입력해주세요.' 
      });
    }

    // 사업자등록번호 형식 검증 (10자리 숫자)
    if (business_number && !/^\d{10}$/.test(business_number)) {
      return res.status(400).json({ 
        success: false, 
        message: '사업자등록번호는 10자리 숫자여야 합니다.' 
      });
    }

    // 중복 체크
    const existingUser = await get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 존재하는 아이디입니다.' 
      });
    }

    // 전화번호 중복 체크
    const existingPhone = await get(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existingPhone) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 등록된 전화번호입니다.' 
      });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = await run(
      `INSERT INTO users (
        username, password, name, phone, role, business_number, phone_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [username, hashedPassword, name, phone, role, business_number || null, 0]
    );

    const userId = result.lastID;

    // 사업주인 경우: companies 테이블에도 등록 (기본 회사 정보)
    if (role === 'owner' && business_number) {
      const companyResult = await run(
        `INSERT INTO companies (
          business_number, company_name, phone, verified, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [business_number, name + '의 사업장', phone, 0]
      );

      const companyId = companyResult.lastID;

      // company_admins에 등록
      await run(
        `INSERT INTO company_admins (
          company_id, user_id, role, granted_at
        ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
        [companyId, userId]
      );

      console.log(`✅ 사업주 회원가입 완료: ${username} (company_id: ${companyId})`);
    } else {
      console.log(`✅ 근로자 회원가입 완료: ${username}`);
    }

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      userId: userId
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 2. 로그인 (기존과 동일)
// ============================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '아이디 또는 비밀번호가 일치하지 않습니다.' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: '아이디 또는 비밀번호가 일치하지 않습니다.' 
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        businessNumber: user.business_number
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        businessNumber: user.business_number,
        phoneVerified: user.phone_verified
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 3. 사업자등록번호로 회사 검색 (근로자용)
// ============================================
router.get('/companies/search', async (req, res) => {
  const { business_number } = req.query;

  try {
    if (!business_number) {
      return res.status(400).json({ 
        success: false, 
        message: '사업자등록번호를 입력해주세요.' 
      });
    }

    const company = await get(
      `SELECT 
        c.id,
        c.business_number,
        c.company_name,
        c.representative_name,
        c.address,
        c.phone,
        c.verified,
        u.name as owner_name
      FROM companies c
      LEFT JOIN company_admins ca ON c.id = ca.company_id AND ca.role = 'owner'
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE c.business_number = ?
      LIMIT 1`,
      [business_number]
    );

    if (!company) {
      return res.json({
        success: false,
        message: '해당 사업자등록번호로 등록된 회사가 없습니다.'
      });
    }

    res.json({
      success: true,
      company: company
    });

  } catch (error) {
    console.error('회사 검색 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 4. 근로자 -> 회사 매칭 요청
// ============================================
router.post('/employee/match-request', async (req, res) => {
  const { 
    userId,           // 근로자 ID
    companyId,        // 회사 ID
    startDate,        // 입사일
    position,         // 직급
    employmentType,   // 고용형태
    taxType,          // 4대보험, 3.3%
    monthlySalary,    // 월급
    hourlyRate        // 시급
  } = req.body;

  try {
    // 입력 검증
    if (!userId || !companyId || !startDate) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    // 이미 같은 회사에 재직중인지 확인
    const existing = await get(
      `SELECT id FROM company_employee_relations 
       WHERE company_id = ? AND user_id = ? AND status = 'active' AND end_date IS NULL`,
      [companyId, userId]
    );

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 해당 회사에 재직중입니다.' 
      });
    }

    // 매칭 요청 생성 (status: 'pending' 으로 시작, 사업주 승인 필요)
    const result = await run(
      `INSERT INTO company_employee_relations (
        company_id, user_id, start_date, position, employment_type, status,
        tax_type, monthly_salary, hourly_rate, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [companyId, userId, startDate, position || '', employmentType || 'regular', 
       taxType || '4대보험', monthlySalary || 0, hourlyRate || 0]
    );

    console.log(`✅ 매칭 요청 생성: user ${userId} -> company ${companyId}`);

    res.json({
      success: true,
      message: '매칭 요청이 완료되었습니다. 사업주의 승인을 기다려주세요.',
      relationId: result.lastID
    });

  } catch (error) {
    console.error('매칭 요청 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 5. 사업주 -> 매칭 요청 목록 조회
// ============================================
router.get('/owner/match-requests/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const requests = await all(
      `SELECT 
        cer.id,
        cer.company_id,
        cer.user_id,
        cer.start_date,
        cer.position,
        cer.employment_type,
        cer.status,
        cer.tax_type,
        cer.monthly_salary,
        cer.hourly_rate,
        cer.created_at,
        u.name as employee_name,
        u.username as employee_username,
        u.phone as employee_phone
      FROM company_employee_relations cer
      JOIN users u ON cer.user_id = u.id
      WHERE cer.company_id = ? AND cer.status = 'pending'
      ORDER BY cer.created_at DESC`,
      [companyId]
    );

    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('매칭 요청 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 6. 사업주 -> 매칭 요청 승인/거부
// ============================================
router.post('/owner/match-approve', async (req, res) => {
  const { relationId, approve } = req.body;

  try {
    if (!relationId || approve === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    if (approve) {
      // 승인: status를 'active'로 변경
      await run(
        `UPDATE company_employee_relations 
         SET status = 'active', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [relationId]
      );

      console.log(`✅ 매칭 승인: relation ${relationId}`);
      res.json({
        success: true,
        message: '매칭이 승인되었습니다.'
      });
    } else {
      // 거부: status를 'rejected'로 변경 또는 삭제
      await run(
        `UPDATE company_employee_relations 
         SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [relationId]
      );

      console.log(`❌ 매칭 거부: relation ${relationId}`);
      res.json({
        success: true,
        message: '매칭이 거부되었습니다.'
      });
    }

  } catch (error) {
    console.error('매칭 승인/거부 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 7. 퇴사 처리
// ============================================
router.post('/employee/resign', async (req, res) => {
  const { relationId, endDate } = req.body;

  try {
    if (!relationId || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    // 퇴사 처리: end_date 설정, status를 'resigned'로 변경
    await run(
      `UPDATE company_employee_relations 
       SET end_date = ?, status = 'resigned', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [endDate, relationId]
    );

    console.log(`✅ 퇴사 처리: relation ${relationId}, end_date: ${endDate}`);

    res.json({
      success: true,
      message: '퇴사 처리가 완료되었습니다.'
    });

  } catch (error) {
    console.error('퇴사 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 8. 내 고용 이력 조회 (근로자용)
// ============================================
router.get('/employee/my-employment/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const employments = await all(
      `SELECT 
        cer.id as relation_id,
        cer.company_id,
        cer.start_date,
        cer.end_date,
        cer.position,
        cer.employment_type,
        cer.status,
        cer.tax_type,
        cer.monthly_salary,
        cer.hourly_rate,
        c.company_name,
        c.business_number,
        c.address
      FROM company_employee_relations cer
      JOIN companies c ON cer.company_id = c.id
      WHERE cer.user_id = ?
      ORDER BY cer.start_date DESC`,
      [userId]
    );

    res.json({
      success: true,
      employments: employments
    });

  } catch (error) {
    console.error('고용 이력 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 9. 내 급여명세서 조회 (근로자용, 모든 회사의 과거 이력 포함)
// ============================================
router.get('/employee/my-payslips/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const payslips = await all(
      `SELECT 
        ss.id,
        ss.payroll_month,
        ss.pay_date,
        ss.base_pay,
        ss.total_deductions,
        ss.net_pay,
        ss.tax_type,
        ss.published,
        ss.company_name,
        c.business_number
      FROM salary_slips ss
      LEFT JOIN companies c ON ss.company_id = c.id
      WHERE ss.user_id = ?
      ORDER BY ss.payroll_month DESC`,
      [userId]
    );

    res.json({
      success: true,
      payslips: payslips
    });

  } catch (error) {
    console.error('급여명세서 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 10. 사업주의 회사 정보 조회
// ============================================
router.get('/owner/my-companies/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const companies = await all(
      `SELECT 
        c.id,
        c.business_number,
        c.company_name,
        c.representative_name,
        c.business_type,
        c.address,
        c.phone,
        c.verified,
        ca.role
      FROM companies c
      JOIN company_admins ca ON c.id = ca.company_id
      WHERE ca.user_id = ?
      ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      companies: companies
    });

  } catch (error) {
    console.error('회사 정보 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


export default router;
