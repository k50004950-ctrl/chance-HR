import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function fixCompanyBusinessNumber() {
  try {
    console.log('🔄 Company business_number 수정 시작...');

    // company_id 1의 business_number를 실제 번호로 업데이트
    const updateResult = await pool.query(
      'UPDATE companies SET business_number = $1 WHERE id = $2 RETURNING *',
      ['819-06-01671', 1]
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Company 업데이트 완료!');
      console.log('   - company_id:', updateResult.rows[0].id);
      console.log('   - business_number:', updateResult.rows[0].business_number);
      console.log('   - company_name:', updateResult.rows[0].company_name);
    } else {
      console.log('❌ Company 업데이트 실패 - company_id 1이 존재하지 않습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

fixCompanyBusinessNumber();
