import { query, run } from '../config/database.js';

// 2026년 4대보험 요율 (2026년 1월 기준)
const insuranceRates = {
  year: 2026,
  national_pension_rate: 0.045, // 국민연금 4.5% (근로자 부담)
  health_insurance_rate: 0.03545, // 건강보험 3.545% (근로자 부담)
  long_term_care_rate: 0.1295, // 장기요양보험 12.95% (건강보험료의 12.95%)
  employment_insurance_rate: 0.009, // 고용보험 0.9% (근로자 부담)
  national_pension_min: 370000, // 국민연금 기준소득월액 하한
  national_pension_max: 5900000, // 국민연금 기준소득월액 상한
  health_insurance_min: 0, // 건강보험 하한 없음
  health_insurance_max: 0, // 건강보험 상한 없음
  effective_from: '2026-01-01',
  effective_to: '2026-12-31',
  notes: '2026년 기준 4대보험 요율 (근로자 부담 기준)'
};

async function insertInsuranceRates() {
  try {
    console.log('🔄 2026년 4대보험 요율 데이터 추가 중...\n');

    // 기존 데이터 확인
    const existing = await query(
      'SELECT * FROM insurance_rates WHERE year = ?',
      [insuranceRates.year]
    );

    if (existing && existing.length > 0) {
      console.log('⚠️  2026년 요율 데이터가 이미 존재합니다. 기존 데이터를 삭제하고 새로 추가합니다.');
      await run('DELETE FROM insurance_rates WHERE year = ?', [insuranceRates.year]);
    }

    // 새 데이터 추가
    const result = await run(`
      INSERT INTO insurance_rates (
        year, 
        national_pension_rate, 
        health_insurance_rate, 
        long_term_care_rate, 
        employment_insurance_rate,
        national_pension_min,
        national_pension_max,
        health_insurance_min,
        health_insurance_max,
        effective_from,
        effective_to,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      insuranceRates.year,
      insuranceRates.national_pension_rate,
      insuranceRates.health_insurance_rate,
      insuranceRates.long_term_care_rate,
      insuranceRates.employment_insurance_rate,
      insuranceRates.national_pension_min,
      insuranceRates.national_pension_max,
      insuranceRates.health_insurance_min,
      insuranceRates.health_insurance_max,
      insuranceRates.effective_from,
      insuranceRates.effective_to,
      insuranceRates.notes
    ]);

    console.log('✅ 2026년 4대보험 요율 데이터가 성공적으로 추가되었습니다!\n');
    console.log('📊 추가된 요율 정보:');
    console.log('  - 국민연금: 4.5% (근로자 부담)');
    console.log('  - 건강보험: 3.545% (근로자 부담)');
    console.log('  - 장기요양보험: 12.95% (건강보험료의 12.95%)');
    console.log('  - 고용보험: 0.9% (근로자 부담)');
    console.log('  - 국민연금 기준소득월액 하한: 370,000원');
    console.log('  - 국민연금 기준소득월액 상한: 5,900,000원');
    console.log('  - 적용기간: 2026-01-01 ~ 2026-12-31\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

insertInsuranceRates();
