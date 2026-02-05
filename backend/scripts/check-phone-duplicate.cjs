const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ladAFiwmVqhUbVZsadiwDpIXtHbGmLGH@turntable.proxy.rlwy.net:25868/railway';

const pool = new Pool({ connectionString });

async function checkPhoneDuplicate() {
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.error('❌ 사용법: node check-phone-duplicate.cjs <전화번호>');
    console.error('   예: node check-phone-duplicate.cjs 01012345678');
    process.exit(1);
  }

  try {
    console.log(`📱 전화번호 "${phoneNumber}" 중복 확인 중...\n`);

    // users 테이블에서 확인
    const usersResult = await pool.query(
      `SELECT id, username, name, phone, role, created_at 
       FROM users 
       WHERE phone = $1
       ORDER BY created_at DESC`,
      [phoneNumber]
    );

    console.log('=== users 테이블 ===');
    if (usersResult.rows.length === 0) {
      console.log('✅ 해당 전화번호로 등록된 사용자 없음');
    } else {
      console.log(`⚠️  ${usersResult.rows.length}개의 계정 발견:`);
      usersResult.rows.forEach((user, idx) => {
        console.log(`\n${idx + 1}. ${user.name} (${user.username})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   역할: ${user.role}`);
        console.log(`   전화번호: ${user.phone}`);
        console.log(`   생성일: ${user.created_at}`);
      });
    }

    // employee_details 테이블에서 확인 (phone이 있을 수 있음)
    const employeeDetailsResult = await pool.query(
      `SELECT ed.*, u.name, u.username 
       FROM employee_details ed
       LEFT JOIN users u ON ed.user_id = u.id
       WHERE ed.phone = $1`,
      [phoneNumber]
    );

    console.log('\n=== employee_details 테이블 ===');
    if (employeeDetailsResult.rows.length === 0) {
      console.log('✅ 해당 전화번호로 등록된 직원 상세정보 없음');
    } else {
      console.log(`⚠️  ${employeeDetailsResult.rows.length}개의 레코드 발견:`);
      employeeDetailsResult.rows.forEach((detail, idx) => {
        console.log(`\n${idx + 1}. user_id: ${detail.user_id}`);
        console.log(`   이름: ${detail.name || '(삭제된 사용자)'}`);
        console.log(`   username: ${detail.username || '(삭제된 사용자)'}`);
        console.log(`   전화번호: ${detail.phone}`);
      });
    }

    // companies 테이블에서 확인
    const companiesResult = await pool.query(
      `SELECT id, name, business_number, phone, created_at
       FROM companies
       WHERE phone = $1`,
      [phoneNumber]
    );

    console.log('\n=== companies 테이블 ===');
    if (companiesResult.rows.length === 0) {
      console.log('✅ 해당 전화번호로 등록된 회사 없음');
    } else {
      console.log(`⚠️  ${companiesResult.rows.length}개의 회사 발견:`);
      companiesResult.rows.forEach((company, idx) => {
        console.log(`\n${idx + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   사업자번호: ${company.business_number}`);
        console.log(`   전화번호: ${company.phone}`);
        console.log(`   생성일: ${company.created_at}`);
      });
    }

    console.log('\n=== 요약 ===');
    console.log(`users 테이블: ${usersResult.rows.length}개`);
    console.log(`employee_details 테이블: ${employeeDetailsResult.rows.length}개`);
    console.log(`companies 테이블: ${companiesResult.rows.length}개`);
    console.log(`총: ${usersResult.rows.length + employeeDetailsResult.rows.length + companiesResult.rows.length}개`);

    if (usersResult.rows.length + employeeDetailsResult.rows.length + companiesResult.rows.length === 0) {
      console.log('\n✅ 해당 전화번호는 회원가입 가능합니다!');
    } else {
      console.log('\n⚠️  해당 전화번호는 이미 사용 중입니다!');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkPhoneDuplicate();
