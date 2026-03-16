/**
 * Migration script: Encrypt existing plaintext SSN values
 * Run once: node backend/scripts/migrate-encrypt-ssn.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { query, run, initDatabase } from '../config/database.js';
import { encryptSSN, isEncrypted } from '../utils/crypto.js';

async function migrateSSN() {
  try {
    await initDatabase();
    console.log('🔐 SSN 암호화 마이그레이션 시작...\n');

    // Get all users with SSN
    const users = await query(
      "SELECT id, username, ssn FROM users WHERE ssn IS NOT NULL AND ssn != ''"
    );

    console.log(`📋 SSN이 등록된 사용자: ${users.length}명\n`);

    let encrypted = 0;
    let skipped = 0;

    for (const user of users) {
      if (isEncrypted(user.ssn)) {
        console.log(`  ⏭️  ${user.username} (ID: ${user.id}) - 이미 암호화됨`);
        skipped++;
        continue;
      }

      const encryptedValue = encryptSSN(user.ssn);
      await run('UPDATE users SET ssn = ? WHERE id = ?', [encryptedValue, user.id]);
      console.log(`  ✅ ${user.username} (ID: ${user.id}) - 암호화 완료`);
      encrypted++;
    }

    console.log(`\n🎉 마이그레이션 완료!`);
    console.log(`   암호화: ${encrypted}건`);
    console.log(`   스킵: ${skipped}건`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    process.exit(1);
  }
}

migrateSSN();
