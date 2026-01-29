import { query } from '../config/database.js';

const listUsers = async () => {
  try {
    console.log('📋 사용자 목록 조회 중...\n');
    
    const users = await query('SELECT id, username, name, role FROM users ORDER BY id');
    
    console.log('=== 현재 사용자 목록 ===');
    users.forEach(u => {
      console.log(`  ${u.id}: ${u.username} (${u.name}) - Role: ${u.role}`);
    });
    console.log(`\n총 ${users.length}명\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

listUsers();
