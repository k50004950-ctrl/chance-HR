import { query } from '../config/database.js';

async function checkTest2Account() {
  try {
    console.log('=== 테스트2 계정 분석 ===\n');
    
    // 1. 사용자 정보 확인
    console.log('[1] 사용자 정보 조회...');
    const users = await query(`SELECT id, username, name, role, workplace_id FROM users WHERE username = ?`, ['테스트2']);
    
    if (users.length === 0) {
      console.log('❌ "테스트2" 계정을 찾을 수 없습니다!');
      return;
    }
    
    const user = users[0];
    console.log('✅ 사용자 발견:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Workplace ID: ${user.workplace_id || '없음'}`);
    
    // 2. 사업장 정보 확인
    console.log('\n[2] 사업장 정보 조회...');
    if (user.role === 'owner') {
      const workplaces = await query(`SELECT * FROM workplaces WHERE owner_id = ?`, [user.id]);
      console.log(`✅ 사업장 수: ${workplaces.length}`);
      
      if (workplaces.length > 0) {
        workplaces.forEach(wp => {
          console.log(`   - ${wp.business_name} (ID: ${wp.id})`);
        });
        
        // 3. 직원 정보 확인
        console.log('\n[3] 직원 정보 조회...');
        const workplaceId = workplaces[0].id;
        const employees = await query(`SELECT * FROM users WHERE workplace_id = ? AND role = 'employee'`, [workplaceId]);
        console.log(`✅ 직원 수: ${employees.length}`);
        
        if (employees.length > 0) {
          employees.forEach(emp => {
            console.log(`   - ${emp.name} (ID: ${emp.id})`);
            console.log(`     Tax Type: ${emp.employment_tax_type || '미설정'}`);
            console.log(`     Status: ${emp.employment_status || '미설정'}`);
            console.log(`     Base Salary: ${emp.base_salary || 0}`);
          });
          
          // 4. 근태 기록 확인
          console.log('\n[4] 근태 기록 조회 (2026-02)...');
          const attendance = await query(
            `SELECT * FROM attendance WHERE employee_id IN (${employees.map(() => '?').join(',')}) 
             AND date >= ? AND date <= ?`,
            [...employees.map(e => e.id), '2026-02-01', '2026-02-28']
          );
          console.log(`✅ 근태 기록 수: ${attendance.length}`);
          
          // 5. 급여 명세서 확인
          console.log('\n[5] 급여 명세서 조회...');
          const salarySlips = await query(
            `SELECT * FROM salary_slips WHERE employee_id IN (${employees.map(() => '?').join(',')})
             ORDER BY salary_month DESC LIMIT 5`,
            employees.map(e => e.id)
          );
          console.log(`✅ 급여 명세서 수: ${salarySlips.length}`);
          
          if (salarySlips.length > 0) {
            salarySlips.forEach(slip => {
              const empName = employees.find(e => e.id === slip.employee_id)?.name;
              console.log(`   - ${empName}, ${slip.salary_month}: ${slip.base_pay} → ${slip.net_pay}`);
            });
          }
        } else {
          console.log('⚠️ 등록된 직원이 없습니다!');
        }
      } else {
        console.log('⚠️ 등록된 사업장이 없습니다!');
      }
    } else {
      console.log(`⚠️ 이 계정은 ${user.role} 역할입니다. owner가 아닙니다.`);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

checkTest2Account();
