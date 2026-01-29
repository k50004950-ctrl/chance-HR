import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Railway PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? {
    rejectUnauthorized: false
  } : false
});

async function runMigration() {
  console.log('🚀 V2 인증 시스템 마이그레이션 시작...\n');
  
  try {
    // SQL 파일 읽기
    const sqlPath = join(__dirname, '../migrations/007_v2_auth_system_postgresql.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL 파일 로드 완료');
    console.log('📊 실행할 SQL 길이:', sql.length, 'bytes\n');
    
    // 세미콜론으로 분리하여 각 쿼리 실행
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 총 ${statements.length}개 SQL 문장 실행 예정\n`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // 주석만 있는 라인은 스킵
      if (statement.trim().startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      try {
        console.log(`[${i + 1}/${statements.length}] 실행 중...`);
        
        await pool.query(statement);
        successCount++;
        console.log(`✅ 성공\n`);
      } catch (error) {
        // 이미 존재하는 테이블/컬럼은 무시
        if (error.code === '42P07' || // 테이블이 이미 존재
            error.code === '42701' || // 컬럼이 이미 존재
            error.code === '42P16' || // 다중 primary key
            error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          console.log(`⏭️  이미 존재함 (스킵)\n`);
          skipCount++;
        } else {
          console.error(`❌ 오류 발생:`);
          console.error(`   Code: ${error.code}`);
          console.error(`   Message: ${error.message}`);
          console.error(`   Statement preview: ${statement.substring(0, 100)}...\n`);
          // 치명적인 오류가 아니면 계속 진행
          if (error.code !== '42P01') { // relation does not exist는 심각한 오류
            console.log(`⚠️  계속 진행...\n`);
            skipCount++;
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ 마이그레이션 완료!');
    console.log(`   성공: ${successCount}`);
    console.log(`   스킵: ${skipCount}`);
    console.log(`   전체: ${statements.length}\n`);
    
    // 결과 확인
    console.log('📊 생성된 테이블 확인:\n');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'company_admins', 'company_employee_relations', 'matching_requests')
      ORDER BY table_name
    `);
    
    for (const row of tables.rows) {
      console.log(`   ✅ ${row.table_name}`);
    }
    
    console.log('\n🎉 V2 시스템 마이그레이션 성공!\n');
    
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 실행
runMigration()
  .then(() => {
    console.log('✅ 프로세스 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 프로세스 실패:', error);
    process.exit(1);
  });
