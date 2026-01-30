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

    // 1. workplace_invitations 테이블 생성
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

    // 2. 인덱스 생성
    console.log('📌 인덱스 생성 중...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invitations_token ON workplace_invitations(token);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invitations_workplace ON workplace_invitations(workplace_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invitations_active ON workplace_invitations(is_active);
    `);
    console.log('✅ 인덱스 생성 완료\n');

    // 3. 테이블 확인
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
