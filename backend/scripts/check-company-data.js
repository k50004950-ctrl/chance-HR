import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkData() {
  try {
    console.log('🔍 회사 데이터 확인 중...\n');

    // 1. companies 테이블 확인
    const companiesResult = await pool.query(
      'SELECT * FROM companies WHERE id = 1'
    );
    console.log('📊 companies 테이블 (company_id = 1):');
    console.log(companiesResult.rows[0]);
    console.log('');

    // 2. company_admins 확인
    const adminsResult = await pool.query(
      'SELECT * FROM company_admins WHERE company_id = 1'
    );
    console.log('👥 company_admins 테이블:');
    console.log(adminsResult.rows);
    console.log('');

    // 3. users 테이블에서 사업주 정보 확인
    if (adminsResult.rows.length > 0) {
      const userId = adminsResult.rows[0].user_id;
      const userResult = await pool.query(
        'SELECT id, username, name, phone, business_number FROM users WHERE id = $1',
        [userId]
      );
      console.log(`📇 사업주 정보 (user_id = ${userId}):`);
      console.log(userResult.rows[0]);
      console.log('');
    }

    // 4. 검색 쿼리 테스트
    console.log('🔍 검색 테스트:');
    console.log('   - business_number: 819-06-01671');
    console.log('   - owner_phone: 01022556296');
    console.log('');

    const searchResult = await pool.query(
      `SELECT 
        c.id,
        c.business_number,
        c.company_name,
        c.phone,
        u.name as owner_name,
        u.phone as owner_phone
      FROM companies c
      LEFT JOIN company_admins ca ON c.id = ca.company_id AND ca.role = 'owner'
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE c.business_number = $1 AND u.phone = $2
      LIMIT 1`,
      ['819-06-01671', '01022556296']
    );

    console.log('✅ 검색 결과:');
    if (searchResult.rows.length > 0) {
      console.log(searchResult.rows[0]);
    } else {
      console.log('❌ 검색 결과 없음!');
      console.log('');
      console.log('🔍 핸드폰번호 형식 확인:');
      const phoneCheckResult = await pool.query(
        `SELECT u.phone FROM users u
         JOIN company_admins ca ON u.id = ca.user_id
         WHERE ca.company_id = 1`,
        []
      );
      console.log('   DB에 저장된 핸드폰번호:', phoneCheckResult.rows[0]?.phone);
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
