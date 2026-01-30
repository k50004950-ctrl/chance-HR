import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkInfo() {
  try {
    console.log('🔍 김테스트 계정 정보 확인...\n');

    // 1. users 테이블 확인
    const user = await pool.query(`
      SELECT id, username, name, phone, ssn, email, address
      FROM users
      WHERE username = '김테스트';
    `);

    console.log('👤 users 테이블:');
    console.table(user.rows);

    if (user.rowCount === 0) {
      console.log('❌ 김테스트 계정을 찾을 수 없습니다!');
      return;
    }

    // 2. users 테이블 컬럼 확인
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('ssn', 'email', 'address')
      ORDER BY column_name;
    `);

    console.log('\n📊 users 테이블 컬럼 (ssn, email, address):');
    console.table(columns.rows);

    // 3. company_employee_relations 확인
    const userId = user.rows[0].id;
    const relation = await pool.query(`
      SELECT * FROM company_employee_relations
      WHERE user_id = $1;
    `, [userId]);

    console.log('\n📋 company_employee_relations:');
    console.table(relation.rows);

    // 4. employee_details 확인
    const details = await pool.query(`
      SELECT * FROM employee_details
      WHERE user_id = $1;
    `, [userId]);

    console.log('\n📋 employee_details:');
    if (details.rowCount > 0) {
      console.table(details.rows);
    } else {
      console.log('   (데이터 없음)');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

checkInfo();
