import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestData() {
  try {
    console.log('데이터베이스 연결 중...');
    
    // 1. 테스트 사업주 계정 생성
    const hashedPassword = await bcrypt.hash('1234', 10);
    const ownerResult = await pool.query(
      `INSERT INTO users (username, password, name, phone, email, role, business_name, business_number, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      ['test', hashedPassword, '테스트대표', '010-1234-5678', 'test@test.com', 'owner', '테스트회사', '123-45-67890', 'approved']
    );
    const ownerId = ownerResult.rows[0].id;
    console.log(`✅ 테스트 사업주 생성 완료 (ID: ${ownerId})`);

    // 2. 사업장 생성
    const workplaceResult = await pool.query(
      `INSERT INTO workplaces (name, address, latitude, longitude, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['테스트 사업장', '서울시 강남구 테헤란로 123', 37.5012743, 127.0396597, ownerId]
    );
    const workplaceId = workplaceResult.rows[0].id;
    console.log(`✅ 사업장 생성 완료 (ID: ${workplaceId})`);

    // 3. 직원 3명 생성
    const employees = [
      { username: 'employee1', password: '1234', name: '김직원', salaryType: 'hourly', amount: 12000 },
      { username: 'employee2', password: '1234', name: '이직원', salaryType: 'annual', amount: 30000000 },
      { username: 'employee3', password: '1234', name: '박직원', salaryType: 'monthly', amount: 2100000 }
    ];

    for (const emp of employees) {
      const hashedEmpPassword = await bcrypt.hash(emp.password, 10);
      const empResult = await pool.query(
        `INSERT INTO users (username, password, name, role, workplace_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
         RETURNING id`,
        [emp.username, hashedEmpPassword, emp.name, 'employee', workplaceId]
      );
      const empId = empResult.rows[0].id;

      // 직원 상세 정보
      await pool.query(
        `INSERT INTO employee_details (user_id, workplace_id, hire_date, position, work_start_time, work_end_time)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [empId, workplaceId, '2025-01-01', '직원', '09:00', '18:00']
      );

      // 급여 정보
      await pool.query(
        `INSERT INTO salary_info (user_id, salary_type, amount, weekly_holiday_pay)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET salary_type = EXCLUDED.salary_type, amount = EXCLUDED.amount`,
        [empId, emp.salaryType, emp.amount, emp.salaryType === 'hourly']
      );

      console.log(`✅ ${emp.name} 생성 완료 (${emp.salaryType}, ${emp.amount.toLocaleString()}원)`);

      // 4. 2025년 1년치 근태 데이터 생성
      console.log(`  📅 ${emp.name}의 2025년 근태 데이터 생성 중...`);
      let attendanceCount = 0;

      for (let month = 1; month <= 12; month++) {
        const daysInMonth = new Date(2025, month, 0).getDate();
        let lateCount = 0;
        let absentCount = 0;
        const maxLate = Math.floor(Math.random() * 3) + 1; // 1-3회
        const maxAbsent = Math.floor(Math.random() * 3) + 1; // 1-3회

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(2025, month - 1, day);
          const dayOfWeek = date.getDay();

          // 주말 제외
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;

          let checkInTime, checkOutTime, workHours, status;

          // 랜덤으로 지각/결근 결정
          const rand = Math.random();
          
          if (absentCount < maxAbsent && rand < 0.05) {
            // 결근 (5% 확률)
            checkInTime = null;
            checkOutTime = null;
            workHours = null;
            status = 'absent';
            absentCount++;
          } else if (lateCount < maxLate && rand < 0.15) {
            // 지각 (10% 확률)
            const lateMinutes = Math.floor(Math.random() * 60) + 10; // 10-70분 지각
            checkInTime = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 09:${String(lateMinutes).padStart(2, '0')}:00`;
            checkOutTime = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 18:00:00`;
            workHours = 8 - (lateMinutes / 60);
            status = 'completed';
            lateCount++;
          } else {
            // 정상 출근
            checkInTime = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 09:00:00`;
            checkOutTime = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 18:00:00`;
            workHours = 8;
            status = 'completed';
          }

          await pool.query(
            `INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_out_time, work_hours, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [empId, workplaceId, date.toISOString().split('T')[0], checkInTime, checkOutTime, workHours, status]
          );
          attendanceCount++;
        }
        
        console.log(`    ${month}월: 지각 ${lateCount}회, 결근 ${absentCount}회`);
      }
      console.log(`  ✅ 총 ${attendanceCount}건의 근태 데이터 생성 완료`);
    }

    console.log('\n🎉 모든 테스트 데이터 생성 완료!');
    console.log('\n📋 생성된 계정:');
    console.log('  사업주: test / 1234');
    console.log('  직원1: employee1 / 1234 (시급 12,000원)');
    console.log('  직원2: employee2 / 1234 (연봉 30,000,000원)');
    console.log('  직원3: employee3 / 1234 (월급 2,100,000원)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

createTestData();
