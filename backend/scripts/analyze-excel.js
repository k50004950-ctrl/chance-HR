const XLSX = require('xlsx');
const path = require('path');

// 엑셀 파일 경로
const excelPath = path.join(__dirname, '..', '..', '2026년급여관리프로그램급여계산급여명세서작성4대보험요율자동업데이트.xlsm');

console.log('📊 엑셀 파일 분석 중...\n');
console.log(`파일 경로: ${excelPath}\n`);

try {
  // 엑셀 파일 읽기
  const workbook = XLSX.readFile(excelPath);
  
  console.log('📋 시트 목록:');
  console.log('='.repeat(80));
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`${index + 1}. ${sheetName}`);
  });
  console.log('\n');
  
  // 각 시트 상세 분석
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log('='.repeat(80));
    console.log(`📄 시트 ${index + 1}: ${sheetName}`);
    console.log('='.repeat(80));
    
    const worksheet = workbook.Sheets[sheetName];
    
    // 시트 범위 확인
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`📏 범위: ${XLSX.utils.encode_range(range)} (행: ${range.e.r + 1}, 열: ${range.e.c + 1})`);
    
    // 첫 20행의 데이터를 JSON으로 변환
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: '' 
    });
    
    console.log(`\n📊 데이터 미리보기 (최대 20행):\n`);
    
    const previewRows = Math.min(20, data.length);
    for (let i = 0; i < previewRows; i++) {
      const row = data[i];
      if (row && row.some(cell => cell !== '')) { // 빈 행이 아닌 경우만 출력
        console.log(`[행 ${i + 1}]`);
        row.forEach((cell, colIndex) => {
          if (cell !== '') {
            const colName = XLSX.utils.encode_col(colIndex);
            console.log(`  ${colName}: ${cell}`);
          }
        });
        console.log('');
      }
    }
    
    // 머지된 셀 정보
    if (worksheet['!merges']) {
      console.log(`\n🔗 병합된 셀: ${worksheet['!merges'].length}개`);
      worksheet['!merges'].slice(0, 5).forEach((merge, idx) => {
        console.log(`  ${idx + 1}. ${XLSX.utils.encode_range(merge)}`);
      });
      if (worksheet['!merges'].length > 5) {
        console.log(`  ... 외 ${worksheet['!merges'].length - 5}개`);
      }
    }
    
    console.log('\n');
  });
  
  // 매크로 정보 (VBA 프로젝트)
  if (workbook.vbaraw) {
    console.log('='.repeat(80));
    console.log('🔧 VBA 매크로 정보');
    console.log('='.repeat(80));
    console.log('✅ 이 파일에는 VBA 매크로가 포함되어 있습니다.');
    console.log('⚠️  매크로 코드는 바이너리 형식으로 저장되어 있어 직접 읽을 수 없습니다.');
    console.log('\n');
  }
  
  console.log('✅ 분석 완료!\n');
  
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  console.error(error.stack);
}
