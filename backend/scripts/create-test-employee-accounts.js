import { query, run, initDB } from '../config/database.js';
import bcrypt from 'bcrypt';

const createTestEmployeeAccounts = async () => {
  try {
    await initDB();
    
    console.log('📋 테스트 직원 계정 생성 시작...\n');
    
    // 1. test_owner의 workplace_id 찾기
    const ownerResult = await query(
      'SELECT id FROM users WHERE username = ?',
      ['test_owner']
    );
    
    if (!ownerResult || ownerResult.length === 0) {
      console.error('❌ test_owner 계정을 찾을 수 없습니다.');
      process.exit(1);
    }
    
    const ownerId = ownerResult[0].id;
    
    const workplaceResult = await query(
      'SELECT workplace_id FROM workplaces WHERE owner_id = ?',
      [ownerId]
    );
    
    if (!workplaceResult || workplaceResult.length === 0) {
      console.error('❌ test_owner의 사업장을 찾을 수 없습니다.');
      process.exit(1);
    }
    
    const workplaceId = workplaceResult[0].workplace_id;
    console.log(`✓ test_owner의 사업장 ID: ${workplaceId}\n`);
    
    // 2. 테스트 직원 계정 3명 생성
    const testEmployees = [
      {
        username: 'test_emp1',
        password: 'Test!1234',
        name: '테스트직원1',
        role: 'EMPLOYEE',
        employeeData: {
          name: '테스트직원1',
          phone: '01011111111',
          salary_type: 'monthly',
          base_amount: 2500000,
          tax_type: '4대보험',
          employment_status: 'active'
        }
      },
      {
        username: 'test_emp2',
        password: 'Test!1234',
        name: '테스트직원2',
        role: 'EMPLOYEE',
        employeeData: {
          name: '테스트직원2',
          phone: '01022222222',
          salary_type: 'hourly',
          base_amount: 15000,
          tax_type: '3.3%',
          employment_status: 'active'
        }
      },
      {
        username: 'test_emp3',
        password: 'Test!1234',
        name: '테스트직원3',
        role: 'EMPLOYEE',
        employeeData: {
          name: '테스트직원3',
          phone: '01033333333',
          salary_type: 'daily',
          base_amount: 120000,
          tax_type: '일용직',
          employment_status: 'active'
        }
      }
    ];
    
    for (const testEmp of testEmployees) {
      // 기존 계정 확인
      const existingUser = await query(
        'SELECT id FROM users WHERE username = ?',
        [testEmp.username]
      );
      
      let userId;
      
      if (existingUser && existingUser.length > 0) {
        userId = existingUser[0].id;
        console.log(`✓ 기존 계정 발견: ${testEmp.username} (ID: ${userId})`);
        
        // 비밀번호 리셋
        const hashedPassword = await bcrypt.hash(testEmp.password, 10);
        await run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, userId]
        );
        console.log(`  - 비밀번호 리셋 완료`);
      } else {
        // 새 계정 생성
        const hashedPassword = await bcrypt.hash(testEmp.password, 10);
        const userResult = await run(
          `INSERT INTO users (username, password, name, role, consent_service) 
           VALUES (?, ?, ?, ?, 1)`,
          [testEmp.username, hashedPassword, testEmp.name, testEmp.role]
        );
        
        userId = userResult.lastID || userResult.insertId;
        console.log(`✓ 새 계정 생성: ${testEmp.username} (ID: ${userId})`);
      }
      
      // 기존 직원 데이터 확인
      const existingEmployee = await query(
        'SELECT employee_id FROM employees WHERE user_id = ? AND workplace_id = ?',
        [userId, workplaceId]
      );
      
      if (existingEmployee && existingEmployee.length > 0) {
        const employeeId = existingEmployee[0].employee_id;
        console.log(`  - 기존 직원 데이터 발견 (employee_id: ${employeeId})`);
        
        // 직원 데이터 업데이트
        await run(
          `UPDATE employees SET 
            name = ?, phone = ?, salary_type = ?, base_amount = ?, 
            tax_type = ?, employment_status = ?
           WHERE employee_id = ?`,
          [
            testEmp.employeeData.name,
            testEmp.employeeData.phone,
            testEmp.employeeData.salary_type,
            testEmp.employeeData.base_amount,
            testEmp.employeeData.tax_type,
            testEmp.employeeData.employment_status,
            employeeId
          ]
        );
        console.log(`  - 직원 데이터 업데이트 완료\n`);
      } else {
        // 새 직원 데이터 생성
        await run(
          `INSERT INTO employees 
           (workplace_id, user_id, name, phone, salary_type, base_amount, tax_type, employment_status, hire_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workplaceId,
            userId,
            testEmp.employeeData.name,
            testEmp.employeeData.phone,
            testEmp.employeeData.salary_type,
            testEmp.employeeData.base_amount,
            testEmp.employeeData.tax_type,
            testEmp.employeeData.employment_status,
            new Date().toISOString().split('T')[0]
          ]
        );
        console.log(`  - 새 직원 데이터 생성 완료\n`);
      }
    }
    
    console.log('✅ 테스트 직원 계정 생성/업데이트 완료!\n');
    console.log('📝 생성된 계정:');
    console.log('  - test_emp1 / Test!1234 (월급, 4대보험, 2,500,000원)');
    console.log('  - test_emp2 / Test!1234 (시급, 3.3%, 15,000원)');
    console.log('  - test_emp3 / Test!1234 (일급, 일용직, 120,000원)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
};

createTestEmployeeAccounts();
