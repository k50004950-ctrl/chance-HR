import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkConsent() {
  try {
    console.log('🔍 이지혜짱 계정 상태 확인...\n');

    const userId = 76;

    // 1. users 테이블
    const user = await pool.query(`
      SELECT id, username, name, workplace_id, role
      FROM users
      WHERE id = $1;
    `, [userId]);

    console.log('👤 users:');
    console.table(user.rows);

    // 2. employee_details 테이블
    const details = await pool.query(`
      SELECT *
      FROM employee_details
      WHERE user_id = $1;
    `, [userId]);

    console.log('\n📋 employee_details:');
    if (details.rowCount > 0) {
      console.table(details.rows);
    } else {
      console.log('   ❌ employee_details 없음!');
    }

    // 3. consent_records 테이블 확인
    const consent = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'consent_records'
      );
    `);

    console.log('\n📋 consent_records 테이블 존재:', consent.rows[0].exists);

    if (consent.rows[0].exists) {
      const consentRecords = await pool.query(`
        SELECT *
        FROM consent_records
        WHERE user_id = $1;
      `, [userId]);

      console.log('\n✅ consent_records:');
      if (consentRecords.rowCount > 0) {
        console.table(consentRecords.rows);
      } else {
        console.log('   ❌ consent_records 없음!');
      }
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

checkConsent();
