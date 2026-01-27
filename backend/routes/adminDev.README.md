# ⚠️ 임시 개발자용 관리자 API

**목적**: PC 회귀 테스트를 위한 test_owner 계정 생성/리셋

**⚠️ 주의**: 이 API는 임시 개발용이며, 프로덕션 배포 전에 반드시 삭제하거나 비활성화해야 합니다!

---

## 📋 API 목록

### 1. POST /api/admin/dev/reset-test-owner

test_owner 계정 생성 또는 비밀번호 리셋

**권한**: SUPER_ADMIN만 호출 가능

**응답**:
- 기존 계정이 있으면: 비밀번호를 `Test!1234`로 리셋
- 계정이 없으면: 신규 생성 (사업장, 직원, 출근 기록 포함)

---

### 2. GET /api/admin/dev/test-owner-info

test_owner 계정 정보 조회

**권한**: SUPER_ADMIN만 호출 가능

---

## 🔧 사용 방법

### Step 1: admin 계정으로 로그인하여 JWT 토큰 획득

```bash
# 로컬 환경
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "!Q1538215a"
  }'

# 프로덕션 환경
curl -X POST https://chance-hr-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "!Q1538215a"
  }'
```

**응답 예시**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

`token` 값을 복사하여 다음 단계에서 사용합니다.

---

### Step 2: test_owner 계정 생성/리셋

```bash
# ⚠️ <YOUR_JWT_TOKEN>을 위에서 복사한 토큰으로 교체하세요!

# 로컬 환경
curl -X POST http://localhost:5000/api/admin/dev/reset-test-owner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# 프로덕션 환경
curl -X POST https://chance-hr-production.up.railway.app/api/admin/dev/reset-test-owner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**신규 생성 시 응답 예시**:
```json
{
  "status": "created",
  "message": "test_owner 계정이 생성되었습니다.",
  "username": "test_owner",
  "password": "Test!1234",
  "userId": 123,
  "workplaceId": 456,
  "employeeId": 789,
  "details": {
    "workplace": "테스트 사업장",
    "employee": "김직원 (1명)",
    "attendance": "오늘 출근 기록 1건 (미퇴근)"
  }
}
```

**비밀번호 리셋 시 응답 예시**:
```json
{
  "status": "reset",
  "message": "test_owner 계정의 비밀번호가 Test!1234로 리셋되었습니다.",
  "userId": 123,
  "username": "test_owner"
}
```

---

### Step 3: test_owner로 로그인 테스트

```bash
# 로컬 환경
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_owner",
    "password": "Test!1234"
  }'

# 프로덕션 환경
curl -X POST https://chance-hr-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_owner",
    "password": "Test!1234"
  }'
```

**성공 응답 예시**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "test_owner",
    "role": "OWNER",
    "name": "테스터(사업주)"
  }
}
```

---

## 🧪 test_owner 계정 정보 조회

```bash
# ⚠️ <YOUR_JWT_TOKEN>을 admin JWT 토큰으로 교체하세요!

# 로컬 환경
curl -X GET http://localhost:5000/api/admin/dev/test-owner-info \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# 프로덕션 환경
curl -X GET https://chance-hr-production.up.railway.app/api/admin/dev/test-owner-info \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**응답 예시**:
```json
{
  "exists": true,
  "user": {
    "id": 123,
    "username": "test_owner",
    "role": "OWNER",
    "name": "테스터(사업주)",
    "email": "test_owner@test.com",
    "phone": "01012345678"
  },
  "workplaces": [
    {
      "id": 456,
      "name": "테스트 사업장",
      "address": "서울특별시 강남구 테헤란로 123"
    }
  ],
  "employeeCount": 1
}
```

---

## 🎯 PC 회귀 테스트 시나리오

1. ✅ 위 Step 2를 실행하여 test_owner 계정 생성/리셋
2. ✅ 브라우저에서 `https://chance-hr-production.up.railway.app` 접속
3. ✅ `test_owner / Test!1234`로 로그인
4. ✅ PC 화면(1920x1080)에서 회귀 테스트 체크리스트 실행

---

## 📝 PowerShell용 명령어 (Windows)

```powershell
# Step 1: admin 로그인
$response = Invoke-RestMethod -Uri "https://chance-hr-production.up.railway.app/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"!Q1538215a"}'

$token = $response.token
Write-Host "JWT Token: $token"

# Step 2: test_owner 생성/리셋
Invoke-RestMethod -Uri "https://chance-hr-production.up.railway.app/api/admin/dev/reset-test-owner" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json"

# Step 3: test_owner 로그인 테스트
Invoke-RestMethod -Uri "https://chance-hr-production.up.railway.app/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username":"test_owner","password":"Test!1234"}'
```

---

## ⚠️ 삭제 체크리스트

프로덕션 배포 전 반드시 확인:

- [ ] `backend/routes/adminDev.js` 파일 삭제
- [ ] `backend/server.js`에서 `adminDevRoutes` import 및 `app.use` 제거
- [ ] 이 README 파일 삭제

---

**작성일**: 2026-01-28  
**작성자**: AI Assistant  
**목적**: PC 회귀 테스트용 임시 API
