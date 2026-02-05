const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ladAFiwmVqhUbVZsadiwDpIXtHbGmLGH@turntable.proxy.rlwy.net:25868/railway';

const pool = new Pool({ connectionString });

async function createMissingEmployeeDetails() {
  try {
    console.log('🔧 employee_details가 없는 계정 확인 중...\n');

    // employee_details가 없는 직원 찾기
    const missingResult = await pool.query(`
      SELECT u.id, u.username, u.name, u.phone, u.workplace_id
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      WHERE u.role = 'employee' 
        AND ed.user_id IS NULL
      ORDER BY u.id DESC
    `);

    if (missingResult.rows.length === 0) {
      console.log('✅ 모든 직원 계정에 employee_details가 있습니다!');
      await pool.end();
      return;
    }

    console.log(`⚠️  ${missingResult.rows.length}개의 계정에 employee_details가 없습니다.\n`);

    for (const user of missingResult.rows) {
      console.log(`처리 중: ${user.name} (ID: ${user.id})`);

      try {
        // employee_details 생성 (동의는 false로 설정하여 팝업이 뜨도록 함)
        await pool.query(`
          INSERT INTO employee_details (
            user_id, 
            workplace_id,
            privacy_consent,
            location_consent
          ) VALUES ($1, $2, false, false)
          ON CONFLICT (user_id) DO NOTHING
        `, [user.id, user.workplace_id]);

        console.log(`   ✅ employee_details 생성 완료`);
      } catch (err) {
        console.error(`   ❌ 오류: ${err.message}`);
      }
    }

    console.log('\n📊 작업 완료 요약:');
    console.log(`   처리된 계정: ${missingResult.rows.length}개`);
    console.log('\n✅ 이제 해당 계정들로 로그인하면 동의 팝업이 표시됩니다!');

    await pool.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

createMissingEmployeeDetails();
