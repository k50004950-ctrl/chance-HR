# 출퇴근 관리 시스템 - Backend

Node.js + Express 기반의 출퇴근 관리 시스템 백엔드 API입니다.

## 기능

- 🔐 사용자 인증 (JWT)
- 👥 사용자 역할 관리 (관리자, 사업주, 직원)
- 🏢 사업장 관리
- 👤 직원 정보 관리
- 📝 출퇴근 기록 (위치 기반)
- 💰 급여 계산 (연봉, 월급, 시급 + 주휴수당)
- 📎 파일 업로드 (근로계약서 등)

## 설치 및 실행

### 1. 의존성 설치

```bash
cd backend
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 만들고 필요한 값을 설정하세요:

```
PORT=5000
JWT_SECRET=your-secret-key-change-this-in-production-2026
NODE_ENV=development
```

### 3. 서버 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (자동 재시작)
npm run dev
```

서버가 http://localhost:5000 에서 실행됩니다.

## 기본 관리자 계정

최초 실행 시 자동으로 생성됩니다:
- **Username**: admin
- **Password**: admin123

⚠️ **중요**: 프로덕션 환경에서는 반드시 비밀번호를 변경하세요!

## API 엔드포인트

### 인증 (Authentication)

- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 사용자 등록

### 사업장 (Workplaces)

- `GET /api/workplaces` - 모든 사업장 조회 (관리자)
- `GET /api/workplaces/my` - 내 사업장 조회 (사업주)
- `GET /api/workplaces/:id` - 특정 사업장 조회
- `POST /api/workplaces` - 사업장 등록
- `PUT /api/workplaces/:id` - 사업장 수정
- `DELETE /api/workplaces/:id` - 사업장 삭제

### 직원 (Employees)

- `GET /api/employees/workplace/:workplaceId` - 사업장의 직원 목록
- `GET /api/employees/:id` - 직원 상세정보
- `POST /api/employees` - 직원 등록
- `PUT /api/employees/:id` - 직원 정보 수정
- `DELETE /api/employees/:id` - 직원 삭제

### 출퇴근 (Attendance)

- `POST /api/attendance/check-in` - 출근 체크
- `POST /api/attendance/check-out` - 퇴근 체크
- `GET /api/attendance/my` - 내 출퇴근 기록
- `GET /api/attendance/today` - 오늘의 출퇴근 상태
- `GET /api/attendance/employee/:employeeId` - 특정 직원의 출퇴근 기록
- `GET /api/attendance/workplace/:workplaceId` - 사업장의 출퇴근 기록

### 급여 (Salary)

- `GET /api/salary/calculate/:employeeId` - 직원 급여 계산
- `GET /api/salary/workplace/:workplaceId` - 사업장 전체 급여 계산

## 데이터베이스

SQLite를 사용하며, `database.db` 파일에 저장됩니다.

### 테이블 구조

- **users** - 사용자 정보
- **workplaces** - 사업장 정보
- **employee_details** - 직원 상세정보
- **salary_info** - 급여 정보
- **attendance** - 출퇴근 기록

## 위치 기반 출퇴근

사업장의 위도, 경도, 반경을 설정하여 직원이 해당 범위 내에 있을 때만 출퇴근 체크가 가능합니다.

기본 반경: 100미터

## 급여 계산 방식

### 시급
- 총 근무시간 × 시급
- 주휴수당: 주 15시간 이상 근무 시 주당 근무시간의 20% 추가 지급

### 월급
- 월급 × 개월 수

### 연봉
- (연봉 / 12) × 개월 수

## 파일 업로드

근로계약서 등의 파일은 `uploads/` 폴더에 저장되며, 다음 형식을 지원합니다:
- PDF
- DOC, DOCX
- JPG, JPEG, PNG

최대 파일 크기: 10MB

## 보안

- JWT 토큰 기반 인증
- 비밀번호 bcrypt 해싱
- 역할 기반 접근 제어
- CORS 설정

## 라이선스

MIT
