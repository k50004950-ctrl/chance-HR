# 📧 이메일 인증 설정 가이드

이메일 인증 기능을 사용하기 위한 설정 가이드입니다.

---

## 🔧 Gmail SMTP 설정 방법

### 1️⃣ Gmail 계정 준비

1. Gmail 계정 로그인
2. **Google 계정 관리** 페이지로 이동

### 2️⃣ 2단계 인증 활성화

1. 왼쪽 메뉴에서 **"보안"** 클릭
2. **"2단계 인증"** 찾기
3. **"2단계 인증 사용"** 클릭하여 활성화

### 3️⃣ 앱 비밀번호 생성

1. 2단계 인증 활성화 후, 다시 **"보안"** 페이지로 이동
2. **"앱 비밀번호"** 검색 또는 찾기
3. **"앱 비밀번호"** 클릭
4. 앱 선택: **"기타(맞춤 이름)"** 선택
5. 이름 입력: `찬스출퇴근관리` 입력
6. **"생성"** 클릭
7. **16자리 비밀번호** 복사 (공백 포함 또는 제외)

### 4️⃣ backend/.env 파일 설정

`backend/.env` 파일을 열고 다음 항목을 추가/수정하세요:

\`\`\`env
# 이메일 설정 (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # 16자리 앱 비밀번호 (공백 포함 가능)
\`\`\`

**예시:**
\`\`\`env
EMAIL_USER=chance.company@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
\`\`\`

---

## 🧪 이메일 전송 테스트

### 로컬 테스트

1. 백엔드 서버 실행:
   \`\`\`bash
   cd backend
   npm start
   \`\`\`

2. 서버 로그에서 확인:
   \`\`\`
   ✅ 이메일 서버 연결 성공
   \`\`\`

3. 회원가입 페이지에서 이메일 인증 테스트
4. 이메일 수신함에서 인증번호 확인

---

## 🚨 문제 해결

### "이메일 전송에 실패했습니다"

**원인:**
- EMAIL_USER 또는 EMAIL_PASS가 설정되지 않았거나 잘못됨
- 2단계 인증이 활성화되지 않음
- 앱 비밀번호가 아닌 일반 비밀번호 사용

**해결방법:**
1. `.env` 파일에서 EMAIL_USER와 EMAIL_PASS 확인
2. Gmail 2단계 인증 활성화 확인
3. 앱 비밀번호를 새로 생성하여 다시 입력
4. 백엔드 서버 재시작

### "Invalid login" 에러

**원인:**
- 잘못된 Gmail 주소 또는 앱 비밀번호

**해결방법:**
1. Gmail 주소가 정확한지 확인 (오타 확인)
2. 앱 비밀번호를 새로 생성
3. 공백 포함 여부 확인 (공백 있어도 작동함)

### 이메일이 스팸함으로 가는 경우

**해결방법:**
1. 스팸함에서 "스팸 아님"으로 표시
2. "찬스 출퇴근 관리" 발신자를 연락처에 추가

---

## 🌐 Railway 배포 시 설정

Railway 대시보드에서 환경 변수 설정:

1. Railway 프로젝트 선택
2. **"Variables"** 탭 클릭
3. 다음 환경 변수 추가:
   - `EMAIL_USER`: Gmail 주소
   - `EMAIL_PASS`: 16자리 앱 비밀번호

---

## 📋 개발 모드

이메일 설정이 없어도 개발 모드로 작동합니다:

- ✅ 인증번호가 생성됨
- ✅ alert 창으로 인증번호 표시
- ✅ 콘솔에 인증번호 출력
- ❌ 실제 이메일은 전송되지 않음

**개발 모드 사용 시:**
\`\`\`env
# EMAIL_USER와 EMAIL_PASS를 주석 처리하거나 비워두기
# EMAIL_USER=
# EMAIL_PASS=
\`\`\`

---

## ✅ 권장 사항

### 운영 환경 (Production)

- ✅ Gmail 앱 비밀번호 사용
- ✅ 전용 Gmail 계정 생성 권장
- ✅ Railway 환경 변수로 설정
- ✅ 2단계 인증 필수

### 개발 환경 (Development)

- ✅ 개발 모드 사용 (이메일 설정 없이)
- ✅ alert 창으로 인증번호 확인
- ✅ 콘솔 로그 확인

---

## 📱 대안: 다른 이메일 서비스

Gmail 대신 다른 SMTP 서비스를 사용하려면 `backend/services/emailService.js` 수정:

### Naver Mail
\`\`\`javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.naver.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
\`\`\`

### Daum Mail
\`\`\`javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.daum.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
\`\`\`

---

## 🔒 보안 주의사항

- ⚠️ `.env` 파일을 Git에 커밋하지 마세요
- ⚠️ 앱 비밀번호를 공개하지 마세요
- ⚠️ 코드에 직접 비밀번호를 하드코딩하지 마세요
- ✅ Railway 환경 변수로 안전하게 관리하세요

---

## 📞 문의

이메일 설정에 문제가 있으면:
- 카카오톡: "찬스컴퍼니"
- 이메일: K50004950@gmail.com
