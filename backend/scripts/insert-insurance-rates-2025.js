import { query, run } from '../config/database.js';

async function insertInsuranceRates2025() {
  try {
    console.log('🔄 2025년 4대보험 요율 추가 중...\n');

    // 기존 2025년 요율 삭제
    await run('DELETE FROM insurance_rates WHERE year = 2025', []);
    console.log('✅ 기존 2025년 요율 삭제 완료');

    // 2025년 요율 한 번에 삽입
    await run(`
      INSERT INTO insurance_rates (
        year,
        national_pension_rate,
        national_pension_min,
        national_pension_max,
        health_insurance_rate,
        health_insurance_min,
        health_insurance_max,
        long_term_care_rate,
        employment_insurance_rate,
        effective_from,
        effective_to,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      2025,
      0.045,  // 4.5% (국민연금)
      370000,
      5900000,
      0.03545,  // 3.545% (건강보험)
      330000,
      9999999999,
      0.1281,  // 12.81% (장기요양)
      0.009,  // 0.9% (고용보험)
      '2025-01-01',
      '2025-12-31',
      '2025년 4대보험 요율 (근로자 부담분)'
    ]);

    console.log('✅ 국민연금: 4.5% (기준소득월액: 370,000 ~ 5,900,000원)');
    console.log('✅ 건강보험: 3.545%');
    console.log('✅ 장기요양보험: 12.81% (건강보험료의 %)');
    console.log('✅ 고용보험: 0.9%')

    console.log('\n====================================');
    console.log('✅ 2025년 4대보험 요율 추가 완료!');
    console.log('====================================');
    console.log('추가된 요율:');
    console.log('  - 국민연금: 4.5% (기준소득월액: 370,000 ~ 5,900,000원)');
    console.log('  - 건강보험: 3.545%');
    console.log('  - 장기요양보험: 12.81% (건강보험료의 %)');
    console.log('  - 고용보험: 0.9%');
    console.log('====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

insertInsuranceRates2025();
