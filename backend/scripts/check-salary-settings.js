import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkSalarySettings() {
  try {
    console.log('💰 급여 설정 상태 확인 중...\n');

    // 1. salary_info 테이블 확인
    const salaryInfo = await pool.query(`
      SELECT si.*, u.username, u.name
      FROM salary_info si
      JOIN users u ON si.user_id = u.id
      ORDER BY u.id;
    `);

    console.log('📋 salary_info 테이블:', salaryInfo.rowCount, '건');
    if (salaryInfo.rowCount > 0) {
      console.table(salaryInfo.rows);
    } else {
      console.log('   ❌ 급여 정보 없음 (salary_info)');
    }

    // 2. company_employee_relations 테이블 확인 (V2)
    const relations = await pool.query(`
      SELECT 
        cer.id,
        cer.user_id,
        u.username,
        u.name,
        cer.company_id,
        cer.position,
        cer.monthly_salary,
        cer.hourly_rate,
        cer.tax_type,
        cer.status
      FROM company_employee_relations cer
      JOIN users u ON cer.user_id = u.id
      WHERE cer.status = 'approved'
      ORDER BY cer.user_id;
    `);

    console.log('\n📋 company_employee_relations 테이블 (V2):', relations.rowCount, '건');
    if (relations.rowCount > 0) {
      console.table(relations.rows);
    } else {
      console.log('   ❌ 급여 정보 없음 (company_employee_relations)');
    }

    // 3. 김테스트, 이지혜 상세 정보
    const employees = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.name,
        u.workplace_id,
        u.role,
        si.salary_type,
        si.amount,
        si.tax_type as si_tax_type,
        cer.monthly_salary,
        cer.hourly_rate,
        cer.tax_type as cer_tax_type
      FROM users u
      LEFT JOIN salary_info si ON u.id = si.user_id
      LEFT JOIN company_employee_relations cer ON u.id = cer.user_id AND cer.status = 'approved'
      WHERE u.username IN ('김테스트', '이지혜')
      ORDER BY u.id;
    `);

    console.log('\n👥 김테스트, 이지혜 급여 정보:');
    console.table(employees.rows);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

checkSalarySettings();
