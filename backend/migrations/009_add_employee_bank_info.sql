-- 009_add_employee_bank_info.sql
-- 직원 급여통장 정보 추가

-- PostgreSQL용
ALTER TABLE employee_details 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_holder VARCHAR(100);

-- SQLite용 (자동 변환)
-- ALTER TABLE employee_details ADD COLUMN bank_name TEXT;
-- ALTER TABLE employee_details ADD COLUMN account_number TEXT;
-- ALTER TABLE employee_details ADD COLUMN account_holder TEXT;
