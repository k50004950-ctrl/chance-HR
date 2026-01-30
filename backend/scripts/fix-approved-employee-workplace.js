import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function fixWorkplaceId() {
  try {
    console.log('🔧 승인된 직원의 workplace_id 업데이트 중...\n');

    const companyId = 1;
    const userId = 76; // 이지혜짱
    const ownerId = 75; // 찬스컴퍼니

    // 1. 사업주의 workplace 찾기
    const workplace = await pool.query(`
      SELECT id FROM workplaces
      WHERE owner_id = $1 AND company_id = $2
      LIMIT 1;
    `, [ownerId, companyId]);

    if (workplace.rows.length === 0) {
      console.log('❌ workplace를 찾을 수 없습니다!');
      return;
    }

    const workplaceId = workplace.rows[0].id;
    console.log(`✅ workplace 찾음: id = ${workplaceId}\n`);

    // 2. company_employee_relations에 workplace_id 업데이트
    await pool.query(`
      UPDATE company_employee_relations
      SET workplace_id = $1
      WHERE company_id = $2 AND user_id = $3 AND status = 'active';
    `, [workplaceId, companyId, userId]);
    console.log('✅ company_employee_relations.workplace_id 업데이트 완료');

    // 3. users 테이블에도 workplace_id 업데이트
    await pool.query(`
      UPDATE users
      SET workplace_id = $1
      WHERE id = $2;
    `, [workplaceId, userId]);
    console.log('✅ users.workplace_id 업데이트 완료');

    // 4. 사업주의 workplace_id도 업데이트
    await pool.query(`
      UPDATE users
      SET workplace_id = $1
      WHERE id = $2;
    `, [workplaceId, ownerId]);
    console.log('✅ 사업주 workplace_id 업데이트 완료');

    // 5. 최종 확인
    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.name, u.workplace_id,
        cer.company_id, cer.status
      FROM users u
      LEFT JOIN company_employee_relations cer ON u.id = cer.user_id AND cer.status = 'active'
      WHERE u.id IN ($1, $2);
    `, [ownerId, userId]);

    console.log('\n📋 최종 상태:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

fixWorkplaceId();
