# PWA 아이콘 생성 가이드

## 필요한 아이콘 크기

다음 크기의 PNG 아이콘이 필요합니다:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## 빠른 생성 방법

### 방법 1: 온라인 도구 사용 (가장 쉬움!)

1. **PWA Asset Generator** 사용:
   - https://progressier.com/pwa-icons-generator
   - 512x512 이미지 업로드
   - 모든 크기 자동 생성 및 다운로드

2. **Favicon Generator** 사용:
   - https://realfavicongenerator.net/
   - 이미지 업로드
   - "Generate favicons and HTML code" 클릭
   - 생성된 아이콘 다운로드

### 방법 2: 로고 디자인

간단한 로고를 만들고 싶다면:
- **Canva**: https://www.canva.com/
- 512x512 크기로 디자인
- 배경색: #667eea (보라색)
- 텍스트: "찬스" 또는 "C"
- 다운로드 후 위 온라인 도구로 모든 크기 생성

### 방법 3: AI 생성

1. ChatGPT/DALL-E에 요청:
   ```
   "출퇴근 관리 앱 아이콘 디자인, 
   보라색 배경(#667eea), 
   시계와 체크 아이콘, 
   심플하고 모던한 스타일"
   ```

2. 생성된 이미지 다운로드
3. 온라인 도구로 모든 크기 생성

## 임시 아이콘

개발 단계에서는 다음 사이트에서 무료 아이콘 사용 가능:
- https://www.flaticon.com/
- https://icons8.com/
- https://www.iconfinder.com/

검색어: "attendance", "clock", "check", "calendar"

## 아이콘 배치

생성된 아이콘을 `frontend/public/` 폴더에 넣으면 됩니다.

## 스크린샷 (선택사항)

앱 스토어 등록을 원한다면:
- screenshot-mobile.png (540x720)
- 실제 앱 화면을 캡처하여 사용
