-- 근로계약서 테이블 (한국 근로기준법 준수)
CREATE TABLE IF NOT EXISTS labor_contracts (
  id SERIAL PRIMARY KEY,
  workplace_id INTEGER NOT NULL REFERENCES workplaces(id),
  employee_id INTEGER NOT NULL REFERENCES users(id),
  employer_name VARCHAR(100),
  employee_name VARCHAR(100),
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  job_description TEXT,
  work_location TEXT,
  work_days VARCHAR(50),
  work_start_time VARCHAR(10),
  work_end_time VARCHAR(10),
  salary_type VARCHAR(20),
  salary_amount INTEGER,
  payment_date VARCHAR(50),
  social_insurance BOOLEAN DEFAULT true,
  special_terms TEXT,
  employer_signed BOOLEAN DEFAULT false,
  employer_signed_at TIMESTAMP,
  employee_signed BOOLEAN DEFAULT false,
  employee_signed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_labor_contracts_workplace ON labor_contracts(workplace_id);
CREATE INDEX IF NOT EXISTS idx_labor_contracts_employee ON labor_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_labor_contracts_status ON labor_contracts(status);
