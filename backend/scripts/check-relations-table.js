import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkTable() {
  try {
    console.log('🔍 company_employee_relations 테이블 확인...\n');

    // 1. 테이블 존재 확인
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'company_employee_relations'
      );
    `);
    
    console.log('📋 테이블 존재:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ company_employee_relations 테이블이 없습니다!');
      return;
    }

    // 2. 테이블 구조 확인
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'company_employee_relations'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 테이블 구조:');
    console.table(columns.rows);

    // 3. 기존 데이터 확인
    const data = await pool.query(`
      SELECT * FROM company_employee_relations LIMIT 5;
    `);

    console.log(`\n📦 기존 데이터 (${data.rowCount}건):`);
    if (data.rowCount > 0) {
      console.table(data.rows);
    } else {
      console.log('   (데이터 없음)');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error('상세:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
