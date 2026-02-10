# 📱 핸드폰 본인인증 및 계정 찾기 기능 가이드

## 🎯 구현된 기능

### 1. **핸드폰 본인인증 (SMS 인증)**
- 회원가입 시 전화번호 인증 필수
- 6자리 인증번호 발송
- 5분 타이머 (만료 시 재전송 필요)
- 실시간 인증 상태 확인

### 2. **아이디 찾기**
- 이름 + 전화번호 인증으로 아이디 조회
- 여러 계정이 있을 경우 모두 표시
- 계정 생성일 및 역할 정보 제공

### 3. **비밀번호 재설정**
- 아이디 + 전화번호 인증으로 본인 확인
- 새 비밀번호 설정
- 10분 유효 토큰 사용

---

## 📂 파일 구조

### **백엔드**

```
backend/
├── routes/
│   ├── sms.js                    # SMS 인증 API
│   └── account-recovery.js       # 계정 찾기/복구 API
└── server.js                     # 라우트 등록
```

### **프론트엔드**

```
frontend/src/
├── components/
│   └── PhoneVerification.jsx    # 전화번호 인증 컴포넌트
├── pages/
│   ├── SignupV2.jsx             # 회원가입 (인증 통합)
│   ├── LoginV2.jsx              # 로그인 (찾기 링크 추가)
│   ├── FindUsername.jsx         # 아이디 찾기
│   └── ResetPassword.jsx        # 비밀번호 재설정
└── App.jsx                       # 라우팅 설정
```

---

## 🔧 API 엔드포인트

### **SMS 인증**

#### 1. 인증번호 전송
```http
POST /api/sms/send-code
Content-Type: application/json

{
  "phone": "01012345678",
  "purpose": "signup" | "find-id" | "reset-password"
}
```

**응답:**
```json
{
  "success": true,
  "message": "인증번호가 전송되었습니다.",
  "devCode": "123456"  // 개발용 (운영환경에서는 제거)
}
```

#### 2. 인증번호 확인
```http
POST /api/sms/verify-code
Content-Type: application/json

{
  "phone": "01012345678",
  "code": "123456"
}
```

**응답:**
```json
{
  "success": true,
  "message": "인증이 완료되었습니다.",
  "phone": "01012345678"
}
```

---

### **계정 찾기/복구**

#### 3. 아이디 찾기
```http
POST /api/account/find-username
Content-Type: application/json

{
  "name": "홍길동",
  "phone": "01012345678"
}
```

**응답:**
```json
{
  "success": true,
  "users": [
    {
      "username": "ho**ng",
      "fullUsername": "hong123",
      "role": "사업주",
      "createdAt": "2026-02-10T12:00:00.000Z"
    }
  ]
}
```

#### 4. 비밀번호 재설정 인증
```http
POST /api/account/verify-reset-password
Content-Type: application/json

{
  "username": "hong123",
  "phone": "01012345678"
}
```

**응답:**
```json
{
  "success": true,
  "resetToken": "base64_encoded_token",
  "userId": 123,
  "username": "hong123",
  "name": "홍길동"
}
```

#### 5. 비밀번호 재설정 실행
```http
POST /api/account/reset-password
Content-Type: application/json

{
  "userId": 123,
  "newPassword": "newpassword123",
  "resetToken": "base64_encoded_token"
}
```

**응답:**
```json
{
  "success": true,
  "message": "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요."
}
```

---

## 🎨 사용자 플로우

### **회원가입 플로우**

```
1. 회원가입 페이지 접속
   ↓
2. 기본 정보 입력 (아이디, 비밀번호, 이름)
   ↓
3. 전화번호 입력 → "인증번호 전송" 클릭
   ↓
4. SMS로 6자리 인증번호 수신 (개발용: 콘솔 출력)
   ↓
5. 인증번호 입력 → "확인" 클릭
   ↓
6. 인증 완료 ✅
   ↓
7. 나머지 정보 입력 후 회원가입 완료
```

### **아이디 찾기 플로우**

```
1. 로그인 페이지 → "아이디 찾기" 클릭
   ↓
2. 이름 입력
   ↓
3. 전화번호 입력 → 인증 완료
   ↓
4. "아이디 찾기" 클릭
   ↓
5. 등록된 아이디 표시
   ↓
6. "로그인하기" 또는 "비밀번호 재설정"
```

### **비밀번호 재설정 플로우**

```
1. 로그인 페이지 → "비밀번호 찾기" 클릭
   ↓
2. 아이디 입력
   ↓
3. 전화번호 입력 → 인증 완료
   ↓
4. "다음" 클릭 → 계정 확인
   ↓
5. 새 비밀번호 입력 (2회)
   ↓
6. "비밀번호 재설정" 클릭
   ↓
7. 재설정 완료 → 로그인 페이지로 이동
```

---

## 🔐 보안 기능

### 1. **인증번호 관리**
- 5분 유효시간
- 일회용 (사용 후 삭제)
- 전화번호당 1개만 활성화

### 2. **비밀번호 재설정 토큰**
- Base64 인코딩
- 10분 유효시간
- 사용자 ID + 타임스탬프 포함
- 일회용

### 3. **전화번호 검증**
- 형식 검증 (010-XXXX-XXXX)
- 중복 가입 방지
- 가입 여부 확인 (찾기 기능)

---

## 🚀 실제 SMS 연동 방법

현재는 **개발용 모드**로 콘솔에만 인증번호가 출력됩니다.

실제 운영환경에서는 SMS API를 연동해야 합니다:

### **추천 SMS 서비스**

1. **알리고 (Aligo)** - 저렴, 간단
2. **네이버 클라우드 SMS** - 안정적
3. **카카오 알림톡** - 높은 도달률
4. **Twilio** - 글로벌 서비스

### **연동 예시 (알리고)**

```javascript
// backend/routes/sms.js

import axios from 'axios';

async function sendSMS(phone, message) {
  try {
    const response = await axios.post('https://apis.aligo.in/send/', {
      key: process.env.ALIGO_API_KEY,
      user_id: process.env.ALIGO_USER_ID,
      sender: process.env.ALIGO_SENDER,
      receiver: phone,
      msg: message,
      testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y'
    });
    
    console.log('SMS 전송 성공:', response.data);
    return true;
  } catch (error) {
    console.error('SMS 전송 실패:', error);
    return false;
  }
}

// 인증번호 전송 시 호출
await sendSMS(cleanPhone, `[찬스 출퇴근] 인증번호: ${code}`);
```

### **환경 변수 설정**

```env
# .env 파일
ALIGO_API_KEY=your_api_key
ALIGO_USER_ID=your_user_id
ALIGO_SENDER=01012345678
```

---

## 📱 모바일 최적화

### **반응형 디자인**
- 모든 페이지 모바일 최적화
- 터치 친화적 버튼 크기
- 자동 포커스 및 키보드 타입 설정

### **UX 개선**
- 실시간 타이머 표시
- 인증 상태 시각적 피드백
- 에러 메시지 명확화
- 로딩 상태 표시

---

## 🧪 테스트 방법

### **개발 환경 테스트**

1. **회원가입 테스트**
```bash
# 서버 실행
cd backend && npm run dev

# 프론트엔드 실행
cd frontend && npm run dev

# 브라우저에서 http://localhost:5173/signup-v2 접속
```

2. **인증번호 확인**
- 콘솔에서 인증번호 확인
- 또는 응답 JSON의 `devCode` 필드 확인

3. **아이디/비밀번호 찾기 테스트**
- 로그인 페이지에서 링크 클릭
- 테스트 계정으로 진행

---

## 🐛 문제 해결

### **인증번호가 전송되지 않음**
```bash
# 백엔드 로그 확인
cd backend
npm run dev

# 콘솔에서 "📱 ============ SMS 인증번호 ============" 확인
```

### **인증번호가 만료됨**
- 5분 이내에 입력해야 함
- "재전송" 버튼 클릭하여 새 인증번호 받기

### **전화번호 형식 오류**
- 하이픈 자동 추가됨
- 010으로 시작하는 11자리 숫자만 가능

---

## 📊 데이터베이스

인증 정보는 **메모리에 임시 저장**됩니다.

실제 운영환경에서는 **Redis** 사용을 권장합니다:

```javascript
// Redis 연동 예시
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// 인증번호 저장 (5분 TTL)
await redis.setex(`sms:${phone}`, 300, JSON.stringify({
  code,
  purpose,
  verified: false
}));

// 인증번호 조회
const data = await redis.get(`sms:${phone}`);
const stored = JSON.parse(data);
```

---

## 🎉 완료!

이제 다음 기능들이 모두 구현되었습니다:

✅ 회원가입 시 핸드폰 본인인증  
✅ 아이디 찾기  
✅ 비밀번호 재설정  
✅ 로그인 페이지에 찾기 링크  
✅ 모바일 최적화  

---

## 📞 문의

추가 기능이나 개선사항이 필요하시면 언제든 문의해주세요!
