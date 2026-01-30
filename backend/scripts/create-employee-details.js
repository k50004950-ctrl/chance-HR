import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function createEmployeeDetails() {
  try {
    console.log('🔧 이지혜짱 employee_details 생성 중...\n');

    const userId = 76;
    const workplaceId = 27;

    // 1. company_employee_relations에서 정보 가져오기
    const relation = await pool.query(`
      SELECT start_date, position, monthly_salary, hourly_rate, tax_type, employment_type
      FROM company_employee_relations
      WHERE user_id = $1 AND status = 'active'
      LIMIT 1;
    `, [userId]);

    if (relation.rowCount === 0) {
      console.log('❌ company_employee_relations를 찾을 수 없습니다!');
      return;
    }

    const rel = relation.rows[0];
    console.log('📋 매칭 정보:');
    console.table(rel);

    // 2. employee_details 생성
    await pool.query(`
      INSERT INTO employee_details (
        user_id, 
        workplace_id, 
        hire_date, 
        position, 
        monthly_salary, 
        hourly_rate, 
        tax_type,
        privacy_consent_date,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (user_id, workplace_id) DO UPDATE
      SET 
        hire_date = EXCLUDED.hire_date,
        position = EXCLUDED.position,
        monthly_salary = EXCLUDED.monthly_salary,
        hourly_rate = EXCLUDED.hourly_rate,
        tax_type = EXCLUDED.tax_type,
        privacy_consent_date = NOW();
    `, [
      userId,
      workplaceId,
      rel.start_date,
      rel.position || '',
      rel.monthly_salary || 0,
      rel.hourly_rate || 0,
      rel.tax_type || '4대보험'
    ]);

    console.log('\n✅ employee_details 생성 완료!');
    console.log('✅ privacy_consent_date 설정 완료 (동의 완료)');

    // 3. 최종 확인
    const result = await pool.query(`
      SELECT *
      FROM employee_details
      WHERE user_id = $1;
    `, [userId]);

    console.log('\n📋 최종 employee_details:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

createEmployeeDetails();
