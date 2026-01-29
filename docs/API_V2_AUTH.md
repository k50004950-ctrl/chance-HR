# Auth V2 API 문서

## 개요
독립 회원가입 시스템 기반의 새로운 인증 API입니다.

**Base URL**: `/api/v2/auth`

---

## 1. 회원가입 (사업주/근로자 공통)

### `POST /signup`

**Request Body:**
```json
{
  "username": "user123",          // 필수
  "password": "password123",      // 필수
  "name": "홍길동",               // 필수
  "phone": "01012345678",         // 필수
  "role": "owner",                // 필수: "owner" 또는 "employee"
  "business_number": "1234567890" // 사업주는 필수, 근로자는 선택
}
```

**Response (성공):**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "userId": 1
}
```

**Response (실패):**
```json
{
  "success": false,
  "message": "이미 존재하는 아이디입니다."
}
```

**비즈니스 로직:**
- 사업주(`role: "owner"`)인 경우:
  - `business_number` 필수
  - `companies` 테이블에 자동 등록
  - `company_admins` 테이블에 관리자로 등록
- 근로자(`role: "employee"`)인 경우:
  - 회원가입만 진행
  - 이후 사업자등록번호로 회사 검색 후 매칭 요청 필요

---

## 2. 로그인

### `POST /login`

**Request Body:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response (성공):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "user123",
    "name": "홍길동",
    "role": "owner",
    "businessNumber": "1234567890",
    "phoneVerified": false
  }
}
```

---

## 3. 사업자등록번호로 회사 검색 (근로자용)

### `GET /companies/search?business_number=1234567890`

**Response (성공):**
```json
{
  "success": true,
  "company": {
    "id": 1,
    "business_number": "1234567890",
    "company_name": "홍길동의 사업장",
    "representative_name": null,
    "address": null,
    "phone": "01012345678",
    "verified": false,
    "owner_name": "홍길동"
  }
}
```

**Response (회사 없음):**
```json
{
  "success": false,
  "message": "해당 사업자등록번호로 등록된 회사가 없습니다."
}
```

---

## 4. 근로자 -> 회사 매칭 요청

### `POST /employee/match-request`

**Request Body:**
```json
{
  "userId": 2,                      // 필수: 근로자 ID
  "companyId": 1,                   // 필수: 회사 ID
  "startDate": "2026-02-01",        // 필수: 입사일
  "position": "주방보조",            // 선택
  "employmentType": "parttime",     // 선택: regular, contract, parttime, freelancer
  "taxType": "4대보험",              // 선택: 4대보험, 3.3%
  "monthlySalary": 2500000,         // 선택
  "hourlyRate": 10000               // 선택
}
```

**Response:**
```json
{
  "success": true,
  "message": "매칭 요청이 완료되었습니다. 사업주의 승인을 기다려주세요.",
  "relationId": 1
}
```

---

## 5. 사업주 -> 매칭 요청 목록 조회

### `GET /owner/match-requests/:companyId`

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "company_id": 1,
      "user_id": 2,
      "start_date": "2026-02-01",
      "position": "주방보조",
      "employment_type": "parttime",
      "status": "pending",
      "tax_type": "4대보험",
      "monthly_salary": 2500000,
      "hourly_rate": 10000,
      "created_at": "2026-01-29T12:00:00.000Z",
      "employee_name": "김직원",
      "employee_username": "employee1",
      "employee_phone": "01098765432"
    }
  ]
}
```

---

## 6. 사업주 -> 매칭 요청 승인/거부

### `POST /owner/match-approve`

**Request Body:**
```json
{
  "relationId": 1,  // 필수
  "approve": true   // 필수: true = 승인, false = 거부
}
```

**Response (승인):**
```json
{
  "success": true,
  "message": "매칭이 승인되었습니다."
}
```

**Response (거부):**
```json
{
  "success": true,
  "message": "매칭이 거부되었습니다."
}
```

---

## 7. 퇴사 처리

### `POST /employee/resign`

**Request Body:**
```json
{
  "relationId": 1,              // 필수: company_employee_relations ID
  "endDate": "2026-12-31"       // 필수: 퇴사일
}
```

**Response:**
```json
{
  "success": true,
  "message": "퇴사 처리가 완료되었습니다."
}
```

---

## 8. 내 고용 이력 조회 (근로자용)

### `GET /employee/my-employment/:userId`

**Response:**
```json
{
  "success": true,
  "employments": [
    {
      "relation_id": 1,
      "company_id": 1,
      "start_date": "2026-02-01",
      "end_date": "2026-12-31",
      "position": "주방보조",
      "employment_type": "parttime",
      "status": "resigned",
      "tax_type": "4대보험",
      "monthly_salary": 2500000,
      "hourly_rate": 10000,
      "company_name": "홍길동의 사업장",
      "business_number": "1234567890",
      "address": null
    },
    {
      "relation_id": 2,
      "company_id": 3,
      "start_date": "2027-01-10",
      "end_date": null,
      "position": "서빙",
      "employment_type": "parttime",
      "status": "active",
      "tax_type": "3.3%",
      "monthly_salary": 0,
      "hourly_rate": 12000,
      "company_name": "이영희의 식당",
      "business_number": "9876543210",
      "address": "서울시 강남구"
    }
  ]
}
```

**설명:**
- 근로자는 여러 회사의 이력을 가질 수 있음
- `end_date`가 `null`인 경우 현재 재직중
- `status`: `active` (재직중), `resigned` (퇴사), `pending` (승인 대기), `rejected` (거부됨)

---

## 9. 내 급여명세서 조회 (근로자용, 모든 회사)

### `GET /employee/my-payslips/:userId`

**Response:**
```json
{
  "success": true,
  "payslips": [
    {
      "id": 1,
      "payroll_month": "2026-01",
      "pay_date": "2026-02-05",
      "base_pay": 2500000,
      "total_deductions": 250000,
      "net_pay": 2250000,
      "tax_type": "4대보험",
      "published": true,
      "company_name": "홍길동의 사업장",
      "business_number": "1234567890"
    },
    {
      "id": 25,
      "payroll_month": "2027-01",
      "pay_date": "2027-02-05",
      "base_pay": 1800000,
      "total_deductions": 60000,
      "net_pay": 1740000,
      "tax_type": "3.3%",
      "published": true,
      "company_name": "이영희의 식당",
      "business_number": "9876543210"
    }
  ]
}
```

**설명:**
- 근로자는 과거 근무했던 모든 회사의 급여명세서를 볼 수 있음
- 퇴사 후에도 과거 급여명세서는 계속 조회 가능

---

## 10. 사업주의 회사 정보 조회

### `GET /owner/my-companies/:userId`

**Response:**
```json
{
  "success": true,
  "companies": [
    {
      "id": 1,
      "business_number": "1234567890",
      "company_name": "홍길동의 사업장",
      "representative_name": null,
      "business_type": null,
      "address": null,
      "phone": "01012345678",
      "verified": false,
      "role": "owner"
    }
  ]
}
```

---

## 데이터베이스 구조

### 핵심 테이블

1. **`companies`**: 회사 정보
   - `business_number` (사업자등록번호, UNIQUE)
   - `company_name`
   - `verified` (국세청 검증 여부)

2. **`company_employee_relations`**: 회사-직원 관계 (고용 이력)
   - `company_id`, `user_id`
   - `start_date`, `end_date` (`null` = 재직중)
   - `status`: `pending`, `active`, `resigned`, `rejected`
   - 한 직원이 여러 회사에서 일할 수 있음 (시간대별로)

3. **`company_admins`**: 회사 관리자
   - 한 회사에 여러 관리자 가능
   - `role`: `owner`, `admin`, `hr`

4. **`users`**: 사용자 (기존 테이블 확장)
   - `business_number` 추가 (사업주용)
   - `phone`, `phone_verified` 추가
   - `birth_date`, `gender` 추가 (본인인증용)

5. **`salary_slips`**: 급여명세서 (기존 테이블 확장)
   - `company_id`, `company_name`, `relation_id` 추가
   - 퇴사 후에도 과거 명세서 조회 가능

---

## 마이그레이션

**실행 방법:**
```bash
cd backend
node scripts/run-migration-006.cjs
```

**마이그레이션 내용:**
- 새 테이블 생성: `companies`, `company_employee_relations`, `company_admins`
- 기존 테이블 컬럼 추가: `users`, `salary_slips`, `attendance`
- 인덱스 생성 (성능 최적화)
- 뷰 생성: `v_current_employment`

---

## 기존 시스템과의 호환성

- **기존 `/api/auth` API는 그대로 유지**
- 새 시스템은 `/api/v2/auth`로 분리
- 기존 데이터는 별도 마이그레이션 스크립트로 이전 필요
- 점진적 전환 가능 (신규 사용자부터 V2 사용)
