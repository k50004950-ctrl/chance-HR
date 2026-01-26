const XLSX = require('xlsx');
const path = require('path');
const sqlite3 = require('sqlite3');

// 엑셀 파일 경로
const excelPath = path.join(__dirname, '..', '..', '2026년급여관리프로그램급여계산급여명세서작성4대보험요율자동업데이트.xlsm');
const dbPath = path.join(__dirname, '..', 'database.db');

console.log('📊 근로소득 간이세액표 임포트 시작...\n');

const db = new sqlite3.Database(dbPath);

// Promise 기반 쿼리 함수
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const importTaxTable = async () => {
  try {
    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(excelPath);
    const taxSheetName = workbook.SheetNames.find(name => name.includes('간이세액'));
    
    if (!taxSheetName) {
      throw new Error('근로소득 간이세액표 시트를 찾을 수 없습니다.');
    }
    
    console.log(`✅ 시트 발견: "${taxSheetName}"`);
    
    const worksheet = workbook.Sheets[taxSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: '' 
    });
    
    // 기존 2026년 데이터 삭제
    console.log('\n🗑️  기존 2026년 세액표 데이터 삭제 중...');
    await run('DELETE FROM tax_table WHERE year = ?', [2026]);
    
    // 데이터 파싱 (행 6부터 시작)
    console.log('\n📥 데이터 파싱 및 저장 중...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (let i = 5; i < data.length; i++) {
      const row = data[i];
      
      // A열(salary_min), B열(salary_max) 확인
      const salaryMin = parseInt(String(row[0] || '').replace(/,/g, ''));
      const salaryMax = parseInt(String(row[1] || '').replace(/,/g, ''));
      
      if (!salaryMin || !salaryMax) {
        skippedCount++;
        continue;
      }
      
      // C열~M열: 부양가족 1~11명에 대한 세액
      const dependents = [];
      for (let j = 2; j <= 12; j++) {
        const tax = parseInt(String(row[j] || '0').replace(/,/g, ''));
        dependents.push(isNaN(tax) ? 0 : tax);
      }
      
      // DB에 저장
      try {
        await run(`
          INSERT INTO tax_table 
          (year, salary_min, salary_max, 
           dependents_1, dependents_2, dependents_3, dependents_4, dependents_5, dependents_6,
           dependents_7, dependents_8, dependents_9, dependents_10, dependents_11)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          2026,
          salaryMin * 1000,  // 천원 단위를 원 단위로 변환
          salaryMax * 1000,
          ...dependents
        ]);
        
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`  ✓ ${insertedCount}개 행 저장됨...`);
        }
      } catch (err) {
        if (!err.message.includes('UNIQUE constraint')) {
          console.error(`  ✗ 행 ${i + 1} 저장 오류:`, err.message);
        }
      }
    }
    
    console.log(`\n✅ 임포트 완료!`);
    console.log(`   - 저장된 행: ${insertedCount}개`);
    console.log(`   - 건너뛴 행: ${skippedCount}개`);
    
    // 통계 확인
    const stats = await query(`
      SELECT 
        year,
        COUNT(*) as total_rows,
        MIN(salary_min) as min_salary,
        MAX(salary_max) as max_salary
      FROM tax_table
      WHERE year = 2026
      GROUP BY year
    `);
    
    if (stats.length > 0) {
      console.log(`\n📊 저장된 데이터 통계:`);
      console.log(`   - 연도: ${stats[0].year}`);
      console.log(`   - 총 행 수: ${stats[0].total_rows}`);
      console.log(`   - 최소 급여: ${stats[0].min_salary.toLocaleString()}원`);
      console.log(`   - 최대 급여: ${stats[0].max_salary.toLocaleString()}원`);
    }
    
    // 샘플 데이터 확인
    const samples = await query(`
      SELECT * FROM tax_table
      WHERE year = 2026
      ORDER BY salary_min
      LIMIT 5
    `);
    
    console.log(`\n📋 샘플 데이터 (처음 5개):`);
    samples.forEach((sample, idx) => {
      console.log(`\n${idx + 1}. 월급여 ${sample.salary_min.toLocaleString()}원 ~ ${sample.salary_max.toLocaleString()}원`);
      console.log(`   부양 1명: ${sample.dependents_1.toLocaleString()}원`);
      console.log(`   부양 2명: ${sample.dependents_2.toLocaleString()}원`);
      console.log(`   부양 3명: ${sample.dependents_3.toLocaleString()}원`);
    });
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error.stack);
  } finally {
    db.close();
  }
};

importTaxTable();
