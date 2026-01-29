# 새로운 인증 시스템 설계

## 🎯 목표

### 기존 시스템의 문제점
- Owner가 Employee 계정을 직접 생성
- Employee는 자신의 계정을 만들 수 없음
- 이직 불가능 (1:N 고정 관계)

### 새 시스템의 장점
- Owner와 Employee 모두 독립적으로 회원가입
- 사업자등록번호로 자동 매칭
- 이직/퇴사 처리 가능
- 과거 급여명세서 영구 보관

---

## 🏗️ 시스템 아키텍처

### 1. 데이터 모델

```
companies (회사)
  ↓ 1:N
company_admins (회사 관리자)
  ↓ M:N
users (사용자)
  ↓ M:N
company_employee_relations (고용 관계)
  ↓ 1:N
salary_slips (급여명세서)
attendance (출퇴근 기록)
```

### 2. 핵심 테이블

#### `companies` - 회사 정보
- `business_number` (UNIQUE): 사업자등록번호 (10자리)
- `company_name`: 회사명
- `verified`: 국세청 검증 여부

#### `company_employee_relations` - 고용 관계
- `company_id` + `user_id`: 회사-직원 매칭
- `start_date`, `end_date`: 재직 기간
- `status`: active, resigned, on_leave
- **이력 추적**: 같은 직원이 여러 회사 경력 보유 가능

#### `company_admins` - 회사 관리자
- 한 회사에 여러 관리자 등록 가능
- role: owner, admin, hr

---

## 📱 사용자 플로우

### A. 사업주 회원가입

```
1. 회원가입 폼
   ├─ 이름
   ├─ 아이디
   ├─ 비밀번호
   ├─ 사업자등록번호 (10자리) ← 필수
   └─ 전화번호

2. 계정 생성
   └─ role: 'owner'

3. 회사 정보 등록
   ├─ business_number로 companies 조회
   ├─ 없으면 → companies 생성
   └─ company_admins에 owner로 등록

4. 사업장 설정
   └─ 근무 시간, 주소 등 설정
```

### B. 근로자 회원가입

```
1. 회원가입 폼
   ├─ 이름
   ├─ 아이디
   ├─ 비밀번호
   ├─ 사업자등록번호 (10자리) ← 필수
   ├─ 입사일
   └─ 전화번호

2. 계정 생성
   └─ role: 'employee'

3. 회사 매칭
   ├─ business_number로 companies 조회
   ├─ 있으면 → company_employee_relations 생성 (status: 'pending')
   └─ 없으면 → 오류: "등록되지 않은 사업자등록번호입니다"

4. 관리자 승인 대기
   └─ Owner가 승인하면 status: 'active'
```

### C. 이직 처리

```
1. 퇴사 처리 (Owner가 실행)
   ├─ company_employee_relations.end_date = 퇴사일
   └─ company_employee_relations.status = 'resigned'

2. 새 회사 입사 (Employee가 실행)
   ├─ 새 회사의 사업자등록번호 입력
   ├─ 새 company_employee_relations 생성
   └─ 입사일, 직급 등 입력

3. 과거 데이터 보존
   ├─ 이전 회사 급여명세서: user_id로 계속 조회 가능
   ├─ 출퇴근 기록: relation_id로 회사별 구분
   └─ 개인 대시보드에서 전체 이력 확인 가능
```

---

## 🔄 API 변경 사항

### 기존 API
```javascript
// 직원 계정 생성 (Owner만 가능)
POST /api/employees/create
{
  username, password, name
}
```

### 새 API

```javascript
// 1. 회원가입 (Owner)
POST /api/auth/signup/owner
{
  username, password, name,
  business_number,  // 사업자등록번호
  company_name,
  phone
}

// 2. 회원가입 (Employee)
POST /api/auth/signup/employee
{
  username, password, name,
  business_number,  // 입사할 회사의 사업자등록번호
  start_date,       // 입사일
  phone
}

// 3. 직원 승인 (Owner)
POST /api/companies/:companyId/employees/:userId/approve
{
  position,
  tax_type,
  monthly_salary
}

// 4. 퇴사 처리
POST /api/companies/:companyId/employees/:userId/resign
{
  end_date,
  reason
}

// 5. 재입사 신청 (Employee)
POST /api/companies/join
{
  business_number,
  start_date
}

// 6. 내 전체 고용 이력 조회
GET /api/employees/my-history
Response: [
  {
    company_name,
    start_date,
    end_date,
    status,
    payslips_count
  }
]

// 7. 과거 급여명세서 조회
GET /api/salary/my-slips
Query: ?company_id=X&year=2026
```

---

## 🔐 사업자등록번호 검증

### 국세청 API 연동 (선택사항)

```javascript
// 사업자등록번호 진위 확인 API
// 국세청 홈택스 Open API 사용

POST https://api.odcloud.kr/api/nts-businessman/v1/status
Headers: {
  Authorization: API_KEY
}
Body: {
  businesses: [{
    b_no: "1234567890",  // 사업자등록번호
    start_dt: "20260101", // 개업일자
    p_nm: "홍길동"        // 대표자명
  }]
}

Response: {
  data: [{
    b_no: "1234567890",
    valid: "01",  // 01=계속사업자, 02=휴업자, 03=폐업자
    tax_type: "일반과세자"
  }]
}
```

### 구현 방법

1. **레벨 1 (현재)**: 형식만 검증 (10자리 숫자)
2. **레벨 2 (추천)**: 국세청 API 검증
3. **레벨 3 (미래)**: 회사 등기부등본 확인

---

## 📊 데이터 마이그레이션 전략

### 기존 데이터 처리

```sql
-- Step 1: 기존 workplaces → companies 마이그레이션
INSERT INTO companies (business_number, company_name, address, phone)
SELECT 
  COALESCE(business_number, 'TEMP_' || id) as business_number,
  name as company_name,
  address,
  phone
FROM workplaces;

-- Step 2: 기존 employee_details → company_employee_relations 마이그레이션
INSERT INTO company_employee_relations (
  company_id, user_id, start_date, end_date, status,
  position, tax_type, monthly_salary, work_start_time, work_end_time
)
SELECT 
  (SELECT c.id FROM companies c JOIN workplaces w ON c.id = w.id WHERE ed.workplace_id = w.id) as company_id,
  ed.user_id,
  COALESCE(ed.hire_date, '2026-01-01') as start_date,
  ed.resignation_date,
  CASE 
    WHEN ed.resignation_date IS NULL THEN 'active'
    ELSE 'resigned'
  END as status,
  ed.position,
  ed.tax_type,
  ed.monthly_salary,
  ed.work_start_time,
  ed.work_end_time
FROM employee_details ed;

-- Step 3: salary_slips에 company_id 채우기
UPDATE salary_slips
SET company_id = (
  SELECT cer.company_id 
  FROM company_employee_relations cer 
  WHERE cer.user_id = salary_slips.user_id
    AND salary_slips.payroll_month >= strftime('%Y-%m', cer.start_date)
    AND (cer.end_date IS NULL OR salary_slips.payroll_month <= strftime('%Y-%m', cer.end_date))
  LIMIT 1
);
```

---

## 🚀 구현 순서

### Step 1: DB 마이그레이션
- [x] SQL 스키마 작성
- [ ] 마이그레이션 스크립트 실행
- [ ] 데이터 검증

### Step 2: Backend API
- [ ] 새 회원가입 API (owner/employee 분리)
- [ ] 사업자등록번호 매칭 API
- [ ] 직원 승인/거부 API
- [ ] 퇴사/재입사 API
- [ ] 고용 이력 조회 API

### Step 3: Frontend
- [ ] 새 회원가입 폼 (owner/employee 구분)
- [ ] 사업자등록번호 입력 UI
- [ ] 직원 승인 대기 목록
- [ ] 고용 이력 조회 페이지

### Step 4: 테스트
- [ ] 신규 가입 테스트
- [ ] 매칭 테스트
- [ ] 이직 시나리오 테스트
- [ ] 과거 명세서 조회 테스트

---

## ⚠️ 주의사항

### 1. 사업자등록번호 중복 방지
- 같은 사업자등록번호로 여러 회사 등록 불가
- 첫 등록자가 해당 번호의 소유자

### 2. 승인 시스템
- Employee가 가입 후 Owner가 승인해야 사용 가능
- 악의적 가입 방지

### 3. 데이터 보안
- 퇴사자도 자신의 과거 급여명세서 조회 가능
- 하지만 현재 회사 정보는 조회 불가

---

다음: 실제 구현 시작! 🚀
