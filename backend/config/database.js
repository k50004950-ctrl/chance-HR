import sqlite3 from 'sqlite3';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.db');
const USE_POSTGRES = process.env.DATABASE_URL ? true : false;

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
          qr_check_in_token VARCHAR(100),
          qr_check_out_token VARCHAR(100),
          qr_token_expires_at TIMESTAMP,
          owner_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id)
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workplace_id) REFERENCES workplaces(id)
        )
      `);
      
      // Add work_days column if it doesn't exist
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN work_days VARCHAR(100)`);
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
          console.error('Error adding work_days column to employee_details:', e);
        }
      }

      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN gender VARCHAR(10)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN birth_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN career TEXT`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN job_type VARCHAR(255)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN employment_renewal_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN contract_start_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN contract_end_date DATE`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN employment_notes TEXT`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN separation_type VARCHAR(50)`);
      } catch (e) {}
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN separation_reason TEXT`);
      } catch (e) {}
      
      // Add id_card_file and family_cert_file columns if they don't exist
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN id_card_file VARCHAR(500)`);
      } catch (e) {
        // Column already exists, ignore
      }
      
      try {
        await pool.query(`ALTER TABLE employee_details ADD COLUMN family_cert_file VARCHAR(500)`);
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
        await run(`ALTER TABLE users ADD COLUMN employment_status TEXT DEFAULT 'active'`);
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
          qr_check_in_token TEXT,
          qr_check_out_token TEXT,
          qr_token_expires_at DATETIME,
          owner_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id)
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

export default { query, run, get, initDatabase };
