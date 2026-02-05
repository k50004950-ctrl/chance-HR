const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ladAFiwmVqhUbVZsadiwDpIXtHbGmLGH@turntable.proxy.rlwy.net:25868/railway';

const pool = new Pool({ connectionString });

async function deleteOrphanedCompany() {
  try {
    const result = await pool.query('DELETE FROM companies WHERE id = 3 RETURNING *');
    
    if (result.rows.length > 0) {
      console.log('✅ 고아 company 레코드 삭제 완료:');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   전화번호: ${result.rows[0].phone}`);
      console.log(`   사업자번호: ${result.rows[0].business_number}`);
    } else {
      console.log('⚠️  삭제할 레코드를 찾을 수 없습니다 (이미 삭제되었을 수 있음)');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    await pool.end();
    process.exit(1);
  }
}

deleteOrphanedCompany();
