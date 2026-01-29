-- Phase 2: 독립 회원가입 및 사업자등록번호 매칭 시스템

-- 1. 회사 정보 테이블 (기존 workplaces 대체/확장)
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_number TEXT UNIQUE NOT NULL,  -- 사업자등록번호 (10자리)
  company_name TEXT NOT NULL,            -- 회사명
  representative_name TEXT,              -- 대표자명
  business_type TEXT,                    -- 업종
  address TEXT,                          -- 주소
  phone TEXT,                            -- 전화번호
  verified BOOLEAN DEFAULT 0,            -- 국세청 검증 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 회사-직원 관계 테이블 (고용 이력)
CREATE TABLE IF NOT EXISTS company_employee_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,           -- 회사 ID
  user_id INTEGER NOT NULL,              -- 직원 ID
  start_date DATE NOT NULL,              -- 입사일
  end_date DATE,                         -- 퇴사일 (NULL = 현재 재직중)
  position TEXT,                         -- 직급/직책
  employment_type TEXT DEFAULT 'regular', -- 고용형태: regular, contract, parttime, freelancer
  status TEXT DEFAULT 'active',          -- active, resigned, on_leave
  hourly_rate REAL,                      -- 시급 (시급제인 경우)
  monthly_salary REAL,                   -- 월급 (월급제인 경우)
  tax_type TEXT DEFAULT '4대보험',      -- 4대보험, 3.3%
  payroll_period_start_day INTEGER,      -- 급여 계산 시작일
  payroll_period_end_day INTEGER,        -- 급여 계산 종료일
  work_start_time TEXT,                  -- 출근 시간
  work_end_time TEXT,                    -- 퇴근 시간
  dependents_count INTEGER DEFAULT 1,    -- 부양가족 수
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_id, user_id, start_date)  -- 같은 회사에 같은 날 중복 입사 방지
);

-- 3. users 테이블 수정 (사업자등록번호 추가)
ALTER TABLE users ADD COLUMN business_number TEXT;  -- 사업주의 경우 사업자등록번호
ALTER TABLE users ADD COLUMN phone TEXT;            -- 전화번호
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT 0;  -- 본인인증 여부
ALTER TABLE users ADD COLUMN birth_date DATE;       -- 생년월일 (본인인증용)
ALTER TABLE users ADD COLUMN gender TEXT;           -- 성별 (본인인증용)

-- 4. 급여명세서 테이블 수정 (회사 정보 보관)
ALTER TABLE salary_slips ADD COLUMN company_id INTEGER;
ALTER TABLE salary_slips ADD COLUMN company_name TEXT;
ALTER TABLE salary_slips ADD COLUMN relation_id INTEGER;  -- company_employee_relations ID

-- 5. 출퇴근 기록 테이블 수정
ALTER TABLE attendance ADD COLUMN company_id INTEGER;
ALTER TABLE attendance ADD COLUMN relation_id INTEGER;

-- 6. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number);
CREATE INDEX IF NOT EXISTS idx_relations_company_user ON company_employee_relations(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_relations_status ON company_employee_relations(status);
CREATE INDEX IF NOT EXISTS idx_relations_dates ON company_employee_relations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_users_business_number ON users(business_number);
CREATE INDEX IF NOT EXISTS idx_salary_slips_company ON salary_slips(company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id, date);

-- 7. 데이터 마이그레이션을 위한 임시 뷰
CREATE VIEW IF NOT EXISTS v_current_employment AS
SELECT 
  cer.id as relation_id,
  cer.company_id,
  c.company_name,
  c.business_number,
  cer.user_id,
  u.username,
  u.name as employee_name,
  cer.position,
  cer.status,
  cer.start_date,
  cer.end_date,
  cer.tax_type,
  cer.monthly_salary
FROM company_employee_relations cer
JOIN companies c ON cer.company_id = c.id
JOIN users u ON cer.user_id = u.id
WHERE cer.status = 'active' AND cer.end_date IS NULL;

-- 8. 회사 관리자 테이블 (회사에 여러 관리자 가능)
CREATE TABLE IF NOT EXISTS company_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'owner',  -- owner, admin, hr
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_admins ON company_admins(company_id, user_id);
