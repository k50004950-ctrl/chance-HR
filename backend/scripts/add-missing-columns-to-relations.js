import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function addColumns() {
  try {
    console.log('🔧 company_employee_relations 테이블에 컬럼 추가 중...\n');

    // 1. tax_type 컬럼 추가
    try {
      await pool.query(`
        ALTER TABLE company_employee_relations 
        ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT '4대보험';
      `);
      console.log('✅ tax_type 컬럼 추가 완료');
    } catch (err) {
      console.log('⚠️ tax_type 컬럼:', err.message);
    }

    // 2. monthly_salary 컬럼 추가
    try {
      await pool.query(`
        ALTER TABLE company_employee_relations 
        ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12,2) DEFAULT 0;
      `);
      console.log('✅ monthly_salary 컬럼 추가 완료');
    } catch (err) {
      console.log('⚠️ monthly_salary 컬럼:', err.message);
    }

    // 3. hourly_rate 컬럼 추가
    try {
      await pool.query(`
        ALTER TABLE company_employee_relations 
        ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 0;
      `);
      console.log('✅ hourly_rate 컬럼 추가 완료');
    } catch (err) {
      console.log('⚠️ hourly_rate 컬럼:', err.message);
    }

    console.log('\n🎉 모든 컬럼 추가 완료!');

    // 4. 최종 테이블 구조 확인
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'company_employee_relations'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 최종 테이블 구조:');
    console.table(columns.rows);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

addColumns();
