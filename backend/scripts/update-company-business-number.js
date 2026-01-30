import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function updateCompanyBusinessNumber() {
  try {
    console.log('🔄 Company business_number 업데이트 시작...');

    // 1. workplace_id 27의 business_number 조회
    const workplaceResult = await pool.query(
      'SELECT id, name, business_number FROM workplaces WHERE id = $1',
      [27]
    );

    if (workplaceResult.rows.length === 0) {
      console.log('❌ workplace_id 27을 찾을 수 없습니다.');
      return;
    }

    const workplace = workplaceResult.rows[0];
    console.log('📋 사업장 정보:', workplace);

    if (!workplace.business_number) {
      console.log('⚠️ 사업장에 business_number가 없습니다.');
      return;
    }

    // 2. company_id 1의 business_number 업데이트
    const updateResult = await pool.query(
      'UPDATE companies SET business_number = $1 WHERE id = $2 RETURNING *',
      [workplace.business_number, 1]
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Company 업데이트 완료:', updateResult.rows[0]);
    } else {
      console.log('❌ Company 업데이트 실패');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await pool.end();
  }
}

updateCompanyBusinessNumber();
