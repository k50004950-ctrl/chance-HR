import { query, initDB } from '../config/database.js';

const checkUsers = async () => {
  try {
    await initDB();
    
    console.log('📋 데이터베이스 사용자 조회...\n');
    
    const users = await query(
      'SELECT id, username, role FROM users ORDER BY role, username'
    );
    
    console.log(`✓ 총 ${users.length}명의 사용자 발견:\n`);
    
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) [ID: ${user.id}]`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

checkUsers();
