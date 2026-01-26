# Layout 리팩터링 문서

## 📁 생성된 Layout 컴포넌트

### 1. BaseLayout.jsx
**경로**: `frontend/src/layouts/BaseLayout.jsx`

**책임**:
- Header 표시
- 공통 컨테이너 구조

**사용법**:
```jsx
<BaseLayout user={user}>
  <YourContent />
</BaseLayout>
```

---

### 2. OwnerLayout.jsx
**경로**: `frontend/src/layouts/OwnerLayout.jsx`

**책임**:
- 네비게이션 (PC: 상단 탭, Mobile: 하단 탭바)
- 반응형 UI 전환 (useIsMobile hook)
- 더보기 드롭다운 메뉴

**Props**:
```typescript
{
  activeTab: string,      // 현재 활성 탭
  onTabChange: (tab) => void,  // 탭 변경 콜백
  children: ReactNode     // 컨텐츠
}
```

**탭 목록**:
- `dashboard`: 메인
- `attendance`: 오늘 출근
- `salary-slips`: 급여 보내기
- `calendar`: 출근 달력 (더보기)
- `employees`: 직원 관리 (더보기)
- `salary`: 급여 계산 (더보기)
- `retirement`: 퇴사 처리 (더보기)
- `documents`: 서류 보관함 (더보기)
- `community`: 소통방 (더보기)
- `settings`: 설정 (더보기)

**사용법**:
```jsx
<OwnerLayout activeTab={activeTab} onTabChange={setActiveTab}>
  <YourDashboardContent />
</OwnerLayout>
```

---

### 3. EmployeeLayout.jsx
**경로**: `frontend/src/layouts/EmployeeLayout.jsx`

**책임**:
- 직원 전용 네비게이션
- 모바일 최적화

**탭 목록**:
- `attendance`: 출퇴근
- `salary`: 급여명세서
- `announcements`: 공지사항
- `community`: 소통방

---

### 4. AdminLayout.jsx
**경로**: `frontend/src/layouts/AdminLayout.jsx`

**책임**:
- 관리자 전용 네비게이션

**탭 목록**:
- `owners`: 사업주 목록
- `workplaces`: 사업장 목록
- `insurance`: 4대보험 요율
- `announcements`: 공지사항
- `community`: 커뮤니티

---

## 🔄 마이그레이션 계획

### Phase 1: Wrapper 적용 (최소 변경)
1. Dashboard 컴포넌트에 Layout을 최상위로 wrap
2. 기존 네비게이션 JSX는 그대로 유지 (중복 허용)
3. 테스트 → 기능 100% 동작 확인

### Phase 2: 중복 제거
1. 기존 네비게이션 JSX 제거
2. Layout으로 네비게이션 위임
3. 테스트 → 기능 100% 동작 확인

### Phase 3: 상태 정리
1. 불필요한 상태 제거 (showMoreMenu 등)
2. CSS 정리
3. 최종 테스트

---

## ✅ 완료된 작업

- [x] BaseLayout 생성
- [x] OwnerLayout 생성 (PC + Mobile)
- [x] EmployeeLayout 생성
- [x] AdminLayout 생성

## 📋 남은 작업

- [ ] OwnerDashboard에 OwnerLayout 적용
- [ ] EmployeeDashboard에 EmployeeLayout 적용
- [ ] AdminDashboard에 AdminLayout 적용
- [ ] 기존 네비게이션 JSX 제거
- [ ] 회귀 테스트 실행
- [ ] 모바일 UI 추가 개선

---

## 🎯 핵심 원칙

### DO ✅
- Layout은 UI 구조만 담당
- Dashboard는 비즈니스 로직만 담당
- 작은 변경 → 테스트 → 커밋

### DON'T ❌
- 도메인 로직 변경 금지
- API 계약 변경 금지
- 한 번에 큰 변경 금지

---

## 🧪 테스트 체크리스트

각 마이그레이션 후 다음을 확인:

### 기능 테스트
- [ ] 로그인 → 대시보드 진입
- [ ] 탭 전환 정상 작동
- [ ] 직원 추가/수정
- [ ] 출근 기록 조회
- [ ] 급여 계산
- [ ] 모바일: 하단 탭바 표시
- [ ] 모바일: 탭 전환 정상

### UI 테스트
- [ ] PC: 네비게이션 표시
- [ ] PC: 더보기 드롭다운 작동
- [ ] Mobile: 하단 탭바 표시
- [ ] Mobile: 텍스트 줄바꿈 정상
- [ ] Mobile: 터치 영역 충분

### 회귀 테스트
- [ ] 스모크 테스트 스크립트 실행
- [ ] 통과율 100% 확인
- [ ] 콘솔 에러 없음

---

## 📊 진행 상태

| Dashboard | Layout 생성 | Wrapper 적용 | 중복 제거 | 테스트 완료 |
|-----------|-------------|--------------|-----------|-------------|
| Owner     | ✅          | ⏳           | ⏳        | ⏳          |
| Employee  | ✅          | ⏳           | ⏳        | ⏳          |
| Admin     | ✅          | ⏳           | ⏳        | ⏳          |

**현재 진행률**: 25% (Layout 생성 완료)

**다음 단계**: OwnerDashboard에 OwnerLayout wrapper 적용
