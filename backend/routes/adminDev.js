/**
 * ⚠️ 임시 개발자용 관리자 API
 * 
 * 목적: PC 회귀 테스트를 위한 test_owner 계정 생성/리셋
 * 
 * TODO: 프로덕션 배포 전에 반드시 삭제하거나 비활성화할 것!
 * 
 * 이 파일은:
 * - 개발/테스트 환경에서만 사용
 * - SUPER_ADMIN 권한 필수
 * - 실제 서비스 출시 시 제거 필요
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getConnection } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/admin/dev/reset-test-owner
 * 
 * test_owner 계정 생성 또는 비밀번호 리셋
 * 
 * 권한: SUPER_ADMIN만 호출 가능
 * 
 * 응답:
 * - { status: "reset", message: "..." } - 기존 계정 비밀번호 리셋
 * - { status: "created", message: "...", workplaceId, userId } - 신규 계정 생성
 */
router.post('/reset-test-owner', authenticateToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  const db = await getConnection();
  
  try {
    console.log('🔧 [DEV API] test_owner 리셋/생성 시작...');

    // 비밀번호 해시 생성
    const password = 'Test!1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 트랜잭션 시작 (SQLite는 BEGIN TRANSACTION 사용)
    await db.run('BEGIN TRANSACTION');

    try {
      // 1. 기존 test_owner 계정 확인
      const existingUser = await db.get('SELECT * FROM users WHERE username = ?', ['test_owner']);

      if (existingUser) {
        // 기존 계정이 있으면 비밀번호만 리셋
        console.log('   ℹ️  기존 test_owner 계정 발견 (id: ' + existingUser.id + ')');
        console.log('   🔄 비밀번호 리셋 중...');

        await db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, existingUser.id]
        );

        await db.run('COMMIT');

        console.log('   ✅ 비밀번호 리셋 완료');

        return res.json({
          status: 'reset',
          message: 'test_owner 계정의 비밀번호가 Test!1234로 리셋되었습니다.',
          userId: existingUser.id,
          username: 'test_owner'
        });
      }

      // 2. 계정이 없으면 신규 생성
      console.log('   ℹ️  test_owner 계정 없음 → 신규 생성');

      // 2-1. 테스트 사업장 생성
      console.log('   📍 테스트 사업장 생성 중...');
      const workplaceResult = await db.run(
        `INSERT INTO workplaces (name, address, latitude, longitude, check_in_range, owner_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['테스트 사업장', '서울특별시 강남구 테헤란로 123', 37.5665, 126.9780, 100, null]
      );
      const workplaceId = workplaceResult.lastID;
      console.log('   ✅ 테스트 사업장 생성 완료 (id: ' + workplaceId + ')');

      // 2-2. test_owner 계정 생성
      console.log('   👤 test_owner 계정 생성 중...');
      const userResult = await db.run(
        `INSERT INTO users (username, password, role, name, email, phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['test_owner', hashedPassword, 'OWNER', '테스터(사업주)', 'test_owner@test.com', '01012345678']
      );
      const userId = userResult.lastID;
      console.log('   ✅ test_owner 계정 생성 완료 (id: ' + userId + ')');

      // 2-3. 사업장과 owner 연결
      console.log('   🔗 사업장 owner 연결 중...');
      await db.run('UPDATE workplaces SET owner_id = ? WHERE id = ?', [userId, workplaceId]);
      console.log('   ✅ 사업장 owner 연결 완료');

      // 2-4. 테스트 직원 1명 생성
      console.log('   👥 테스트 직원 생성 중...');
      const employeeResult = await db.run(
        `INSERT INTO users (username, password, role, name, email, phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['test_emp1', hashedPassword, 'EMPLOYEE', '김직원', 'test_emp1@test.com', '01087654321']
      );
      const employeeId = employeeResult.lastID;

      await db.run(
        `INSERT INTO employee_details (
          user_id, workplace_id, employment_status, hire_date, 
          salary_type, base_pay, work_days, work_start_time, work_end_time,
          pay_schedule_type, pay_day
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId, workplaceId, 'active', '2026-01-01',
          'monthly', 2500000, 'mon,tue,wed,thu,fri', '09:00', '18:00',
          'monthly', 25
        ]
      );
      console.log('   ✅ 테스트 직원 생성 완료 (id: ' + employeeId + ')');

      // 2-5. 오늘 출근 기록 1개 생성 (미퇴근 상태)
      console.log('   📊 오늘 출근 기록 생성 중...');
      const today = new Date().toISOString().split('T')[0];
      const checkInTime = new Date();
      checkInTime.setHours(9, 5, 0, 0); // 09:05 출근

      await db.run(
        `INSERT INTO attendance (user_id, workplace_id, date, check_in_time)
         VALUES (?, ?, ?, ?)`,
        [employeeId, workplaceId, today, checkInTime.toISOString()]
      );
      console.log('   ✅ 출근 기록 생성 완료');

      // 트랜잭션 커밋
      await db.run('COMMIT');

      console.log('   🎉 test_owner 계정 생성 완료!');

      return res.json({
        status: 'created',
        message: 'test_owner 계정이 생성되었습니다.',
        username: 'test_owner',
        password: 'Test!1234',
        userId: userId,
        workplaceId: workplaceId,
        employeeId: employeeId,
        details: {
          workplace: '테스트 사업장',
          employee: '김직원 (1명)',
          attendance: '오늘 출근 기록 1건 (미퇴근)'
        }
      });

    } catch (error) {
      // 트랜잭션 롤백
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ [DEV API] 오류 발생:', error);
    return res.status(500).json({
      error: 'test_owner 생성/리셋 실패',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/dev/test-owner-info
 * 
 * test_owner 계정 정보 조회
 * 
 * 권한: SUPER_ADMIN만 호출 가능
 */
router.get('/test-owner-info', authenticateToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  const db = await getConnection();
  
  try {
    const user = await db.get('SELECT id, username, role, name, email, phone FROM users WHERE username = ?', ['test_owner']);
    
    if (!user) {
      return res.json({
        exists: false,
        message: 'test_owner 계정이 존재하지 않습니다.'
      });
    }

    // 연결된 사업장 조회
    const workplaces = await db.all(
      'SELECT id, name, address FROM workplaces WHERE owner_id = ?',
      [user.id]
    );

    // 직원 수 조회
    const employeeCount = await db.get(
      `SELECT COUNT(*) as count FROM employee_details ed
       INNER JOIN users u ON ed.user_id = u.id
       WHERE ed.workplace_id IN (SELECT id FROM workplaces WHERE owner_id = ?)`,
      [user.id]
    );

    return res.json({
      exists: true,
      user: user,
      workplaces: workplaces,
      employeeCount: employeeCount?.count || 0
    });

  } catch (error) {
    console.error('❌ [DEV API] 오류 발생:', error);
    return res.status(500).json({
      error: 'test_owner 정보 조회 실패',
      message: error.message
    });
  }
});

export default router;
