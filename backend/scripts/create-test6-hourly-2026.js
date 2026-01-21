import bcrypt from 'bcryptjs';
import { query, get, run } from '../config/database.js';

const createTest6Account = async () => {
  try {
    console.log('테스트6 계정 생성 시작 (2026년 시급 근무자)...');

    // 첫 번째 사업장 찾기
    const workplace = await get("SELECT id, name FROM workplaces ORDER BY id LIMIT 1");
    if (!workplace) {
      console.error('사업장을 찾을 수 없습니다. 먼저 사업장을 생성해주세요.');
      return;
    }

    console.log(`사업장: ${workplace.name} (ID: ${workplace.id})`);

    // 테스트6 계정이 이미 있는지 확인
    const existingUser = await get("SELECT id FROM users WHERE username = 'test6'");
    if (existingUser) {
      console.log('테스트6 계정이 이미 존재합니다. 삭제 후 재생성합니다...');
      
      // 관련 데이터 삭제
      await run("DELETE FROM attendance WHERE user_id = ?", [existingUser.id]);
      try {
        await run("DELETE FROM salary_slips WHERE user_id = ?", [existingUser.id]);
      } catch (e) {
        // salary_slips 테이블이 없을 수 있음
      }
      try {
        await run("DELETE FROM salary_history WHERE user_id = ?", [existingUser.id]);
      } catch (e) {
        // salary_history 테이블이 없을 수 있음
      }
      await run("DELETE FROM salary_info WHERE user_id = ?", [existingUser.id]);
      await run("DELETE FROM employee_details WHERE user_id = ?", [existingUser.id]);
      await run("DELETE FROM users WHERE id = ?", [existingUser.id]);
      console.log('기존 테스트6 계정 삭제 완료');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash('1234', 10);

    // 사용자 생성
    const userResult = await run(
      `INSERT INTO users (username, password, name, role, workplace_id, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['test6', hashedPassword, '김시급', 'employee', workplace.id, '010-6666-6666']
    );

    let userId = userResult.lastID || userResult.insertId;
    
    // userId가 없으면 직접 조회
    if (!userId) {
      const user = await get("SELECT id FROM users WHERE username = 'test6'");
      userId = user.id;
    }
    
    console.log(`사용자 생성 완료 (ID: ${userId}, 이름: 김시급)`);

    // 직원 상세 정보 생성 (2026년 1월 2일 입사, 시급)
    await run(
      `INSERT INTO employee_details (
        user_id, hire_date, work_days, work_start_time, work_end_time
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        '2026-01-02', // 2026년 1월 2일 입사
        'mon,tue,wed,thu,fri,sat', // 월~토 근무 (주6일)
        '10:00',
        '19:00'
      ]
    );

    console.log('직원 상세 정보 생성 완료 (입사일: 2026-01-02)');

    // 급여 정보 생성 (시급 12,000원)
    await run(
      `INSERT INTO salary_info (
        user_id, workplace_id, salary_type, amount, tax_type, weekly_holiday_type, weekly_holiday_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        workplace.id,
        'hourly', // 시급
        12000, // 12,000원 (2026년 최저시급 기준)
        '4대보험',
        'separate', // 주휴수당 별도 지급
        1
      ]
    );

    console.log('급여 정보 생성 완료 (시급: 12,000원, 주휴수당 별도)');

    // 2026년 1월 출근 기록 생성
    const year = 2026;
    const month = 1;
    const daysInMonth = 31; // 1월은 31일

    let workDaysCount = 0;

    for (let day = 2; day <= daysInMonth; day++) { // 1월 2일부터 시작
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      // 일요일 제외 (월~토 근무)
      if (dayOfWeek === 0) continue;

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 출근 시간: 10:00, 퇴근 시간: 19:00 (점심 1시간 제외 = 8시간)
      await run(
        `INSERT INTO attendance (
          user_id, workplace_id, date, check_in_time, check_out_time, 
          work_hours, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          workplace.id,
          dateStr,
          `${dateStr} 10:00:00`,
          `${dateStr} 19:00:00`,
          8.0,
          'completed',
          `${dateStr} 10:00:00`
        ]
      );

      workDaysCount++;
    }

    console.log(`2026년 1월 출근 기록 생성 완료 (${workDaysCount}일)`);

    // 급여 계산 정보 출력
    const totalWorkHours = workDaysCount * 8;
    const basePay = totalWorkHours * 12000;
    const weeklyHolidayPay = Math.floor(workDaysCount / 5) * 8 * 12000; // 주휴수당
    const totalPay = basePay + weeklyHolidayPay;

    console.log('\n✅ 테스트6 계정 생성 완료!');
    console.log('====================================');
    console.log('📋 계정 정보:');
    console.log('  사용자명: test6');
    console.log('  비밀번호: 1234');
    console.log('  이름: 김시급');
    console.log('  역할: 직원 (employee)');
    console.log('  사업장:', workplace.name);
    console.log('');
    console.log('💼 고용 정보:');
    console.log('  고용 형태: 시급제');
    console.log('  시급: 12,000원');
    console.log('  입사일: 2026-01-02 (목요일)');
    console.log('  근무 요일: 월~토 (주6일)');
    console.log('  근무 시간: 10:00 ~ 19:00 (8시간)');
    console.log('  주휴수당: 별도 지급');
    console.log('  무단결근 차감: 적용');
    console.log('');
    console.log('📅 2026년 1월 급여 예상:');
    console.log(`  근무일수: ${workDaysCount}일`);
    console.log(`  근무시간: ${totalWorkHours}시간`);
    console.log(`  기본급: ${basePay.toLocaleString()}원`);
    console.log(`  주휴수당: ${weeklyHolidayPay.toLocaleString()}원`);
    console.log(`  합계: ${totalPay.toLocaleString()}원`);
    console.log('====================================');

  } catch (error) {
    console.error('테스트6 계정 생성 오류:', error);
    process.exit(1);
  }
};

createTest6Account().then(() => {
  console.log('\n스크립트 실행 완료');
  process.exit(0);
});
