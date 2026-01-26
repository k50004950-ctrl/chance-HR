// 프로덕션 환경에서 실행: Railway 환경 변수 사용
import pg from 'pg';

const { Pool } = pg;

async function addRates2025() {
  // 환경 변수에서 DATABASE_URL 가져오기 (Railway에서 자동 설정)
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    console.log('ℹ️  로컬에서 실행 중이라면 PostgreSQL 데이터베이스를 시작해주세요.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔄 프로덕션 데이터베이스에 2025년 4대보험 요율 추가 중...\n');

    // 기존 2025년 요율 삭제
    await pool.query('DELETE FROM insurance_rates WHERE year = 2025');
    console.log('✅ 기존 2025년 요율 삭제 완료');

    // 2025년 요율 삽입
    const result = await pool.query(`
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
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
    console.log('✅ 고용보험: 0.9%');

    console.log('\n====================================');
    console.log('✅ 2025년 4대보험 요율 추가 완료!');
    console.log('====================================');
    console.log('추가된 요율:');
    console.log('  - 국민연금: 4.5% (기준소득월액: 370,000 ~ 5,900,000원)');
    console.log('  - 건강보험: 3.545%');
    console.log('  - 장기요양보험: 12.81% (건강보험료의 %)');
    console.log('  - 고용보험: 0.9%');
    console.log('====================================\n');

    // 전체 요율 확인
    const rates = await pool.query('SELECT year, national_pension_rate, health_insurance_rate FROM insurance_rates ORDER BY year DESC');
    console.log('\n📊 현재 등록된 연도별 요율:');
    rates.rows.forEach(rate => {
      console.log(`  ${rate.year}년: 국민연금 ${rate.national_pension_rate * 100}%, 건강보험 ${rate.health_insurance_rate * 100}%`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    await pool.end();
    process.exit(1);
  }
}

addRates2025();
