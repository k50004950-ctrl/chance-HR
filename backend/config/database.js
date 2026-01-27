import sqlite3 from 'sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.db');
// Use PostgreSQL on production (Railway), SQLite for local development
const USE_POSTGRES = process.env.DATABASE_URL ? true : false;

console.log('=================================');
console.log('Database Configuration:');
console.log('USE_POSTGRES:', USE_POSTGRES);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('Database Path:', dbPath);
console.log('=================================');

let db;
let pool;

if (USE_POSTGRES) {
  // PostgreSQL 연결 (Railway 배포용)
  const { Pool } = pg;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  pool.on('connect', () => {
    console.log('PostgreSQL 데이터베이스에 연결되었습니다.');
  });
  
  pool.on('error', (err) => {
    console.error('PostgreSQL 연결 오류:', err);
  });
} else {
  // SQLite 연결 (로컬 개발용)
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('데이터베이스 연결 오류:', err.message);
    } else {
      console.log('SQLite 데이터베이스에 연결되었습니다.');
    }
  });
}

// Promise 기반 쿼리 실행 함수
export const query = async (sql, params = []) => {
  if (USE_POSTGRES) {
    // PostgreSQL: $1, $2 형식으로 변환
    let pgSql = sql;
    let pgParams = params;
    
    // SQLite의 ? 를 PostgreSQL의 $1, $2로 변환
    let paramIndex = 1;
    pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await pool.query(pgSql, pgParams);
    return result.rows;
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

export const run = async (sql, params = []) => {
  if (USE_POSTGRES) {
    // PostgreSQL
    let pgSql = sql;
    let pgParams = params;
    
    // SQLite의 ? 를 PostgreSQL의 $1, $2로 변환
    let paramIndex = 1;
    pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // INSERT 문의 경우 RETURNING id 추가
    if (pgSql.toUpperCase().includes('INSERT INTO')) {
      pgSql += ' RETURNING id';
      const result = await pool.query(pgSql, pgParams);
      return { id: result.rows[0]?.id, changes: result.rowCount };
    } else {
      const result = await pool.query(pgSql, pgParams);
      return { id: null, changes: result.rowCount };
    }
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
};

export const get = async (sql, params = []) => {
  if (USE_POSTGRES) {
    // PostgreSQL
    let pgSql = sql;
    let pgParams = params;
    
    // SQLite의 ? 를 PostgreSQL의 $1, $2로 변환
    let paramIndex = 1;
    pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await pool.query(pgSql, pgParams);
    return result.rows[0];
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
};

// 데이터베이스 초기화
export const initDatabase = async () => {
  try {
    if (USE_POSTGRES) {
      // PostgreSQL 스키마 생성
      console.log('PostgreSQL 데이터베이스 초기화 중...');
      
      // Users 테이블
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          ssn VARCHAR(50),
          address TEXT,
          emergency_contact VARCHAR(255),
          emergency_phone VARCHAR(50),
          role VARCHAR(50) NOT NULL DEFAULT 'employee',
          workplace_id INTEGER,
          business_name VARCHAR(255),
          business_number VARCHAR(255),
          approval_status VARCHAR(50) DEFAULT 'approved',
          additional_info TEXT,
          sales_rep VARCHAR(255),
          marketing_consent BOOLEAN DEFAULT false,
          marketing_consent_date TIMESTAMP,
          service_consent BOOLEAN DEFAULT false,
          service_consent_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Workplaces 테이블
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workplaces (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          radius INTEGER DEFAULT 100,
          default_off_days VARCHAR(50) DEFAULT '',
          qr_print_message TEXT,
          qr_check_in_token VARCHAR(100),
          qr_check_out_token VARCHAR(100),
          qr_token_expires_at TIMESTAMP,
          owner_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      // Push 구독 테이블
      await pool.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          workplace_id INTEGER,
          endpoint TEXT NOT NULL,
          subscription TEXT NOT NULL,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // 기존 workplaces 테이블에 radius 컬럼 추가 (마이그레이션)
      try {
        await pool.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS radius INTEGER DEFAULT 100`);
      } catch (e) {
        console.log('radius 컬럼은 이미 존재합니다.');
      }

      // 기존 workplaces 테이블에 default_off_days 컬럼 추가 (마이그레이션)
      try {
        await pool.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS default_off_days VARCHAR(50) DEFAULT ''`);
      } catch (e) {
        console.log('default_off_days 컬럼은 이미 존재합니다.');
      }
      // QR 인쇄 문구 컬럼 추가 (마이그레이션)
      try {
        await pool.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS qr_print_message TEXT`);
      } catch (e) {
        console.log('qr_print_message 컬럼은 이미 존재합니다.');
      }
      // QR 토큰 컬럼 추가 (마이그레이션)
      try {
        await pool.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS qr_check_in_token VARCHAR(100)`);
      } catch (e) {
        console.log('qr_check_in_token 컬럼은 이미 존재합니다.');
      }
      try {
        await pool.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS qr_check_out_token VARCHAR(100)`);
      } catch (e) {
        console.log('qr_check_out_token 컬럼은 이미 존재합니다.');
      }
      try {
        await pool.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS qr_token_expires_at TIMESTAMP`);
      } catch (e) {
        console.log('qr_token_expires_at 컬럼은 이미 존재합니다.');
      }

      // Employee_details 테이블
      await pool.query(`
        CREATE TABLE IF NOT EXISTS employee_details (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL,
          workplace_id INTEGER,
          hire_date DATE,
          gender VARCHAR(10),
          birth_date DATE,
          career TEXT,
          job_type VARCHAR(255),
          employment_renewal_date DATE,
          contract_start_date DATE,
          contract_end_date DATE,
          employment_notes TEXT,
          separation_type VARCHAR(50),
          separation_reason TEXT,
          position VARCHAR(255),
          department VARCHAR(255),
          contract_file VARCHAR(500),
          resume_file VARCHAR(500),
          notes TEXT,
          work_start_time VARCHAR(10),
          work_end_time VARCHAR(10),
          work_days VARCHAR(100),
          pay_schedule_type VARCHAR(30),
          pay_day INTEGER,
          pay_after_days INTEGER,
          payroll_period_start_day INTEGER,
          payroll_period_end_day INTEGER,
          last_pay_notice_date DATE,
          deduct_absence INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);
      
      // Add work_days column if it doesn't exist
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS work_days VARCHAR(100)`);
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
          console.error('Error adding work_days column to employee_details:', e);
        }
      }

      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS birth_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS career TEXT`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS job_type VARCHAR(255)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS employment_renewal_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS contract_start_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS contract_end_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS pay_schedule_type VARCHAR(30)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS pay_day INTEGER`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS pay_after_days INTEGER`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS payroll_period_start_day INTEGER`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS payroll_period_end_day INTEGER`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS last_pay_notice_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS deduct_absence INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS employment_notes TEXT`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS separation_type VARCHAR(50)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS separation_reason TEXT`);
      } catch (e) {}
      
      // Add id_card_file and family_cert_file columns if they don't exist
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS id_card_file VARCHAR(500)`);
      } catch (e) {
        // Column already exists, ignore
      }
      
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS family_cert_file VARCHAR(500)`);
      } catch (e) {
        // Column already exists, ignore
      }

      // Salary_info 테이블
      await pool.query(`
        CREATE TABLE IF NOT EXISTS salary_info (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL,
          workplace_id INTEGER NOT NULL,
          salary_type VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          weekly_holiday_pay BOOLEAN DEFAULT false,
          overtime_pay DECIMAL(15, 2) DEFAULT 0,
          tax_type VARCHAR(50) DEFAULT '4대보험',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);
      
      // workplace_id 컬럼 추가 (기존 테이블용)
      try {
        await pool.query(`
          ALTER TABLE salary_info 
          ADD COLUMN IF NOT EXISTS workplace_id INTEGER
        `);
        console.log('✅ salary_info 테이블에 workplace_id 컬럼 추가됨');
      } catch (err) {
        // 컬럼이 이미 존재하면 무시
      }
      
      // overtime_pay 컬럼 추가 (기존 테이블용)
      try {
        await pool.query(`
          ALTER TABLE salary_info 
          ADD COLUMN IF NOT EXISTS overtime_pay DECIMAL(15, 2) DEFAULT 0
        `);
      } catch (err) {
        // 컬럼이 이미 존재하면 무시
      }
      
      // weekly_holiday_type 컬럼 추가 (기존 테이블용)
      try {
        await pool.query(`
          ALTER TABLE salary_info 
          ADD COLUMN IF NOT EXISTS weekly_holiday_type VARCHAR(20) DEFAULT 'included'
        `);
      } catch (err) {
        // 컬럼이 이미 존재하면 무시
      }

      // Attendance 테이블
      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          workplace_id INTEGER NOT NULL,
          date DATE NOT NULL,
          check_in_time TIMESTAMP,
          check_out_time TIMESTAMP,
          check_in_lat DECIMAL(10, 8),
          check_in_lng DECIMAL(11, 8),
          check_out_lat DECIMAL(10, 8),
          check_out_lng DECIMAL(11, 8),
          work_hours DECIMAL(5, 2),
          status VARCHAR(50) DEFAULT 'incomplete',
          leave_type VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // 기존 attendance 테이블에 leave_type 컬럼 추가 (마이그레이션)
      try {
        await pool.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS leave_type VARCHAR(20)`);
      } catch (e) {
        console.log('leave_type 컬럼은 이미 존재합니다.');
      }

      // Past_employees 테이블 (과거 직원 기록)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS past_employees (
          id SERIAL PRIMARY KEY,
          workplace_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          hire_date DATE NOT NULL,
          resignation_date DATE NOT NULL,
          average_monthly_salary DECIMAL(15, 2) NOT NULL,
          severance_pay DECIMAL(15, 2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // Salary_history 테이블 (급여 변경 이력)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS salary_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          old_salary_type VARCHAR(50),
          old_amount DECIMAL(15, 2),
          new_salary_type VARCHAR(50) NOT NULL,
          new_amount DECIMAL(15, 2) NOT NULL,
          change_date DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Employee_past_payroll 테이블 (시스템 도입 전 과거 급여 기록)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS employee_past_payroll (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          salary_type VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Salary_slips 테이블 (급여명세서)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS salary_slips (
          id SERIAL PRIMARY KEY,
          workplace_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          payroll_month VARCHAR(7) NOT NULL,
          pay_date DATE,
          tax_type VARCHAR(20) DEFAULT '4대보험',
          base_pay DECIMAL(15, 2) DEFAULT 0,
          national_pension DECIMAL(15, 2) DEFAULT 0,
          health_insurance DECIMAL(15, 2) DEFAULT 0,
          employment_insurance DECIMAL(15, 2) DEFAULT 0,
          long_term_care DECIMAL(15, 2) DEFAULT 0,
          income_tax DECIMAL(15, 2) DEFAULT 0,
          local_income_tax DECIMAL(15, 2) DEFAULT 0,
          total_deductions DECIMAL(15, 2) DEFAULT 0,
          net_pay DECIMAL(15, 2) DEFAULT 0,
          employer_national_pension DECIMAL(15, 2) DEFAULT 0,
          employer_health_insurance DECIMAL(15, 2) DEFAULT 0,
          employer_employment_insurance DECIMAL(15, 2) DEFAULT 0,
          employer_long_term_care DECIMAL(15, 2) DEFAULT 0,
          total_employer_burden DECIMAL(15, 2) DEFAULT 0,
          published BOOLEAN DEFAULT FALSE,
          source_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);
      
      // salary_slips에 tax_type 컬럼 추가 (기존 DB 대응)
      await pool.query(`
        ALTER TABLE salary_slips 
        ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT '4대보험'
      `);
      
      // salary_slips에 사업주 부담금 컬럼 추가 (기존 DB 대응)
      try {
        await pool.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS employer_national_pension DECIMAL(15, 2) DEFAULT 0`);
      } catch (e) {
        console.log('employer_national_pension 컬럼은 이미 존재합니다.');
      }
      try {
        await pool.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS employer_health_insurance DECIMAL(15, 2) DEFAULT 0`);
      } catch (e) {
        console.log('employer_health_insurance 컬럼은 이미 존재합니다.');
      }
      try {
        await pool.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS employer_employment_insurance DECIMAL(15, 2) DEFAULT 0`);
      } catch (e) {
        console.log('employer_employment_insurance 컬럼은 이미 존재합니다.');
      }
      try {
        await pool.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS employer_long_term_care DECIMAL(15, 2) DEFAULT 0`);
      } catch (e) {
        console.log('employer_long_term_care 컬럼은 이미 존재합니다.');
      }
      try {
        await pool.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS total_employer_burden DECIMAL(15, 2) DEFAULT 0`);
      } catch (e) {
        console.log('total_employer_burden 컬럼은 이미 존재합니다.');
      }
      
      // salary_slips에 dependents_count 컬럼 추가 (기존 DB 대응)
      try {
        await pool.query(`ALTER TABLE salary_slips ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 1`);
      } catch (e) {
        console.log('dependents_count 컬럼은 이미 존재합니다.');
      }
      
      // salary_slips에 published 컬럼 추가 (기존 DB 대응)
      await pool.query(`
        ALTER TABLE salary_slips 
        ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE
      `);

      // 기본 관리자 계정 생성 (없을 경우)
      const adminExists = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        ['admin']
      );

      if (adminExists.rows.length === 0) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('admin123', 10);
        await pool.query(
          "INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)",
          ['admin', hashedPassword, '관리자', 'admin']
        );
        console.log('기본 관리자 계정이 생성되었습니다. (username: admin, password: admin123)');
      }

      // 기존 테이블에 새 컬럼 추가 (마이그레이션)
      try {
        await pool.query('ALTER TABLE salary_info ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50) DEFAULT \'4대보험\'');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }

      // users 테이블에 employment_status 컬럼 추가
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT \'active\'');
        console.log('✅ users 테이블에 employment_status 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }

      // users 테이블에 sales_rep 컬럼 추가
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255)');
        console.log('✅ users 테이블에 sales_rep 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }

      // users 테이블에 marketing_consent 컬럼 추가
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false');
        console.log('✅ users 테이블에 marketing_consent 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_date TIMESTAMP');
        console.log('✅ users 테이블에 marketing_consent_date 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS service_consent BOOLEAN DEFAULT false');
        console.log('✅ users 테이블에 service_consent 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS service_consent_date TIMESTAMP');
        console.log('✅ users 테이블에 service_consent_date 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_office_name VARCHAR(255)');
        console.log('✅ users 테이블에 tax_office_name 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }

      // employee_details 테이블에 resignation_date 컬럼 추가
      try {
        await pool.query('ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS resignation_date DATE');
        console.log('✅ employee_details 테이블에 resignation_date 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }

      // employee_details 테이블에 개인정보 동의 컬럼 추가
      try {
        await pool.query('ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS privacy_consent_date TIMESTAMP');
        await pool.query('ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS location_consent BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS location_consent_date TIMESTAMP');
        console.log('✅ employee_details 테이블에 개인정보 동의 컬럼 추가됨');
      } catch (e) {
        // 컬럼이 이미 존재하면 무시
      }

      // Announcements 테이블 (공지사항)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS announcements (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          created_by INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // User_announcements 테이블 (사용자별 공지 읽음 상태)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_announcements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          announcement_id INTEGER NOT NULL,
          is_read BOOLEAN DEFAULT false,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
          UNIQUE(user_id, announcement_id)
        )
      `);

      // Insurance_rates 테이블 (4대보험 요율 관리)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS insurance_rates (
          id SERIAL PRIMARY KEY,
          year INTEGER NOT NULL,
          national_pension_rate DECIMAL(5, 4) NOT NULL,
          national_pension_min DECIMAL(15, 2) DEFAULT 0,
          national_pension_max DECIMAL(15, 2) DEFAULT 0,
          health_insurance_rate DECIMAL(5, 4) NOT NULL,
          health_insurance_min DECIMAL(15, 2) DEFAULT 0,
          health_insurance_max DECIMAL(15, 2) DEFAULT 0,
          long_term_care_rate DECIMAL(5, 4) NOT NULL,
          employment_insurance_rate DECIMAL(5, 4) NOT NULL,
          effective_from DATE NOT NULL,
          effective_to DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(year, effective_from)
        )
      `);

      // 2026년 기본 요율 데이터 삽입
      const existingRates = await pool.query(
        "SELECT * FROM insurance_rates WHERE year = $1",
        [2026]
      );
      if (existingRates.rows.length === 0) {
        await pool.query(`
          INSERT INTO insurance_rates 
          (year, national_pension_rate, national_pension_min, national_pension_max, 
           health_insurance_rate, health_insurance_min, health_insurance_max,
           long_term_care_rate, employment_insurance_rate, 
           effective_from, notes)
          VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          2026, 
          0.0475, 400000, 6370000,  // 국민연금 4.75%
          0.03595, 279266, 127056982,  // 건강보험 3.595%
          0.1295,  // 장기요양보험 12.95% (건강보험료의 비율)
          0.009,   // 고용보험 0.9%
          '2026-01-01',
          '2026년 4대보험 요율 (기본값)'
        ]);
        console.log('✅ 2026년 기본 보험 요율이 등록되었습니다.');
      }

      // 2025년 기본 요율 데이터 삽입
      const existing2025Rates = await pool.query(
        "SELECT * FROM insurance_rates WHERE year = $1",
        [2025]
      );
      if (existing2025Rates.rows.length === 0) {
        await pool.query(`
          INSERT INTO insurance_rates 
          (year, national_pension_rate, national_pension_min, national_pension_max, 
           health_insurance_rate, health_insurance_min, health_insurance_max,
           long_term_care_rate, employment_insurance_rate, 
           effective_from, effective_to, notes)
          VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          2025, 
          0.045, 370000, 5900000,      // 국민연금 4.5%
          0.03545, 280000, 100000000,  // 건강보험 3.545%
          0.1281,                      // 장기요양보험 12.81%
          0.009,                       // 고용보험 0.9%
          '2025-01-01',
          '2025-12-31',
          '2025년 4대보험 요율'
        ]);
        console.log('✅ 2025년 기본 보험 요율이 등록되었습니다.');
      }

      // Tax_table 테이블 (근로소득 간이세액표)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tax_table (
          id SERIAL PRIMARY KEY,
          year INTEGER NOT NULL,
          salary_min INTEGER NOT NULL,
          salary_max INTEGER NOT NULL,
          dependents_1 INTEGER DEFAULT 0,
          dependents_2 INTEGER DEFAULT 0,
          dependents_3 INTEGER DEFAULT 0,
          dependents_4 INTEGER DEFAULT 0,
          dependents_5 INTEGER DEFAULT 0,
          dependents_6 INTEGER DEFAULT 0,
          dependents_7 INTEGER DEFAULT 0,
          dependents_8 INTEGER DEFAULT 0,
          dependents_9 INTEGER DEFAULT 0,
          dependents_10 INTEGER DEFAULT 0,
          dependents_11 INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(year, salary_min, salary_max)
        )
      `);

      // Community_posts 테이블 (커뮤니티 게시판)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS community_posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category VARCHAR(50) NOT NULL CHECK (category IN ('owner', 'employee')),
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Rates_master 테이블 (요율 마스터)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rates_master (
          id SERIAL PRIMARY KEY,
          effective_yyyymm VARCHAR(6) UNIQUE NOT NULL,
          nps_employee_rate_percent DECIMAL(10, 3) NOT NULL,
          nhis_employee_rate_percent DECIMAL(10, 3) NOT NULL,
          ltci_rate_of_nhis_percent DECIMAL(10, 3) NOT NULL,
          ei_employee_rate_percent DECIMAL(10, 3) NOT NULL,
          freelancer_withholding_rate_percent DECIMAL(10, 3) NOT NULL,
          nps_employer_rate_percent DECIMAL(10, 3),
          nhis_employer_rate_percent DECIMAL(10, 3),
          ei_employer_rate_percent DECIMAL(10, 3),
          nps_min_amount INTEGER DEFAULT 0,
          nps_max_amount INTEGER DEFAULT 0,
          nhis_min_amount INTEGER DEFAULT 0,
          nhis_max_amount INTEGER DEFAULT 0,
          memo TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Payroll_finalized 테이블 (급여 확정 스냅샷)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payroll_finalized (
          id SERIAL PRIMARY KEY,
          workplace_id INTEGER NOT NULL REFERENCES workplaces(id),
          payroll_month VARCHAR(7) NOT NULL,
          employee_id INTEGER NOT NULL REFERENCES users(id),
          applied_effective_yyyymm VARCHAR(6) NOT NULL,
          applied_rates_json TEXT NOT NULL,
          base_pay DECIMAL(15, 2) NOT NULL,
          deductions_json TEXT NOT NULL,
          totals_json TEXT NOT NULL,
          tax_type VARCHAR(20) DEFAULT '4대보험',
          finalized_by INTEGER NOT NULL REFERENCES users(id),
          finalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workplace_id, payroll_month, employee_id)
        )
      `);

      // 202601 기본 요율 데이터 삽입
      const existingRatesMaster = await pool.query(
        "SELECT * FROM rates_master WHERE effective_yyyymm = $1",
        ['202601']
      );
      if (existingRatesMaster.rows.length === 0) {
        await pool.query(`
          INSERT INTO rates_master 
          (effective_yyyymm, nps_employee_rate_percent, nhis_employee_rate_percent,
           ltci_rate_of_nhis_percent, ei_employee_rate_percent, 
           freelancer_withholding_rate_percent, memo)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          '202601',
          4.5,    // 국민연금
          3.545,  // 건강보험
          12.95,  // 장기요양
          0.9,    // 고용보험
          3.3,    // 프리랜서 원천징수
          '2026년 1월 기본 요율'
        ]);
        console.log('✅ 2026-01 기본 요율이 등록되었습니다.');
      }

      console.log('PostgreSQL 데이터베이스 초기화 완료');
    } else {
      // SQLite 초기화 (기존 코드)
      console.log('SQLite 데이터베이스 초기화 중...');

      // Users 테이블
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          ssn TEXT,
          address TEXT,
          emergency_contact TEXT,
          emergency_phone TEXT,
          role TEXT NOT NULL DEFAULT 'employee',
          workplace_id INTEGER,
          business_name TEXT,
          business_number TEXT,
          approval_status TEXT DEFAULT 'approved',
          additional_info TEXT,
          sales_rep TEXT,
          marketing_consent INTEGER DEFAULT 0,
          marketing_consent_date DATETIME,
          service_consent INTEGER DEFAULT 0,
          service_consent_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // 기존 테이블에 새 컬럼 추가 (마이그레이션)
      try {
        await run(`ALTER TABLE users ADD COLUMN business_name TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN business_number TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT 'approved'`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN additional_info TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN sales_rep TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN marketing_consent INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN marketing_consent_date DATETIME`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN service_consent INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN service_consent_date DATETIME`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN employment_status TEXT DEFAULT 'active'`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE users ADD COLUMN tax_office_name TEXT`);
      } catch (e) {}

      // Workplaces 테이블
      await run(`
        CREATE TABLE IF NOT EXISTS workplaces (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          radius INTEGER DEFAULT 100,
          default_off_days TEXT,
          qr_print_message TEXT,
          qr_check_in_token TEXT,
          qr_check_out_token TEXT,
          qr_token_expires_at DATETIME,
          owner_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      // Push 구독 테이블
      await run(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workplace_id INTEGER,
          endpoint TEXT NOT NULL,
          subscription TEXT NOT NULL,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // 기존 workplaces 테이블에 radius 컬럼 추가 (마이그레이션)
      try {
        await run(`ALTER TABLE workplaces ADD COLUMN radius INTEGER DEFAULT 100`);
      } catch (e) {}
      // 기존 workplaces 테이블에 default_off_days 컬럼 추가 (마이그레이션)
      try {
        await run(`ALTER TABLE workplaces ADD COLUMN default_off_days TEXT`);
      } catch (e) {}
      // QR 인쇄 문구 컬럼 추가 (마이그레이션)
      try {
        await run(`ALTER TABLE workplaces ADD COLUMN qr_print_message TEXT`);
      } catch (e) {}
      // QR 토큰 컬럼 추가 (마이그레이션)
      try {
        await run(`ALTER TABLE workplaces ADD COLUMN qr_check_in_token TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE workplaces ADD COLUMN qr_check_out_token TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE workplaces ADD COLUMN qr_token_expires_at DATETIME`);
      } catch (e) {}

      // Employee_details 테이블
        await run(`
          CREATE TABLE IF NOT EXISTS employee_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            workplace_id INTEGER,
            hire_date DATE,
          gender TEXT,
          birth_date DATE,
          career TEXT,
          job_type TEXT,
          employment_renewal_date DATE,
          contract_start_date DATE,
          contract_end_date DATE,
          employment_notes TEXT,
          separation_type TEXT,
          separation_reason TEXT,
            position TEXT,
            department TEXT,
            contract_file TEXT,
            resume_file TEXT,
            notes TEXT,
            work_start_time TEXT,
            work_end_time TEXT,
            work_days TEXT,
          pay_schedule_type TEXT,
          pay_day INTEGER,
          pay_after_days INTEGER,
          payroll_period_start_day INTEGER,
          payroll_period_end_day INTEGER,
          last_pay_notice_date DATE,
          deduct_absence INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
          )
        `);

      // 기존 테이블에 새 컬럼 추가
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN work_start_time TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN work_end_time TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN work_days TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN gender TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN birth_date DATE`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN career TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN job_type TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN employment_renewal_date DATE`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN contract_start_date DATE`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN contract_end_date DATE`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN pay_schedule_type TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN pay_day INTEGER`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN pay_after_days INTEGER`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN payroll_period_start_day INTEGER`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN payroll_period_end_day INTEGER`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN last_pay_notice_date DATE`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN deduct_absence INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN employment_notes TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN separation_type TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN separation_reason TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN id_card_file TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN family_cert_file TEXT`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN resignation_date DATE`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN privacy_consent INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN privacy_consent_date DATETIME`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN location_consent INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE employee_details ADD COLUMN location_consent_date DATETIME`);
      } catch (e) {}
      try {
        await run(`ALTER TABLE salary_info ADD COLUMN tax_type TEXT DEFAULT '4대보험'`);
      } catch (e) {}

      // Salary_info 테이블
      await run(`
        CREATE TABLE IF NOT EXISTS salary_info (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          workplace_id INTEGER NOT NULL,
          salary_type TEXT NOT NULL,
          amount REAL NOT NULL,
          weekly_holiday_pay INTEGER DEFAULT 0,
          overtime_pay REAL DEFAULT 0,
          tax_type TEXT DEFAULT '4대보험',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);
      
      // overtime_pay 컬럼 추가 (기존 테이블용)
      try {
        await run(`ALTER TABLE salary_info ADD COLUMN overtime_pay REAL DEFAULT 0`);
      } catch (err) {
        // 컬럼이 이미 존재하면 무시
      }
      
      // weekly_holiday_type 컬럼 추가 (기존 테이블용)
      try {
        await run(`ALTER TABLE salary_info ADD COLUMN weekly_holiday_type TEXT DEFAULT 'included'`);
      } catch (err) {
        // 컬럼이 이미 존재하면 무시
      }

      // Attendance 테이블
      await run(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workplace_id INTEGER NOT NULL,
          date DATE NOT NULL,
          check_in_time DATETIME,
          check_out_time DATETIME,
          check_in_lat REAL,
          check_in_lng REAL,
          check_out_lat REAL,
          check_out_lng REAL,
          work_hours REAL,
          status TEXT DEFAULT 'incomplete',
          leave_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // 기존 attendance 테이블에 leave_type 컬럼 추가 (마이그레이션)
      try {
        await run(`ALTER TABLE attendance ADD COLUMN leave_type TEXT`);
      } catch (e) {}

      // Past_employees 테이블 (과거 직원 기록)
      await run(`
        CREATE TABLE IF NOT EXISTS past_employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workplace_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          hire_date DATE NOT NULL,
          resignation_date DATE NOT NULL,
          average_monthly_salary REAL NOT NULL,
          severance_pay REAL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // Salary_history 테이블 (급여 변경 이력)
      await run(`
        CREATE TABLE IF NOT EXISTS salary_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          old_salary_type TEXT,
          old_amount REAL,
          new_salary_type TEXT NOT NULL,
          new_amount REAL NOT NULL,
          change_date DATE NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Employee_past_payroll 테이블 (시스템 도입 전 과거 급여 기록)
      await run(`
        CREATE TABLE IF NOT EXISTS employee_past_payroll (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          salary_type TEXT NOT NULL,
          amount REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Salary_slips 테이블 (급여명세서)
      await run(`
        CREATE TABLE IF NOT EXISTS salary_slips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workplace_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          payroll_month TEXT NOT NULL,
          pay_date DATE,
          tax_type TEXT DEFAULT '4대보험',
          base_pay REAL DEFAULT 0,
          national_pension REAL DEFAULT 0,
          health_insurance REAL DEFAULT 0,
          employment_insurance REAL DEFAULT 0,
          long_term_care REAL DEFAULT 0,
          income_tax REAL DEFAULT 0,
          local_income_tax REAL DEFAULT 0,
          total_deductions REAL DEFAULT 0,
          net_pay REAL DEFAULT 0,
          employer_national_pension REAL DEFAULT 0,
          employer_health_insurance REAL DEFAULT 0,
          employer_employment_insurance REAL DEFAULT 0,
          employer_long_term_care REAL DEFAULT 0,
          total_employer_burden REAL DEFAULT 0,
          published INTEGER DEFAULT 0,
          source_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);

      // salary_slips에 tax_type 컬럼 추가 (기존 DB 대응)
      const slipsColumns = await query('PRAGMA table_info(salary_slips)');
      const hasTaxTypeInSlips = slipsColumns.some((col) => col.name === 'tax_type');
      if (!hasTaxTypeInSlips) {
        await run(`ALTER TABLE salary_slips ADD COLUMN tax_type TEXT DEFAULT '4대보험'`);
      }
      
      // salary_slips에 published 컬럼 추가 (기존 DB 대응)
      const hasPublishedInSlips = slipsColumns.some((col) => col.name === 'published');
      if (!hasPublishedInSlips) {
        await run(`ALTER TABLE salary_slips ADD COLUMN published INTEGER DEFAULT 0`);
      }
      
      // salary_slips에 사업주 부담금 컬럼 추가 (기존 DB 대응)
      const hasEmployerNationalPension = slipsColumns.some((col) => col.name === 'employer_national_pension');
      if (!hasEmployerNationalPension) {
        await run(`ALTER TABLE salary_slips ADD COLUMN employer_national_pension REAL DEFAULT 0`);
      }
      const hasEmployerHealthInsurance = slipsColumns.some((col) => col.name === 'employer_health_insurance');
      if (!hasEmployerHealthInsurance) {
        await run(`ALTER TABLE salary_slips ADD COLUMN employer_health_insurance REAL DEFAULT 0`);
      }
      const hasEmployerEmploymentInsurance = slipsColumns.some((col) => col.name === 'employer_employment_insurance');
      if (!hasEmployerEmploymentInsurance) {
        await run(`ALTER TABLE salary_slips ADD COLUMN employer_employment_insurance REAL DEFAULT 0`);
      }
      const hasEmployerLongTermCare = slipsColumns.some((col) => col.name === 'employer_long_term_care');
      if (!hasEmployerLongTermCare) {
        await run(`ALTER TABLE salary_slips ADD COLUMN employer_long_term_care REAL DEFAULT 0`);
      }
      const hasTotalEmployerBurden = slipsColumns.some((col) => col.name === 'total_employer_burden');
      if (!hasTotalEmployerBurden) {
        await run(`ALTER TABLE salary_slips ADD COLUMN total_employer_burden REAL DEFAULT 0`);
      }
      
      // salary_slips에 dependents_count 컬럼 추가 (기존 DB 대응)
      const hasDependentsCount = slipsColumns.some((col) => col.name === 'dependents_count');
      if (!hasDependentsCount) {
        await run(`ALTER TABLE salary_slips ADD COLUMN dependents_count INTEGER DEFAULT 1`);
      }

      // Announcements 테이블 (공지사항)
      await run(`
        CREATE TABLE IF NOT EXISTS announcements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_by INTEGER NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // User_announcements 테이블 (사용자별 공지 읽음 상태)
      await run(`
        CREATE TABLE IF NOT EXISTS user_announcements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          announcement_id INTEGER NOT NULL,
          is_read INTEGER DEFAULT 0,
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
          UNIQUE(user_id, announcement_id)
        )
      `);

      // Insurance_rates 테이블 (4대보험 요율 관리)
      await run(`
        CREATE TABLE IF NOT EXISTS insurance_rates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          national_pension_rate REAL NOT NULL,
          national_pension_min REAL DEFAULT 0,
          national_pension_max REAL DEFAULT 0,
          health_insurance_rate REAL NOT NULL,
          health_insurance_min REAL DEFAULT 0,
          health_insurance_max REAL DEFAULT 0,
          long_term_care_rate REAL NOT NULL,
          employment_insurance_rate REAL NOT NULL,
          effective_from DATE NOT NULL,
          effective_to DATE,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(year, effective_from)
        )
      `);

      // 2026년 기본 요율 데이터 삽입
      const existingRates = await get('SELECT * FROM insurance_rates WHERE year = ?', [2026]);
      if (!existingRates) {
        await run(`
          INSERT INTO insurance_rates 
          (year, national_pension_rate, national_pension_min, national_pension_max, 
           health_insurance_rate, health_insurance_min, health_insurance_max,
           long_term_care_rate, employment_insurance_rate, 
           effective_from, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          2026, 
          0.0475, 400000, 6370000,  // 국민연금 4.75%
          0.03595, 279266, 127056982,  // 건강보험 3.595%
          0.1295,  // 장기요양보험 12.95% (건강보험료의 비율)
          0.009,   // 고용보험 0.9%
          '2026-01-01',
          '2026년 4대보험 요율 (기본값)'
        ]);
        console.log('✅ 2026년 기본 보험 요율이 등록되었습니다.');
      }

      // 2025년 기본 요율 데이터 삽입
      const existing2025Rates = await get('SELECT * FROM insurance_rates WHERE year = ?', [2025]);
      if (!existing2025Rates) {
        await run(`
          INSERT INTO insurance_rates 
          (year, national_pension_rate, national_pension_min, national_pension_max, 
           health_insurance_rate, health_insurance_min, health_insurance_max,
           long_term_care_rate, employment_insurance_rate, 
           effective_from, effective_to, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          2025, 
          0.045, 370000, 5900000,      // 국민연금 4.5%
          0.03545, 280000, 100000000,  // 건강보험 3.545%
          0.1281,                      // 장기요양보험 12.81%
          0.009,                       // 고용보험 0.9%
          '2025-01-01',
          '2025-12-31',
          '2025년 4대보험 요율'
        ]);
        console.log('✅ 2025년 기본 보험 요율이 등록되었습니다.');
      }

      // Tax_table 테이블 (근로소득 간이세액표)
      await run(`
        CREATE TABLE IF NOT EXISTS tax_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          salary_min INTEGER NOT NULL,
          salary_max INTEGER NOT NULL,
          dependents_1 INTEGER DEFAULT 0,
          dependents_2 INTEGER DEFAULT 0,
          dependents_3 INTEGER DEFAULT 0,
          dependents_4 INTEGER DEFAULT 0,
          dependents_5 INTEGER DEFAULT 0,
          dependents_6 INTEGER DEFAULT 0,
          dependents_7 INTEGER DEFAULT 0,
          dependents_8 INTEGER DEFAULT 0,
          dependents_9 INTEGER DEFAULT 0,
          dependents_10 INTEGER DEFAULT 0,
          dependents_11 INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(year, salary_min, salary_max)
        )
      `);

      // Community_posts 테이블 (커뮤니티 게시판)
      await run(`
        CREATE TABLE IF NOT EXISTS community_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('owner', 'employee')),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Rates_master 테이블 (요율 마스터)
      await run(`
        CREATE TABLE IF NOT EXISTS rates_master (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          effective_yyyymm TEXT UNIQUE NOT NULL,
          nps_employee_rate_percent REAL NOT NULL,
          nhis_employee_rate_percent REAL NOT NULL,
          ltci_rate_of_nhis_percent REAL NOT NULL,
          ei_employee_rate_percent REAL NOT NULL,
          freelancer_withholding_rate_percent REAL NOT NULL,
          nps_employer_rate_percent REAL,
          nhis_employer_rate_percent REAL,
          ei_employer_rate_percent REAL,
          nps_min_amount INTEGER DEFAULT 0,
          nps_max_amount INTEGER DEFAULT 0,
          nhis_min_amount INTEGER DEFAULT 0,
          nhis_max_amount INTEGER DEFAULT 0,
          memo TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Payroll_finalized 테이블 (급여 확정 스냅샷)
      await run(`
        CREATE TABLE IF NOT EXISTS payroll_finalized (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workplace_id INTEGER NOT NULL,
          payroll_month TEXT NOT NULL,
          employee_id INTEGER NOT NULL,
          applied_effective_yyyymm TEXT NOT NULL,
          applied_rates_json TEXT NOT NULL,
          base_pay REAL NOT NULL,
          deductions_json TEXT NOT NULL,
          totals_json TEXT NOT NULL,
          tax_type TEXT DEFAULT '4대보험',
          finalized_by INTEGER NOT NULL,
          finalized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workplace_id, payroll_month, employee_id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id),
          FOREIGN KEY (employee_id) REFERENCES users(id),
          FOREIGN KEY (finalized_by) REFERENCES users(id)
        )
      `);

      // 202601 기본 요율 데이터 삽입
      const existingRatesMaster = await get('SELECT * FROM rates_master WHERE effective_yyyymm = ?', ['202601']);
      if (!existingRatesMaster) {
        await run(`
          INSERT INTO rates_master 
          (effective_yyyymm, nps_employee_rate_percent, nhis_employee_rate_percent,
           ltci_rate_of_nhis_percent, ei_employee_rate_percent, 
           freelancer_withholding_rate_percent, memo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          '202601',
          4.5,    // 국민연금
          3.545,  // 건강보험
          12.95,  // 장기요양
          0.9,    // 고용보험
          3.3,    // 프리랜서 원천징수
          '2026년 1월 기본 요율'
        ]);
        console.log('✅ 2026-01 기본 요율이 등록되었습니다.');
      }

      // 기본 관리자 계정 생성
      const adminExists = await get('SELECT * FROM users WHERE username = ?', ['admin']);
      
      if (!adminExists) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('admin123', 10);
        await run(
          'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
          ['admin', hashedPassword, '관리자', 'admin']
        );
        console.log('기본 관리자 계정이 생성되었습니다. (username: admin, password: admin123)');
      }

      console.log('SQLite 데이터베이스 초기화 완료');
    }
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
    throw error;
  }
};

// getConnection 함수 추가 (PostgreSQL/SQLite 통합)
export const getConnection = async () => {
  if (USE_POSTGRES) {
    // PostgreSQL: pool에서 client를 가져옴
    const client = await pool.connect();
    
    // SQLite와 동일한 인터페이스 제공
    return {
      query: (sql, params) => client.query(sql, params),
      run: async (sql, params = []) => {
        // SQLite의 ? 를 PostgreSQL의 $1, $2로 변환
        let pgSql = sql;
        let paramIndex = 1;
        pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await client.query(pgSql, params);
        return { lastID: result.rows[0]?.id, changes: result.rowCount };
      },
      get: async (sql, params = []) => {
        // SQLite의 ? 를 PostgreSQL의 $1, $2로 변환
        let pgSql = sql;
        let paramIndex = 1;
        pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await client.query(pgSql, params);
        return result.rows[0];
      },
      all: async (sql, params = []) => {
        // SQLite의 ? 를 PostgreSQL의 $1, $2로 변환
        let pgSql = sql;
        let paramIndex = 1;
        pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await client.query(pgSql, params);
        return result.rows;
      },
      release: () => client.release()
    };
  } else {
    // SQLite: 기존 db 객체를 래핑
    return {
      query: query,
      run: run,
      get: get,
      all: query, // query는 all과 동일
      release: () => {} // SQLite는 release 불필요
    };
  }
};

// pool export 추가 (PostgreSQL용)
export { pool };

export default { query, run, get, initDatabase, pool, getConnection };
