const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'attendance.db');
const migrationPath = path.join(__dirname, '..', 'migrations', '011_add_community_likes.sql');

console.log('📊 커뮤니티 추천(좋아요) 기능 추가 시작...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 데이터베이스 연결 실패:', err);
    process.exit(1);
  }
});

// 마이그레이션 파일 읽기
const migration = fs.readFileSync(migrationPath, 'utf8');

// 각 SQL 문을 세미콜론으로 분리
const statements = migration
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

// 순차적으로 실행
const executeStatements = async () => {
  for (const statement of statements) {
    await new Promise((resolve, reject) => {
      db.run(statement, (err) => {
        if (err) {
          // ALTER TABLE 오류는 무시 (이미 컬럼이 있을 수 있음)
          if (err.message.includes('duplicate column name')) {
            console.log('ℹ️ like_count 컬럼이 이미 존재합니다.');
            resolve();
          } else {
            console.error('❌ SQL 실행 오류:', err.message);
            console.error('SQL:', statement.substring(0, 100) + '...');
            reject(err);
          }
        } else {
          console.log('✅ SQL 실행 완료:', statement.substring(0, 50) + '...');
          resolve();
        }
      });
    });
  }
};

executeStatements()
  .then(() => {
    console.log('\n✅ 커뮤니티 추천(좋아요) 기능 추가 완료!');
    db.close();
  })
  .catch((err) => {
    console.error('\n❌ 마이그레이션 실패:', err);
    db.close();
    process.exit(1);
  });
