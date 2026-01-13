# 🚂 Railway 배포 단계별 가이드

## ✅ 현재 완료된 작업

- ✅ SQLite → PostgreSQL 전환 완료
- ✅ 환경 변수 설정 파일 생성
- ✅ 프로덕션 빌드 설정 완료
- ✅ Git 저장소 초기화 완료
- ✅ pg (PostgreSQL) 패키지 설치 완료

## 📋 다음 단계: Railway에 배포하기

### 1단계: GitHub 저장소 생성 및 푸시

#### 1-1. GitHub에 새 저장소 생성
1. https://github.com/new 접속
2. Repository name: `attendance-system` (또는 원하는 이름)
3. Public 또는 Private 선택
4. **README, .gitignore, license 추가하지 않음** (이미 있음)
5. "Create repository" 클릭

#### 1-2. GitHub에 코드 푸시
생성된 저장소 페이지에서 표시되는 명령어 중 "push an existing repository" 부분을 사용:

```bash
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
git push -u origin main
```

**주의**: `YOUR_USERNAME`을 실제 GitHub 사용자명으로 변경하세요!

---

### 2단계: Railway 프로젝트 생성

#### 2-1. Railway 로그인
1. https://railway.app 접속
2. "Login" 클릭
3. GitHub 계정으로 로그인
4. Railway에 GitHub 접근 권한 승인

#### 2-2. 새 프로젝트 생성
1. 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. 방금 생성한 저장소 선택
4. Railway가 자동으로 프로젝트 생성

---

### 3단계: PostgreSQL 데이터베이스 추가

#### 3-1. 데이터베이스 서비스 추가
1. 프로젝트 대시보드에서 "New" 클릭
2. "Database" 선택
3. "Add PostgreSQL" 클릭
4. 자동으로 생성됨 (이름: postgres)

#### 3-2. 데이터베이스 연결 확인
- Railway가 자동으로 `DATABASE_URL` 환경 변수를 생성
- Backend 서비스가 이를 자동으로 인식

---

### 4단계: Backend 서비스 설정

#### 4-1. Backend 서비스 선택
- 프로젝트 대시보드에서 Backend 서비스 카드 클릭

#### 4-2. 환경 변수 설정
1. "Variables" 탭 클릭
2. "New Variable" 클릭하여 다음 변수 추가:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=여기에-랜덤-문자열-32자-이상
FRONTEND_URL=https://your-frontend-url.up.railway.app
```

**JWT_SECRET 생성 방법:**
```bash
# 터미널에서 실행
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성된 문자열을 복사하여 JWT_SECRET 값으로 사용!

**주의**: `FRONTEND_URL`은 나중에 Frontend 도메인 생성 후 업데이트할 예정

#### 4-3. 빌드 설정
1. "Settings" 탭 클릭
2. "Build" 섹션에서:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install` (자동 감지됨)
   - **Start Command**: `npm start` (자동 감지됨)

#### 4-4. 배포 시작
1. "Deployments" 탭 클릭
2. "Deploy" 버튼 클릭 (또는 자동 배포 대기)
3. 로그에서 "PostgreSQL 데이터베이스에 연결되었습니다" 확인

#### 4-5. 도메인 생성
1. "Settings" 탭 클릭
2. "Networking" 섹션
3. "Generate Domain" 클릭
4. 생성된 URL 복사 (예: `https://attendance-backend-production.up.railway.app`)

---

### 5단계: Frontend 서비스 설정

#### 5-1. 새 서비스 추가
1. 프로젝트 대시보드로 돌아가기
2. "New" 클릭
3. "GitHub Repo" 선택
4. **같은 저장소** 선택 (attendance-system)

#### 5-2. 환경 변수 설정
1. Frontend 서비스 선택
2. "Variables" 탭 클릭
3. "New Variable" 클릭:

```
VITE_API_URL=https://your-backend-url.up.railway.app/api
```

**주의**: Backend에서 생성한 도메인 URL을 사용! (4-5단계에서 복사한 URL)

#### 5-3. 빌드 설정
1. "Settings" 탭 클릭
2. "Build" 섹션에서:
   - **Root Directory**: `frontend`
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`

#### 5-4. 배포 시작
1. "Deployments" 탭 클릭
2. "Deploy" 버튼 클릭
3. 빌드 완료 대기 (1-2분 소요)

#### 5-5. 도메인 생성
1. "Settings" 탭 클릭
2. "Networking" 섹션
3. "Generate Domain" 클릭
4. 생성된 URL 복사 (예: `https://attendance-frontend-production.up.railway.app`)

---

### 6단계: 환경 변수 최종 업데이트

#### 6-1. Backend 환경 변수 업데이트
1. Backend 서비스 선택
2. "Variables" 탭
3. `FRONTEND_URL` 찾기
4. Frontend 도메인으로 업데이트 (5-5단계에서 복사한 URL)
5. 저장 → 자동 재배포

#### 6-2. Frontend 환경 변수 확인
1. Frontend 서비스 선택
2. "Variables" 탭
3. `VITE_API_URL`이 Backend 도메인으로 올바르게 설정되었는지 확인

---

### 7단계: 배포 확인 및 테스트

#### 7-1. Backend API 테스트
브라우저에서 Backend URL 접속:
```
https://your-backend-url.up.railway.app/
```

다음과 같은 JSON 응답이 나와야 함:
```json
{
  "message": "출퇴근 관리 시스템 API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "workplaces": "/api/workplaces",
    "employees": "/api/employees",
    "attendance": "/api/attendance",
    "salary": "/api/salary"
  }
}
```

#### 7-2. Frontend 접속
브라우저에서 Frontend URL 접속:
```
https://your-frontend-url.up.railway.app/
```

로그인 페이지가 나타나야 함!

#### 7-3. 관리자 로그인
- **Username**: `admin`
- **Password**: `admin123`

로그인 성공 시 관리자 대시보드로 이동!

#### 7-4. 데이터베이스 확인
1. Railway 대시보드 → PostgreSQL 서비스
2. "Data" 탭 클릭
3. 다음 테이블들이 생성되었는지 확인:
   - users
   - workplaces
   - employee_details
   - salary_info
   - attendance

---

## 🎉 배포 완료!

### 📱 시스템 사용 시작

#### 1. 사업주 등록
1. Frontend URL에서 "회원가입" 클릭
2. 사업주 정보 입력
3. 관리자 계정으로 로그인하여 승인

#### 2. 사업장 등록
1. 사업주 계정으로 로그인
2. 사업장 정보 입력 (주소, 위경도)

#### 3. 직원 등록
1. "직원 관리" 탭
2. "직원 등록" 클릭
3. 직원 정보 및 급여 정보 입력

#### 4. 출퇴근 기록
1. 직원 계정으로 로그인
2. GPS 위치 권한 허용
3. "출근하기" / "퇴근하기" 버튼 사용

---

## 🔄 업데이트 배포 방법

코드를 수정한 후:

```bash
# 변경 사항 커밋
git add .
git commit -m "업데이트 내용"

# GitHub에 푸시
git push origin main
```

Railway가 자동으로 감지하고 재배포합니다!

---

## 🐛 문제 해결

### Backend가 시작되지 않을 때
1. Railway 대시보드 → Backend 서비스
2. "Deployments" 탭 → 최신 배포 클릭
3. "View Logs" 클릭하여 오류 확인
4. 환경 변수 확인 (`DATABASE_URL`, `JWT_SECRET`)

### Frontend에서 API 호출 실패
1. 브라우저 개발자 도구 (F12) → Console 탭
2. CORS 오류 확인
3. `VITE_API_URL`이 올바른지 확인
4. Backend의 `FRONTEND_URL`이 올바른지 확인

### 데이터베이스 연결 오류
1. PostgreSQL 서비스가 실행 중인지 확인
2. Backend 로그에서 "PostgreSQL 데이터베이스에 연결되었습니다" 메시지 확인
3. `DATABASE_URL` 환경 변수가 자동으로 설정되었는지 확인

---

## 💡 추가 팁

### 로그 확인
- Railway 대시보드 → 서비스 선택 → "Deployments" → "View Logs"

### 비용 관리
- Railway 무료 티어: 월 $5 크레딧
- 신용카드 등록 필요
- 소규모 프로젝트에 충분

### 보안
- JWT_SECRET을 강력한 랜덤 문자열로 설정
- 관리자 비밀번호 변경 (첫 로그인 후)
- 환경 변수에 민감한 정보 저장하지 않기

---

## 📞 지원

문제가 발생하면:
- Railway 문서: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

---

**배포 성공을 기원합니다! 🚀**
