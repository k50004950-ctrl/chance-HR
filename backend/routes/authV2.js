import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, get, all } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { encryptSSN } from '../utils/crypto.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-2026';

// ============================================
// 1. 독립 회원가입 (사업주 / 근로자 공통)
// ============================================
router.post('/signup', signupLimiter, async (req, res) => {
  const {
    username,
    password,
    name,
    phone,
    role,  // 'owner' 또는 'employee'
    business_number,  // 사업주는 필수, 근로자는 선택
    ssn,  // 근로자 주민등록번호
    email,  // 근로자 이메일
    address  // 근로자 주소
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

    // 근로자인 경우 주민등록번호, 이메일, 주소 필수
    if (role === 'employee') {
      if (!ssn || !email || !address) {
        return res.status(400).json({ 
          success: false, 
          message: '근로자는 주민등록번호, 이메일, 주소가 필수입니다.' 
        });
      }

      // 주민등록번호 형식 검증 (13자리 숫자)
      if (!/^\d{13}$/.test(ssn)) {
        return res.status(400).json({ 
          success: false, 
          message: '주민등록번호는 13자리 숫자여야 합니다.' 
        });
      }
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

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성 (근로자는 ssn, email, address 포함 - SSN은 암호화)
    const encryptedSSN = encryptSSN(ssn);
    const result = await run(
      `INSERT INTO users (
        username, password, name, phone, role, business_number, ssn, email, address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        username,
        hashedPassword,
        name,
        phone,
        role,
        business_number || null,
        encryptedSSN,
        email || null,
        address || null
      ]
    );

    const userId = result.id || result.lastID; // PostgreSQL은 id, SQLite는 lastID

    console.log(`✅ 근로자 회원가입 완료: ${username}`, {
      ssn: ssn ? '✓' : '✗',
      email: email ? '✓' : '✗',
      address: address ? '✓' : '✗'
    });

    // 사업주인 경우: companies 테이블에도 등록 (기본 회사 정보)
    if (role === 'owner' && business_number) {
      try {
        // 이미 존재하는 사업자등록번호인지 확인
        const existingCompany = await get(
          'SELECT id FROM companies WHERE business_number = ?',
          [business_number]
        );

        let companyId;

        if (existingCompany) {
          // 이미 존재하는 회사에 관리자로 추가
          companyId = existingCompany.id;
          console.log(`📌 기존 회사에 관리자 추가: company_id ${companyId}`);
        } else {
          // 새 회사 생성
          const companyResult = await run(
            `INSERT INTO companies (
              business_number, company_name, phone, verified, created_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [business_number, name + '의 사업장', phone, false]
          );
          companyId = companyResult.id || companyResult.lastID; // PostgreSQL은 id, SQLite는 lastID
          console.log(`✅ 새 회사 생성: company_id ${companyId}`);
        }

        // company_admins에 등록
        await run(
          `INSERT INTO company_admins (
            company_id, user_id, role, granted_at
          ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
          [companyId, userId]
        );

        // 🏢 기본 사업장(workplace) 자동 생성
        const workplaceResult = await run(
          `INSERT INTO workplaces (
            owner_id, company_id, name, business_number, address, phone, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [userId, companyId, name + '의 사업장', business_number, '', phone]
        );
        
        const workplaceId = workplaceResult.id || workplaceResult.lastID; // PostgreSQL은 id, SQLite는 lastID
        console.log(`🏢 기본 사업장 생성: workplace_id ${workplaceId}`);

        // users 테이블에 workplace_id 연결
        await run(
          `UPDATE users SET workplace_id = ? WHERE id = ?`,
          [workplaceId, userId]
        );
        console.log(`🔗 사용자와 사업장 연결 완료`);

        console.log(`✅ 사업주 회원가입 완료: ${username} (company_id: ${companyId}, workplace_id: ${workplaceId})`);
      } catch (companyError) {
        console.error('회사 등록 오류:', companyError);
        // 회사 등록 실패해도 사용자 계정은 생성되었으므로 계속 진행
        console.log(`⚠️  사용자는 생성되었으나 회사 등록 실패: ${username}`);
      }
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
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    // 입력 검증
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '아이디와 비밀번호를 입력해주세요.' 
      });
    }

    console.log(`🔐 로그인 시도: ${username}`);

    const user = await get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      console.log(`❌ 사용자 없음: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: '아이디 또는 비밀번호가 일치하지 않습니다.' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`❌ 비밀번호 불일치: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: '아이디 또는 비밀번호가 일치하지 않습니다.' 
      });
    }

    console.log(`✅ 비밀번호 확인 완료: ${username}`);

    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        businessNumber: user.business_number || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`🎫 JWT 토큰 발급 완료: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        role: user.role,
        workplace_id: user.workplace_id || null,
        must_change_password: !!user.must_change_password
      }
    });

    console.log(`✅ 로그인 성공: ${username}`);

  } catch (error) {
    console.error('로그인 오류:', error);
    console.error('에러 스택:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '로그인 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
});


// ============================================
// 3. 사업자등록번호 + 사업주 핸드폰번호로 회사 검색 (근로자용)
// ============================================
router.get('/companies/search', async (req, res) => {
  const { business_number, owner_phone } = req.query;

  try {
    if (!business_number) {
      return res.status(400).json({ 
        success: false, 
        message: '사업자등록번호를 입력해주세요.' 
      });
    }

    if (!owner_phone) {
      return res.status(400).json({ 
        success: false, 
        message: '사업주 핸드폰번호를 입력해주세요.' 
      });
    }

    console.log(`🔍 회사 검색 시도:`, { business_number, owner_phone });

    // 사업자등록번호와 사업주 핸드폰번호 매칭
    const cleanPhone = owner_phone.replace(/-/g, '');

    // 1차: 전화번호까지 매칭
    let company = await get(
      `SELECT
        c.id, c.business_number, c.company_name, c.representative_name,
        c.address, c.phone, c.verified,
        u.name as owner_name, u.phone as owner_phone, u.id as owner_user_id
      FROM companies c
      LEFT JOIN company_admins ca ON c.id = ca.company_id AND ca.role = 'owner'
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE REPLACE(c.business_number, '-', '') = ?
        AND (REPLACE(u.phone, '-', '') = ? OR REPLACE(c.phone, '-', '') = ?)
      LIMIT 1`,
      [business_number, cleanPhone, cleanPhone]
    );

    // 2차: 전화번호가 더미값이면 사업자등록번호만으로 매칭 (전화번호 자동 등록)
    if (!company) {
      company = await get(
        `SELECT
          c.id, c.business_number, c.company_name, c.representative_name,
          c.address, c.phone, c.verified,
          u.name as owner_name, u.phone as owner_phone, u.id as owner_user_id
        FROM companies c
        LEFT JOIN company_admins ca ON c.id = ca.company_id AND ca.role = 'owner'
        LEFT JOIN users u ON ca.user_id = u.id
        WHERE REPLACE(c.business_number, '-', '') = ?
          AND (u.phone IS NULL OR u.phone = '' OR u.phone = '00000000000'
               OR c.phone IS NULL OR c.phone = '' OR c.phone = '00000000000')
        LIMIT 1`,
        [business_number]
      );

      // 더미 전화번호로 매칭된 경우: 실제 전화번호 자동 업데이트
      if (company) {
        console.log(`📱 더미 전화번호 사업주 발견 - 자동 업데이트: company ${company.id}`);
        try {
          if (company.owner_user_id) {
            await run('UPDATE users SET phone = ? WHERE id = ?', [cleanPhone, company.owner_user_id]);
          }
          await run('UPDATE companies SET phone = ? WHERE id = ?', [cleanPhone, company.id]);
          console.log(`✅ 전화번호 업데이트 완료: ${cleanPhone}`);
        } catch (e) {
          console.error('전화번호 업데이트 실패:', e.message);
        }
      }
    }

    console.log(`🔍 검색 결과:`, company ? `✅ 찾음 (${company.company_name})` : '❌ 없음');

    if (!company) {
      return res.json({
        success: false,
        message: '사업자등록번호 또는 사업주 핸드폰번호가 일치하지 않습니다. 다시 확인해주세요.'
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
// 4. 근로자 -> 회사 매칭 요청 (근무정보는 사업주가 승인 시 입력)
// ============================================
router.post('/employee/match-request', authenticate, async (req, res) => {
  const { 
    userId,     // 근로자 ID
    companyId   // 회사 ID
  } = req.body;

  try {
    // 입력 검증
    if (!userId || !companyId) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    // 이미 같은 회사에 매칭 중이거나 재직중인지 확인
    const existing = await get(
      `SELECT id, status FROM company_employee_relations
       WHERE company_id = ? AND user_id = ?`,
      [companyId, userId]
    );

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: '이미 매칭 요청이 대기 중입니다.'
        });
      } else if (existing.status === 'active') {
        return res.status(400).json({
          success: false,
          message: '이미 해당 회사에 재직중입니다.'
        });
      } else if (existing.status === 'resigned') {
        // 퇴직 후 재입사 요청: 기존 레코드를 pending으로 재활성화
        await run(
          `UPDATE company_employee_relations
           SET status = 'pending', start_date = CURRENT_DATE, end_date = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [existing.id]
        );
        console.log(`✅ 재입사 매칭 요청: user ${userId} -> company ${companyId} (기존 resigned → pending)`);
        return res.json({
          success: true,
          message: '재입사 매칭 요청이 전송되었습니다. 사업주 승인을 기다려주세요.'
        });
      }
    }

    // 매칭 요청 생성 (status: 'pending', start_date는 현재 날짜, 근무정보는 사업주가 승인 시 입력)
    const result = await run(
      `INSERT INTO company_employee_relations (
        company_id, user_id, status, start_date, created_at
      ) VALUES (?, ?, 'pending', CURRENT_DATE, CURRENT_TIMESTAMP)`,
      [companyId, userId]
    );

    console.log(`✅ 매칭 요청 생성: user ${userId} -> company ${companyId}`);

    res.json({
      success: true,
      message: '매칭 요청이 완료되었습니다. 사업주의 승인을 기다려주세요.',
      relationId: result.id || result.lastID
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
router.get('/owner/match-requests/:companyId', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
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
router.post('/owner/match-approve', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  const { relationId, approve } = req.body;

  try {
    if (!relationId || approve === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    if (approve) {
      // 먼저 relation 정보 가져오기
      const relation = await get(
        `SELECT user_id, company_id, workplace_id, start_date, position, monthly_salary, hourly_rate, tax_type
         FROM company_employee_relations 
         WHERE id = ?`,
        [relationId]
      );

      if (!relation) {
        return res.status(404).json({ 
          success: false, 
          message: '매칭 요청을 찾을 수 없습니다.' 
        });
      }

      // workplace_id가 없으면 회사의 workplace 찾기
      let workplaceId = relation.workplace_id;
      if (!workplaceId) {
        const workplace = await get(
          `SELECT w.id FROM workplaces w
           JOIN companies c ON w.company_id = c.id
           WHERE c.id = ?
           LIMIT 1`,
          [relation.company_id]
        );

        if (workplace) {
          workplaceId = workplace.id;
          console.log(`🔍 workplace 찾음: ${workplaceId} (company: ${relation.company_id})`);
        }
      }

      // 승인: status를 'active'로 변경하고 workplace_id 설정
      await run(
        `UPDATE company_employee_relations 
         SET status = 'active', workplace_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [workplaceId, relationId]
      );

      console.log(`✅ 매칭 승인: relation ${relationId}, workplace ${workplaceId}`);

      // 🔗 기존 시스템 호환성: users 테이블도 업데이트
      try {
        if (workplaceId) {
          await run(
            `UPDATE users 
             SET workplace_id = ?, employment_status = 'active' 
             WHERE id = ?`,
            [workplaceId, relation.user_id]
          );
          console.log(`✅ users 테이블 업데이트: user ${relation.user_id} -> workplace ${workplaceId}`);
        }

        // employee_details가 없으면 생성
        const existing = await get(
          'SELECT id FROM employee_details WHERE user_id = ?',
          [relation.user_id]
        );

        if (!existing && workplaceId) {
          await run(
            `INSERT INTO employee_details (
              user_id, workplace_id, hire_date, position, monthly_salary, hourly_rate, tax_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              relation.user_id,
              workplaceId,
              relation.start_date,
              relation.position || '',
              relation.monthly_salary || 0,
              relation.hourly_rate || 0,
              relation.tax_type || '4대보험'
            ]
          );
          console.log(`✅ employee_details 생성: user ${relation.user_id}`);
        }
      } catch (compatError) {
        console.error('⚠️  기존 시스템 호환성 업데이트 오류:', compatError);
        // 호환성 오류는 무시하고 V2 승인은 계속 진행
      }

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
router.post('/employee/resign', authenticate, async (req, res) => {
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
       SET end_date = ?, status = 'resigned', resignation_date = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [endDate, endDate, relationId]
    );

    // 🔗 기존 시스템 호환성: users 테이블도 업데이트
    try {
      const relation = await get(
        'SELECT user_id FROM company_employee_relations WHERE id = ?',
        [relationId]
      );

      if (relation) {
        await run(
          `UPDATE users 
           SET employment_status = 'resigned', resignation_date = ? 
           WHERE id = ?`,
          [endDate, relation.user_id]
        );
        console.log(`✅ users 테이블 업데이트 (퇴사): user ${relation.user_id}`);

        // employee_details도 업데이트
        await run(
          `UPDATE employee_details 
           SET resignation_date = ? 
           WHERE user_id = ?`,
          [endDate, relation.user_id]
        );
        console.log(`✅ employee_details 업데이트 (퇴사): user ${relation.user_id}`);
      }
    } catch (compatError) {
      console.error('⚠️  기존 시스템 호환성 업데이트 오류:', compatError);
      // 호환성 오류는 무시하고 V2 퇴사는 계속 진행
    }

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
router.get('/employee/my-employment/:userId', authenticate, async (req, res) => {
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
router.get('/employee/my-payslips/:userId', authenticate, async (req, res) => {
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
router.get('/owner/my-companies/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;

  try {
    let companies = await all(
      `SELECT 
        c.id,
        c.business_number,
        c.company_name,
        c.representative_name,
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

    // V1 시스템 사용자: 회사가 없지만 workplace가 있는 경우 자동 마이그레이션
    if (companies.length === 0) {
      console.log(`🔄 V1 사용자 자동 마이그레이션 시도: userId ${userId}`);
      
      // 사용자의 workplace와 정보 조회
      const userWorkplaces = await all(
        `SELECT w.id, w.name, w.address, w.business_number as workplace_business_number, 
                u.name as owner_name, u.phone as owner_phone, u.business_number as user_business_number
         FROM workplaces w
         JOIN users u ON w.owner_id = u.id
         WHERE w.owner_id = ?`,
        [userId]
      );

      if (userWorkplaces.length > 0) {
        const workplace = userWorkplaces[0];
        console.log(`📋 사업장 정보:`, { 
          id: workplace.id, 
          name: workplace.name, 
          workplace_business: workplace.workplace_business_number,
          user_business: workplace.user_business_number 
        });
        
        // 사업자등록번호 우선순위: workplace > user > 임시생성
        const businessNumber = workplace.workplace_business_number || 
                              workplace.user_business_number || 
                              `T${userId}${Date.now()}`.substring(0, 20);
        console.log(`🔢 사용할 사업자번호: ${businessNumber}`);
        
        // 회사 생성
        if (true) { // 항상 실행
          // 이미 존재하는 회사인지 확인
          const existingCompany = await get(
            'SELECT id FROM companies WHERE business_number = ?',
            [businessNumber]
          );

          let companyId;

          if (existingCompany) {
            companyId = existingCompany.id;
            console.log(`✅ 기존 회사 발견: company_id ${companyId}`);
          } else {
            // 새 회사 생성
            const companyResult = await run(
              `INSERT INTO companies (
                business_number, company_name, phone, verified, created_at
              ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [businessNumber, workplace.name, workplace.owner_phone, false]
            );
            companyId = companyResult.id || companyResult.lastID;
            console.log(`✅ 새 회사 생성: company_id ${companyId}`);
          }

          // company_admins에 추가 (중복 체크)
          const existingAdmin = await get(
            'SELECT id FROM company_admins WHERE company_id = ? AND user_id = ?',
            [companyId, userId]
          );
          
          if (!existingAdmin) {
            await run(
              `INSERT INTO company_admins (
                company_id, user_id, role, granted_at
              ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
              [companyId, userId]
            );
            console.log(`✅ company_admins 등록: ${userId} → ${companyId}`);
          } else {
            console.log(`ℹ️ 이미 등록된 관리자: ${userId} → ${companyId}`);
          }

          // workplace에 company_id 연결
          await run(
            `UPDATE workplaces SET company_id = ? WHERE id = ?`,
            [companyId, workplace.id]
          );

          console.log(`🎉 V1 사용자 마이그레이션 완료: userId ${userId} → companyId ${companyId}`);

          // 다시 조회
          companies = await all(
            `SELECT 
              c.id,
              c.business_number,
              c.company_name,
              c.representative_name,
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
        }
      }
    }

    res.json({
      success: true,
      companies: companies
    });

  } catch (error) {
    console.error('❌ 회사 정보 조회 오류:', error);
    console.error('❌ 에러 상세:', error.message);
    console.error('❌ 스택:', error.stack);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});


// ============================================
// 11. 사업주 -> 회사 직원 목록 조회
// ============================================
router.get('/owner/employees/:companyId', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  const { companyId } = req.params;

  try {
    const employees = await all(
      `SELECT 
        cer.id as relation_id,
        cer.user_id,
        cer.start_date,
        cer.end_date,
        cer.position,
        cer.employment_type,
        cer.tax_type,
        cer.status,
        cer.monthly_salary,
        cer.hourly_rate,
        u.name,
        u.username,
        u.phone,
        u.email
      FROM company_employee_relations cer
      JOIN users u ON cer.user_id = u.id
      WHERE cer.company_id = ? AND cer.status IN ('active', 'pending')
      ORDER BY cer.status ASC, cer.start_date DESC`,
      [companyId]
    );

    res.json({
      success: true,
      employees: employees
    });

  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});


// ============================================
// 사업장 수동 생성 (사업주 전용)
// ============================================
router.post('/owner/create-workplace', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  let { companyId, ownerId, name, address, phone, latitude, longitude, radius, business_number } = req.body;

  try {
    // 필수 항목 체크 (companyId는 제외 - 자동 생성 가능)
    if (!ownerId || !name || !business_number || !address || !latitude || !longitude || !radius) {
      return res.status(400).json({ success: false, message: '필수 항목을 모두 입력해주세요.' });
    }

    // companyId가 없으면 자동 생성 (V1 사용자 지원)
    if (!companyId) {
      console.log('🔄 companyId 없음. 자동 생성 시작...');
      
      // 사용자 정보 조회
      const owner = await get(
        `SELECT id, name, phone, business_number FROM users WHERE id = ?`,
        [ownerId]
      );

      if (!owner) {
        return res.status(404).json({ 
          success: false, 
          message: '사용자를 찾을 수 없습니다.' 
        });
      }

      // 회사 자동 생성
      const companyResult = await run(
        `INSERT INTO companies (name, business_number, representative_name, phone, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [name, business_number, owner.name, phone || owner.phone || '미정']
      );
      companyId = companyResult.id || companyResult.lastID;

      // users 테이블의 company_id 업데이트
      await run(
        `UPDATE users SET company_id = ? WHERE id = ?`,
        [companyId, ownerId]
      );

      console.log(`✅ 회사 자동 생성 완료: ${name} (company_id: ${companyId})`);
    }

    // 사업장 생성 (phone과 business_number는 companies 테이블에 저장됨)
    const result = await run(
      `INSERT INTO workplaces (
        company_id, owner_id, name, address, latitude, longitude, radius, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [companyId, ownerId, name, address, latitude, longitude, radius]
    );
    const workplaceId = result.id || result.lastID; // PostgreSQL은 id, SQLite는 lastID

    // 사용자의 workplace_id 업데이트 (기본 사업장으로 설정)
    await run(
      `UPDATE users SET workplace_id = ? WHERE id = ?`,
      [workplaceId, ownerId]
    );

    console.log(`🏢 수동 사업장 생성 완료: ${name} (workplace_id: ${workplaceId}) for owner ${ownerId}`);

    res.json({
      success: true,
      message: '사업장이 성공적으로 등록되었습니다.',
      workplaceId: workplaceId,
      companyId: companyId
    });

  } catch (error) {
    console.error('수동 사업장 생성 오류:', error);
    res.status(500).json({ success: false, message: '사업장 생성 중 서버 오류가 발생했습니다.' });
  }
});


// ============================================
// 초대 링크 시스템
// ============================================

// 1. 초대 링크 생성 (사업주 전용)
router.post('/owner/create-invite', async (req, res) => {
  let { workplaceId, companyId, expiresInDays, maxUses, ownerId } = req.body;

  console.log('📨 초대 링크 생성 요청:', { workplaceId, companyId, ownerId, expiresInDays, maxUses });

  try {
    if (!workplaceId || !ownerId) {
      console.error('❌ 필수 파라미터 누락');
      return res.status(400).json({ 
        success: false, 
        message: '사업장 ID와 사업주 ID가 필요합니다.',
        debug: { workplaceId, companyId, ownerId }
      });
    }
    
    // companyId가 없으면 자동 생성 (V1 사용자 지원)
    if (!companyId) {
      console.log('🔄 companyId 없음. 자동 생성 시작...');
      
      const workplace = await get(
        `SELECT w.*, u.name as owner_name, u.phone as owner_phone, u.business_number as owner_business_number
         FROM workplaces w
         JOIN users u ON w.owner_id = u.id
         WHERE w.id = ? AND w.owner_id = ?`,
        [workplaceId, ownerId]
      );

      if (!workplace) {
        return res.status(404).json({ 
          success: false, 
          message: '사업장을 찾을 수 없습니다.' 
        });
      }

      const businessNumber = workplace.business_number || workplace.owner_business_number;
      
      if (!businessNumber) {
        return res.status(400).json({ 
          success: false, 
          message: '사업자등록번호가 필요합니다. 사업장 정보를 확인해주세요.' 
        });
      }

      // 기존 회사 확인
      let company = await get(
        'SELECT id FROM companies WHERE business_number = ?',
        [businessNumber]
      );

      if (company) {
        companyId = company.id;
        console.log(`✅ 기존 회사 사용: ${companyId}`);
      } else {
        // 새 회사 생성
        const companyResult = await run(
          `INSERT INTO companies (
            business_number, company_name, phone, verified, created_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [businessNumber, workplace.name, workplace.phone || workplace.owner_phone, false]
        );
        companyId = companyResult.id || companyResult.lastID;
        console.log(`✅ 새 회사 생성: ${companyId}`);
      }

      // company_admins에 추가
      const existingAdmin = await get(
        'SELECT id FROM company_admins WHERE company_id = ? AND user_id = ?',
        [companyId, ownerId]
      );

      if (!existingAdmin) {
        await run(
          `INSERT INTO company_admins (
            company_id, user_id, role, granted_at
          ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
          [companyId, ownerId]
        );
        console.log(`✅ company_admins 등록: ${ownerId} → ${companyId}`);
      }

      // workplace에 company_id 연결
      await run(
        `UPDATE workplaces SET company_id = ? WHERE id = ?`,
        [companyId, workplaceId]
      );
      
      console.log(`🎉 자동 회사 생성 완료: companyId ${companyId}`);
    }

    // 고유 토큰 생성 (UUID 형식)
    const token = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // 만료일 계산 (기본 7일)
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 초대 링크 저장
    const result = await run(
      `INSERT INTO workplace_invitations (
        workplace_id, company_id, token, created_by, expires_at, max_uses, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workplaceId, companyId, token, ownerId, expiresAt, maxUses || null, 1]
    );

    console.log(`✉️ 초대 링크 생성: ${token} (workplace: ${workplaceId})`);

    res.json({
      success: true,
      message: '초대 링크가 생성되었습니다.',
      invitation: {
        id: result.id || result.lastID, // PostgreSQL은 id, SQLite는 lastID
        token,
        expiresAt,
        maxUses,
        inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`
      }
    });

  } catch (error) {
    console.error('초대 링크 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '초대 링크 생성 중 오류가 발생했습니다.' 
    });
  }
});

// 2. 초대 링크 목록 조회 (사업주 전용)
router.get('/owner/invites/:workplaceId', async (req, res) => {
  const { workplaceId } = req.params;

  try {
    const invitations = await all(
      `SELECT 
        wi.*,
        u.name as creator_name,
        w.name as workplace_name
      FROM workplace_invitations wi
      LEFT JOIN users u ON wi.created_by = u.id
      LEFT JOIN workplaces w ON wi.workplace_id = w.id
      WHERE wi.workplace_id = ?
      ORDER BY wi.created_at DESC`,
      [workplaceId]
    );

    res.json({
      success: true,
      invitations: invitations.map(inv => ({
        ...inv,
        inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inv.token}`,
        isExpired: new Date(inv.expires_at) < new Date(),
        isMaxed: inv.max_uses ? inv.uses_count >= inv.max_uses : false
      }))
    });

  } catch (error) {
    console.error('초대 링크 목록 조회 오류:', error);
    console.error('에러 상세:', error.message);
    
    // 테이블이 없는 경우
    if (error.message && error.message.includes('workplace_invitations')) {
      return res.status(500).json({
        success: false,
        message: 'V2 시스템 마이그레이션이 필요합니다. 관리자에게 문의하세요.'
      });
    }

    res.status(500).json({
      success: false,
      message: '초대 링크 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 3. 초대 링크 비활성화 (사업주 전용)
router.delete('/owner/invite/:token', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  const { token } = req.params;

  try {
    await run(
      `UPDATE workplace_invitations SET is_active = 0 WHERE token = ?`,
      [token]
    );

    console.log(`🔒 초대 링크 비활성화: ${token}`);

    res.json({
      success: true,
      message: '초대 링크가 비활성화되었습니다.'
    });

  } catch (error) {
    console.error('초대 링크 비활성화 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '초대 링크 비활성화 중 오류가 발생했습니다.' 
    });
  }
});

// 4. 초대 링크 유효성 확인 (공개)
router.get('/invite/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const invitation = await get(
      `SELECT 
        wi.*,
        w.name as workplace_name,
        w.address as workplace_address,
        c.company_name,
        u.name as owner_name
      FROM workplace_invitations wi
      JOIN workplaces w ON wi.workplace_id = w.id
      JOIN companies c ON wi.company_id = c.id
      JOIN users u ON wi.created_by = u.id
      WHERE wi.token = ?`,
      [token]
    );

    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        message: '유효하지 않은 초대 링크입니다.' 
      });
    }

    // 유효성 검사
    const isExpired = new Date(invitation.expires_at) < new Date();
    const isMaxed = invitation.max_uses ? invitation.uses_count >= invitation.max_uses : false;
    const isActive = invitation.is_active === 1 || invitation.is_active === true;

    if (!isActive) {
      return res.status(400).json({ 
        success: false, 
        message: '비활성화된 초대 링크입니다.' 
      });
    }

    if (isExpired) {
      return res.status(400).json({ 
        success: false, 
        message: '만료된 초대 링크입니다.' 
      });
    }

    if (isMaxed) {
      return res.status(400).json({ 
        success: false, 
        message: '초대 링크 사용 가능 횟수가 초과되었습니다.' 
      });
    }

    res.json({
      success: true,
      invitation: {
        workplaceName: invitation.workplace_name,
        workplaceAddress: invitation.workplace_address,
        companyName: invitation.company_name,
        ownerName: invitation.owner_name,
        workplaceId: invitation.workplace_id,
        companyId: invitation.company_id
      }
    });

  } catch (error) {
    console.error('초대 링크 확인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '초대 링크 확인 중 오류가 발생했습니다.' 
    });
  }
});

// 5. 초대 링크로 회원가입 (직원 전용)
router.post('/employee/signup-with-invite', async (req, res) => {
  const {
    username,
    password,
    name,
    phone,
    ssn,
    address,
    bank_name,
    account_number,
    account_holder,
    inviteToken
  } = req.body;

  try {
    // 입력 검증
    if (!username || !password || !name || !phone || !ssn || !address || 
        !bank_name || !account_number || !account_holder || !inviteToken) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    // 초대 링크 확인
    const invitation = await get(
      `SELECT * FROM workplace_invitations WHERE token = ?`,
      [inviteToken]
    );

    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        message: '유효하지 않은 초대 링크입니다.' 
      });
    }

    // 유효성 검사
    const isExpired = new Date(invitation.expires_at) < new Date();
    const isMaxed = invitation.max_uses ? invitation.uses_count >= invitation.max_uses : false;
    const isActive = invitation.is_active === 1 || invitation.is_active === true;

    if (!isActive || isExpired || isMaxed) {
      return res.status(400).json({ 
        success: false, 
        message: '사용할 수 없는 초대 링크입니다.' 
      });
    }

    // 아이디 중복 확인
    const existingUser = await get(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 사용 중인 아이디입니다.' 
      });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedSSN = encryptSSN(ssn);

    // 사용자 생성 (주민번호 암호화, 주소 포함)
    const userResult = await run(
      `INSERT INTO users (
        username, password, name, phone, ssn, address, role, workplace_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'employee', ?, CURRENT_TIMESTAMP)`,
      [username, hashedPassword, name, phone, encryptedSSN, address, invitation.workplace_id]
    );
    const userId = userResult.id || userResult.lastID; // PostgreSQL은 id, SQLite는 lastID

    // 직원 상세 정보 생성 (급여통장 정보 포함)
    await run(
      `INSERT INTO employee_details (
        user_id, workplace_id, bank_name, account_number, account_holder, employment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
      [userId, invitation.workplace_id, bank_name, account_number, account_holder]
    );

    // 회사-직원 관계 생성
    await run(
      `INSERT INTO company_employee_relations (
        company_id, user_id, workplace_id, start_date, status, created_at
      ) VALUES (?, ?, ?, CURRENT_DATE, 'active', CURRENT_TIMESTAMP)`,
      [invitation.company_id, userId, invitation.workplace_id]
    );

    // 초대 링크 사용 횟수 증가
    await run(
      `UPDATE workplace_invitations 
       SET uses_count = uses_count + 1 
       WHERE token = ?`,
      [inviteToken]
    );

    console.log(`✅ 초대 링크로 회원가입 완료: ${username} (workplace: ${invitation.workplace_id})`);

    // JWT 토큰 발급
    const token = jwt.sign(
      {
        id: userId,
        userId: userId,
        username: username,
        role: 'employee',
        workplaceId: invitation.workplace_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '회원가입이 완료되었습니다!',
      token,
      user: {
        id: userId,
        username,
        name,
        phone,
        role: 'employee',
        workplace_id: invitation.workplace_id
      }
    });

  } catch (error) {
    console.error('초대 링크 회원가입 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '회원가입 중 오류가 발생했습니다.' 
    });
  }
});


export default router;
