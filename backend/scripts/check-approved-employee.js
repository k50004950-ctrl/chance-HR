import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkApprovedEmployee() {
  try {
    console.log('🔍 승인된 직원 확인 중...\n');

    // 1. company_employee_relations 확인
    const relations = await pool.query(`
      SELECT 
        cer.*,
        u.username,
        u.name,
        u.role,
        u.workplace_id
      FROM company_employee_relations cer
      JOIN users u ON cer.user_id = u.id
      WHERE cer.company_id = 1
      ORDER BY cer.created_at DESC
      LIMIT 5;
    `);

    console.log('📋 company_employee_relations:');
    console.table(relations.rows);

    // 2. 사업주의 workplace_id 확인
    const owner = await pool.query(`
      SELECT id, username, name, role, workplace_id
      FROM users
      WHERE id = 75;
    `);

    console.log('\n👤 사업주 (찬스컴퍼니) 정보:');
    console.table(owner.rows);

    // 3. workplaces 테이블 확인
    const workplaces = await pool.query(`
      SELECT * FROM workplaces
      WHERE company_id = 1 OR id IN (
        SELECT DISTINCT workplace_id 
        FROM users 
        WHERE id IN (75, 76)
      )
      LIMIT 5;
    `);

    console.log('\n🏢 관련 workplaces:');
    console.table(workplaces.rows);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

checkApprovedEmployee();
