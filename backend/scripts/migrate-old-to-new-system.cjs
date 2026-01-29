const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');

console.log('🔄 기존 시스템 데이터를 새 시스템으로 마이그레이션 시작...\n');
console.log('⚠️  주의: 이 작업은 기존 workplaces와 employees 데이터를 기반으로 새 companies와 company_employee_relations를 생성합니다.\n');

const db = new sqlite3.Database(dbPath);

// SQL 실행 헬퍼
function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function migrate() {
  let companiesCreated = 0;
  let relationsCreated = 0;
  let adminsCreated = 0;
  let salarySlipsUpdated = 0;
  let attendanceUpdated = 0;

  try {
    console.log('📋 Step 1: workplaces → companies 마이그레이션');
    console.log('─'.repeat(50));

    // 1. 기존 workplaces 테이블에서 데이터 가져오기
    const workplaces = await allSQL(`
      SELECT 
        w.*,
        u.business_number as owner_business_number,
        u.name as owner_name,
        u.phone as owner_phone
      FROM workplaces w
      LEFT JOIN users u ON w.owner_id = u.id
    `);

    console.log(`   기존 사업장 수: ${workplaces.length}개\n`);

    if (workplaces.length === 0) {
      console.log('   ⏭️  마이그레이션할 사업장이 없습니다.\n');
    }

    for (const workplace of workplaces) {
      try {
        // 사업자등록번호가 없으면 임시로 생성 (나중에 수정 필요)
        let businessNumber = workplace.owner_business_number;
        
        if (!businessNumber) {
          // 임시 사업자등록번호 생성 (workplace_id 기반)
          businessNumber = `TMP${String(workplace.id).padStart(7, '0')}`;
          console.log(`   ⚠️  사업장 "${workplace.name}": 사업자등록번호 없음 → 임시 번호 생성: ${businessNumber}`);
        }

        // 중복 체크
        const existing = await getSQL(
          'SELECT id FROM companies WHERE business_number = ?',
          [businessNumber]
        );

        if (existing) {
          console.log(`   ⏭️  사업장 "${workplace.name}": 이미 존재함 (company_id: ${existing.id})`);
          
          // workplace 테이블의 company_id 업데이트
          await runSQL(
            'UPDATE workplaces SET company_id = ? WHERE id = ?',
            [existing.id, workplace.id]
          );

          continue;
        }

        // companies 테이블에 삽입
        const companyResult = await runSQL(
          `INSERT INTO companies (
            business_number, company_name, representative_name, address, phone,
            verified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            businessNumber,
            workplace.name || '회사명 없음',
            workplace.owner_name || null,
            workplace.address || null,
            workplace.owner_phone || null,
            0  // verified = false
          ]
        );

        const companyId = companyResult.lastID;
        companiesCreated++;

        console.log(`   ✅ 사업장 "${workplace.name}" → company_id: ${companyId}`);

        // workplace 테이블의 company_id 업데이트
        await runSQL(
          'UPDATE workplaces SET company_id = ? WHERE id = ?',
          [companyId, workplace.id]
        );

        // company_admins 테이블에 owner 등록
        if (workplace.owner_id) {
          await runSQL(
            `INSERT INTO company_admins (
              company_id, user_id, role, granted_at
            ) VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)`,
            [companyId, workplace.owner_id]
          );
          adminsCreated++;
        }

      } catch (err) {
        console.error(`   ❌ 사업장 "${workplace.name}" 마이그레이션 실패:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Step 1 완료: ${companiesCreated}개 회사 생성, ${adminsCreated}개 관리자 등록\n`);


    // 2. employees → company_employee_relations 마이그레이션
    console.log('📋 Step 2: employees → company_employee_relations 마이그레이션');
    console.log('─'.repeat(50));

    const employees = await allSQL(`
      SELECT 
        e.*,
        w.company_id,
        w.name as workplace_name
      FROM employees e
      LEFT JOIN workplaces w ON e.workplace_id = w.id
      WHERE e.status = 'active'
    `);

    console.log(`   기존 직원 수: ${employees.length}명\n`);

    for (const employee of employees) {
      try {
        if (!employee.company_id) {
          console.log(`   ⚠️  직원 "${employee.name}": company_id 없음 (workplace: ${employee.workplace_name}) → 스킵`);
          continue;
        }

        // 중복 체크
        const existing = await getSQL(
          `SELECT id FROM company_employee_relations 
           WHERE company_id = ? AND user_id = ? AND status = 'active'`,
          [employee.company_id, employee.user_id]
        );

        if (existing) {
          console.log(`   ⏭️  직원 "${employee.name}": 이미 존재함 (relation_id: ${existing.id})`);
          continue;
        }

        // company_employee_relations 테이블에 삽입
        const relationResult = await runSQL(
          `INSERT INTO company_employee_relations (
            company_id, user_id, start_date, position, employment_type, status,
            hourly_rate, monthly_salary, tax_type,
            payroll_period_start_day, payroll_period_end_day,
            work_start_time, work_end_time,
            dependents_count,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            employee.company_id,
            employee.user_id,
            employee.hire_date || new Date().toISOString().split('T')[0],
            employee.position || '',
            employee.employment_type || 'regular',
            employee.hourly_rate || 0,
            employee.monthly_salary || 0,
            employee.tax_type || '4대보험',
            employee.payroll_period_start_day || 1,
            employee.payroll_period_end_day || 31,
            employee.work_start_time || '09:00',
            employee.work_end_time || '18:00',
            employee.dependents_count || 1
          ]
        );

        const relationId = relationResult.lastID;
        relationsCreated++;

        console.log(`   ✅ 직원 "${employee.name}" → relation_id: ${relationId}`);

      } catch (err) {
        console.error(`   ❌ 직원 "${employee.name}" 마이그레이션 실패:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Step 2 완료: ${relationsCreated}개 고용 관계 생성\n`);


    // 3. salary_slips 테이블의 company_id, company_name 채우기
    console.log('📋 Step 3: salary_slips에 company_id, company_name 채우기');
    console.log('─'.repeat(50));

    const slips = await allSQL(`
      SELECT 
        ss.id,
        ss.workplace_id,
        ss.user_id,
        w.company_id,
        c.company_name
      FROM salary_slips ss
      LEFT JOIN workplaces w ON ss.workplace_id = w.id
      LEFT JOIN companies c ON w.company_id = c.id
      WHERE ss.company_id IS NULL
    `);

    console.log(`   업데이트할 급여명세서: ${slips.length}개\n`);

    for (const slip of slips) {
      try {
        if (!slip.company_id) {
          console.log(`   ⚠️  급여명세서 ID ${slip.id}: company_id 없음 → 스킵`);
          continue;
        }

        await runSQL(
          `UPDATE salary_slips SET company_id = ?, company_name = ? WHERE id = ?`,
          [slip.company_id, slip.company_name || '회사명 없음', slip.id]
        );

        salarySlipsUpdated++;
      } catch (err) {
        console.error(`   ❌ 급여명세서 ID ${slip.id} 업데이트 실패:`, err.message);
      }
    }

    console.log(`   ✅ ${salarySlipsUpdated}개 급여명세서 업데이트 완료\n`);


    // 4. attendance 테이블의 company_id 채우기
    console.log('📋 Step 4: attendance에 company_id 채우기');
    console.log('─'.repeat(50));

    const attendances = await allSQL(`
      SELECT 
        a.id,
        e.workplace_id,
        w.company_id
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN workplaces w ON e.workplace_id = w.id
      WHERE a.company_id IS NULL
      LIMIT 1000
    `);

    console.log(`   업데이트할 출퇴근 기록: ${attendances.length}개 (최대 1000개)\n`);

    for (const attendance of attendances) {
      try {
        if (!attendance.company_id) {
          continue;
        }

        await runSQL(
          `UPDATE attendance SET company_id = ? WHERE id = ?`,
          [attendance.company_id, attendance.id]
        );

        attendanceUpdated++;
      } catch (err) {
        console.error(`   ❌ 출퇴근 기록 ID ${attendance.id} 업데이트 실패:`, err.message);
      }
    }

    console.log(`   ✅ ${attendanceUpdated}개 출퇴근 기록 업데이트 완료\n`);

    console.log('\n' + '='.repeat(50));
    console.log('✨ 마이그레이션 완료!\n');
    console.log(`📊 요약:`);
    console.log(`   - 생성된 회사: ${companiesCreated}개`);
    console.log(`   - 생성된 관리자: ${adminsCreated}명`);
    console.log(`   - 생성된 고용 관계: ${relationsCreated}개`);
    console.log(`   - 업데이트된 급여명세서: ${salarySlipsUpdated}개`);
    console.log(`   - 업데이트된 출퇴근 기록: ${attendanceUpdated}개\n`);

    console.log('⚠️  참고사항:');
    console.log('   1. 임시 사업자등록번호(TMP로 시작)는 실제 번호로 수정이 필요합니다.');
    console.log('   2. 기존 시스템(/api/auth)과 새 시스템(/api/v2/auth)은 병행 가능합니다.');
    console.log('   3. 신규 사용자는 /signup-v2로 독립 회원가입 가능합니다.\n');

  } catch (error) {
    console.error('\n❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  } finally {
    db.close(() => {
      console.log('✅ DB 연결 종료\n');
      process.exit(0);
    });
  }
}

// 실행
migrate();
