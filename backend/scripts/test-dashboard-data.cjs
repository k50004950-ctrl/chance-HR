const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'attendance.db');
const db = new sqlite3.Database(dbPath);

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function testDashboardData() {
  try {
    console.log('🔍 대시보드 데이터 테스트 시작...\n');

    // 1. 모든 workplace 조회
    const workplaces = await query('SELECT * FROM workplaces ORDER BY id');
    console.log('📍 사업장 목록:');
    workplaces.forEach(w => {
      console.log(`  - ID: ${w.id}, 이름: ${w.name}, 사업주: ${w.owner_id}`);
    });
    console.log();

    if (workplaces.length === 0) {
      console.log('❌ 사업장이 없습니다!');
      return;
    }

    // 첫 번째 사업장 선택
    const workplace = workplaces[0];
    console.log(`✅ 테스트할 사업장: ${workplace.name} (ID: ${workplace.id})\n`);

    // 2. 해당 사업장의 직원 조회
    const employees = await query(`
      SELECT u.*, e.*
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE e.workplace_id = ? AND e.employment_status = 'active'
    `, [workplace.id]);

    console.log(`👥 활성 직원: ${employees.length}명`);
    employees.forEach(emp => {
      console.log(`  - ${emp.name} (ID: ${emp.user_id})`);
    });
    console.log();

    // 3. 이번 달 출근 기록 조회
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${String(new Date(year, today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    
    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);

    const attendance = await query(`
      SELECT a.*, u.name as employee_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.workplace_id = ? 
        AND a.date >= ? 
        AND a.date <= ?
      ORDER BY a.date DESC
    `, [workplace.id, startDate, endDate]);

    console.log(`📊 이번 달 출근기록: ${attendance.length}건\n`);

    // 4. 오늘 출근 기록 상세
    const todayStr = today.toISOString().split('T')[0];
    console.log(`📌 오늘 날짜: ${todayStr}`);

    const todayAttendance = attendance.filter(a => a.date === todayStr);
    console.log(`📊 오늘 출근기록: ${todayAttendance.length}건`);

    if (todayAttendance.length > 0) {
      console.log('\n오늘 출근 상세:');
      todayAttendance.forEach(a => {
        console.log(`  - ${a.employee_name}:`);
        console.log(`    date: ${a.date}`);
        console.log(`    check_in_time: ${a.check_in_time}`);
        console.log(`    check_out_time: ${a.check_out_time}`);
        console.log(`    status: ${a.status}`);
      });
    } else {
      console.log('⚠️ 오늘 출근 기록이 없습니다!');
    }

    // 5. 최근 출근 기록 5건
    console.log('\n\n📋 최근 출근 기록 (최대 5건):');
    attendance.slice(0, 5).forEach(a => {
      console.log(`  - ${a.employee_name} (${a.date}):`);
      console.log(`    check_in: ${a.check_in_time || '없음'}`);
      console.log(`    check_out: ${a.check_out_time || '없음'}`);
      console.log(`    status: ${a.status}`);
    });

    // 6. 출근 통계
    const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
    const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
    const notCheckedIn = employees.length - checkedInToday;

    console.log('\n\n📊 출근 통계:');
    console.log(`  ✅ 출근: ${checkedInToday}명`);
    console.log(`  ❌ 미출근: ${notCheckedIn}명`);
    console.log(`  ⚠️ 미퇴근: ${notCheckedOut}명`);
    console.log(`  👥 총 직원: ${employees.length}명`);

    // 7. API 응답 형식 확인
    console.log('\n\n🔍 API 응답 형식:');
    if (attendance.length > 0) {
      console.log('첫 번째 출근기록 샘플:');
      console.log(JSON.stringify(attendance[0], null, 2));
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    db.close();
  }
}

testDashboardData();
