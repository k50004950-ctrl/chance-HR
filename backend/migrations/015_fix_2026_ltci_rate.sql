-- 2026년 장기요양보험료율 수정: 12.95% → 13.14% (보건복지부 고시 기준)
UPDATE insurance_rates
SET long_term_care_rate = 0.1314,
    notes = '2026년 4대보험 요율 (장기요양 13.14% 수정)'
WHERE year = 2026;
