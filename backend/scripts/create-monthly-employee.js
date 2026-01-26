import { query, run, get } from '../config/database.js';
import bcrypt from 'bcryptjs';

async function createMonthlyEmployee() {
  try {
    console.log('🔄 월급제 직원 계정 생성 중...\n');

    const hashedPassword = await bcrypt.hash('1234', 10);

    // 테스트2 사업주의 workplace_id 찾기
    const owner = await get('SELECT id FROM users WHERE username = ?', ['테스트2']);
    if (!owner) {
      console.error('❌ 테스트2 사업주를 찾을 수 없습니다.');
      process.exit(1);
    }

    const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [owner.id]);
    if (!workplace) {
      console.error('❌ 테스트2 사업장을 찾을 수 없습니다.');
      process.exit(1);
    }

    const workplaceId = workplace.id;
    console.log(`✅ 사업장 ID: ${workplaceId}`);

    // 기존 김월급 계정 삭제
    const existingEmployee = await get('SELECT id FROM users WHERE username = ?', ['김월급']);
    if (existingEmployee) {
      console.log('⚠️  기존 김월급 계정을 삭제합니다...');
      await run('DELETE FROM users WHERE id = ?', [existingEmployee.id]);
      await run('DELETE FROM employee_details WHERE user_id = ?', [existingEmployee.id]);
      await run('DELETE FROM salary_info WHERE user_id = ?', [existingEmployee.id]);
      await run('DELETE FROM attendance WHERE user_id = ?', [existingEmployee.id]);
      await run('DELETE FROM salary_slips WHERE user_id = ?', [existingEmployee.id]);
    }

    // 김월급 직원 생성
    const employeeResult = await run(`
      INSERT INTO users (username, password, name, email, phone, role, service_consent, workplace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['김월급', hashedPassword, '김월급', 'monthly@test.com', '010-3333-4444', 'employee', 1, workplaceId]);

    const employeeId = employeeResult.id;
    console.log(`✅ 김월급 직원 계정 생성 완료 (ID: ${employeeId})`);

    // 김월급 직원 상세 정보 (월급제)
    const hireDate = '2025-01-02';

    await run(`
      INSERT INTO employee_details (
        user_id, workplace_id, hire_date, position, department, work_start_time, work_end_time,
        work_days, notes, pay_schedule_type, pay_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId, workplaceId, hireDate, '대리', '영업팀', '09:00', '18:00',
      '월,화,수,목,금', '월급제 직원 (2025년 1월 입사)', '월말', 10
    ]);

    console.log('✅ 김월급 직원 상세 정보 추가 완료');

    // 김월급 급여 정보 (월급 2,000,000원, 4대보험)
    await run(`
      INSERT INTO salary_info (
        user_id, salary_type, amount, tax_type, workplace_id
      ) VALUES (?, ?, ?, ?, ?)
    `, [employeeId, 'monthly', 2000000, '4대보험', workplaceId]);

    console.log('✅ 김월급 급여 정보 추가 완료 (월급: 2,000,000원, 4대보험)');

    // 2025년 1월부터 2026년 1월까지 출퇴근 기록 생성
    console.log('\n🔄 2025년 1월 ~ 2026년 1월 출퇴근 기록 생성 중...');
    
    const startDate = new Date('2025-01-02'); // 입사일
    const endDate = new Date('2026-01-26'); // 오늘

    let recordCount = 0;
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
      
      // 월~금만 출근 기록 생성 (주말 제외)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = date.toISOString().split('T')[0];
        
        // 90% 정상 출근, 10% 결근
        const isAbsent = Math.random() < 0.1;
        
        if (isAbsent) {
          // 결근
          await run(`
            INSERT INTO attendance (
              user_id, workplace_id, date, check_in_time, check_out_time, 
              work_hours, status, created_at
            ) VALUES (?, ?, ?, NULL, NULL, 0, 'absent', datetime('now'))
          `, [employeeId, workplaceId, dateStr]);
        } else {
          // 정상 출퇴근
          const checkInTime = `${dateStr}T09:00:00`;
          const checkOutTime = `${dateStr}T18:00:00`;
          
          await run(`
            INSERT INTO attendance (
              user_id, workplace_id, date, check_in_time, check_out_time, 
              work_hours, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'completed', datetime('now'))
          `, [employeeId, workplaceId, dateStr, checkInTime, checkOutTime, 8.0]);
        }
        
        recordCount++;
      }
    }

    console.log(`✅ 출퇴근 기록 ${recordCount}일치 추가 완료\n`);

    console.log('====================================');
    console.log('✅ 월급제 직원 계정 생성 완료!');
    console.log('====================================');
    console.log('직원 계정:');
    console.log('  - 사용자명: 김월급');
    console.log('  - 비밀번호: 1234');
    console.log('  - 급여: 월급 2,000,000원 (4대보험)');
    console.log('  - 입사일: 2025-01-02');
    console.log(`  - 출퇴근 기록: 2025년 1월 ~ 2026년 1월 (${recordCount}일)`);
    console.log('====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

createMonthlyEmployee();
