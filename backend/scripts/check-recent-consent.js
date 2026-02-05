const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ladAFiwmVqhUbVZsadiwDpIXtHbGmLGH@turntable.proxy.rlwy.net:25868/railway';

const pool = new Pool({ connectionString });

async function checkRecentConsent() {
  try {
    console.log('📋 최근 생성된 직원 계정의 동의 상태 확인 중...\n');

    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.name,
        u.phone,
        u.role,
        u.created_at,
        ed.privacy_consent,
        ed.location_consent,
        ed.privacy_consent_date,
        CASE 
          WHEN ed.user_id IS NULL THEN 'employee_details 없음'
          WHEN ed.privacy_consent = true THEN '동의 완료'
          ELSE '미동의'
        END as consent_status
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      WHERE u.role = 'employee'
      ORDER BY u.id DESC
      LIMIT 15
    `);

    console.log(`총 ${result.rows.length}개의 직원 계정 발견\n`);
    
    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.name} (${row.username})`);
      console.log(`   ID: ${row.id}`);
      console.log(`   전화번호: ${row.phone}`);
      console.log(`   생성일: ${row.created_at}`);
      console.log(`   상태: ${row.consent_status}`);
      console.log(`   개인정보 동의: ${row.privacy_consent ? 'O' : 'X'}`);
      console.log(`   위치정보 동의: ${row.location_consent ? 'O' : 'X'}`);
      console.log(`   동의일: ${row.privacy_consent_date || '-'}`);
      console.log('');
    });

    const noDetailsCount = result.rows.filter(r => r.consent_status === 'employee_details 없음').length;
    const notConsentedCount = result.rows.filter(r => r.consent_status === '미동의').length;
    const consentedCount = result.rows.filter(r => r.consent_status === '동의 완료').length;

    console.log('📊 요약:');
    console.log(`   employee_details 없음: ${noDetailsCount}명`);
    console.log(`   미동의: ${notConsentedCount}명`);
    console.log(`   동의 완료: ${consentedCount}명`);

    if (noDetailsCount > 0 || notConsentedCount > 0) {
      console.log('\n⚠️  동의 처리가 필요한 계정이 있습니다.');
      console.log('   자동 생성 스크립트를 실행하시겠습니까?');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

checkRecentConsent();
