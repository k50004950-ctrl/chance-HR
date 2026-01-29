# 새로운 인증 시스템 사용 가이드

## 📝 개요

기존 시스템은 사업주가 근로자 계정을 생성하는 방식이었습니다.  
**새 시스템**에서는:
- 사업주와 근로자가 **독립적으로 회원가입**
- **사업자등록번호**를 기준으로 매칭
- 근로자는 퇴사 후 **이직 가능** (다른 사업장에서 근무 가능)
- **과거 급여명세서**는 퇴사 후에도 계속 조회 가능

---

## 🚀 시작하기

### 1. DB 마이그레이션 실행

기존 시스템을 사용 중이라면, 먼저 DB 스키마를 업데이트해야 합니다.

```bash
cd backend
node scripts/run-migration-006.cjs
```

**출력 예시:**
```
🔄 새 인증 시스템 마이그레이션 시작...

📋 Step 1: companies 테이블 생성
✅ companies 테이블 생성 완료

📋 Step 2: company_employee_relations 테이블 생성
✅ company_employee_relations 테이블 생성 완료

✨ 마이그레이션 완료!
   성공: 17개
   스킵: 0개 (이미 존재)
   실패: 0개
```

### 2. 기존 데이터 마이그레이션 (선택사항)

기존 workplaces와 employees 데이터를 새 시스템으로 옮기려면:

```bash
cd backend
node scripts/migrate-old-to-new-system.cjs
```

**주의:**
- 임시 사업자등록번호(`TMP0000001` 형식)가 생성된 경우, 나중에 실제 번호로 수정 필요
- 기존 시스템(`/api/auth`)과 새 시스템(`/api/v2/auth`)은 병행 가능

---

## 👥 사용 방법

### 사업주 (Owner)

#### 1. 회원가입
1. `/signup-v2` 페이지로 이동
2. 가입 유형: **사업주** 선택
3. **사업자등록번호** 입력 (필수, 10자리)
4. 나머지 정보 입력 후 회원가입

**시스템 동작:**
- `users` 테이블에 사용자 생성
- `companies` 테이블에 회사 자동 등록
- `company_admins` 테이블에 관리자로 등록

#### 2. 로그인
- `/login-v2` 페이지에서 로그인
- 사업주 대시보드로 자동 이동

#### 3. 근로자 매칭 요청 승인
- 대시보드에서 "매칭 요청 목록" 확인
- 근로자가 요청한 매칭을 **승인** 또는 **거부**

---

### 근로자 (Employee)

#### 1. 회원가입
1. `/signup-v2` 페이지로 이동
2. 가입 유형: **근로자** 선택
3. 사업자등록번호는 **입력하지 않음**
4. 나머지 정보 입력 후 회원가입

#### 2. 로그인
- `/login-v2` 페이지에서 로그인
- 근로자 대시보드로 자동 이동

#### 3. 회사 검색 및 매칭 요청
1. 대시보드에서 "회사 찾기" 버튼 클릭
2. 사업주에게 받은 **사업자등록번호** 입력
3. 회사 정보 확인 후 **매칭 요청**
4. 입사일, 직급, 고용형태, 급여 정보 입력
5. 사업주의 승인 대기

**매칭 상태:**
- `pending`: 승인 대기 중
- `active`: 승인 완료 (재직중)
- `rejected`: 거부됨
- `resigned`: 퇴사

#### 4. 고용 이력 조회
- 대시보드에서 "고용 이력" 탭 확인
- 과거 근무했던 모든 회사 목록 확인 가능

#### 5. 퇴사 처리
- 고용 이력에서 현재 재직중인 회사의 "퇴사 처리" 버튼 클릭
- 퇴사일 입력 후 확정
- 상태가 `resigned`로 변경됨

#### 6. 이직
- 퇴사 처리 후, 다시 "회사 찾기"로 새 회사 매칭 요청 가능
- 한 사람이 여러 회사의 이력을 가질 수 있음

#### 7. 과거 급여명세서 조회
- 대시보드에서 "전체 급여명세서" 탭 확인
- 과거 근무했던 모든 회사의 급여명세서 조회 가능
- 퇴사 후에도 급여명세서는 계속 조회 가능

---

## 🔄 기존 시스템과의 차이점

| 항목 | 기존 시스템 | 새 시스템 |
|------|------------|----------|
| **회원가입** | 사업주가 근로자 계정 생성 | 사업주/근로자 독립 회원가입 |
| **매칭 방식** | 사업주가 직접 생성 | 근로자가 사업자등록번호로 검색 후 요청 |
| **퇴사 처리** | 직원 삭제 | 퇴사일 기록, 이력 보존 |
| **이직** | 불가능 (새 계정 필요) | 가능 (같은 계정으로 다른 회사 근무) |
| **급여명세서** | 현재 회사만 조회 | 모든 회사 이력 조회 가능 |
| **API 엔드포인트** | `/api/auth` | `/api/v2/auth` |
| **페이지** | `/login`, `/signup` | `/login-v2`, `/signup-v2` |

---

## 📊 DB 스키마

### 핵심 테이블

#### 1. `companies` - 회사 정보
```sql
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_number TEXT UNIQUE NOT NULL,  -- 사업자등록번호 (10자리)
  company_name TEXT NOT NULL,
  representative_name TEXT,
  business_type TEXT,
  address TEXT,
  phone TEXT,
  verified BOOLEAN DEFAULT 0,            -- 국세청 검증 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `company_employee_relations` - 고용 이력
```sql
CREATE TABLE company_employee_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  start_date DATE NOT NULL,              -- 입사일
  end_date DATE,                         -- 퇴사일 (NULL = 재직중)
  position TEXT,
  employment_type TEXT DEFAULT 'regular',
  status TEXT DEFAULT 'active',          -- active, resigned, pending, rejected
  hourly_rate REAL,
  monthly_salary REAL,
  tax_type TEXT DEFAULT '4대보험',
  -- ... (기타 필드)
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_id, user_id, start_date)
);
```

#### 3. `company_admins` - 회사 관리자
```sql
CREATE TABLE company_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'owner',             -- owner, admin, hr
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(company_id, user_id)
);
```

#### 4. `users` - 사용자 (확장)
- 새로 추가된 컬럼:
  - `business_number`: 사업주의 사업자등록번호
  - `phone`: 전화번호
  - `phone_verified`: 본인인증 여부
  - `birth_date`: 생년월일 (본인인증용)
  - `gender`: 성별 (본인인증용)

#### 5. `salary_slips` - 급여명세서 (확장)
- 새로 추가된 컬럼:
  - `company_id`: 회사 ID (퇴사 후에도 조회 가능)
  - `company_name`: 회사명 (스냅샷)
  - `relation_id`: 고용 관계 ID

#### 6. `attendance` - 출퇴근 기록 (확장)
- 새로 추가된 컬럼:
  - `company_id`: 회사 ID
  - `relation_id`: 고용 관계 ID

---

## 🔐 보안 및 권한

### 데이터 접근 권한

- **사업주**:
  - 자신의 회사 정보 조회/수정
  - 자신의 회사 직원 목록 조회
  - 매칭 요청 승인/거부
  - 직원 급여명세서 발급

- **근로자**:
  - 자신의 고용 이력 조회
  - 자신의 급여명세서 조회 (모든 회사)
  - 회사 검색 및 매칭 요청
  - 퇴사 처리

### 본인인증 (추후 구현 예정)

- PASS, NICE 등 본인인증 API 연동
- 회원가입 시 본인인증 필수
- `users.phone_verified` 필드로 인증 여부 관리

---

## 📡 API 엔드포인트

### 인증

- `POST /api/v2/auth/signup` - 회원가입 (사업주/근로자 공통)
- `POST /api/v2/auth/login` - 로그인

### 근로자용

- `GET /api/v2/auth/companies/search?business_number={번호}` - 회사 검색
- `POST /api/v2/auth/employee/match-request` - 매칭 요청
- `GET /api/v2/auth/employee/my-employment/:userId` - 내 고용 이력
- `GET /api/v2/auth/employee/my-payslips/:userId` - 내 급여명세서 (전체)
- `POST /api/v2/auth/employee/resign` - 퇴사 처리

### 사업주용

- `GET /api/v2/auth/owner/match-requests/:companyId` - 매칭 요청 목록
- `POST /api/v2/auth/owner/match-approve` - 매칭 승인/거부
- `GET /api/v2/auth/owner/my-companies/:userId` - 내 회사 목록

자세한 API 문서: [docs/API_V2_AUTH.md](./API_V2_AUTH.md)

---

## 🛠️ 문제 해결

### Q. 사업자등록번호를 잘못 입력했어요
A. 현재는 DB에서 직접 수정해야 합니다. 추후 설정 페이지에서 수정 기능 추가 예정.

```sql
UPDATE companies SET business_number = '새번호' WHERE id = 회사ID;
UPDATE users SET business_number = '새번호' WHERE id = 사용자ID;
```

### Q. 기존 시스템과 새 시스템을 동시에 사용할 수 있나요?
A. 네, 가능합니다. 기존 API(`/api/auth`)와 새 API(`/api/v2/auth`)는 독립적으로 작동합니다.

### Q. 기존 데이터는 어떻게 되나요?
A. `migrate-old-to-new-system.cjs` 스크립트를 실행하면 기존 데이터가 새 시스템으로 복사됩니다. 기존 테이블은 그대로 유지됩니다.

### Q. 퇴사한 직원의 급여명세서는 어떻게 되나요?
A. 퇴사 후에도 `salary_slips` 테이블에 `company_id`와 `company_name`이 저장되어 있어 계속 조회 가능합니다.

### Q. 한 사람이 여러 회사에서 동시에 일할 수 있나요?
A. 기술적으로는 가능하지만, 현재 UI는 한 번에 한 회사만 재직중(`active`)인 것을 전제로 설계되어 있습니다. 필요하면 개선 가능합니다.

---

## 🎯 추후 개발 예정

1. **본인인증 연동**
   - PASS, NICE API 연동
   - 회원가입 시 본인인증 필수

2. **국세청 사업자등록번호 검증**
   - 국세청 API 연동
   - 사업자등록번호 실시간 검증

3. **회사 정보 수정 기능**
   - 사업주가 대시보드에서 회사 정보 수정

4. **알림 기능**
   - 매칭 요청 알림
   - 급여명세서 발급 알림

5. **UI/UX 개선**
   - 모바일 최적화
   - 고용 이력 타임라인 뷰

---

## 📚 참고 문서

- [API V2 문서](./API_V2_AUTH.md)
- [새 인증 시스템 설계](./NEW_AUTH_SYSTEM.md)
- [시스템 아키텍처](./SYSTEM_ARCHITECTURE.md)

---

## 📞 문의

문제가 있거나 개선 사항이 있으면 이슈를 남겨주세요!
