-- 2025년 4대보험 요율 직접 추가 (프로덕션용)

-- 기존 2025년 요율 삭제 (중복 방지)
DELETE FROM insurance_rates WHERE year = 2025;

-- 2025년 4대보험 요율 삽입
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
) VALUES (
  2025,
  0.045,      -- 국민연금 4.5% (근로자 부담분)
  370000,     -- 국민연금 기준소득월액 하한
  5900000,    -- 국민연금 기준소득월액 상한
  0.03545,    -- 건강보험 3.545% (근로자 부담분)
  280000,     -- 건강보험 보수월액 하한
  100000000,  -- 건강보험 보수월액 상한
  0.1281,     -- 장기요양보험 12.81% (건강보험료의 %)
  0.009,      -- 고용보험 0.9% (근로자 부담분)
  '2025-01-01',
  '2025-12-31',
  '2025년 4대보험 요율'
);

-- 확인
SELECT * FROM insurance_rates WHERE year IN (2025, 2026) ORDER BY year DESC;
