/**
 * 스모크 테스트 스크립트
 * 
 * 사용 방법:
 * 1. 브라우저에서 애플리케이션 로그인
 * 2. F12 (개발자 도구) → Console 탭
 * 3. 이 스크립트 전체를 복사하여 붙여넣기
 * 4. smokeTest.runAll() 실행
 * 
 * 또는 개별 테스트:
 * - smokeTest.testAuth()
 * - smokeTest.testEmployeeList()
 * - smokeTest.testAttendance()
 */

const smokeTest = {
  baseURL: window.location.origin,
  token: localStorage.getItem('token'),
  results: [],

  // 결과 로깅
  log(testName, passed, message = '') {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    
    const emoji = passed ? '✅' : '❌';
    const style = passed 
      ? 'color: green; font-weight: bold;' 
      : 'color: red; font-weight: bold;';
    
    console.log(`%c${emoji} ${testName}`, style, message);
    return result;
  },

  // API 호출 헬퍼
  async callAPI(method, endpoint, body = null) {
    const url = `${this.baseURL}/api${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    
    return { status: response.status, data };
  },

  // 1. 인증 테스트
  async testAuth() {
    console.group('🔐 인증 테스트');
    
    // 토큰 존재 확인
    if (!this.token) {
      this.log('토큰 존재', false, '로그인이 필요합니다');
      console.groupEnd();
      return;
    }
    this.log('토큰 존재', true);
    
    // 사용자 정보 확인
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);
      
      if (user && user.id && user.role) {
        this.log('사용자 정보', true, `ID: ${user.id}, Role: ${user.role}`);
      } else {
        this.log('사용자 정보', false, '유효하지 않은 사용자 데이터');
      }
    } catch (e) {
      this.log('사용자 정보', false, e.message);
    }
    
    console.groupEnd();
  },

  // 2. 직원 목록 조회 테스트 (Owner)
  async testEmployeeList() {
    console.group('👥 직원 목록 조회');
    
    try {
      // 사업장 목록 조회
      const wpRes = await this.callAPI('GET', '/workplaces/my');
      
      if (wpRes.status === 200 && wpRes.data && wpRes.data.length > 0) {
        this.log('사업장 조회', true, `${wpRes.data.length}개 사업장`);
        
        const workplaceId = wpRes.data[0].id;
        
        // 직원 목록 조회
        const empRes = await this.callAPI('GET', `/employees/workplace/${workplaceId}`);
        
        if (empRes.status === 200 && Array.isArray(empRes.data)) {
          this.log('직원 조회', true, `${empRes.data.length}명`);
          
          // 직원 데이터 구조 검증
          if (empRes.data.length > 0) {
            const employee = empRes.data[0];
            const hasRequiredFields = employee.id && employee.name && employee.user_id;
            
            if (hasRequiredFields) {
              this.log('직원 데이터 구조', true, `필수 필드 존재`);
            } else {
              this.log('직원 데이터 구조', false, `필수 필드 누락: ${JSON.stringify(employee)}`);
            }
          }
        } else {
          this.log('직원 조회', false, `상태 코드: ${empRes.status}`);
        }
      } else {
        this.log('사업장 조회', false, `상태 코드: ${wpRes.status}`);
      }
    } catch (e) {
      this.log('직원 목록 조회', false, e.message);
    }
    
    console.groupEnd();
  },

  // 3. 출근 기록 조회 테스트
  async testAttendance() {
    console.group('📅 출근 기록 조회');
    
    try {
      // 사업장 ID 가져오기
      const wpRes = await this.callAPI('GET', '/workplaces/my');
      
      if (wpRes.status === 200 && wpRes.data && wpRes.data.length > 0) {
        const workplaceId = wpRes.data[0].id;
        const today = new Date().toISOString().split('T')[0];
        
        // 오늘 출근 기록 조회
        const attRes = await this.callAPI('GET', `/attendance/workplace/${workplaceId}?date=${today}`);
        
        if (attRes.status === 200 && Array.isArray(attRes.data)) {
          this.log('출근 기록 조회', true, `${attRes.data.length}건`);
          
          // 상태별 카운트
          const statusCount = {
            normal: 0,
            late: 0,
            absent: 0,
            incomplete: 0
          };
          
          attRes.data.forEach(att => {
            if (att.status) statusCount[att.status]++;
          });
          
          this.log('출근 상태 분포', true, 
            `정상: ${statusCount.normal}, 지각: ${statusCount.late}, ` +
            `결근: ${statusCount.absent}, 미완료: ${statusCount.incomplete}`
          );
          
          // 미퇴근 체크
          const notCheckedOut = attRes.data.filter(att => 
            att.check_in_time && !att.check_out_time
          ).length;
          
          if (notCheckedOut > 0) {
            this.log('미퇴근 인원', true, `⚠️ ${notCheckedOut}명 (알림 필요)`);
          } else {
            this.log('미퇴근 인원', true, `없음`);
          }
        } else {
          this.log('출근 기록 조회', false, `상태 코드: ${attRes.status}`);
        }
      }
    } catch (e) {
      this.log('출근 기록 조회', false, e.message);
    }
    
    console.groupEnd();
  },

  // 4. 급여 계산 API 테스트
  async testSalaryCalculation() {
    console.group('💰 급여 계산');
    
    try {
      // 현재 월
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${year}-${month}`;
      
      // 사업장 ID 가져오기
      const wpRes = await this.callAPI('GET', '/workplaces/my');
      
      if (wpRes.status === 200 && wpRes.data && wpRes.data.length > 0) {
        const workplaceId = wpRes.data[0].id;
        
        // 급여 계산 요청
        const salRes = await this.callAPI('POST', '/salary/calculate', {
          workplaceId,
          month: currentMonth
        });
        
        if (salRes.status === 200 && salRes.data) {
          this.log('급여 계산 API', true, `${salRes.data.employees?.length || 0}명 계산 완료`);
          
          // 계산 결과 검증
          if (salRes.data.employees && salRes.data.employees.length > 0) {
            const employee = salRes.data.employees[0];
            
            // 필수 필드 체크
            const requiredFields = ['employeeId', 'name', 'baseSalary', 'totalPay'];
            const hasAllFields = requiredFields.every(field => employee[field] !== undefined);
            
            if (hasAllFields) {
              this.log('급여 데이터 구조', true, `필수 필드 존재`);
              
              // 금액 검증 (음수 체크)
              if (employee.totalPay < 0) {
                this.log('급여 금액 검증', false, `⚠️ 총 지급액이 음수: ${employee.totalPay}`);
              } else {
                this.log('급여 금액 검증', true, `총 지급액: ${employee.totalPay.toLocaleString()}원`);
              }
            } else {
              this.log('급여 데이터 구조', false, `필수 필드 누락`);
            }
          }
        } else {
          this.log('급여 계산 API', false, `상태 코드: ${salRes.status}`);
        }
      }
    } catch (e) {
      this.log('급여 계산', false, e.message);
    }
    
    console.groupEnd();
  },

  // 5. 4대보험 계산 API 테스트
  async testInsuranceCalculation() {
    console.group('🏥 4대보험 계산');
    
    try {
      const testCases = [
        { basePay: 2500000, payrollMonth: '2025-01', desc: '2025년 250만원' },
        { basePay: 2500000, payrollMonth: '2026-01', desc: '2026년 250만원' },
        { basePay: 3000000, payrollMonth: '2026-01', desc: '2026년 300만원' }
      ];
      
      for (const testCase of testCases) {
        const insRes = await this.callAPI('POST', '/salary/calculate-insurance', {
          basePay: testCase.basePay,
          payrollMonth: testCase.payrollMonth
        });
        
        if (insRes.status === 200 && insRes.data) {
          const { 
            nationalPension, 
            healthInsurance, 
            employmentInsurance, 
            longTermCare 
          } = insRes.data;
          
          const total = nationalPension + healthInsurance + employmentInsurance + longTermCare;
          
          if (total > 0) {
            this.log(`4대보험 계산 (${testCase.desc})`, true, 
              `총 ${total.toLocaleString()}원 ` +
              `(국민연금: ${nationalPension.toLocaleString()}, ` +
              `건강보험: ${healthInsurance.toLocaleString()}, ` +
              `고용보험: ${employmentInsurance.toLocaleString()}, ` +
              `장기요양: ${longTermCare.toLocaleString()})`
            );
          } else {
            this.log(`4대보험 계산 (${testCase.desc})`, false, `⚠️ 계산 결과가 0원`);
          }
        } else {
          this.log(`4대보험 계산 (${testCase.desc})`, false, `상태 코드: ${insRes.status}`);
        }
      }
    } catch (e) {
      this.log('4대보험 계산', false, e.message);
    }
    
    console.groupEnd();
  },

  // 6. 소득세 계산 API 테스트
  async testTaxCalculation() {
    console.group('💸 소득세 계산');
    
    try {
      const testCases = [
        { basePay: 2500000, dependentsCount: 1, desc: '250만원, 부양 1명' },
        { basePay: 3000000, dependentsCount: 2, desc: '300만원, 부양 2명' },
        { basePay: 5000000, dependentsCount: 1, desc: '500만원, 부양 1명' }
      ];
      
      for (const testCase of testCases) {
        const taxRes = await this.callAPI('POST', '/salary/calculate-tax', {
          basePay: testCase.basePay,
          dependentsCount: testCase.dependentsCount
        });
        
        if (taxRes.status === 200 && taxRes.data) {
          const { incomeTax, localIncomeTax } = taxRes.data;
          const total = incomeTax + localIncomeTax;
          
          this.log(`소득세 계산 (${testCase.desc})`, true,
            `총 ${total.toLocaleString()}원 ` +
            `(소득세: ${incomeTax.toLocaleString()}, ` +
            `지방세: ${localIncomeTax.toLocaleString()})`
          );
        } else {
          this.log(`소득세 계산 (${testCase.desc})`, false, `상태 코드: ${taxRes.status}`);
        }
      }
    } catch (e) {
      this.log('소득세 계산', false, e.message);
    }
    
    console.groupEnd();
  },

  // 7. 권한 체크 테스트
  async testAuthorization() {
    console.group('🔒 권한 체크');
    
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);
      
      if (!user || !user.role) {
        this.log('권한 체크', false, '사용자 역할 정보 없음');
        console.groupEnd();
        return;
      }
      
      // 역할별 접근 가능 API 정의
      const roleEndpoints = {
        owner: [
          { method: 'GET', path: '/workplaces/my', shouldPass: true },
          { method: 'GET', path: '/employees/workplace/1', shouldPass: true },
          { method: 'GET', path: '/workplaces', shouldPass: false } // admin only
        ],
        employee: [
          { method: 'POST', path: '/attendance/check-in', shouldPass: true },
          { method: 'GET', path: '/salary/slips/employee', shouldPass: true },
          { method: 'GET', path: '/employees/workplace/1', shouldPass: false } // owner only
        ],
        admin: [
          { method: 'GET', path: '/workplaces', shouldPass: true },
          { method: 'POST', path: '/announcements', shouldPass: true }
        ],
        super_admin: [
          { method: 'GET', path: '/workplaces', shouldPass: true },
          { method: 'POST', path: '/announcements', shouldPass: true },
          { method: 'POST', path: '/insurance-rates', shouldPass: true }
        ]
      };
      
      const endpoints = roleEndpoints[user.role] || [];
      
      for (const endpoint of endpoints) {
        const res = await this.callAPI(endpoint.method, endpoint.path);
        const passed = endpoint.shouldPass 
          ? (res.status === 200 || res.status === 201)
          : (res.status === 403 || res.status === 401);
        
        if (passed) {
          this.log(
            `${endpoint.method} ${endpoint.path}`,
            true,
            endpoint.shouldPass ? `접근 허용 (${res.status})` : `접근 차단 (${res.status})`
          );
        } else {
          this.log(
            `${endpoint.method} ${endpoint.path}`,
            false,
            `⚠️ 예상: ${endpoint.shouldPass ? '200/201' : '403/401'}, 실제: ${res.status}`
          );
        }
      }
    } catch (e) {
      this.log('권한 체크', false, e.message);
    }
    
    console.groupEnd();
  },

  // 8. DOM 요소 존재 확인
  testDOMElements() {
    console.group('🖼️ UI 요소 존재 확인');
    
    const selectors = [
      { selector: 'header', name: '헤더' },
      { selector: '.container', name: '메인 컨테이너' },
      { selector: 'button', name: '버튼 (최소 1개)' },
      { selector: 'input, select, textarea', name: '입력 필드 (최소 1개)' }
    ];
    
    selectors.forEach(({ selector, name }) => {
      const element = document.querySelector(selector);
      if (element) {
        this.log(`DOM: ${name}`, true, `선택자: ${selector}`);
      } else {
        this.log(`DOM: ${name}`, false, `⚠️ 요소를 찾을 수 없음: ${selector}`);
      }
    });
    
    // 모바일 체크
    const isMobile = window.innerWidth <= 768;
    this.log('반응형 감지', true, isMobile ? '모바일 모드' : 'PC 모드');
    
    // 하단 탭바 존재 확인 (모바일)
    if (isMobile) {
      const bottomNav = document.querySelector('.mobile-bottom-nav, .bottom-tab-bar, [class*="bottom"]');
      if (bottomNav) {
        this.log('모바일 하단 탭바', true);
      } else {
        this.log('모바일 하단 탭바', false, '⚠️ 하단 탭바를 찾을 수 없음');
      }
    }
    
    console.groupEnd();
  },

  // 9. 콘솔 에러 체크
  checkConsoleErrors() {
    console.group('🐛 콘솔 에러 체크');
    
    // 이 테스트는 수동으로 확인해야 함
    console.warn('수동 확인 필요: 콘솔에 빨간색 에러 메시지가 있는지 확인하세요.');
    
    this.log('콘솔 에러 체크', true, '수동 확인 필요');
    
    console.groupEnd();
  },

  // 전체 테스트 실행
  async runAll() {
    console.clear();
    console.log('%c🚀 스모크 테스트 시작', 'font-size: 20px; font-weight: bold; color: blue;');
    console.log('테스트 시간:', new Date().toLocaleString());
    console.log('URL:', window.location.href);
    console.log('---');
    
    this.results = [];
    
    await this.testAuth();
    await this.testEmployeeList();
    await this.testAttendance();
    await this.testSalaryCalculation();
    await this.testInsuranceCalculation();
    await this.testTaxCalculation();
    await this.testAuthorization();
    this.testDOMElements();
    this.checkConsoleErrors();
    
    // 결과 요약
    console.log('\n');
    console.log('%c📊 테스트 결과 요약', 'font-size: 18px; font-weight: bold; color: purple;');
    
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`총 테스트: ${total}개`);
    console.log(`%c✅ 통과: ${passed}개`, 'color: green; font-weight: bold;');
    console.log(`%c❌ 실패: ${failed}개`, 'color: red; font-weight: bold;');
    console.log(`통과율: ${passRate}%`);
    
    if (failed > 0) {
      console.log('\n❌ 실패한 테스트:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.message}`);
        });
    }
    
    // JSON 결과 출력
    console.log('\n');
    console.log('%c📄 JSON 결과 (복사 가능)', 'font-size: 14px; color: gray;');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      url: window.location.href,
      total,
      passed,
      failed,
      passRate: parseFloat(passRate),
      results: this.results
    }, null, 2));
    
    return {
      total,
      passed,
      failed,
      passRate: parseFloat(passRate)
    };
  },

  // 특정 역할로 테스트 (로그인 후 실행)
  async runForRole(role) {
    console.log(`%c🎭 ${role.toUpperCase()} 역할 테스트`, 'font-size: 18px; color: blue;');
    
    const userStr = localStorage.getItem('user');
    const user = JSON.parse(userStr);
    
    if (!user || user.role !== role) {
      console.error(`❌ 현재 로그인된 역할(${user?.role})이 테스트 대상(${role})과 다릅니다.`);
      return;
    }
    
    await this.runAll();
  }
};

// 전역으로 노출
window.smokeTest = smokeTest;

console.log('%c✨ 스모크 테스트 스크립트 로드 완료', 'color: green; font-weight: bold;');
console.log('사용법:');
console.log('  smokeTest.runAll()           - 전체 테스트 실행');
console.log('  smokeTest.testAuth()         - 인증 테스트만');
console.log('  smokeTest.testEmployeeList() - 직원 목록 테스트만');
console.log('  smokeTest.runForRole("owner") - 특정 역할 테스트');
