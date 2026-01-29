import { query, run } from '../config/database.js';

const upgradeAdmin = async () => {
  try {
    console.log('🔧 Upgrading admin to SUPER_ADMIN...');
    
    // admin 계정을 SUPER_ADMIN으로 업그레이드
    await run(
      `UPDATE users SET role = ? WHERE username = ?`,
      ['SUPER_ADMIN', 'admin']
    );
    
    console.log('✅ admin 계정이 SUPER_ADMIN으로 업그레이드되었습니다.');
    
    // 확인
    const user = await query('SELECT username, role FROM users WHERE username = ?', ['admin']);
    console.log('현재 admin 계정 정보:', user[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

upgradeAdmin();
