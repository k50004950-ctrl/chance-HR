import bcrypt from 'bcryptjs';
import { query, get, run } from '../config/database.js';

const createTest5Account = async () => {
  try {
    console.log('테스트5 계정 생성 시작...');

    // 테스터 사업주의 사업장 찾기
    const workplace = await get("SELECT id FROM workplaces WHERE name LIKE '%즈즈를%'");
    if (!workplace) {
      console.error('즈즈를 사업장을 찾을 수 없습니다.');
      return;
    }

    console.log(`사업장 ID: ${workplace.id}`);

    // 테스트5 계정이 이미 있는지 확인
    const existingUser = await get("SELECT id FROM users WHERE username = 'test5'");
    if (existingUser) {
      console.log('테스트5 계정이 이미 존재합니다.');
      return;
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash('1234', 10);

    // 사용자 생성
    const userResult = await run(
      `INSERT INTO users (username, password, name, role, workplace_id, phone, employment_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['test5', hashedPassword, '테스트5', 'employee', workplace.id, '010-5555-5555', 'active']
    );

    const userId = userResult.lastID || userResult.insertId;
    console.log(`사용자 생성 완료 (ID: ${userId})`);

    // 직원 상세 정보 생성 (2025년 입사, 시급)
    await run(
      `INSERT INTO employee_details (
        user_id, hire_date, work_days, work_start_time, work_end_time, 
        business_registration, privacy_consent, location_consent,
        pay_schedule_type, pay_day, payroll_period_start_day, payroll_period_end_day, deduct_absence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        '2025-01-01', // 2025년 입사
        'mon,tue,wed,thu,fri', // 평일 근무
        '09:00',
        '18:00',
        true,
        true,
        true,
        'monthly', // 월급제
        0, // 말일 지급
        1, // 1일부터
        0, // 말일까지
        false
      ]
    );

    console.log('직원 상세 정보 생성 완료');

    // 급여 정보 생성 (시급 10,000원)
    await run(
      `INSERT INTO salary_info (
        user_id, salary_type, amount, tax_type, weekly_holiday_type, weekly_holiday_pay
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'hourly', // 시급
        10000, // 10,000원
        '4대보험',
        'separate', // 주휴수당 별도 지급
        1
      ]
    );

    console.log('급여 정보 생성 완료 (시급: 10,000원)');

    // 2025년 출근 기록 생성 (1월 ~ 12월)
    for (let month = 1; month <= 12; month++) {
      const year = 2025;
      const daysInMonth = new Date(year, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // 주말 제외 (월~금만)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 출근 시간: 09:00, 퇴근 시간: 18:00 (점심 1시간 제외 = 8시간)
        await run(
          `INSERT INTO attendance (
            user_id, workplace_id, date, check_in_time, check_out_time, 
            work_hours, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            workplace.id,
            dateStr,
            `${dateStr} 09:00:00`,
            `${dateStr} 18:00:00`,
            8.0,
            'completed',
            `${dateStr} 09:00:00`
          ]
        );
      }

      console.log(`${year}년 ${month}월 출근 기록 생성 완료`);
    }

    console.log('✅ 테스트5 계정 생성 완료!');
    console.log('----------------------------');
    console.log('계정 정보:');
    console.log('  사용자명: test5');
    console.log('  비밀번호: 1234');
    console.log('  이름: 테스트5');
    console.log('  고용 형태: 시급 (10,000원)');
    console.log('  입사일: 2025-01-01');
    console.log('  2025년 전체 출근 기록 생성됨');
    console.log('----------------------------');

  } catch (error) {
    console.error('테스트5 계정 생성 오류:', error);
  }
};

createTest5Account();
