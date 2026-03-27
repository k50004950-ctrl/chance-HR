# 🚀 Railway 배포 가이드

이 문서는 출퇴근 관리 시스템을 Railway에 배포하는 상세한 가이드입니다.

## 📋 사전 준비

### 필요한 계정
1. ✅ GitHub 계정
2. ✅ Railway 계정 (GitHub로 로그인 가능)

### 로컬 환경 확인
```bash
# Node.js 버전 확인 (v18 이상 권장)
node --version

# npm 버전 확인
npm --version

# Git 설치 확인
git --version
```

## 🔧 1단계: 프로젝트 준비

### 1-1. 환경 변수 파일 생성

**Backend (.env)**
```bash
cd backend
cp .env.example .env
```

`.env` 파일 내용:
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
FRONTEND_URL=https://your-frontend-url.up.railway.app
```

**Frontend (.env)**
```bash
cd ../frontend
cp .env.example .env
```

`.env` 파일 내용:
```env
VITE_API_URL=https://your-backend-url.up.railway.app/api
```

### 1-2. 로컬 테스트
```bash
# Backend 테스트
cd backend
npm install
npm start

# 새 터미널에서 Frontend 테스트
cd frontend
npm install
npm run dev
```

## 📦 2단계: Git 저장소 설정

### 2-1. Git 초기화
```bash
# 프로젝트 루트 디렉토리에서
git init
git add .
git commit -m "Initial commit: 출퇴근 관리 시스템"
```

### 2-2. GitHub 저장소 생성
1. GitHub에서 새 저장소 생성 (예: `attendance-system`)
2. **Public** 또는 **Private** 선택
3. README, .gitignore, license 추가하지 않음

### 2-3. GitHub에 푸시
```bash
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
git branch -M main
git push -u origin main
```

## 🚂 3단계: Railway 배포

### 3-1. Railway 프로젝트 생성
1. [Railway.app](https://railway.app) 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 저장소 연결 (처음이면 GitHub 권한 승인 필요)
5. 생성한 저장소 선택

### 3-2. PostgreSQL 데이터베이스 추가
1. 프로젝트 대시보드에서 "New" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. 자동으로 `DATABASE_URL` 환경 변수가 설정됨
4. 데이터베이스 이름 확인 (예: `postgres`)

### 3-3. Backend 서비스 설정

#### 환경 변수 설정
1. Backend 서비스 선택
2. "Variables" 탭 클릭
3. 다음 변수 추가:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=생성할-랜덤-문자열-최소-32자
FRONTEND_URL=https://your-frontend-url.up.railway.app
```

**JWT_SECRET 생성 방법:**
```bash
# Node.js에서 랜덤 문자열 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 빌드 설정
1. "Settings" 탭 클릭
2. "Build" 섹션:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. "Deploy" 클릭

#### 도메인 생성
1. "Settings" 탭 → "Networking"
2. "Generate Domain" 클릭
3. 생성된 URL 복사 (예: `https://attendance-backend-production.up.railway.app`)

### 3-4. Frontend 서비스 설정

#### 새 서비스 추가
1. 프로젝트 대시보드에서 "New" 클릭
2. "GitHub Repo" 선택
3. **같은 저장소** 선택

#### 환경 변수 설정
1. Frontend 서비스 선택
2. "Variables" 탭 클릭
3. 다음 변수 추가:

```
VITE_API_URL=https://your-backend-url.up.railway.app/api
```

**주의**: Backend에서 생성한 도메인 URL을 사용!

#### 빌드 설정
1. "Settings" 탭 클릭
2. "Build" 섹션:
   - **Root Directory**: `frontend`
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
3. "Deploy" 클릭

#### 도메인 생성
1. "Settings" 탭 → "Networking"
2. "Generate Domain" 클릭
3. 생성된 URL 복사 (예: `https://attendance-frontend-production.up.railway.app`)

### 3-5. 환경 변수 업데이트

#### Backend 업데이트
1. Backend 서비스 → "Variables"
2. `FRONTEND_URL`을 Frontend 도메인으로 업데이트
3. 저장 후 자동 재배포

#### Frontend 업데이트
1. Frontend 서비스 → "Variables"
2. `VITE_API_URL`을 Backend 도메인으로 업데이트
3. 저장 후 자동 재배포

## ✅ 4단계: 배포 확인

### 4-1. Backend 확인
```bash
# API 엔드포인트 테스트
curl https://your-backend-url.up.railway.app/

# 응답 예시:
{
  "message": "출퇴근 관리 시스템 API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

### 4-2. Frontend 확인
1. Frontend URL 접속
2. 로그인 페이지 확인
3. 관리자 계정으로 로그인:
   - Username: `admin`
   - Password: `admin123`

### 4-3. 데이터베이스 확인
1. Railway 대시보드 → PostgreSQL 서비스
2. "Data" 탭에서 테이블 확인:
   - `users`
   - `workplaces`
   - `employee_details`
   - `salary_info`
   - `attendance`

## 🔄 5단계: 업데이트 배포

### 코드 변경 후 배포
```bash
# 변경 사항 커밋
git add .
git commit -m "업데이트 내용"

# GitHub에 푸시
git push origin main

# Railway가 자동으로 감지하고 재배포
```

### 수동 재배포
1. Railway 대시보드
2. 서비스 선택
3. "Deployments" 탭
4. "Deploy" 버튼 클릭

## 🐛 문제 해결

### Backend가 시작되지 않을 때
1. "Deployments" 탭에서 로그 확인
2. 환경 변수 확인 (`DATABASE_URL`, `JWT_SECRET`)
3. `package.json`의 `start` 스크립트 확인

### Frontend가 API를 호출하지 못할 때
1. `VITE_API_URL` 환경 변수 확인
2. Backend CORS 설정 확인
3. 브라우저 개발자 도구 → Network 탭 확인

### 데이터베이스 연결 오류
1. PostgreSQL 서비스가 실행 중인지 확인
2. `DATABASE_URL` 환경 변수가 자동으로 설정되었는지 확인
3. Backend 로그에서 연결 오류 메시지 확인

### 파일 업로드가 작동하지 않을 때
Railway는 파일 시스템이 임시적이므로:
1. 프로덕션에서는 S3, Cloudinary 등 외부 스토리지 사용 권장
2. 또는 Railway Volumes 사용 (유료)

## 💰 비용 관리

### Railway 무료 티어
- **월 $5 크레딧** (신용카드 등록 필요)
- **500시간 실행 시간**
- 소규모 프로젝트에 충분

### 비용 절감 팁
1. 개발 중에는 로컬 환경 사용
2. 사용하지 않는 서비스는 일시 중지
3. 로그 레벨 조정으로 리소스 절약

## 🔒 보안 체크리스트

- [ ] JWT_SECRET을 강력한 랜덤 문자열로 변경
- [ ] 관리자 비밀번호 변경
- [ ] CORS 설정 확인
- [ ] 환경 변수에 민감한 정보 저장하지 않기
- [ ] HTTPS 사용 (Railway는 자동 제공)
- [ ] 정기적인 백업 설정

## 📞 지원

문제가 발생하면:
1. Railway 문서: https://docs.railway.app
2. Railway Discord: https://discord.gg/railway
3. GitHub Issues에 문제 보고

---

**배포 완료!** 🎉

이제 출퇴근 관리 시스템을 사용할 수 있습니다!
