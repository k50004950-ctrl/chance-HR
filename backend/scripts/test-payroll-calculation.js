import { query } from '../config/database.js';

const testPayrollCalculation = async () => {
  try {
    console.log('🧪 급여 계산 테스트 시작\n');
    
    // 1. 최신 요율 조회 (202601)
    console.log('=== 1. 요율 조회 (202601) ===');
    const rates = await query(
      'SELECT * FROM rates_master WHERE effective_yyyymm <= ? ORDER BY effective_yyyymm DESC LIMIT 1',
      ['202601']
    );
    
    if (rates.length === 0) {
      console.error('❌ 요율을 찾을 수 없습니다.');
      process.exit(1);
    }
    
    const rate = rates[0];
    console.log(`✅ 요율 적용: ${rate.effective_yyyymm}`);
    console.log(`   국민연금: ${rate.nps_employee_rate_percent}%`);
    console.log(`   건강보험: ${rate.nhis_employee_rate_percent}%`);
    console.log(`   장기요양: ${rate.ltci_rate_of_nhis_percent}%`);
    console.log(`   고용보험: ${rate.ei_employee_rate_percent}%`);
    console.log(`   프리랜서 원천징수: ${rate.freelancer_withholding_rate_percent}%\n`);
    
    // 2. workplace_id = 1의 직원 조회
    console.log('=== 2. 직원 목록 조회 (workplace_id = 1) ===');
    const employees = await query(
      `SELECT u.id, u.username, u.name, u.role, 
              si.salary_type, si.amount, si.tax_type
       FROM users u
       LEFT JOIN salary_info si ON si.user_id = u.id
       WHERE u.role = 'employee' AND si.workplace_id = 1
       LIMIT 3`,
      []
    );
    
    console.log(`✅ 총 ${employees.length}명의 직원 발견\n`);
    
    if (employees.length === 0) {
      console.log('ℹ️  등록된 직원이 없습니다.');
      process.exit(0);
    }
    
    // 3. 각 직원별 급여 계산
    console.log('=== 3. 급여 계산 시뮬레이션 ===\n');
    
    employees.forEach((emp, idx) => {
      console.log(`직원 ${idx + 1}: ${emp.name} (${emp.username})`);
      console.log(`  - 급여 유형: ${emp.salary_type}`);
      console.log(`  - 기본급: ${emp.amount?.toLocaleString() || 'N/A'}원`);
      console.log(`  - 세금 유형: ${emp.tax_type}`);
      
      if (emp.tax_type === '4대보험' && emp.amount) {
        const basePay = parseFloat(emp.amount);
        
        // 4대보험 계산
        const nps = Math.floor(basePay * (rate.nps_employee_rate_percent / 100));
        const nhis = Math.floor(basePay * (rate.nhis_employee_rate_percent / 100));
        const ltci = Math.floor(nhis * (rate.ltci_rate_of_nhis_percent / 100));
        const ei = Math.floor(basePay * (rate.ei_employee_rate_percent / 100));
        
        const totalDeduction = nps + nhis + ltci + ei;
        const netPay = basePay - totalDeduction;
        
        console.log(`  📊 공제액 계산 (요율 ${rate.effective_yyyymm} 적용):`);
        console.log(`     - 국민연금 (${rate.nps_employee_rate_percent}%): ${nps.toLocaleString()}원`);
        console.log(`     - 건강보험 (${rate.nhis_employee_rate_percent}%): ${nhis.toLocaleString()}원`);
        console.log(`     - 장기요양 (${rate.ltci_rate_of_nhis_percent}%): ${ltci.toLocaleString()}원`);
        console.log(`     - 고용보험 (${rate.ei_employee_rate_percent}%): ${ei.toLocaleString()}원`);
        console.log(`     - 총 공제액: ${totalDeduction.toLocaleString()}원`);
        console.log(`  💰 실수령액: ${netPay.toLocaleString()}원`);
      } else if (emp.tax_type === '3.3%' && emp.amount) {
        const basePay = parseFloat(emp.amount);
        const withholding = Math.floor(basePay * (rate.freelancer_withholding_rate_percent / 100));
        const netPay = basePay - withholding;
        
        console.log(`  📊 공제액 계산 (요율 ${rate.effective_yyyymm} 적용):`);
        console.log(`     - 프리랜서 원천징수 (${rate.freelancer_withholding_rate_percent}%): ${withholding.toLocaleString()}원`);
        console.log(`  💰 실수령액: ${netPay.toLocaleString()}원`);
      }
      
      console.log('');
    });
    
    console.log('✅ 급여 계산 테스트 완료!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

testPayrollCalculation();
