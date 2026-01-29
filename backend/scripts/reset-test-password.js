import { query, run } from '../config/database.js';
import bcrypt from 'bcryptjs';

const resetPassword = async () => {
  try {
    console.log('🔧 test 계정 비밀번호 리셋 중...');
    
    const hashedPassword = await bcrypt.hash('test123!', 10);
    
    await run(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, 'test']
    );
    
    console.log('✅ test 계정 비밀번호가 "test123!"로 리셋되었습니다.');
    
    // 확인
    const user = await query('SELECT id, username, name, role FROM users WHERE username = ?', ['test']);
    console.log('계정 정보:', user[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

resetPassword();
