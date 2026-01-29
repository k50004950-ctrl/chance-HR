/**
 * 기존 V2 사업주 중 사업장이 없는 사용자를 위한 수정 스크립트
 * 
 * 용도: V2로 가입했지만 사업장이 생성되지 않은 사용자들에게 기본 사업장 생성
 * 
 * 실행: node backend/scripts/fix-missing-workplaces.js
 */

import { run, get, query } from '../config/database.js';

async function fixMissingWorkplaces() {
  console.log('🔧 사업장 없는 사업주 확인 및 수정 시작...\n');

  try {
    // 1. workplace_id가 NULL인 사업주 찾기
    const ownersWithoutWorkplace = await query(`
      SELECT u.id, u.username, u.name, u.phone, u.business_number
      FROM users u
      WHERE u.role = 'owner' 
        AND u.workplace_id IS NULL
        AND u.business_number IS NOT NULL
    `);

    if (ownersWithoutWorkplace.length === 0) {
      console.log('✅ 모든 사업주가 사업장을 가지고 있습니다.\n');
      return;
    }

    console.log(`📋 사업장이 없는 사업주: ${ownersWithoutWorkplace.length}명\n`);

    for (const owner of ownersWithoutWorkplace) {
      console.log(`\n👤 처리 중: ${owner.name} (${owner.username})`);
      console.log(`   사업자등록번호: ${owner.business_number}`);

      try {
        // 2. 해당 사업자등록번호의 company 찾기
        const company = await get(
          'SELECT id FROM companies WHERE business_number = ?',
          [owner.business_number]
        );

        if (!company) {
          console.log(`   ⚠️  회사 정보 없음 - 스킵`);
          continue;
        }

        console.log(`   📍 company_id: ${company.id}`);

        // 3. 이미 해당 owner의 workplace가 있는지 확인
        const existingWorkplace = await get(
          'SELECT id FROM workplaces WHERE owner_id = ?',
          [owner.id]
        );

        if (existingWorkplace) {
          // workplace는 있는데 users.workplace_id가 NULL인 경우
          console.log(`   🔗 기존 사업장 발견 (ID: ${existingWorkplace.id}) - 연결 중...`);
          await run(
            'UPDATE users SET workplace_id = ? WHERE id = ?',
            [existingWorkplace.id, owner.id]
          );
          console.log(`   ✅ 사용자와 사업장 연결 완료`);
        } else {
          // 새 workplace 생성 필요
          console.log(`   🏢 새 사업장 생성 중...`);
          
          const workplaceResult = await run(
            `INSERT INTO workplaces (
              owner_id, company_id, name, business_number, address, phone, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [owner.id, company.id, owner.name + '의 사업장', owner.business_number, '', owner.phone]
          );

          const workplaceId = workplaceResult.lastID;
          console.log(`   🏢 사업장 생성 완료 (ID: ${workplaceId})`);

          // users 테이블 업데이트
          await run(
            'UPDATE users SET workplace_id = ? WHERE id = ?',
            [workplaceId, owner.id]
          );
          console.log(`   🔗 사용자와 사업장 연결 완료`);
        }

        console.log(`   ✅ ${owner.name} 처리 완료!`);

      } catch (ownerError) {
        console.error(`   ❌ 오류 발생:`, ownerError.message);
      }
    }

    console.log('\n\n🎉 모든 사업주 처리 완료!\n');

    // 4. 최종 확인
    const remainingIssues = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'owner' 
        AND workplace_id IS NULL
        AND business_number IS NOT NULL
    `);

    if (remainingIssues[0].count === 0) {
      console.log('✅ 모든 사업주가 사업장을 가지고 있습니다!');
    } else {
      console.log(`⚠️  아직 ${remainingIssues[0].count}명의 사업주가 사업장이 없습니다.`);
      console.log('   수동으로 확인이 필요합니다.');
    }

  } catch (error) {
    console.error('\n❌ 스크립트 실행 오류:', error);
    throw error;
  }
}

// 실행
fixMissingWorkplaces()
  .then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실패:', error);
    process.exit(1);
  });
