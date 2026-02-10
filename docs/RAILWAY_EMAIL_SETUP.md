# 🚂 Railway 이메일 설정 상세 가이드

Railway에 이메일 환경 변수를 등록하는 방법을 단계별로 설명합니다.

---

## 📋 사전 준비

Railway 설정 전에 먼저 Gmail 앱 비밀번호를 준비하세요!

### ✅ 필요한 정보

1. **Gmail 주소**: `your-email@gmail.com`
2. **Gmail 앱 비밀번호**: 16자리 (예: `abcd efgh ijkl mnop`)

> 💡 Gmail 앱 비밀번호 생성 방법은 `EMAIL_SETUP_GUIDE.md` 참고

---

## 🚀 Railway 환경 변수 설정 (상세)

### 1️⃣ Railway 대시보드 접속

1. **Railway 웹사이트 접속**
   ```
   https://railway.app/
   ```

2. **로그인**
   - GitHub 계정으로 로그인
   - 또는 이메일로 로그인

3. **프로젝트 선택**
   - 대시보드에서 `찬스 출퇴근 관리` 프로젝트 클릭

---

### 2️⃣ Variables 탭 열기

**방법 1: 프로젝트 설정에서**
1. 프로젝트를 클릭하면 서비스 목록이 나옴
2. 백엔드 서비스 이름 클릭 (예: `backend` 또는 자동 생성된 이름)
3. 상단 탭에서 **"Variables"** 클릭

**방법 2: 빠른 접근**
1. 프로젝트 페이지 오른쪽 상단
2. **"Settings"** 또는 **"Variables"** 직접 클릭

---

### 3️⃣ 환경 변수 추가

#### 📧 EMAIL_USER 추가

1. **"New Variable" 버튼 클릭** (또는 "+ Add Variable")

2. **Variable Name 입력:**
   ```
   EMAIL_USER
   ```

3. **Variable Value 입력:**
   ```
   your-email@gmail.com
   ```
   > 예시: `chance.company@gmail.com`

4. **"Add" 버튼 클릭**

---

#### 🔑 EMAIL_PASS 추가

1. **다시 "New Variable" 버튼 클릭**

2. **Variable Name 입력:**
   ```
   EMAIL_PASS
   ```

3. **Variable Value 입력:**
   ```
   abcdefghijklmnop
   ```
   > ⚠️ **주의**: 공백 **제거**하고 입력!
   > 
   > ❌ 잘못된 예: `abcd efgh ijkl mnop`  
   > ✅ 올바른 예: `abcdefghijklmnop`

4. **"Add" 버튼 클릭**

---

### 4️⃣ 환경 변수 확인

Variables 탭에서 다음 두 개가 보여야 합니다:

```
✅ EMAIL_USER = your-email@gmail.com
✅ EMAIL_PASS = **************** (보안상 숨겨짐)
```

---

### 5️⃣ 자동 재배포 확인

환경 변수를 추가하면 **Railway가 자동으로 서비스를 재배포**합니다.

**재배포 확인 방법:**

1. **"Deployments"** 탭 클릭
2. 최신 배포 상태 확인:
   - 🟡 **"Building"** → 빌드 중
   - 🟡 **"Deploying"** → 배포 중
   - 🟢 **"Success"** → 배포 완료 ✅
   - 🔴 **"Failed"** → 배포 실패 ❌

3. 배포 완료까지 **2-3분** 대기

---

## 🧪 이메일 전송 테스트

### 1️⃣ 웹사이트에서 테스트

1. **배포된 사이트 접속**
   ```
   https://your-project.railway.app
   ```

2. **회원가입 페이지로 이동**

3. **이메일 인증 시도:**
   - 이메일 주소 입력
   - "인증번호 전송" 버튼 클릭

4. **이메일 수신 확인:**
   - Gmail 수신함 확인
   - 제목: `[찬스 출퇴근] 회원가입 이메일 인증번호입니다.`

---

### 2️⃣ Railway 로그 확인

**이메일 전송 확인 방법:**

1. Railway 대시보드
2. 서비스 선택
3. **"Logs"** 탭 클릭
4. 로그에서 다음 메시지 확인:

**✅ 성공 시:**
```
✅ Verification email sent to test@email.com for signup
```

**❌ 실패 시:**
```
❌ 이메일 인증번호 전송 오류: Invalid login: 535-5.7.8 Username and Password not accepted
```

---

## 🚨 문제 해결

### ❌ "Invalid login" 에러

**증상:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**원인:**
- 잘못된 Gmail 주소
- 잘못된 앱 비밀번호
- 공백이 포함된 앱 비밀번호

**해결방법:**

1. **Gmail 주소 확인**
   - 오타가 없는지 확인
   - `@gmail.com`이 정확한지 확인

2. **앱 비밀번호 재생성**
   - Google 계정 → 보안 → 앱 비밀번호
   - 기존 비밀번호 삭제
   - 새 앱 비밀번호 생성
   - **16자리 숫자/문자만 복사** (공백 제거!)

3. **Railway 환경 변수 수정**
   - Variables 탭
   - `EMAIL_PASS` 클릭
   - 새 앱 비밀번호 입력 (공백 제거)
   - "Update" 클릭

4. **재배포 대기** (2-3분)

---

### ⚠️ 이메일이 전송되지 않음

**확인 사항:**

1. **환경 변수 이름 확인**
   ```
   ✅ EMAIL_USER (대문자!)
   ✅ EMAIL_PASS (대문자!)
   
   ❌ email_user (소문자 - 작동 안 함)
   ❌ Email_User (혼합 - 작동 안 함)
   ```

2. **환경 변수 값 확인**
   - Variables 탭에서 값이 제대로 입력되었는지 확인
   - `EMAIL_PASS`를 클릭하면 실제 값을 볼 수 있음

3. **Gmail 2단계 인증 확인**
   - Google 계정 → 보안
   - 2단계 인증이 **"사용"** 상태인지 확인

---

### 🔄 환경 변수가 적용 안 됨

**증상:**
- 환경 변수를 추가했는데도 이메일이 전송 안 됨

**해결방법:**

1. **수동 재배포**
   - Deployments 탭
   - 최신 배포 우측의 **"..." (더보기)** 클릭
   - **"Redeploy"** 클릭

2. **서비스 재시작**
   - Settings 탭
   - **"Restart Service"** 버튼 클릭

3. **배포 완료 대기** (2-3분)

---

## 📸 스크린샷 가이드

### Variables 탭 예시

```
┌─────────────────────────────────────────────────┐
│  Variables                                      │
├─────────────────────────────────────────────────┤
│  + New Variable                                 │
├─────────────────────────────────────────────────┤
│  EMAIL_USER                                     │
│  your-email@gmail.com                    [Edit] │
├─────────────────────────────────────────────────┤
│  EMAIL_PASS                                     │
│  ****************                        [Edit] │
├─────────────────────────────────────────────────┤
│  JWT_SECRET                                     │
│  ****************                        [Edit] │
├─────────────────────────────────────────────────┤
│  NODE_ENV                                       │
│  production                              [Edit] │
└─────────────────────────────────────────────────┘
```

---

## ✅ 설정 완료 체크리스트

설정이 완료되면 다음을 확인하세요:

- [ ] Railway Variables 탭에 `EMAIL_USER` 추가됨
- [ ] Railway Variables 탭에 `EMAIL_PASS` 추가됨
- [ ] 앱 비밀번호에 **공백이 없음**
- [ ] 재배포가 **"Success"** 상태
- [ ] 웹사이트에서 이메일 인증 테스트 성공
- [ ] Gmail로 인증번호 수신 확인
- [ ] Railway Logs에서 "✅ Verification email sent" 확인

---

## 🎯 빠른 설정 요약

1. **Gmail 앱 비밀번호 생성** (16자리)
2. **Railway 프로젝트 → Variables 탭**
3. **환경 변수 추가:**
   - `EMAIL_USER` = Gmail 주소
   - `EMAIL_PASS` = 앱 비밀번호 (공백 제거!)
4. **재배포 대기** (2-3분)
5. **웹사이트에서 테스트**

---

## 💡 추가 팁

### 환경 변수 보안

- ✅ Railway Variables는 암호화되어 저장됨
- ✅ Logs에 비밀번호가 노출되지 않음
- ⚠️ 팀원과 공유 시 주의

### 여러 환경 관리

Railway에서 **Production / Staging** 환경을 분리하려면:

1. 각 환경마다 다른 Gmail 계정 사용
2. 또는 같은 Gmail에서 여러 앱 비밀번호 생성
3. 환경별로 다른 `EMAIL_USER`, `EMAIL_PASS` 설정

---

## 📞 문의

Railway 설정에 문제가 있으면:
- 카카오톡: "찬스컴퍼니"
- 이메일: K50004950@gmail.com

---

**설정 완료 후 꼭 테스트하세요!** ✅
