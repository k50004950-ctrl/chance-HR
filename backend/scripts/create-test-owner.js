/**
 * 테스트용 OWNER 계정 생성/리셋 스크립트
 * 
 * 목적: PC 회귀 테스트를 위한 확실한 OWNER 계정 생성
 * 
 * 계정 정보:
 * - username: test_owner
 * - password: Test!1234
 * - role: OWNER
 * - workplace: "테스트 사업장" (자동 생성)
 */

const bcrypt = require('bcryptjs');
const { getConnection } = require('../config/database');

async function createTestOwner() {
  const db = await getConnection();
  
  try {
    console.log('🔧 테스트 OWNER 계정 생성/리셋 시작...\n');

    // 1. 기존 test_owner 계정 확인 및 삭제
    console.log('1️⃣ 기존 test_owner 계정 확인 중...');
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', ['test_owner']);
    
    if (existingUser) {
      console.log('   ✅ 기존 계정 발견 (id: ' + existingUser.id + ')');
      console.log('   🗑️  기존 계정 삭제 중...');
      
      // 관련 데이터 삭제 (외래키 제약 고려)
      await db.run('DELETE FROM employee_details WHERE user_id = ?', [existingUser.id]);
      await db.run('DELETE FROM users WHERE id = ?', [existingUser.id]);
      console.log('   ✅ 기존 계정 삭제 완료\n');
    } else {
      console.log('   ℹ️  기존 계정 없음 (새로 생성)\n');
    }

    // 2. 비밀번호 해시 생성
    console.log('2️⃣ 비밀번호 해시 생성 중...');
    const password = 'Test!1234';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('   ✅ 비밀번호 해시 생성 완료\n');

    // 3. 테스트 사업장 확인/생성
    console.log('3️⃣ 테스트 사업장 확인/생성 중...');
    let testWorkplace = await db.get('SELECT * FROM workplaces WHERE name = ?', ['테스트 사업장']);
    
    if (!testWorkplace) {
      console.log('   📍 테스트 사업장 생성 중...');
      const result = await db.run(
        `INSERT INTO workplaces (name, address, latitude, longitude, check_in_range, owner_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['테스트 사업장', '서울특별시 강남구 테헤란로 123', 37.5665, 126.9780, 100, null]
      );
      
      const workplaceId = result.lastID;
      testWorkplace = await db.get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      console.log('   ✅ 테스트 사업장 생성 완료 (id: ' + workplaceId + ')\n');
    } else {
      console.log('   ✅ 기존 테스트 사업장 사용 (id: ' + testWorkplace.id + ')\n');
    }

    // 4. OWNER 계정 생성
    console.log('4️⃣ OWNER 계정 생성 중...');
    const userResult = await db.run(
      `INSERT INTO users (username, password, role, name, email, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['test_owner', hashedPassword, 'OWNER', '테스터(사업주)', 'test_owner@test.com', '01012345678']
    );
    
    const userId = userResult.lastID;
    console.log('   ✅ OWNER 계정 생성 완료 (id: ' + userId + ')\n');

    // 5. 사업장과 연결
    console.log('5️⃣ 사업장 owner 연결 중...');
    await db.run('UPDATE workplaces SET owner_id = ? WHERE id = ?', [userId, testWorkplace.id]);
    console.log('   ✅ 사업장 owner 연결 완료\n');

    // 6. 테스트 직원 1명 생성 (출근/급여 테스트용)
    console.log('6️⃣ 테스트 직원 생성 중...');
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
        employeeId, testWorkplace.id, 'active', '2026-01-01',
        'monthly', 2500000, 'mon,tue,wed,thu,fri', '09:00', '18:00',
        'monthly', 25
      ]
    );
    console.log('   ✅ 테스트 직원 생성 완료 (id: ' + employeeId + ')\n');

    // 7. 오늘 출근 기록 1개 생성
    console.log('7️⃣ 오늘 출근 기록 생성 중...');
    const today = new Date().toISOString().split('T')[0];
    const checkInTime = new Date();
    checkInTime.setHours(9, 5, 0, 0); // 09:05 출근
    
    await db.run(
      `INSERT INTO attendance (user_id, workplace_id, date, check_in_time)
       VALUES (?, ?, ?, ?)`,
      [employeeId, testWorkplace.id, today, checkInTime.toISOString()]
    );
    console.log('   ✅ 출근 기록 생성 완료 (미퇴근 상태)\n');

    // 8. 결과 출력
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 테스트 OWNER 계정 생성 완료!\n');
    console.log('📋 계정 정보:');
    console.log('   Username: test_owner');
    console.log('   Password: Test!1234');
    console.log('   Role: OWNER');
    console.log('   Workplace: 테스트 사업장 (id: ' + testWorkplace.id + ')');
    console.log('   Employee: 김직원 (1명)');
    console.log('   Attendance: 오늘 출근 기록 1건 (미퇴근)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ 이제 PC 회귀 테스트를 진행할 수 있습니다!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  createTestOwner()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createTestOwner };
