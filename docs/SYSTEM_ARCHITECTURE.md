# 시스템 아키텍처 문서

## 1. 역할 기반 접근 제어 (RBAC)

### 1.1 역할 정의

| 역할 | 코드명 | 권한 레벨 | 대시보드 |
|------|--------|-----------|----------|
| 최고 관리자 | `super_admin` | 3 | AdminDashboard |
| 관리자 | `admin` | 3 | AdminDashboard |
| 사업주 | `owner` | 2 | OwnerDashboard |
| 직원 | `employee` | 1 | EmployeeDashboard |

### 1.2 인증 흐름

```
1. 로그인 (/login)
   ↓
2. JWT 토큰 발급 (backend/middleware/auth.js)
   ↓
3. AuthContext에 user 저장 (frontend/src/context/AuthContext.jsx)
   ↓
4. 역할별 라우팅 (frontend/src/App.jsx)
   - super_admin/admin → AdminDashboard
   - owner → OwnerDashboard  
   - employee → EmployeeDashboard
```

### 1.3 권한 검증 계층

#### Frontend (React)
- **ProtectedRoute Component** (`App.jsx:15-36`)
  - `allowedRoles` prop으로 접근 가능 역할 제한
  - 미인증 사용자 → `/login` 리다이렉트
  - 권한 없음 → `/` 리다이렉트

#### Backend (Express)
- **authenticate Middleware** (`backend/middleware/auth.js:5-19`)
  - JWT 토큰 검증
  - `req.user`에 사용자 정보 주입
  
- **authorizeRole Middleware** (`backend/middleware/auth.js:21-36`)
  - 배열/단일 역할 모두 지원
  - 403 Forbidden 반환 (권한 없음)

---

## 2. 사업주(OWNER) 핵심 플로우 정의

### Flow 1: 로그인 & 사업장 선택
**목적**: 시스템 진입 및 관리할 사업장 선택  
**단계**:
1. 로그인 페이지에서 username/password 입력
2. JWT 토큰 수신 및 저장
3. OwnerDashboard로 라우팅
4. 사업장 목록 자동 로드
5. 단일 사업장: 자동 선택 / 다중: 드롭다운 선택

**성공 조건**:
- ✅ JWT 토큰이 localStorage에 저장됨
- ✅ `selectedWorkplace` state가 설정됨
- ✅ 직원/출근 데이터 자동 로드 시작

**관련 코드**:
- `frontend/src/pages/Login.jsx`
- `frontend/src/context/AuthContext.jsx:37-50` (login function)
- `frontend/src/pages/OwnerDashboard.jsx:113-130` (loadWorkplaces)

---

### Flow 2: 직원 등록
**목적**: 새 직원을 시스템에 추가  
**단계**:
1. "직원 관리" 탭 클릭
2. "직원 추가" 버튼 클릭
3. 모달에서 필수 정보 입력:
   - 이름*, 생년월일*, 주민번호 뒷자리*
   - 전화번호*, 주소, 상세주소
   - 입사일*, 계약기간, 급여 유형(시급/월급/연봉)*
   - 급여액*, 근무요일*, 근무시작시간*, 근무종료시간*
   - 급여 지급일*, 세금 신고 유형*
4. 사용자명/비밀번호 설정 (직원 로그인용)
5. "저장" 버튼 클릭

**성공 조건**:
- ✅ POST `/api/employees` 성공 (201)
- ✅ `users` 테이블에 employee 계정 생성
- ✅ `employee_details` 테이블에 상세정보 저장
- ✅ `salary_info` 테이블에 급여정보 저장
- ✅ 직원 목록에 새 직원 표시
- ✅ "저장되었습니다" 토스트 메시지

**검증 포인트**:
- 필수 필드 누락 시 에러 메시지 표시
- 사용자명 중복 체크
- 급여 유형별 주휴수당 계산 로직 적용 여부

**관련 코드**:
- `frontend/src/pages/OwnerDashboard.jsx:1039-1147` (handleSubmitEmployee)
- `backend/routes/employees.js:POST /`

---

### Flow 3: 출근 기록 조회 & 수정
**목적**: 직원들의 출퇴근 현황 확인 및 이상 데이터 수정  
**단계**:
1. "오늘 출근" 또는 "출근 달력" 탭 선택
2. 날짜/월 선택
3. 출근 기록 리스트 확인:
   - 🟢 정상 (초록색)
   - 🟠 지각 (주황색)
   - 🔴 미퇴근 (빨간색)
4. 문제가 있는 기록 클릭 → 수정 모달
5. 출근/퇴근 시간 직접 입력
6. "저장" 버튼 클릭

**성공 조건**:
- ✅ GET `/api/attendance/workplace/:id` 성공
- ✅ 상태별 색상 표시 정확
- ✅ 미퇴근 알림 표시 (상단 Alert)
- ✅ 수정 후 PUT `/api/attendance/:id` 성공
- ✅ 리스트 자동 새로고침

**검증 포인트**:
- 퇴근 시간 < 출근 시간: 에러
- 미래 날짜: 입력 불가
- 퇴사한 직원: 출근 불가

**관련 코드**:
- `frontend/src/pages/OwnerDashboard.jsx:3776-3984` (Attendance Tab Rendering)
- `backend/routes/attendance.js:PUT /:id`

---

### Flow 4: 급여 계산 (단계별)
**목적**: 월별 근무 내역 기반 급여 자동 계산  
**단계**:
1. "급여 보내기" 탭 클릭
2. **Step 1: 근무 내역 확인**
   - 월 선택 (기본: 현재 월)
   - 직원별 근무일수/시간 표시
   - "다음 단계" 클릭
3. **Step 2: 급여 미리보기**
   - 급여 자동 계산 결과 표시
   - 수정 가능 (총 지급액 input)
   - "다음 단계" 클릭
4. **Step 3: 급여 확정 경고**
   - ⚠️ "확정 후에는 수정이 어렵습니다" 모달
   - "확정" 또는 "취소"
5. **Step 4: 발송 완료**
   - ✅ "이번 달 급여가 확정되었습니다" 배지

**성공 조건**:
- ✅ POST `/api/salary/calculate` 성공
- ✅ 시급: 주휴수당 자동 계산
- ✅ 4대보험: 공제액 자동 계산 (연도별 요율)
- ✅ 3.3% 프리랜서: 원천징수 계산
- ✅ 소득세/지방세: 간이세액표 적용
- ✅ `salaryConfirmed` state = true

**검증 포인트**:
- 주휴수당 = (시급 × 1주 평균 근무시간 ÷ 5일)
- 4대보험료 = 기준소득월액 × 요율
- 확정 후 Step 1로 돌아갈 수 없음

**관련 코드**:
- `frontend/src/pages/OwnerDashboard.jsx:1214-1245` (calculateSalary)
- `backend/routes/salary.js:POST /calculate`

---

### Flow 5: 급여명세서 생성 & 발송
**목적**: 급여명세서를 생성하고 직원 계정에 공개  
**단계**:
1. "급여명세서" 서브탭 클릭
2. 급여대장 자동 표시 (당월)
3. "급여명세서 관리" 섹션에서:
   - 직원 선택
   - 명세서 수정/생성
   - "저장" 클릭
4. "배포" 버튼 클릭 (개별 또는 일괄)
5. 경고 확인:
   - ⚠️ "세무대리인 한번더 검토 必 요청"
   - ⚠️ "홈택스 신고기능 미포함"

**성공 조건**:
- ✅ POST `/api/salary/slips` 성공
- ✅ `salary_slips` 테이블에 저장
- ✅ `published = true` 업데이트
- ✅ 직원 계정에서 명세서 조회 가능
- ✅ 월별 급여대장에 반영

**검증 포인트**:
- 미발송 명세서: 직원 접근 불가
- 발송 후: 수정은 가능하나 재배포 필요
- 사업주 부담금 자동 계산

**관련 코드**:
- `frontend/src/pages/OwnerDashboard.jsx:5259-5573` (Salary Slips Tab)
- `backend/routes/salary.js:POST /slips`
- `backend/routes/salary.js:PUT /slips/:id/publish`

---

### Flow 6: 퇴사 처리
**목적**: 직원 퇴사 기록 및 접근 제한  
**단계**:
1. "직원 관리" 탭
2. 직원 선택
3. "퇴사 처리" 버튼
4. 퇴사일 입력
5. ⚠️ 경고 모달 확인
6. "확인" 클릭

**성공 조건**:
- ✅ PUT `/api/employees/:id` (employment_status = 'resigned')
- ✅ `resignation_date` 저장
- ✅ 직원 로그인 여전히 가능
- ✅ 직원은 과거 급여/출근 기록 조회 가능
- ✅ 새 출근 체크 불가
- ✅ 사업주 직원 목록에서 "퇴사" 필터로 확인

**검증 포인트**:
- "삭제"가 아닌 "퇴사 처리"만 가능
- 퇴사 취소 기능 존재
- 퇴사자는 active 직원 통계에서 제외

**관련 코드**:
- `frontend/src/pages/OwnerDashboard.jsx:1348-1381` (handleResignEmployee)
- `backend/routes/employees.js:PUT /:id`

---

### Flow 7: QR 출근 시스템 설정
**목적**: QR 코드 기반 출퇴근 체크 활성화  
**단계**:
1. "출근 달력" 또는 "설정" 탭
2. "QR 출근 관리" 섹션
3. "QR 코드 생성" 버튼
4. QR 코드 이미지 표시
5. "인쇄용 메시지 저장" (선택사항)
6. "QR 코드 인쇄" 또는 다운로드

**성공 조건**:
- ✅ QR 코드에 암호화된 workplaceId 포함
- ✅ `/qr?token=xxx` 형식 URL 생성
- ✅ 직원이 QR 스캔 → GPS 확인 → 출근 기록
- ✅ 인쇄 메시지 저장 → workplace 테이블 업데이트

**검증 포인트**:
- QR 만료 시간 확인
- GPS 허용 범위 (기본 100m)
- 중복 출근 방지

**관련 코드**:
- `frontend/src/pages/OwnerDashboard.jsx:1475-1534` (generateQRCode)
- `frontend/src/pages/QrAttendance.jsx`

---

### Flow 8: 로그아웃
**목적**: 세션 종료 및 보안 확보  
**단계**:
1. 헤더 "로그아웃" 버튼 클릭
2. 확인 (필요시)

**성공 조건**:
- ✅ localStorage에서 token 삭제
- ✅ AuthContext의 user = null
- ✅ `/login` 페이지로 리다이렉트
- ✅ 뒤로가기 시 ProtectedRoute에서 차단

**관련 코드**:
- `frontend/src/context/AuthContext.jsx:52-59` (logout function)
- `frontend/src/components/Header.jsx`

---

## 3. 데이터베이스 스키마 (주요 테이블)

### users
- `id`, `username`, `password`, `name`, `role`, `email`, `phone`, `business_name`

### workplaces
- `id`, `owner_id`, `name`, `address`, `latitude`, `longitude`, `qr_print_message`

### employee_details
- `user_id`, `workplace_id`, `birth_date`, `ssn_last`, `hire_date`, `contract_start`, `contract_end`, `employment_status`, `resignation_date`

### salary_info
- `user_id`, `workplace_id`, `salary_type`, `base_pay`, `work_days`, `work_start_time`, `work_end_time`, `tax_type`, `pay_day`, `dependents_count`

### attendance
- `id`, `user_id`, `workplace_id`, `date`, `check_in_time`, `check_out_time`, `status`, `latitude`, `longitude`

### salary_slips
- `id`, `user_id`, `workplace_id`, `payroll_month`, `pay_date`, `tax_type`, `base_pay`, `national_pension`, `health_insurance`, `employment_insurance`, `long_term_care`, `income_tax`, `local_income_tax`, `published`, `employer_xxx`

---

## 4. API 계약 (주요 엔드포인트)

### 인증
- `POST /api/auth/login` → `{ token, user }`
- `POST /api/auth/register` → `{ message }`

### 직원
- `GET /api/employees/workplace/:id` → `[{ employee }]`
- `POST /api/employees` → `{ id, userId }`
- `PUT /api/employees/:id` → `{ message }`
- `POST /api/employees/:id/resign` → `{ message }`

### 출근
- `GET /api/attendance/workplace/:id?date=YYYY-MM-DD` → `[{ attendance }]`
- `POST /api/attendance/check-in` → `{ id }`
- `POST /api/attendance/check-out` → `{ message }`
- `PUT /api/attendance/:id` → `{ message }`

### 급여
- `POST /api/salary/calculate` → `{ month, employees: [{ salary }] }`
- `POST /api/salary/calculate-insurance` → `{ ... }`
- `POST /api/salary/calculate-tax` → `{ incomeTax, localIncomeTax }`
- `GET /api/salary/slips/workplace/:id/monthly-summary` → `{ ledger }`
- `POST /api/salary/slips` → `{ id }`
- `PUT /api/salary/slips/:id/publish` → `{ message }`

---

## 5. 상태 관리 아키텍처

### AuthContext (전역)
- `user`: 현재 로그인 사용자
- `login()`, `logout()`, `register()`
- `isAuthenticated`, `isAdmin`, `isOwner`, `isEmployee`

### OwnerDashboard (로컬 상태)
**핵심 상태 (변경 금지)**:
- `selectedWorkplace`: 현재 선택된 사업장
- `employees`: 직원 목록
- `attendance`: 출근 기록
- `employeeSlips`: 급여명세서 목록

**UI 상태 (Layout 분리 가능)**:
- `activeTab`: 현재 탭
- `isMobile`: 모바일 여부
- `showModal`, `modalType`: 모달 제어
- `loading`, `message`: 로딩/메시지

---

## 6. 절대 변경 금지 사항

❌ **도메인 로직 변경**:
- 주휴수당 계산 공식
- 4대보험료 계산 로직
- 소득세/지방세 간이세액표
- 출근/지각/결근 판정 기준

❌ **데이터 구조 변경**:
- DB 스키마
- API Request/Response 형식
- localStorage 키

❌ **권한 체크 제거**:
- `authorizeRole` 미들웨어
- `ProtectedRoute` 컴포넌트

❌ **임시 하드코딩**:
- userId, workplaceId 하드코딩
- Mock 데이터로 실제 API 대체
