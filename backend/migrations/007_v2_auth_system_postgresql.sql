-- =============================================
-- V2 인증 시스템 - PostgreSQL 마이그레이션
-- =============================================

-- 1. users 테이블에 새 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS business_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 2. companies 테이블 생성 (회사/사업장 정보)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  business_number VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  representative_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. company_admins 테이블 생성 (회사 관리자/소유자)
CREATE TABLE IF NOT EXISTS company_admins (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'owner',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  UNIQUE(company_id, user_id)
);

-- 4. company_employee_relations 테이블 생성 (회사-직원 관계)
CREATE TABLE IF NOT EXISTS company_employee_relations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workplace_id INTEGER REFERENCES workplaces(id) ON DELETE SET NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'regular',
  tax_type VARCHAR(50) DEFAULT '4대보험',
  hire_date DATE,
  start_date DATE NOT NULL,
  end_date DATE,
  resignation_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  hourly_rate DECIMAL(15, 2),
  monthly_salary DECIMAL(15, 2),
  annual_salary DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, user_id, start_date)
);

-- 5. matching_requests 테이블 생성 (매칭 요청)
CREATE TABLE IF NOT EXISTS matching_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_position VARCHAR(100),
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  UNIQUE(company_id, user_id, status)
);

-- 6. workplaces 테이블에 company_id 추가
ALTER TABLE workplaces 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- 7. salary_slips 테이블에 company_id 추가
ALTER TABLE salary_slips 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- 8. attendance 테이블에 company_id 추가  
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- 9. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number);
CREATE INDEX IF NOT EXISTS idx_company_admins_company_id ON company_admins(company_id);
CREATE INDEX IF NOT EXISTS idx_company_admins_user_id ON company_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_company_employee_relations_company_id ON company_employee_relations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_employee_relations_user_id ON company_employee_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_company_employee_relations_status ON company_employee_relations(status);
CREATE INDEX IF NOT EXISTS idx_matching_requests_company_id ON matching_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_matching_requests_user_id ON matching_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_requests_status ON matching_requests(status);
CREATE INDEX IF NOT EXISTS idx_workplaces_company_id ON workplaces(company_id);
CREATE INDEX IF NOT EXISTS idx_users_business_number ON users(business_number);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 10. 기존 데이터 마이그레이션 (소유자의 사업장 → companies 테이블)
-- 기존 owner 계정이 있는 경우, 해당 사업장을 companies로 이동
INSERT INTO companies (business_number, company_name, phone, created_at)
SELECT DISTINCT 
  COALESCE(u.business_number, 'TEMP-' || u.id) as business_number,
  COALESCE(u.business_name, u.name || '의 사업장') as company_name,
  u.phone,
  u.created_at
FROM users u
WHERE u.role = 'owner' 
  AND u.business_number IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.business_number = u.business_number
  );

-- 11. company_admins에 기존 소유자 등록
INSERT INTO company_admins (company_id, user_id, role, granted_at)
SELECT 
  c.id as company_id,
  u.id as user_id,
  'owner' as role,
  u.created_at as granted_at
FROM users u
JOIN companies c ON c.business_number = u.business_number
WHERE u.role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM company_admins ca 
    WHERE ca.company_id = c.id AND ca.user_id = u.id
  );

-- 12. workplaces에 company_id 연결
UPDATE workplaces w
SET company_id = c.id
FROM companies c
JOIN users u ON c.business_number = u.business_number
WHERE w.owner_id = u.id
  AND w.company_id IS NULL;

-- 13. 기존 직원들을 company_employee_relations에 등록
INSERT INTO company_employee_relations (
  company_id, user_id, workplace_id, hire_date, status, created_at
)
SELECT 
  w.company_id,
  u.id as user_id,
  u.workplace_id,
  COALESCE(ed.hire_date, u.created_at::date) as hire_date,
  CASE 
    WHEN u.employment_status = 'active' THEN 'active'
    WHEN u.employment_status = 'resigned' THEN 'resigned'
    ELSE 'active'
  END as status,
  u.created_at
FROM users u
JOIN workplaces w ON u.workplace_id = w.id
LEFT JOIN employee_details ed ON ed.user_id = u.id
WHERE u.role = 'employee'
  AND w.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM company_employee_relations cer 
    WHERE cer.company_id = w.company_id AND cer.user_id = u.id
  );

-- =============================================
-- 완료!
-- =============================================
