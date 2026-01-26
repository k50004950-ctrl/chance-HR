import { query, run, get } from '../config/database.js';
import bcrypt from 'bcryptjs';

async function createTest2Accounts() {
  try {
    console.log('🔄 테스트2 계정 생성 중...\n');

    // 1. 테스트2 사업주 계정 생성
    const hashedPassword = await bcrypt.hash('1234', 10);

    // 기존 테스트2 계정이 있다면 삭제
    const existingOwner = await get('SELECT id FROM users WHERE username = ?', ['테스트2']);
    if (existingOwner) {
      console.log('⚠️  기존 테스트2 계정을 삭제합니다...');
      await run('DELETE FROM users WHERE id = ?', [existingOwner.id]);
      await run('DELETE FROM workplaces WHERE owner_id = ?', [existingOwner.id]);
    }

    // 테스트2 사업주 생성
    const ownerResult = await run(`
      INSERT INTO users (username, password, name, email, phone, role, service_consent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['테스트2', hashedPassword, '김대표', 'test2@test.com', '010-1111-2222', 'owner', 1]);

    const ownerId = ownerResult.id;
    console.log(`✅ 테스트2 사업주 계정 생성 완료 (ID: ${ownerId})`);

    // 2. 테스트2 사업장 생성
    const workplaceResult = await run(`
      INSERT INTO workplaces (name, address, latitude, longitude, radius, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['테스트2 사업장', '서울특별시 강남구 테헤란로 123', '37.5012', '127.0396', '100', ownerId]);

    const workplaceId = workplaceResult.id;
    console.log(`✅ 테스트2 사업장 생성 완료 (ID: ${workplaceId})`);

    // 3. 배유진 직원 계정 생성
    const existingEmployee = await get('SELECT id FROM users WHERE username = ?', ['배유진']);
    if (existingEmployee) {
      console.log('⚠️  기존 배유진 계정을 삭제합니다...');
      await run('DELETE FROM users WHERE id = ?', [existingEmployee.id]);
      await run('DELETE FROM employee_details WHERE user_id = ?', [existingEmployee.id]);
      await run('DELETE FROM salary_info WHERE user_id = ?', [existingEmployee.id]);
      await run('DELETE FROM attendance WHERE user_id = ?', [existingEmployee.id]);
    }

    const employeeResult = await run(`
      INSERT INTO users (username, password, name, email, phone, role, service_consent, workplace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['배유진', hashedPassword, '배유진', 'bae@test.com', '010-2222-3333', 'employee', 1, workplaceId]);

    const employeeId = employeeResult.id;
    console.log(`✅ 배유진 직원 계정 생성 완료 (ID: ${employeeId})`);

    // 4. 배유진 직원 상세 정보 (시급제)
    const hireDate = '2025-06-01';

    await run(`
      INSERT INTO employee_details (
        user_id, workplace_id, hire_date, position, department, work_start_time, work_end_time,
        work_days, notes, pay_schedule_type, pay_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId, workplaceId, hireDate, '직원', '영업팀', '09:00', '18:00',
      '월,화,수,목,금', '시급제 직원', '월말', 10
    ]);

    console.log('✅ 배유진 직원 상세 정보 추가 완료');

    // 5. 배유진 급여 정보 (시급 10,000원, 4대보험)
    await run(`
      INSERT INTO salary_info (
        user_id, salary_type, amount, tax_type, weekly_holiday_type, workplace_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [employeeId, 'hourly', 10000, '4대보험', 'separate', workplaceId]);

    console.log('✅ 배유진 급여 정보 추가 완료 (시급: 10,000원, 4대보험, 주휴수당 별도)');

    // 6. 배유진 출퇴근 기록 생성 (최근 10일, 지각/결근 포함)
    const attendanceData = [
      { date: -9, checkIn: '09:05', checkOut: '18:10', status: 'completed' }, // 지각
      { date: -8, checkIn: '08:55', checkOut: '18:00', status: 'completed' },
      { date: -7, checkIn: '09:00', checkOut: '18:05', status: 'completed' },
      { date: -6, checkIn: null, checkOut: null, status: 'absent' }, // 결근
      { date: -5, checkIn: '09:10', checkOut: '18:15', status: 'completed' }, // 지각
      { date: -4, checkIn: '08:50', checkOut: '18:00', status: 'completed' },
      { date: -3, checkIn: '09:00', checkOut: '18:00', status: 'completed' },
      { date: -2, checkIn: null, checkOut: null, status: 'absent' }, // 결근
      { date: -1, checkIn: '09:00', checkOut: '18:05', status: 'completed' },
      { date: 0, checkIn: '09:00', checkOut: '18:00', status: 'completed' }
    ];

    for (const record of attendanceData) {
      const targetDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
      targetDate.setDate(targetDate.getDate() + record.date);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      if (record.checkIn) {
        const checkInDateTime = `${dateStr}T${record.checkIn}:00`;
        const checkOutDateTime = `${dateStr}T${record.checkOut}:00`;
        
        // 근무시간 계산 (점심시간 1시간 제외)
        const checkInTime = new Date(checkInDateTime);
        const checkOutTime = new Date(checkOutDateTime);
        const workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60) - 1).toFixed(2);

        await run(`
          INSERT INTO attendance (
            user_id, workplace_id, date, check_in_time, check_out_time, 
            work_hours, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [employeeId, workplaceId, dateStr, checkInDateTime, checkOutDateTime, workHours, record.status]);
      } else {
        // 결근
        await run(`
          INSERT INTO attendance (
            user_id, workplace_id, date, check_in_time, check_out_time, 
            work_hours, status, created_at
          ) VALUES (?, ?, ?, NULL, NULL, 0, ?, datetime('now'))
        `, [employeeId, workplaceId, dateStr, record.status]);
      }
    }

    console.log('✅ 배유진 출퇴근 기록 10일치 추가 완료 (지각 2회, 결근 2회 포함)\n');

    console.log('====================================');
    console.log('✅ 테스트 계정 생성 완료!');
    console.log('====================================');
    console.log('사업주 계정:');
    console.log('  - 사용자명: 테스트2');
    console.log('  - 비밀번호: 1234');
    console.log('  - 이름: 김대표');
    console.log('  - 사업장: 테스트2 사업장');
    console.log('');
    console.log('직원 계정:');
    console.log('  - 사용자명: 배유진');
    console.log('  - 비밀번호: 1234');
    console.log('  - 급여: 시급 10,000원 (4대보험)');
    console.log('  - 주휴수당: 별도 계산');
    console.log('  - 입사일: 2025-06-01');
    console.log('  - 출퇴근 기록: 최근 10일 (지각 2회, 결근 2회)');
    console.log('====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

createTest2Accounts();
