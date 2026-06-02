import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { encryptSSN } from '../utils/crypto.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function updateInfo() {
  try {
    console.log('🔧 김테스트 계정 정보 업데이트 중...\n');

    const encryptedSSN = encryptSSN('9001011234567');

    // 김테스트 계정 업데이트
    await pool.query(`
      UPDATE users
      SET 
        ssn = $1,
        email = $2,
        address = $3
      WHERE username = '김테스트';
    `, [encryptedSSN, 'test@example.com', '서울시 강남구 테헤란로 123']);

    console.log('✅ users 테이블 업데이트 완료!');

    // 확인
    const result = await pool.query(`
      SELECT id, username, name, phone, email, address,
             CASE WHEN ssn IS NOT NULL AND ssn LIKE '%:%:%' THEN true ELSE false END AS ssn_encrypted
      FROM users
      WHERE username = '김테스트';
    `);

    console.log('\n📋 업데이트된 정보:');
    console.table(result.rows);

    // employee_details에도 정보 반영
    const user = result.rows[0];
    if (user) {
      await pool.query(`
        INSERT INTO employee_details (
          user_id, 
          workplace_id,
          privacy_consent,
          privacy_consent_date,
          location_consent,
          location_consent_date,
          created_at
        ) VALUES ($1, 27, true, NOW(), true, NOW(), NOW())
        ON CONFLICT (user_id, workplace_id) DO UPDATE
        SET 
          privacy_consent = true,
          privacy_consent_date = NOW();
      `, [user.id]);

      console.log('\n✅ employee_details 생성/업데이트 완료!');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

updateInfo();
