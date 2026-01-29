const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const migrationPath = path.join(__dirname, '../migrations/006_new_auth_system.sql');

console.log('🔄 새 인증 시스템 마이그레이션 시작...');
console.log('DB 경로:', dbPath);
console.log('마이그레이션 파일:', migrationPath);

const db = new sqlite3.Database(dbPath);

// 마이그레이션 SQL 읽기
const sql = fs.readFileSync(migrationPath, 'utf8');

// SQL 문장들로 분리 (세미콜론 기준)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`\n📋 총 ${statements.length}개의 SQL 문장 실행 예정\n`);

// 직렬 실행
db.serialize(() => {
  let successCount = 0;
  let errorCount = 0;

  statements.forEach((statement, index) => {
    db.run(statement, (err) => {
      if (err) {
        console.error(`❌ [${index + 1}/${statements.length}] 실패:`, err.message);
        console.error('   문장:', statement.substring(0, 100) + '...');
        errorCount++;
      } else {
        console.log(`✅ [${index + 1}/${statements.length}] 성공`);
        successCount++;
      }

      // 마지막 문장 실행 후
      if (index === statements.length - 1) {
        console.log('\n' + '='.repeat(50));
        console.log(`\n✨ 마이그레이션 완료!`);
        console.log(`   성공: ${successCount}개`);
        console.log(`   실패: ${errorCount}개\n`);

        // 테이블 확인
        db.all(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name IN ('companies', 'company_employee_relations', 'company_admins')
          ORDER BY name
        `, (err, tables) => {
          if (!err && tables) {
            console.log('📋 생성된 테이블:');
            tables.forEach(t => console.log(`   - ${t.name}`));
          }
          
          db.close(() => {
            console.log('\n✅ DB 연결 종료\n');
            process.exit(errorCount > 0 ? 1 : 0);
          });
        });
      }
    });
  });
});
