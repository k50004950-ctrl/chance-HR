import { run, query } from '../config/database.js';

const updateTax = async () => {
  try {
    console.log('🔧 김직원(employee1) 세금 유형 변경 중...');
    
    await run(
      'UPDATE salary_info SET tax_type = ?, salary_type = ?, amount = ? WHERE user_id = ?',
      ['4대보험', 'monthly', 3000000, 3]
    );
    
    console.log('✅ 김직원 → 4대보험 (월급 3,000,000원)으로 변경 완료!');
    
    // 확인
    const result = await query(
      'SELECT u.name, si.salary_type, si.amount, si.tax_type FROM users u LEFT JOIN salary_info si ON si.user_id = u.id WHERE u.id = ?',
      [3]
    );
    console.log('변경 결과:', result[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

updateTax();
