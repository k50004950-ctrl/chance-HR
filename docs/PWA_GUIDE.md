# PWA (Progressive Web App) 전환 가이드

## 📱 PWA란?

웹사이트를 **모바일 앱처럼** 사용할 수 있게 만드는 기술입니다.

### ✅ 장점
- 홈 화면에 앱 아이콘 추가
- 전체 화면 실행 (브라우저 UI 없음)
- 오프라인 동작 가능
- 푸시 알림 수신
- 앱스토어 없이 설치
- 자동 업데이트
- 네이티브 앱보다 가벼움

---

## 🚀 설정 완료!

PWA 기본 설정이 완료되었습니다:
- ✅ `manifest.json` - 앱 정보
- ✅ `sw.js` - Service Worker (캐싱, 오프라인)
- ✅ `index.html` - PWA 메타 태그

---

## 📋 남은 작업

### 1️⃣ 앱 아이콘 생성 (필수)

현재 아이콘이 없어서 설치 시 기본 아이콘이 표시됩니다.

**빠른 생성 방법:**
1. https://progressier.com/pwa-icons-generator 접속
2. 로고 이미지 업로드 (512x512 권장)
3. 모든 크기 자동 생성 및 다운로드
4. `frontend/public/` 폴더에 복사

**필요한 파일:**
```
frontend/public/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

자세한 내용은 `frontend/public/PWA_ICONS_README.md` 참고

### 2️⃣ 빌드 및 배포

```bash
cd frontend
npm run build
```

아이콘 파일이 `frontend/public/`에 있으면 자동으로 빌드에 포함됩니다.

### 3️⃣ HTTPS 필수

PWA는 HTTPS에서만 작동합니다:
- ✅ Railway 배포: 자동으로 HTTPS 제공
- ❌ localhost: HTTP로 테스트 가능 (개발 모드)

---

## 📱 사용자 설치 방법

### Android (Chrome/Samsung Internet)

1. 웹사이트 접속
2. 주소창 오른쪽 **"⋮"** 메뉴 클릭
3. **"홈 화면에 추가"** 또는 **"앱 설치"** 선택
4. 홈 화면에 아이콘 추가됨

### iOS (Safari)

1. 웹사이트 접속
2. 하단 **"공유"** 버튼 (📤) 클릭
3. **"홈 화면에 추가"** 선택
4. 홈 화면에 아이콘 추가됨

### PC (Chrome/Edge)

1. 웹사이트 접속
2. 주소창 오른쪽 **"⊕"** 또는 **"설치"** 버튼 클릭
3. 독립 창으로 실행됨

---

## 🔔 푸시 알림 (이미 구현됨!)

현재 시스템에 푸시 알림이 구현되어 있습니다:
- ✅ Service Worker에 푸시 이벤트 핸들러 추가됨
- ✅ 백엔드 `/api/push` 엔드포인트 존재
- ✅ 사업주 대시보드에 알림 설정 있음

**작동 방식:**
1. 사용자가 앱 설치
2. 알림 권한 요청
3. 백엔드로 구독 정보 전송
4. 서버에서 푸시 알림 발송

---

## 📊 PWA 기능

### 이미 지원되는 기능

- ✅ 홈 화면 추가
- ✅ 전체 화면 실행
- ✅ 오프라인 캐싱 (Service Worker)
- ✅ 푸시 알림
- ✅ 백그라운드 동기화
- ✅ 자동 업데이트

### 앱처럼 동작

- ✅ 앱 아이콘 클릭 → 독립 창 실행
- ✅ 브라우저 UI 없음 (전체 화면)
- ✅ 멀티태스킹 화면에 앱 이름 표시
- ✅ iOS/Android 네이티브 느낌

---

## 🛠️ 고급 설정 (선택사항)

### 1. 앱 설치 프롬프트 커스터마이징

사용자에게 앱 설치를 권장하는 UI 추가:

```jsx
// App.jsx 또는 메인 컴포넌트에 추가
const [installPrompt, setInstallPrompt] = useState(null);

useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setInstallPrompt(e);
  });
}, []);

const handleInstall = () => {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        console.log('사용자가 앱 설치 수락');
      }
      setInstallPrompt(null);
    });
  }
};

// UI에 설치 버튼 표시
{installPrompt && (
  <button onClick={handleInstall}>
    📱 앱 설치하기
  </button>
)}
```

### 2. 오프라인 페이지

네트워크 없을 때 표시할 페이지:

```html
<!-- frontend/public/offline.html -->
<!DOCTYPE html>
<html>
<head>
  <title>오프라인</title>
</head>
<body>
  <h1>📡 인터넷 연결 없음</h1>
  <p>인터넷 연결을 확인하고 다시 시도해주세요.</p>
</body>
</html>
```

`sw.js`에 추가:
```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('/offline.html');
    })
  );
});
```

### 3. 배경 동기화

오프라인에서 작성한 데이터를 온라인 시 자동 전송:

```js
// 출퇴근 기록을 오프라인에서 저장 후 자동 전송
navigator.serviceWorker.ready.then((registration) => {
  registration.sync.register('sync-attendance');
});
```

---

## 🎯 앱스토어 등록 (선택사항)

### Google Play Store (TWA)

PWA를 구글 플레이 스토어에 등록할 수 있습니다:

1. **Bubblewrap 사용**:
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest https://your-domain.com/manifest.json
   bubblewrap build
   ```

2. 생성된 APK를 Play Store에 업로드

3. 필요한 것:
   - Google Play 개발자 계정 ($25)
   - 디지털 서명 키
   - 스크린샷, 설명 등

### App Store (iOS)

iOS는 PWA를 앱스토어에 직접 등록할 수 없지만:
- Safari에서 홈 화면 추가로 사용 가능
- 또는 Capacitor/Cordova로 네이티브 앱 래핑

---

## 🔍 테스트 방법

### Lighthouse (Chrome DevTools)

1. Chrome에서 F12 (개발자 도구)
2. **"Lighthouse"** 탭 선택
3. **"Progressive Web App"** 체크
4. **"Analyze page load"** 클릭
5. PWA 점수 및 개선사항 확인

### 체크리스트

- ✅ HTTPS 사용
- ✅ manifest.json 존재
- ✅ Service Worker 등록
- ✅ 아이콘 192x192, 512x512
- ✅ 모바일 반응형
- ✅ 오프라인 동작
- ✅ 설치 가능

---

## 📈 성능 최적화

### 캐싱 전략

현재 `sw.js`에 구현된 전략:
- **API 요청**: Network First (항상 최신 데이터)
- **정적 파일**: Cache First (빠른 로딩)
- **오프라인**: 캐시된 페이지 반환

### 최적화 팁

1. **이미지 최적화**:
   - WebP 포맷 사용
   - 적절한 크기로 리사이즈
   - Lazy loading

2. **코드 스플리팅**:
   - React.lazy()로 컴포넌트 분할
   - 라우트별 번들 분리

3. **캐시 버전 관리**:
   - 배포 시 캐시 이름 업데이트 (`v1` → `v2`)

---

## 🐛 문제 해결

### Q. 설치 버튼이 안 보여요
A. HTTPS 필수, manifest.json 확인, Service Worker 등록 확인

### Q. 아이콘이 안 나와요
A. `frontend/public/` 폴더에 아이콘 파일 있는지 확인

### Q. 오프라인에서 안 돼요
A. 한 번 이상 접속해야 캐시 생성됨

### Q. 업데이트가 안 돼요
A. Service Worker 업데이트 대기 중일 수 있음
   - 브라우저 닫고 다시 열기
   - 또는 새로고침 프롬프트 추가

### Q. iOS에서 푸시 알림 안 와요
A. iOS Safari는 PWA 푸시 알림 미지원
   - 웹 알림만 가능
   - 네이티브 앱이 필요하면 Capacitor 사용

---

## 📚 추가 자료

- [PWA 공식 문서](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/ko/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/ko/docs/Web/Manifest)
- [Push API](https://developer.mozilla.org/ko/docs/Web/API/Push_API)

---

## 🎉 완성!

아이콘만 추가하면 PWA가 완성됩니다!

**다음 단계:**
1. 아이콘 생성 및 추가
2. `npm run build`
3. 배포
4. 모바일에서 "홈 화면에 추가" 테스트
5. 사용자에게 앱 설치 안내

**최종 업데이트:** 2026년 2월
