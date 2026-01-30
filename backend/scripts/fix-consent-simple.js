import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function fixConsent() {
  try {
    console.log('🔧 이지혜짱 동의 처리 중...\n');

    const userId = 76;
    const workplaceId = 27;

    // 1. 기존 확인
    const existing = await pool.query(`
      SELECT id FROM employee_details WHERE user_id = $1;
    `, [userId]);

    if (existing.rowCount > 0) {
      // UPDATE
      await pool.query(`
        UPDATE employee_details
        SET 
          privacy_consent = true,
          privacy_consent_date = NOW(),
          location_consent = true,
          location_consent_date = NOW()
        WHERE user_id = $1;
      `, [userId]);
      console.log('✅ employee_details 업데이트 완료!');
    } else {
      // INSERT
      await pool.query(`
        INSERT INTO employee_details (
          user_id, 
          workplace_id,
          privacy_consent,
          privacy_consent_date,
          location_consent,
          location_consent_date,
          created_at
        ) VALUES ($1, $2, true, NOW(), true, NOW(), NOW());
      `, [userId, workplaceId]);
      console.log('✅ employee_details 생성 완료!');
    }

    console.log('✅ privacy_consent = true');
    console.log('✅ privacy_consent_date = NOW()');
    console.log('✅ location_consent = true\n');

    // 확인
    const result = await pool.query(`
      SELECT user_id, workplace_id, privacy_consent, privacy_consent_date, location_consent
      FROM employee_details
      WHERE user_id = $1;
    `, [userId]);

    console.log('📋 최종 상태:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

fixConsent();
