import express from 'express';
import bcrypt from 'bcryptjs';
import { run, get, query } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// 테스트 데이터 생성 API (개발/테스트용, super_admin만)
router.get('/create-test-data', authenticate, authorizeRole(['super_admin']), async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return res.status(404).json({ success: false, message: 'Not Found' });
  }
  try {
    console.log('테스트 데이터 생성 시작...');
    
    // 1. 테스트 사업주 계정 생성
    const testOwnerUsername = 'test';
    const testOwnerPassword = '1234';
    const hashedPassword = await bcrypt.hash(testOwnerPassword, 10);
    
    let testOwner = await get(
      'SELECT id FROM users WHERE username = $1',
      [testOwnerUsername]
    );
    
    let testOwnerId;
    if (!testOwner) {
      if (process.env.NODE_ENV === 'production') {
        const result = await query(
          `INSERT INTO users (username, password, name, phone, email, role, business_name, business_number, approval_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [testOwnerUsername, hashedPassword, '테스트대표', '010-1234-5678', 'test@test.com', 'owner', '테스트회사', '123-45-67890', 'approved']
        );
        testOwnerId = result[0].id;
      } else {
        const result = await run(
          `INSERT INTO users (username, password, name, phone, email, role, business_name, business_number, approval_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [testOwnerUsername, hashedPassword, '테스트대표', '010-1234-5678', 'test@test.com', 'owner', '테스트회사', '123-45-67890', 'approved']
        );
        testOwnerId = result.id;
      }
      console.log(`✅ 테스트 사업주 계정 생성 (ID: ${testOwnerId})`);
    } else {
      testOwnerId = testOwner.id;
      await run(
        'UPDATE users SET approval_status = $1, password = $2 WHERE id = $3',
        ['approved', hashedPassword, testOwnerId]
      );
      console.log(`✅ 테스트 사업주 계정 업데이트 (ID: ${testOwnerId})`);
    }
    
    // 2. 테스트 사업장 생성
    let testWorkplace = await get(
      'SELECT id FROM workplaces WHERE name = $1 AND owner_id = $2',
      ['테스트 사업장', testOwnerId]
    );
    
    let testWorkplaceId;
    if (!testWorkplace) {
      if (process.env.NODE_ENV === 'production') {
        const result = await query(
          `INSERT INTO workplaces (name, address, latitude, longitude, owner_id, radius)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          ['테스트 사업장', '서울시 강남구 테헤란로 123', 37.5012743, 127.0396597, testOwnerId, 100]
        );
        testWorkplaceId = result[0].id;
      } else {
        const result = await run(
          `INSERT INTO workplaces (name, address, latitude, longitude, owner_id, radius)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['테스트 사업장', '서울시 강남구 테헤란로 123', 37.5012743, 127.0396597, testOwnerId, 100]
        );
        testWorkplaceId = result.id;
      }
      console.log(`✅ 테스트 사업장 생성 (ID: ${testWorkplaceId})`);
    } else {
      testWorkplaceId = testWorkplace.id;
      console.log(`✅ 테스트 사업장 존재 (ID: ${testWorkplaceId})`);
    }
    
    // test 사업주의 workplace_id 업데이트
    await run(
      'UPDATE users SET workplace_id = $1 WHERE id = $2',
      [testWorkplaceId, testOwnerId]
    );
    console.log(`✅ 테스트 사업주의 workplace_id 업데이트 완료`);
    
    // 3. 직원 3명 생성
    const employeesData = [
      { username: 'employee1', name: '김직원', salary_type: 'hourly', amount: 12000, weekly_holiday_pay: true },
      { username: 'employee2', name: '이직원', salary_type: 'annual', amount: 30000000, weekly_holiday_pay: false },
      { username: 'employee3', name: '박직원', salary_type: 'monthly', amount: 2100000, weekly_holiday_pay: false },
    ];
    
    const employeeIds = {};
    for (const emp of employeesData) {
      const empHashedPassword = await bcrypt.hash('1234', 10);
      let employeeUser = await get('SELECT id FROM users WHERE username = $1', [emp.username]);
      
      let employeeUserId;
      if (!employeeUser) {
        if (process.env.NODE_ENV === 'production') {
          const result = await query(
            `INSERT INTO users (username, password, name, role, workplace_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [emp.username, empHashedPassword, emp.name, 'employee', testWorkplaceId]
          );
          employeeUserId = result[0].id;
        } else {
          const result = await run(
            `INSERT INTO users (username, password, name, role, workplace_id)
             VALUES (?, ?, ?, ?, ?)`,
            [emp.username, empHashedPassword, emp.name, 'employee', testWorkplaceId]
          );
          employeeUserId = result.id;
        }
        console.log(`✅ 직원 계정 생성: ${emp.username} (ID: ${employeeUserId})`);
      } else {
        employeeUserId = employeeUser.id;
        await run(
          'UPDATE users SET workplace_id = $1 WHERE id = $2',
          [testWorkplaceId, employeeUserId]
        );
        console.log(`✅ 직원 계정 업데이트: ${emp.username} (ID: ${employeeUserId})`);
      }
      
      employeeIds[emp.username] = employeeUserId;
      
      // 직원 상세 정보
      let employeeDetails = await get('SELECT id FROM employee_details WHERE user_id = $1', [employeeUserId]);
      if (!employeeDetails) {
        await run(
          `INSERT INTO employee_details (user_id, workplace_id, hire_date, position, department, notes, work_start_time, work_end_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [employeeUserId, testWorkplaceId, '2024-01-01', '사원', '개발팀', '테스트 직원', '09:00', '18:00']
        );
      } else {
        await run(
          `UPDATE employee_details SET work_start_time = $1, work_end_time = $2 WHERE user_id = $3`,
          ['09:00', '18:00', employeeUserId]
        );
      }

      // 급여 정보 (salary_info 테이블)
      let salaryInfo = await get('SELECT id FROM salary_info WHERE user_id = $1', [employeeUserId]);
      if (!salaryInfo) {
        await run(
          `INSERT INTO salary_info (user_id, workplace_id, salary_type, amount, weekly_holiday_pay, tax_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [employeeUserId, testWorkplaceId, emp.salary_type, emp.amount, emp.weekly_holiday_pay, '3.3%']
        );
      } else {
        await run(
          `UPDATE salary_info SET salary_type = $1, amount = $2, weekly_holiday_pay = $3, tax_type = $4 WHERE user_id = $5`,
          [emp.salary_type, emp.amount, emp.weekly_holiday_pay, '3.3%', employeeUserId]
        );
      }
    }
    
    // 4. 2025년 근태 데이터 생성
    console.log('📅 2025년 근태 데이터 생성 중...');
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    
    let attendanceCount = 0;
    for (const empUsername in employeeIds) {
      const userId = employeeIds[empUsername];
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 주말 제외
          const dateString = currentDate.toISOString().split('T')[0];
          
          // 기존 기록 삭제
          await run('DELETE FROM attendance WHERE user_id = $1 AND date = $2', [userId, dateString]);
          
          let checkInTime = new Date(`${dateString}T09:00:00Z`);
          let checkOutTime = new Date(`${dateString}T18:00:00Z`);
          let status = 'completed';
          let workHours = 9.00;
          
          // 랜덤으로 지각, 결근, 미완료 생성
          const random = Math.random();
          if (random < 0.05) { // 5% 확률로 결근
            status = 'absent';
            checkInTime = null;
            checkOutTime = null;
            workHours = 0;
          } else if (random < 0.15) { // 10% 확률로 지각
            checkInTime = new Date(`${dateString}T09:30:00Z`);
            workHours = 8.50;
          } else if (random < 0.20) { // 5% 확률로 미완료
            checkOutTime = null;
            status = 'incomplete';
            workHours = null;
          }
          
          await run(
            `INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_out_time, work_hours, status, check_in_lat, check_in_lng, check_out_lat, check_out_lng)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [userId, testWorkplaceId, dateString, checkInTime, checkOutTime, workHours, status, 37.5012743, 127.0396597, 37.5012743, 127.0396597]
          );
          attendanceCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    console.log(`✅ 총 ${attendanceCount}개의 근태 기록 생성 완료`);
    
    res.json({
      success: true,
      message: '테스트 데이터 생성이 완료되었습니다! 🎉',
      data: {
        testOwner: { username: 'test', password: '1234', id: testOwnerId },
        workplace: { id: testWorkplaceId, name: '테스트 사업장' },
        employees: Object.keys(employeeIds).map(username => ({
          username,
          password: '1234',
          id: employeeIds[username]
        })),
        attendanceRecords: attendanceCount
      }
    });
  } catch (error) {
    console.error('테스트 데이터 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '테스트 데이터 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router;
