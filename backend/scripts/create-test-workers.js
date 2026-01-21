import bcrypt from 'bcryptjs';
import { query, get, run } from '../config/database.js';

const createTestWorkers = async () => {
  try {
    console.log('테스트 근로자 계정 생성 시작...');

    // 첫 번째 사업장 찾기
    const workplace = await get("SELECT id, name FROM workplaces ORDER BY id LIMIT 1");
    if (!workplace) {
      console.error('사업장을 찾을 수 없습니다.');
      return;
    }

    console.log(`사업장: ${workplace.name} (ID: ${workplace.id})`);

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash('1234', 10);

    // ========================================
    // 1. 월급 근로자 (김월급 - test_monthly)
    // ========================================
    console.log('\n[1] 월급 근로자 생성...');
    
    let monthlyUser = await get("SELECT id FROM users WHERE username = 'test_monthly'");
    if (monthlyUser) {
      console.log('기존 test_monthly 계정 삭제...');
      await run("DELETE FROM attendance WHERE user_id = ?", [monthlyUser.id]);
      await run("DELETE FROM salary_info WHERE user_id = ?", [monthlyUser.id]);
      await run("DELETE FROM employee_details WHERE user_id = ?", [monthlyUser.id]);
      await run("DELETE FROM users WHERE id = ?", [monthlyUser.id]);
    }

    const monthlyResult = await run(
      `INSERT INTO users (username, password, name, role, workplace_id, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['test_monthly', hashedPassword, '김월급', 'employee', workplace.id, '010-1111-1111']
    );

    let monthlyUserId = monthlyResult.lastID || monthlyResult.insertId;
    if (!monthlyUserId) {
      const user = await get("SELECT id FROM users WHERE username = 'test_monthly'");
      monthlyUserId = user.id;
    }

    // 직원 상세 정보 (2026년 1월 1일 입사)
    await run(
      `INSERT INTO employee_details (user_id, hire_date, work_days, work_start_time, work_end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [monthlyUserId, '2026-01-01', 'mon,tue,wed,thu,fri', '09:00', '18:00']
    );

    // 급여 정보 (월급 200만원, 4대보험)
    await run(
      `INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, tax_type, weekly_holiday_type, weekly_holiday_pay)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [monthlyUserId, workplace.id, 'monthly', 2000000, '4대보험', 'included', 1]
    );

    console.log(`✅ 김월급 계정 생성 완료 (ID: ${monthlyUserId})`);

    // ========================================
    // 2. 시급 근로자 (박시급 - test_hourly)
    // ========================================
    console.log('\n[2] 시급 근로자 생성...');
    
    let hourlyUser = await get("SELECT id FROM users WHERE username = 'test_hourly'");
    if (hourlyUser) {
      console.log('기존 test_hourly 계정 삭제...');
      await run("DELETE FROM attendance WHERE user_id = ?", [hourlyUser.id]);
      await run("DELETE FROM salary_info WHERE user_id = ?", [hourlyUser.id]);
      await run("DELETE FROM employee_details WHERE user_id = ?", [hourlyUser.id]);
      await run("DELETE FROM users WHERE id = ?", [hourlyUser.id]);
    }

    const hourlyResult = await run(
      `INSERT INTO users (username, password, name, role, workplace_id, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['test_hourly', hashedPassword, '박시급', 'employee', workplace.id, '010-2222-2222']
    );

    let hourlyUserId = hourlyResult.lastID || hourlyResult.insertId;
    if (!hourlyUserId) {
      const user = await get("SELECT id FROM users WHERE username = 'test_hourly'");
      hourlyUserId = user.id;
    }

    // 직원 상세 정보 (2026년 1월 1일 입사)
    await run(
      `INSERT INTO employee_details (user_id, hire_date, work_days, work_start_time, work_end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [hourlyUserId, '2026-01-01', 'mon,tue,wed,thu,fri', '09:00', '18:00']
    );

    // 급여 정보 (시급 10,000원, 4대보험, 주휴수당 별도)
    await run(
      `INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, tax_type, weekly_holiday_type, weekly_holiday_pay)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hourlyUserId, workplace.id, 'hourly', 10000, '4대보험', 'separate', 1]
    );

    console.log(`✅ 박시급 계정 생성 완료 (ID: ${hourlyUserId})`);

    // ========================================
    // 3. 2026년 1월 출퇴근 기록 생성
    // ========================================
    console.log('\n[3] 2026년 1월 출퇴근 기록 생성...');

    const year = 2026;
    const month = 1;
    
    let monthlyWorkDays = 0;
    let monthlyLateCount = 0;
    let monthlyAbsentCount = 0;
    
    let hourlyWorkDays = 0;
    let hourlyLateCount = 0;
    let hourlyAbsentCount = 0;
    let hourlyTotalHours = 0;

    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      // 주말 제외
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 월급 근로자 (김월급) - 가끔 지각, 결근
      let monthlyStatus = 'completed';
      let monthlyCheckIn = `${dateStr} 09:00:00`;
      let monthlyCheckOut = `${dateStr} 18:00:00`;
      let monthlyWorkHours = 8.0;

      if (day === 7 || day === 21) { // 2일 결근
        monthlyStatus = 'absent';
        monthlyCheckIn = null;
        monthlyCheckOut = null;
        monthlyWorkHours = 0;
        monthlyAbsentCount++;
      } else if (day === 3 || day === 13 || day === 27) { // 3일 지각
        monthlyCheckIn = `${dateStr} 09:35:00`;
        monthlyLateCount++;
        monthlyWorkDays++;
      } else {
        monthlyWorkDays++;
      }

      if (monthlyCheckIn) {
        await run(
          `INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_out_time, work_hours, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [monthlyUserId, workplace.id, dateStr, monthlyCheckIn, monthlyCheckOut, monthlyWorkHours, monthlyStatus, monthlyCheckIn]
        );
      }

      // 시급 근로자 (박시급) - 가끔 지각, 결근, 조퇴
      let hourlyStatus = 'completed';
      let hourlyCheckIn = `${dateStr} 09:00:00`;
      let hourlyCheckOut = `${dateStr} 18:00:00`;
      let hourlyWorkHours = 8.0;

      if (day === 10 || day === 24) { // 2일 결근
        hourlyStatus = 'absent';
        hourlyCheckIn = null;
        hourlyCheckOut = null;
        hourlyWorkHours = 0;
        hourlyAbsentCount++;
      } else if (day === 5 || day === 15 || day === 28) { // 3일 지각
        hourlyCheckIn = `${dateStr} 09:45:00`;
        hourlyLateCount++;
        hourlyWorkDays++;
        hourlyTotalHours += hourlyWorkHours;
      } else if (day === 8 || day === 22) { // 2일 조퇴
        hourlyCheckOut = `${dateStr} 17:00:00`;
        hourlyWorkHours = 7.0;
        hourlyWorkDays++;
        hourlyTotalHours += hourlyWorkHours;
      } else {
        hourlyWorkDays++;
        hourlyTotalHours += hourlyWorkHours;
      }

      if (hourlyCheckIn) {
        await run(
          `INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_out_time, work_hours, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [hourlyUserId, workplace.id, dateStr, hourlyCheckIn, hourlyCheckOut, hourlyWorkHours, hourlyStatus, hourlyCheckIn]
        );
      }
    }

    console.log(`\n✅ 2026년 1월 출퇴근 기록 생성 완료`);
    console.log(`  - 김월급: 근무 ${monthlyWorkDays}일, 지각 ${monthlyLateCount}회, 결근 ${monthlyAbsentCount}일`);
    console.log(`  - 박시급: 근무 ${hourlyWorkDays}일, 지각 ${hourlyLateCount}회, 결근 ${hourlyAbsentCount}일, 총 ${hourlyTotalHours}시간`);

    // 급여 계산
    const monthlyPay = 2000000;
    const hourlyBasePay = hourlyTotalHours * 10000;
    const weeklyHolidayWeeks = 5; // 1월 약 5주
    const weeklyHolidayPay = weeklyHolidayWeeks * 8 * 10000; // 주휴수당
    const hourlyTotalPay = hourlyBasePay + weeklyHolidayPay;

    console.log('\n📊 급여 예상:');
    console.log('====================================');
    console.log('👤 김월급 (월급)');
    console.log(`  - 기본급: ${monthlyPay.toLocaleString()}원`);
    console.log(`  - 공제 전 지급액: ${monthlyPay.toLocaleString()}원`);
    console.log('');
    console.log('👤 박시급 (시급)');
    console.log(`  - 근무시간: ${hourlyTotalHours}시간`);
    console.log(`  - 기본급: ${hourlyBasePay.toLocaleString()}원`);
    console.log(`  - 주휴수당: ${weeklyHolidayPay.toLocaleString()}원`);
    console.log(`  - 공제 전 합계: ${hourlyTotalPay.toLocaleString()}원`);
    console.log('====================================');

    console.log('\n✅ 테스트 근로자 계정 생성 완료!');
    console.log('====================================');
    console.log('📋 계정 정보:');
    console.log('');
    console.log('1️⃣ 월급 근로자');
    console.log('  사용자명: test_monthly');
    console.log('  비밀번호: 1234');
    console.log('  이름: 김월급');
    console.log('  급여: 월급 2,000,000원 (4대보험)');
    console.log('  근무: 월~금 09:00~18:00');
    console.log('  입사일: 2026-01-01');
    console.log('');
    console.log('2️⃣ 시급 근로자');
    console.log('  사용자명: test_hourly');
    console.log('  비밀번호: 1234');
    console.log('  이름: 박시급');
    console.log('  급여: 시급 10,000원 (4대보험, 주휴수당 별도)');
    console.log('  근무: 월~금 09:00~18:00');
    console.log('  입사일: 2026-01-01');
    console.log('====================================');

  } catch (error) {
    console.error('테스트 근로자 생성 오류:', error);
    process.exit(1);
  }
};

createTestWorkers().then(() => {
  console.log('\n스크립트 실행 완료');
  process.exit(0);
});
