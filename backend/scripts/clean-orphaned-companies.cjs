const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ladAFiwmVqhUbVZsadiwDpIXtHbGmLGH@turntable.proxy.rlwy.net:25868/railway';

const pool = new Pool({ connectionString });

async function cleanOrphanedCompanies() {
  try {
    console.log('🔍 고아 company 레코드 확인 중...\n');

    // 전화번호가 users 테이블에 없는 companies 찾기 (삭제된 사용자의 회사 정보)
    const orphanedCompanies = await pool.query(`
      SELECT c.*
      FROM companies c
      WHERE c.phone IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.phone = c.phone)
      ORDER BY c.created_at DESC
    `);

    if (orphanedCompanies.rows.length === 0) {
      console.log('✅ 정리할 고아 company 레코드가 없습니다!');
      await pool.end();
      return;
    }

    console.log(`⚠️  ${orphanedCompanies.rows.length}개의 고아 company 레코드 발견:\n`);

    orphanedCompanies.rows.forEach((company, idx) => {
      console.log(`${idx + 1}. ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   사업자번호: ${company.business_number}`);
      console.log(`   전화번호: ${company.phone}`);
      console.log(`   생성일: ${company.created_at}`);
      console.log('');
    });

    // 사용자 확인
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('이 레코드들을 삭제하시겠습니까? (y/n): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('❌ 취소되었습니다.');
      await pool.end();
      return;
    }

    // 삭제 실행
    console.log('\n🗑️  삭제 중...\n');
    let deletedCount = 0;

    for (const company of orphanedCompanies.rows) {
      try {
        await pool.query('DELETE FROM companies WHERE id = $1', [company.id]);
        console.log(`✅ 삭제: ${company.name} (ID: ${company.id})`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ 삭제 실패: ${company.name} - ${error.message}`);
      }
    }

    console.log(`\n📊 작업 완료: ${deletedCount}개 삭제됨`);

    await pool.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

cleanOrphanedCompanies();
