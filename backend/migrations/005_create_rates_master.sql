-- 4대보험 및 원천징수 요율 마스터 테이블
CREATE TABLE IF NOT EXISTS rates_master (
  id SERIAL PRIMARY KEY,
  effective_yyyymm VARCHAR(6) NOT NULL UNIQUE, -- 적용 시작월 (예: 202601)
  
  -- 4대보험 요율 (근로자 부담률, %)
  nps_employee_rate_percent DECIMAL(5, 3) NOT NULL DEFAULT 4.5, -- 국민연금 (근로자)
  nhis_employee_rate_percent DECIMAL(5, 3) NOT NULL DEFAULT 3.545, -- 건강보험 (근로자)
  ltci_rate_of_nhis_percent DECIMAL(5, 3) NOT NULL DEFAULT 12.95, -- 장기요양 (건강보험료의 %)
  ei_employee_rate_percent DECIMAL(5, 3) NOT NULL DEFAULT 0.9, -- 고용보험 (근로자)
  
  -- 프리랜서(3.3%) 원천징수율
  freelancer_withholding_rate_percent DECIMAL(5, 3) NOT NULL DEFAULT 3.3,
  
  -- 추가 필드 (향후 확장용)
  nps_employer_rate_percent DECIMAL(5, 3) DEFAULT 4.5, -- 국민연금 (사업주)
  nhis_employer_rate_percent DECIMAL(5, 3) DEFAULT 3.545, -- 건강보험 (사업주)
  ei_employer_rate_percent DECIMAL(5, 3) DEFAULT 1.15, -- 고용보험 (사업주)
  
  nps_min_amount INTEGER DEFAULT 0, -- 국민연금 최소액
  nps_max_amount INTEGER DEFAULT 0, -- 국민연금 최대액
  nhis_min_amount INTEGER DEFAULT 0, -- 건강보험 최소액
  nhis_max_amount INTEGER DEFAULT 0, -- 건강보험 최대액
  
  memo TEXT, -- 메모
  created_by INTEGER REFERENCES users(id), -- 등록자 (SUPER_ADMIN)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_rates_master_effective_yyyymm ON rates_master(effective_yyyymm DESC);

-- 2026년 1월 기본 요율 데이터 삽입
INSERT INTO rates_master (
  effective_yyyymm, 
  nps_employee_rate_percent, 
  nhis_employee_rate_percent, 
  ltci_rate_of_nhis_percent, 
  ei_employee_rate_percent,
  freelancer_withholding_rate_percent,
  nps_employer_rate_percent,
  nhis_employer_rate_percent,
  ei_employer_rate_percent,
  memo
) VALUES (
  '202601',
  4.5, -- 국민연금 (근로자)
  3.545, -- 건강보험 (근로자)
  12.95, -- 장기요양 (건강보험료의 %)
  0.9, -- 고용보험 (근로자)
  3.3, -- 프리랜서 원천징수율
  4.5, -- 국민연금 (사업주)
  3.545, -- 건강보험 (사업주)
  1.15, -- 고용보험 (사업주)
  '2026년 1월 기본 요율'
) ON CONFLICT (effective_yyyymm) DO NOTHING;

-- 급여 확정 스냅샷 테이블
CREATE TABLE IF NOT EXISTS payroll_finalized (
  id SERIAL PRIMARY KEY,
  workplace_id INTEGER NOT NULL REFERENCES workplaces(id),
  payroll_month VARCHAR(7) NOT NULL, -- 귀속월 (YYYY-MM)
  employee_id INTEGER NOT NULL REFERENCES users(id),
  
  -- 적용된 요율 정보
  applied_effective_yyyymm VARCHAR(6) NOT NULL,
  applied_rates_json JSONB NOT NULL, -- 사용된 요율 전체 스냅샷
  
  -- 급여 계산 결과
  base_pay INTEGER NOT NULL, -- 기본급
  deductions_json JSONB NOT NULL, -- 공제 내역
  totals_json JSONB NOT NULL, -- 총지급/총공제/실수령
  
  -- 메타 정보
  tax_type VARCHAR(20) NOT NULL, -- '4대보험' or '3.3%'
  finalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalized_by INTEGER REFERENCES users(id),
  
  UNIQUE(workplace_id, payroll_month, employee_id)
);

-- 인덱스 생성
CREATE INDEX idx_payroll_finalized_workplace_month ON payroll_finalized(workplace_id, payroll_month);
CREATE INDEX idx_payroll_finalized_employee ON payroll_finalized(employee_id);
