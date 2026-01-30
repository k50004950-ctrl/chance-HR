/**
 * Railway 데이터베이스에 직접 연결하여 누락된 테이블 생성
 */

import pkg from 'pg';
const { Client } = pkg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTables() {
  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // 1. companies 테이블 생성 (먼저!)
    console.log('📦 companies 테이블 생성 중...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        business_number VARCHAR(20) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        representative_name VARCHAR(100),
        address TEXT,
        phone VARCHAR(20),
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ companies 테이블 생성 완료\n');

    // 2. company_admins 테이블 생성
    console.log('📦 company_admins 테이블 생성 중...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_admins (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'owner',
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, user_id)
      );
    `);
    console.log('✅ company_admins 테이블 생성 완료\n');

    // 3. company_employee_relations 테이블 생성
    console.log('📦 company_employee_relations 테이블 생성 중...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_employee_relations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workplace_id INTEGER REFERENCES workplaces(id) ON DELETE SET NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        position VARCHAR(100),
        employment_type VARCHAR(50) DEFAULT 'full-time',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ company_employee_relations 테이블 생성 완료\n');

    // 4. workplace_invitations 테이블 생성
    console.log('📦 workplace_invitations 테이블 생성 중...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workplace_invitations (
        id SERIAL PRIMARY KEY,
        workplace_id INTEGER NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP,
        max_uses INTEGER DEFAULT NULL,
        uses_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ workplace_invitations 테이블 생성 완료\n');

    // 5. 컬럼 추가
    console.log('📦 기존 테이블에 컬럼 추가 중...');
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS business_number VARCHAR(20);`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ssn VARCHAR(20);`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;`);
      await client.query(`ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;`);
      await client.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);`);
      await client.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);`);
      await client.query(`ALTER TABLE employee_details ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255);`);
      console.log('✅ 컬럼 추가 완료\n');
    } catch (err) {
      console.log('⚠️  일부 컬럼은 이미 존재함 (정상)\n');
    }

    // 6. 인덱스 생성
    console.log('📌 인덱스 생성 중...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_companies_business_number ON companies(business_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_company_admins_user ON company_admins(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_company_admins_company ON company_admins(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_relations_user ON company_employee_relations(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_relations_company ON company_employee_relations(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employee_relations_status ON company_employee_relations(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON workplace_invitations(token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitations_workplace ON workplace_invitations(workplace_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitations_active ON workplace_invitations(is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workplaces_company ON workplaces(company_id);`);
    console.log('✅ 인덱스 생성 완료\n');

    // 7. 테이블 확인
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'company_admins', 'company_employee_relations', 'workplace_invitations')
      ORDER BY table_name
    `);

    console.log('📊 V2 시스템 테이블 목록:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    console.log();

    console.log('🎉 모든 테이블이 정상적으로 생성되었습니다!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTables();
