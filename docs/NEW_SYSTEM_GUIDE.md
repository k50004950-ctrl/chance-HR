# 새로운 인증 시스템 사용 가이드

## 📝 개요

기존 시스템은 사업주가 근로자 계정을 생성하는 방식이었습니다.  
**새 시스템**에서는:
- 사업주와 근로자가 **독립적으로 회원가입**
- **사업자등록번호 + 사업주 전화번호**를 기준으로 매칭
- 근로자는 퇴사 후 **이직 가능** (다른 사업장에서 근무 가능)
- **과거 급여명세서**는 퇴사 후에도 계속 조회 가능
- **모바일 최적화** 완료 (스마트폰에서 편리하게 사용)

---

## 🚀 시작하기

### 1. DB 마이그레이션 실행

기존 시스템을 사용 중이라면, 먼저 DB 스키마를 업데이트해야 합니다.

```bash
cd backend
node scripts/run-migration-007.cjs
```

**출력 예시:**
```
🔄 V2 인증 시스템 마이그레이션 시작...

📋 Step 1: companies 테이블 생성
✅ companies 테이블 생성 완료

📋 Step 2: company_employee_relations 테이블 생성
✅ company_employee_relations 테이블 생성 완료

✨ 마이그레이션 완료!
   성공: 20개
   스킵: 0개 (이미 존재)
   실패: 0개
```

### 2. 자동 마이그레이션

서버 시작 시 자동으로 마이그레이션이 실행됩니다:
- 기존 V1 사업주 로그인 시 → 자동으로 `companies` 테이블에 회사 생성
- 기존 데이터는 그대로 유지되며, 새 시스템과 병행 가능

---

## 👥 사용 방법

### 사업주 (Owner)

#### 1. 회원가입
1. `/signup-v2` 페이지로 이동 (또는 기존 `/signup` 페이지에서 V2 선택)
2. 가입 유형: **사업주** 선택
3. **사업자등록번호** 입력 (필수, 10자리, 하이픈 없이)
4. **전화번호** 입력 (필수, 근로자 매칭 시 사용)
5. 나머지 정보 입력 후 회원가입

**✅ 시스템 동작:**
- `users` 테이블에 사용자 생성
- `companies` 테이블에 회사 자동 등록
- `company_admins` 테이블에 관리자로 등록
- 기본 `workplace` 자동 생성

#### 2. 사업장 등록 (필수)
- 로그인 후 **사업장 주소 검색** 필수
- Daum 우편번호 서비스로 주소 검색
- **지도에서 직접 위치 조정** 가능 (핀을 드래그하여 정확한 위치 설정)
- 위도/경도 자동 저장 (출퇴근 위치 기반 기능용)
- 출퇴근 허용 반경 설정 (예: 100m)

#### 3. 근로자 매칭 요청 승인
- 대시보드 → **"🔔 매칭 승인"** 탭 클릭 (PC)
- 또는 하단 네비게이션 → **"🔔 매칭"** 아이콘 (모바일)
- 근로자가 요청한 매칭 확인:
  - 근로자 이름, 주민등록번호, 전화번호, 이메일, 주소 **자동 표시**
  - 직급/직책 (근로자가 입력한 경우)
- **"승인"** 또는 **"거부"** 선택

**✅ 승인 시 자동 처리:**
- 근로자의 개인정보가 직원 관리 화면에 자동 입력됨
- 근로자 계정에 사업주 정보 자동 표시됨
- 근로자가 출퇴근 기록 시작 가능

#### 4. 직원 정보 설정
- **직원 관리** → 매칭된 직원 선택 → **"수정"** 버튼
- 아래 정보는 **사업주가 직접 설정**:
  - 입사일, 고용형태 (정규직/계약직/시간제/프리랜서)
  - 급여 종류 (월급/시급/연봉)
  - 급여액
  - 4대보험/3.3%/일용직 선택
  - 근무요일, 출퇴근 시간
  - 초과근무수당, 주휴수당

#### 5. 급여명세서 발급
- **"📋 급여명세서 배포"** 탭 클릭
- **Step 1**: 급여 기간 설정
- **Step 2**: 직원별 공제액 입력/수정
- **Step 3**: **급여 확정 및 배포** (한 번에 처리)
  - "급여 확정 및 배포" 버튼 클릭 시 급여명세서 생성 + 근로자에게 자동 공개
- 근로자는 즉시 본인의 급여명세서 조회 가능

---

### 근로자 (Employee)

#### 1. 회원가입
1. `/signup-v2` 페이지로 이동
2. 가입 유형: **근로자** 선택
3. **개인정보 입력** (필수):
   - 이름, 사용자명, 비밀번호
   - **주민등록번호** (예: 901010-1234567)
   - **전화번호** (예: 010-1234-5678)
   - **이메일** (선택)
   - **주소** (선택)
4. 회원가입 완료

**💡 입력한 정보는:**
- 사업주와 매칭 시 **자동으로 사업주 화면에 표시**됨
- 급여명세서, 4대보험 관리에 자동 활용됨

#### 2. 로그인
- `/login-v2` 페이지에서 로그인
- 근로자 대시보드로 자동 이동
- **첫 로그인 시**: 개인정보 수집/이용 동의 팝업 (1회만)

#### 3. 회사 검색 및 매칭 요청
1. 대시보드 → **"🏢 회사 찾기"** 버튼 클릭
2. 사업주에게 받은 정보 입력:
   - **사업자등록번호** (10자리, 하이픈 없이)
   - **사업주 전화번호** (010-XXXX-XXXX)
3. **"검색"** 버튼 클릭
4. 회사 정보 확인:
   - 회사명, 사업자등록번호, 대표자명, 주소
5. (선택) 직급/직책 입력 (예: "매니저", "아르바이트생")
6. **"매칭 요청하기"** 버튼 클릭
7. 사업주의 승인 대기

**🎯 간소화됨:**
- 입사일, 급여, 근무시간 등은 **사업주가 설정**
- 근로자는 검색 → 매칭 요청만 하면 됨

**매칭 상태:**
- `pending`: 승인 대기 중 ⏳
- `active`: 승인 완료 (재직중) ✅
- `rejected`: 거부됨 ❌
- `resigned`: 퇴사 📤

#### 4. 사업주 정보 확인
- 매칭 승인되면 자동으로 **"🏢 사업주 정보"** 섹션 표시
- 확인 가능한 정보:
  - 회사명, 사업자등록번호
  - 사업장 주소
  - 입사일, 직급/직책

#### 5. 급여명세서 조회
- 대시보드 → **"💰 급여"** 탭 클릭
- 사업주가 발급한 급여명세서 자동 표시
- **과거 이력**: 퇴사한 회사의 급여명세서도 계속 조회 가능

#### 6. 출퇴근 기록
- 매칭 승인 후 출퇴근 기록 가능
- 위치 기반 출퇴근 체크 (사업장 반경 내)
- QR 코드 스캔 출퇴근 (사업주가 설정한 경우)

#### 7. 고용 이력 조회 (V2 전용)
- 대시보드 → **"🏢 사업주 정보"** 탭 → 하단 스크롤
- **"과거 근무 이력"** 섹션에서 확인
- 퇴사한 모든 회사 목록 표시

#### 8. 퇴사 처리
- 고용 이력에서 현재 재직중인 회사의 **"퇴사 처리"** 버튼 클릭
- 퇴사일 입력 후 확정
- 상태가 `resigned`로 변경됨
- **급여명세서는 계속 조회 가능**

#### 9. 이직
- 퇴사 처리 후, 다시 **"회사 찾기"**로 새 회사 매칭 요청 가능
- 한 계정으로 여러 회사의 이력 관리 가능
- 과거 급여명세서는 모두 보존됨

---

## 📱 모바일 최적화

### 근로자 모바일 사용
- **풀스크린 모달**: 직원 정보 수정 시 전체 화면 활용
- **부드러운 스크롤**: iOS/Android 네이티브 앱처럼 자연스러운 스크롤
- **Sticky Footer**: 제출 버튼이 항상 하단에 고정되어 보임
- **Safe Area 대응**: iPhone 노치 공간 자동 확보
- **터치 최적화**: 모든 버튼 최소 44px 터치 영역 보장

### 사업주 모바일 사용
- **하단 네비게이션**: 홈, 직원, 출퇴근, 급여, 매칭 메뉴
- **카드형 UI**: 직원 목록, 출퇴근 기록 등 카드 형태로 표시
- **지도 선택**: 모바일에서도 핀을 드래그하여 위치 조정 가능

### 개인정보 동의 팝업
- **첫 로그인 시만 표시** (localStorage 활용)
- 동의 완료 후 다시 로그인해도 팝업 안 뜸
- 체크박스 2개 모두 체크 필수

---

## 🔄 기존 시스템과의 차이점

| 항목 | 기존 시스템 | 새 시스템 (V2) |
|------|------------|----------------|
| **회원가입** | 사업주가 근로자 계정 생성 | 사업주/근로자 독립 회원가입 |
| **개인정보** | 사업주가 입력 | 근로자가 직접 입력 (자동 연동) |
| **매칭 방식** | 사업주가 직접 생성 | 근로자가 사업자번호+전화번호로 검색 |
| **매칭 승인** | 없음 (즉시 생성) | 사업주가 승인/거부 |
| **근무 정보** | 사업주가 모두 입력 | 사업주가 입력 (간소화) |
| **퇴사 처리** | 직원 삭제 | 퇴사일 기록, 이력 보존 |
| **이직** | 불가능 (새 계정 필요) | 가능 (같은 계정으로 다른 회사 근무) |
| **급여명세서** | 현재 회사만 조회 | 모든 회사 이력 조회 가능 |
| **주소 검색** | 수동 입력 | Daum API + 지도 선택 |
| **위치 설정** | 수동 입력 | 지도에서 핀 드래그 |
| **개인정보 동의** | 없음 | 첫 로그인 시 1회 동의 |
| **API** | `/api/auth` | `/api/v2/auth` |
| **페이지** | `/login`, `/signup` | `/login-v2`, `/signup-v2` |
| **모바일** | 부분 최적화 | 완전 최적화 |

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
  workplace_id INTEGER,                  -- 사업장 ID
  start_date DATE NOT NULL,              -- 입사일
  end_date DATE,                         -- 퇴사일 (NULL = 재직중)
  position TEXT,                         -- 직급/직책
  employment_type TEXT DEFAULT 'regular',-- regular, contract, parttime, freelancer
  status TEXT DEFAULT 'pending',         -- pending, active, rejected, resigned
  hourly_rate REAL,
  monthly_salary REAL,
  tax_type TEXT DEFAULT '4대보험',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE SET NULL,
  UNIQUE(company_id, user_id, start_date)
);
```

**💡 중요: status 값**
- `pending`: 매칭 요청 대기 중
- `active`: 승인 완료, 재직 중 (프론트엔드에서 인식)
- `rejected`: 매칭 거부됨
- `resigned`: 퇴사 완료

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
  - `business_number`: 사업주의 사업자등록번호 (VARCHAR(20))
  - `phone`: 전화번호 (매칭 시 사용)
  - `ssn`: 주민등록번호 (근로자)
  - `email`: 이메일 (근로자)
  - `address`: 주소 (근로자)
  - `phone_verified`: 본인인증 여부 (추후 구현)
  - `birth_date`: 생년월일
  - `gender`: 성별

#### 5. `employee_details` - 근로자 상세 정보 (확장)
- 새로 추가된 컬럼:
  - `privacy_consent`: 개인정보 수집/이용 동의 여부
  - `privacy_consent_date`: 동의 일시
  - `location_consent`: 위치정보 수집/이용 동의 여부
  - `location_consent_date`: 동의 일시
  - `bank_name`: 은행명
  - `account_number`: 계좌번호
  - `account_holder`: 예금주

#### 6. `workplaces` - 사업장 정보 (확장)
- 새로 추가된 컬럼:
  - `company_id`: 회사 ID (companies 테이블 연결)
  - `latitude`: 위도 (지도 선택)
  - `longitude`: 경도 (지도 선택)
  - `radius`: 출퇴근 허용 반경 (미터)

#### 7. `salary_slips` - 급여명세서 (확장)
- 새로 추가된 컬럼:
  - `company_id`: 회사 ID (퇴사 후에도 조회 가능)
  - `company_name`: 회사명 (스냅샷)
  - `relation_id`: 고용 관계 ID
  - `published`: 발급 여부 (true일 때만 근로자에게 표시)

#### 8. `attendance` - 출퇴근 기록 (확장)
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
  - 사업장 위치 설정

- **근로자**:
  - 자신의 고용 이력 조회
  - 자신의 급여명세서 조회 (모든 회사)
  - 회사 검색 및 매칭 요청
  - 퇴사 처리
  - 출퇴근 기록

### 개인정보 동의

- **첫 로그인 시 필수 동의**:
  - 개인정보 수집/이용 동의
  - 위치정보 수집/이용 동의
- **localStorage 활용**: 동의 완료 후 재로그인 시 팝업 안 뜸
- **DB 저장**: `employee_details` 테이블에 동의 기록 저장

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

- `GET /api/v2/auth/companies/search?business_number={번호}&owner_phone={전화번호}` - 회사 검색
- `POST /api/v2/auth/employee/match-request` - 매칭 요청
  - Body: `{ company_id, position? }`
  - 입사일은 자동으로 오늘 날짜로 설정
- `GET /api/v2/auth/employee/my-employment/:userId` - 내 고용 이력
- `GET /api/v2/auth/employee/my-payslips/:userId` - 내 급여명세서 (전체)
- `POST /api/v2/auth/employee/resign` - 퇴사 처리

### 사업주용

- `GET /api/v2/auth/owner/match-requests/:companyId` - 매칭 요청 목록
- `POST /api/v2/auth/owner/match-approve` - 매칭 승인/거부
  - Body: `{ relationId, approve: true/false }`
  - 승인 시 자동으로 workplace_id 설정
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

### Q. 기존 V1 사업주가 로그인하면 어떻게 되나요?
A. 자동으로 `companies` 테이블에 회사가 생성되고 `company_admins`에 등록됩니다. 기존 기능은 그대로 사용 가능합니다.

### Q. 퇴사한 직원의 급여명세서는 어떻게 되나요?
A. 퇴사 후에도 `salary_slips` 테이블에 `company_id`와 `company_name`이 저장되어 있어 계속 조회 가능합니다.

### Q. 근로자 매칭 후 사업주 정보가 안 보여요
A. 매칭 승인이 완료되었는지 확인하세요 (status = 'active'). 로그아웃 후 다시 로그인하거나 페이지 새로고침 해보세요.

### Q. 모바일에서 직원 정보 수정이 안 돼요
A. 모달을 아래로 스크롤하여 "저장" 버튼을 찾으세요. 하단에 고정되어 있어 항상 접근 가능합니다.

### Q. 개인정보 동의 팝업이 계속 떠요
A. 동의 체크박스 2개를 모두 체크하고 "위치 확인" 버튼을 클릭하세요. localStorage에 저장되어 다음 로그인부터는 안 뜹니다.

### Q. 주소 검색 후 위도/경도가 부정확해요
A. 지도에서 **빨간 핀을 드래그**하여 정확한 위치로 이동시킬 수 있습니다. 핀을 이동하면 위도/경도가 자동으로 업데이트됩니다.

### Q. 한 사람이 여러 회사에서 동시에 일할 수 있나요?
A. 기술적으로는 가능하지만, 현재 UI는 한 번에 한 회사만 재직중(`active`)인 것을 전제로 설계되어 있습니다. 필요하면 개선 가능합니다.

---

## 🎯 최근 업데이트 (2026-02)

### ✅ 완료된 기능

1. **근로자 자동 정보 입력** ⭐
   - 근로자가 회원가입 시 입력한 개인정보(주민번호, 주소, 이메일 등)
   - 매칭 승인 시 사업주의 직원 관리 화면에 자동 입력됨

2. **매칭 시스템 간소화** ⭐
   - 근로자는 회사 검색 → 매칭 요청만 하면 됨
   - 입사일, 급여, 근무시간 등은 사업주가 나중에 설정

3. **개인정보 동의 개선** ⭐
   - localStorage 활용하여 첫 로그인 시만 팝업 표시
   - 동의 완료 후 재로그인 시 팝업 안 뜸

4. **모바일 최적화** ⭐
   - 풀스크린 모달, 부드러운 스크롤
   - Sticky Footer (제출 버튼 항상 보임)
   - iPhone Safe Area 대응

5. **지도 기반 위치 선택** ⭐
   - Daum Postcode API로 주소 검색
   - Kakao Maps API로 지도 표시
   - 핀 드래그로 정확한 위치 조정 가능

6. **급여명세서 배포 통합** ⭐
   - Step 3에서 "급여 확정 및 배포" 한 번에 처리
   - 발급 즉시 근로자에게 공개 (published = true)

7. **사업주 정보 자동 표시** ⭐
   - 근로자 매칭 승인 후 자동으로 사업주 정보 표시
   - status 'active' 또는 'approved' 모두 지원

### 🔜 추후 개발 예정

1. **본인인증 연동**
   - PASS, NICE API 연동
   - 회원가입 시 본인인증 필수

2. **국세청 사업자등록번호 검증**
   - 국세청 API 연동
   - 사업자등록번호 실시간 검증

3. **회사 정보 수정 기능**
   - 사업주가 대시보드에서 회사 정보 수정

4. **알림 기능**
   - 매칭 요청 알림 (Push)
   - 급여명세서 발급 알림

5. **고용 이력 타임라인**
   - 시각적인 이력 조회 UI

---

## 📚 참고 문서

- [API V2 문서](./API_V2_AUTH.md)
- [새 인증 시스템 설계](./NEW_AUTH_SYSTEM.md)
- [시스템 아키텍처](./SYSTEM_ARCHITECTURE.md)

---

## 📱 모바일 테스트 체크리스트

### 근로자 앱
- [ ] 회원가입 (개인정보 입력)
- [ ] 로그인 (개인정보 동의 팝업)
- [ ] 회사 찾기 (사업자번호 + 전화번호)
- [ ] 매칭 요청
- [ ] 사업주 정보 확인
- [ ] 급여명세서 조회
- [ ] 출퇴근 기록

### 사업주 앱
- [ ] 회원가입 (사업자번호 입력)
- [ ] 사업장 등록 (주소 검색 + 지도 선택)
- [ ] 매칭 요청 승인
- [ ] 직원 정보 수정 (모달 스크롤 + 저장 버튼)
- [ ] 급여명세서 발급 (Step 3 통합)
- [ ] 직원 출퇴근 확인

---

## 📞 문의

문제가 있거나 개선 사항이 있으면 이슈를 남겨주세요!

**최종 업데이트:** 2026년 2월  
**버전:** V2.1 (모바일 최적화 완료)
