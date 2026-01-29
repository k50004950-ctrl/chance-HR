const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const migrationPath = path.join(__dirname, '../migrations/006_new_auth_system.sql');

console.log('🔄 새 인증 시스템 마이그레이션 시작...');
console.log('DB 경로:', dbPath);
console.log('마이그레이션 파일:', migrationPath);

const db = new sqlite3.Database(dbPath);

// 컬럼 존재 확인 헬퍼
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) return reject(err);
      const exists = rows.some(row => row.name === columnName);
      resolve(exists);
    });
  });
}

// 테이블 존재 확인 헬퍼
function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}

// SQL 실행 헬퍼
function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// 메인 마이그레이션 로직
async function migrate() {
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    console.log('\n📋 Step 1: companies 테이블 생성');
    if (!(await tableExists('companies'))) {
      await runSQL(`
        CREATE TABLE companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_number TEXT UNIQUE NOT NULL,
          company_name TEXT NOT NULL,
          representative_name TEXT,
          business_type TEXT,
          address TEXT,
          phone TEXT,
          verified BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ companies 테이블 생성 완료');
      successCount++;
    } else {
      console.log('⏭️  companies 테이블 이미 존재');
      skipCount++;
    }

    console.log('\n📋 Step 2: company_employee_relations 테이블 생성');
    if (!(await tableExists('company_employee_relations'))) {
      await runSQL(`
        CREATE TABLE company_employee_relations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE,
          position TEXT,
          employment_type TEXT DEFAULT 'regular',
          status TEXT DEFAULT 'active',
          hourly_rate REAL,
          monthly_salary REAL,
          tax_type TEXT DEFAULT '4대보험',
          payroll_period_start_day INTEGER,
          payroll_period_end_day INTEGER,
          work_start_time TEXT,
          work_end_time TEXT,
          dependents_count INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(company_id, user_id, start_date)
        )
      `);
      console.log('✅ company_employee_relations 테이블 생성 완료');
      successCount++;
    } else {
      console.log('⏭️  company_employee_relations 테이블 이미 존재');
      skipCount++;
    }

    console.log('\n📋 Step 3: company_admins 테이블 생성');
    if (!(await tableExists('company_admins'))) {
      await runSQL(`
        CREATE TABLE company_admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'owner',
          granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          granted_by INTEGER,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(company_id, user_id)
        )
      `);
      console.log('✅ company_admins 테이블 생성 완료');
      successCount++;
    } else {
      console.log('⏭️  company_admins 테이블 이미 존재');
      skipCount++;
    }

    console.log('\n📋 Step 4: users 테이블 컬럼 추가');
    const userColumns = [
      { name: 'business_number', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'phone_verified', type: 'BOOLEAN DEFAULT 0' },
      { name: 'birth_date', type: 'DATE' },
      { name: 'gender', type: 'TEXT' }
    ];

    for (const col of userColumns) {
      if (!(await columnExists('users', col.name))) {
        try {
          await runSQL(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ users.${col.name} 추가 완료`);
          successCount++;
        } catch (err) {
          console.error(`❌ users.${col.name} 추가 실패:`, err.message);
          errorCount++;
        }
      } else {
        console.log(`⏭️  users.${col.name} 이미 존재`);
        skipCount++;
      }
    }

    console.log('\n📋 Step 5: salary_slips 테이블 컬럼 추가');
    const salarySlipColumns = [
      { name: 'company_id', type: 'INTEGER' },
      { name: 'company_name', type: 'TEXT' },
      { name: 'relation_id', type: 'INTEGER' }
    ];

    for (const col of salarySlipColumns) {
      if (!(await columnExists('salary_slips', col.name))) {
        try {
          await runSQL(`ALTER TABLE salary_slips ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ salary_slips.${col.name} 추가 완료`);
          successCount++;
        } catch (err) {
          console.error(`❌ salary_slips.${col.name} 추가 실패:`, err.message);
          errorCount++;
        }
      } else {
        console.log(`⏭️  salary_slips.${col.name} 이미 존재`);
        skipCount++;
      }
    }

    console.log('\n📋 Step 6: attendance 테이블 컬럼 추가');
    const attendanceColumns = [
      { name: 'company_id', type: 'INTEGER' },
      { name: 'relation_id', type: 'INTEGER' }
    ];

    for (const col of attendanceColumns) {
      if (!(await columnExists('attendance', col.name))) {
        try {
          await runSQL(`ALTER TABLE attendance ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ attendance.${col.name} 추가 완료`);
          successCount++;
        } catch (err) {
          console.error(`❌ attendance.${col.name} 추가 실패:`, err.message);
          errorCount++;
        }
      } else {
        console.log(`⏭️  attendance.${col.name} 이미 존재`);
        skipCount++;
      }
    }

    console.log('\n📋 Step 7: 인덱스 생성');
    const indexes = [
      { name: 'idx_companies_business_number', sql: 'CREATE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number)' },
      { name: 'idx_relations_company_user', sql: 'CREATE INDEX IF NOT EXISTS idx_relations_company_user ON company_employee_relations(company_id, user_id)' },
      { name: 'idx_relations_status', sql: 'CREATE INDEX IF NOT EXISTS idx_relations_status ON company_employee_relations(status)' },
      { name: 'idx_relations_dates', sql: 'CREATE INDEX IF NOT EXISTS idx_relations_dates ON company_employee_relations(start_date, end_date)' },
      { name: 'idx_users_business_number', sql: 'CREATE INDEX IF NOT EXISTS idx_users_business_number ON users(business_number)' },
      { name: 'idx_salary_slips_company', sql: 'CREATE INDEX IF NOT EXISTS idx_salary_slips_company ON salary_slips(company_id, payroll_month)' },
      { name: 'idx_attendance_company', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id, date)' },
      { name: 'idx_company_admins', sql: 'CREATE INDEX IF NOT EXISTS idx_company_admins ON company_admins(company_id, user_id)' }
    ];

    for (const idx of indexes) {
      try {
        await runSQL(idx.sql);
        console.log(`✅ ${idx.name} 생성 완료`);
        successCount++;
      } catch (err) {
        console.error(`❌ ${idx.name} 생성 실패:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📋 Step 8: 뷰 생성');
    try {
      await runSQL(`
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
        WHERE cer.status = 'active' AND cer.end_date IS NULL
      `);
      console.log('✅ v_current_employment 뷰 생성 완료');
      successCount++;
    } catch (err) {
      console.error('❌ 뷰 생성 실패:', err.message);
      errorCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n✨ 마이그레이션 완료!`);
    console.log(`   성공: ${successCount}개`);
    console.log(`   스킵: ${skipCount}개 (이미 존재)`);
    console.log(`   실패: ${errorCount}개\n`);

    // 최종 테이블 목록 확인
    db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('companies', 'company_employee_relations', 'company_admins')
      ORDER BY name
    `, (err, tables) => {
      if (!err && tables) {
        console.log('📋 새로 생성된 테이블:');
        tables.forEach(t => console.log(`   - ${t.name}`));
      }
      
      db.close(() => {
        console.log('\n✅ DB 연결 종료\n');
        process.exit(errorCount > 0 ? 1 : 0);
      });
    });

  } catch (err) {
    console.error('\n❌ 마이그레이션 실패:', err);
    db.close(() => {
      process.exit(1);
    });
  }
}

// 실행
migrate();
