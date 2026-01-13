# 📋 출퇴근 관리 시스템

직원 출퇴근 기록 및 급여 관리를 위한 웹 애플리케이션입니다.

## 🚀 기능

### 👨‍💼 관리자 (Admin)
- 사업주 계정 승인/거부
- 전체 사업장 관리
- 시스템 전체 모니터링

### 🏢 사업주 (Owner)
- 사업장 등록 및 관리
- 직원 등록 및 관리
- 직원 급여 정보 설정 (시급/월급/연봉)
- 출퇴근 기록 조회 및 수정
- 급여 계산 (주휴수당 자동 계산)
- 근로자 명부 관리

### 👤 직원 (Employee)
- GPS 기반 출퇴근 체크
- 개인 출퇴근 기록 조회
- 급여 정보 확인

## 🛠️ 기술 스택

### Backend
- Node.js + Express
- PostgreSQL (Production) / SQLite (Development)
- JWT Authentication
- Multer (파일 업로드)

### Frontend
- React + Vite
- React Router
- Axios
- Kakao Postcode API

## 📦 Railway 배포 가이드

### 1. Railway 계정 준비
1. [Railway.app](https://railway.app) 접속
2. GitHub 계정으로 로그인

### 2. GitHub 저장소 생성
```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: 출퇴근 관리 시스템"

# GitHub 저장소 생성 후 연결
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
git branch -M main
git push -u origin main
```

### 3. Railway 프로젝트 생성

#### 3-1. PostgreSQL 데이터베이스 추가
1. Railway 대시보드에서 "New Project" 클릭
2. "Provision PostgreSQL" 선택
3. 데이터베이스가 생성되면 자동으로 `DATABASE_URL` 환경 변수가 설정됨

#### 3-2. Backend 서비스 배포
1. "New Service" → "GitHub Repo" 선택
2. 저장소 선택
3. 환경 변수 설정:
   ```
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key-change-this
   FRONTEND_URL=https://your-frontend-url.up.railway.app
   ```
4. Settings → Deploy → Root Directory: `backend`
5. Settings → Deploy → Start Command: `npm start`
6. Deploy 클릭

#### 3-3. Frontend 서비스 배포
1. "New Service" → "GitHub Repo" 선택 (같은 저장소)
2. 환경 변수 설정:
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app/api
   ```
3. Settings → Deploy → Root Directory: `frontend`
4. Settings → Deploy → Build Command: `npm install && npm run build`
5. Settings → Deploy → Start Command: `npx serve -s dist -l $PORT`
6. Deploy 클릭

### 4. 도메인 설정
1. Backend 서비스 → Settings → Networking → Generate Domain
2. Frontend 서비스 → Settings → Networking → Generate Domain
3. Backend의 `FRONTEND_URL` 환경 변수를 Frontend 도메인으로 업데이트
4. Frontend의 `VITE_API_URL` 환경 변수를 Backend 도메인으로 업데이트

## 🔐 기본 계정

배포 후 자동으로 생성되는 관리자 계정:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **보안을 위해 첫 로그인 후 반드시 비밀번호를 변경하세요!**

## 📱 사용 방법

### 사업주 등록
1. 회원가입 페이지에서 사업주 정보 입력
2. 관리자 승인 대기
3. 승인 후 로그인 가능

### 직원 등록
1. 사업주 로그인
2. "직원 관리" → "직원 등록"
3. 직원 정보 및 급여 정보 입력
4. 근로계약서/이력서 업로드 (선택)

### 출퇴근 체크
1. 직원 로그인
2. GPS 위치 권한 허용
3. "출근하기" 버튼 클릭
4. 퇴근 시 "퇴근하기" 버튼 클릭

### 급여 계산
1. 사업주 로그인
2. "급여 계산" 탭 선택
3. 월 선택 후 자동 계산
4. 시급제 직원: 주휴수당 자동 계산

## 🔧 로컬 개발 환경 설정

### Backend
```bash
cd backend
npm install
cp .env.example .env
# .env 파일 수정
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# .env 파일 수정
npm run dev
```

## 📄 라이선스

MIT License

## 👨‍💻 개발자

출퇴근 관리 시스템 v1.0.0
