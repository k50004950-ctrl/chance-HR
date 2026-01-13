# 출퇴근 관리 시스템 - Frontend

React + Vite 기반의 출퇴근 관리 시스템 프론트엔드입니다.

## 기능

### 관리자 (Admin)
- 사업장 등록, 수정, 삭제
- 사업주 계정 생성
- 전체 데이터 관리

### 사업주 (Owner)
- 자신의 사업장 직원 관리
- 직원 등록, 수정, 삭제
- 급여 정보 설정
- 출퇴근 기록 확인
- 급여 계산

### 직원 (Employee)
- 위치 기반 출퇴근 체크
- 내 출퇴근 기록 조회
- 급여 정보 확인

## 설치 및 실행

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

### 3. 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

## 주요 기술

- **React 18** - UI 라이브러리
- **React Router** - 라우팅
- **Axios** - HTTP 클라이언트
- **Vite** - 빌드 도구
- **Context API** - 상태 관리

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/      # 재사용 가능한 컴포넌트
│   │   └── Header.jsx
│   ├── context/         # Context API
│   │   └── AuthContext.jsx
│   ├── pages/           # 페이지 컴포넌트
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── OwnerDashboard.jsx
│   │   └── EmployeeDashboard.jsx
│   ├── services/        # API 서비스
│   │   └── api.js
│   ├── App.jsx          # 메인 앱 컴포넌트
│   ├── main.jsx         # 엔트리 포인트
│   └── index.css        # 글로벌 스타일
├── index.html
├── package.json
└── vite.config.js
```

## API 연동

백엔드 API는 `http://localhost:5000`에서 실행되어야 합니다.

Vite의 프록시 설정으로 `/api` 경로의 요청이 자동으로 백엔드로 전달됩니다.

## 위치 기반 출퇴근

직원이 출퇴근 버튼을 클릭하면:
1. 브라우저의 Geolocation API로 현재 위치를 가져옵니다
2. 서버에서 사업장 범위 내에 있는지 확인합니다
3. 범위 내에 있으면 출퇴근이 기록됩니다

⚠️ **주의**: 위치 권한을 허용해야 합니다.

## 반응형 디자인

모바일과 데스크톱 모두에서 사용 가능하도록 반응형으로 디자인되었습니다.

## 브라우저 지원

- Chrome (권장)
- Firefox
- Safari
- Edge

## 라이선스

MIT
