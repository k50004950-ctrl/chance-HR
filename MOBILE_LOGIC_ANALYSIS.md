# 🔍 모바일 분기 기능 로직 혼입 분석 보고서

## 📊 분석 개요

**목적**: `OwnerDashboard.jsx`에서 `isMobile` 조건부 분기에 기능 로직이 섞여있는지 진단

**파일**: `frontend/src/pages/OwnerDashboard.jsx` (약 8,273 lines)

**분석 범위**: 출근 / 급여 / 직원 / 알림 / 설정

---

## ⚠️ 주요 문제점 요약

### 현재 구조의 문제

```
OwnerDashboard.jsx (8,273 lines)
├── 🔴 모든 로직이 단일 컴포넌트에 집중
├── 🔴 isMobile 조건부로 UI + 로직이 중복 구현
├── 🔴 데이터 로드/정렬/필터링 로직이 렌더링과 혼재
├── 🔴 43개의 isMobile 분기점 (대부분 스타일링이지만 일부 로직 포함)
└── 🔴 PC/Mobile 기능 동일성 검증 불가능 구조
```

---

## 🔍 탭별 상세 분석

### 1. 🏠 홈(Dashboard) 탭

#### 공통 로직 (정상 - 분리 불필요)
```javascript
// ✅ 공통: generateNotifications() 함수
const generateNotifications = () => {
  // 미퇴근, 급여일 임박, 계약 만료, 미출근 감지
  // 모바일/PC 동일한 로직 사용
};
```

#### UI 분기
```javascript
// ✅ 정상: UI만 분기
{isMobile ? (
  <div className="mobile-home-control-tower">
    {/* 모바일 전용 요약 카드 */}
  </div>
) : (
  <>
    <DashboardSummaryCards />
    <MainActionButtons />
  </>
)}
```

**결론**: ✅ **문제 없음** - 로직은 공통, UI만 분기

---

### 2. 👥 직원(Roster) 탭

#### 🔴 문제 1: 정렬 로직이 렌더링 블록 내부에 중복 구현

**위치**: 약 2400-2700 라인

**모바일 블록** (라인 2365):
```javascript
{isMobile ? (
  <div className="mobile-employee-header">
    {/* ... */}
  </div>
) : (
  /* 데스크톱 헤더 */
)}

// ⚠️ 문제: 직원 정렬이 렌더링 시점에 인라인으로 실행됨
{(() => {
  // 리스크 직원 우선 정렬
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aRisks = [
      !a.contract_file_url,
      !a.base_pay || a.base_pay === 0,
      a.employment_status === 'resigned' && !a.resignation_date
    ].filter(Boolean).length;
    
    const bRisks = [/* ... */].filter(Boolean).length;
    
    if (aRisks !== bRisks) return bRisks - aRisks;
    return a.name.localeCompare(b.name);
  });
  
  return sortedEmployees.map(emp => /* ... */);
})()}
```

**문제점**:
- 정렬 로직이 렌더링 블록 내부에서 매번 실행됨
- PC/Mobile 각각에서 동일한 정렬 로직을 사용하는지 검증 불가
- 정렬 기준 변경 시 여러 곳을 수정해야 함

**개선안**:
```javascript
// ✅ hooks/useEmployeeSort.js
const useSortedEmployees = (employees, priorityRisks = true) => {
  return useMemo(() => {
    if (!priorityRisks) return [...employees];
    
    return [...employees].sort((a, b) => {
      const aRisks = calculateEmployeeRisks(a).length;
      const bRisks = calculateEmployeeRisks(b).length;
      if (aRisks !== bRisks) return bRisks - aRisks;
      return a.name.localeCompare(b.name);
    });
  }, [employees, priorityRisks]);
};

// OwnerDashboard.jsx
const sortedEmployees = useSortedEmployees(filteredEmployees, true);
```

#### 🔴 문제 2: 리스크 계산 로직이 중복됨

**위치**: 직원 카드 렌더링 내부 (여러 곳)

```javascript
// ⚠️ 중복: 각 직원 카드마다 리스크 계산 반복
const risks = [];
if (!emp.contract_file_url) risks.push({ label: '서류 필요', color: '#f59e0b' });
if (!emp.base_pay || emp.base_pay === 0) risks.push({ label: '급여 미설정', color: '#ef4444' });
// ...
```

**개선안**:
```javascript
// ✅ utils/employeeRiskCalculator.js
export const calculateEmployeeRisks = (employee) => {
  const risks = [];
  if (!employee.contract_file_url) {
    risks.push({ type: 'no_contract', label: '서류 필요', color: '#f59e0b' });
  }
  if (!employee.base_pay || employee.base_pay === 0) {
    risks.push({ type: 'no_salary', label: '급여 미설정', color: '#ef4444' });
  }
  if (employee.employment_status === 'resigned' && !employee.resignation_date) {
    risks.push({ type: 'resignation_pending', label: '퇴사 처리 필요', color: '#ef4444' });
  }
  return risks;
};
```

**우선순위**: **P0** (기능 정합성 검증 불가)

---

### 3. 📊 출근(Attendance) 탭

#### 🔴 문제 3: 출근 기록 정렬 로직이 렌더링 블록 내부

**위치**: 약 3400-3700 라인

```javascript
{(() => {
  // ⚠️ 문제: 정렬 로직이 렌더링 내부
  const sortedAttendance = [...attendance].sort((a, b) => {
    const aStatus = getAttendanceStatus(a);
    const bStatus = getAttendanceStatus(b);
    
    const priority = { 'incomplete': 1, 'late': 2, 'completed': 3 };
    const aPriority = priority[aStatus.type] || 99;
    const bPriority = priority[bStatus.type] || 99;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    // ...
  });
  
  return sortedAttendance.map(/* ... */);
})()}
```

**문제점**:
- 매 렌더링마다 정렬 재실행 (성능 이슈)
- 정렬 우선순위 변경 시 여러 곳 수정 필요
- PC/Mobile 간 정렬 일관성 검증 불가

**개선안**:
```javascript
// ✅ hooks/useAttendanceSort.js
const useSortedAttendance = (attendance, employees, priorityProblems = true) => {
  return useMemo(() => {
    if (!priorityProblems) return attendance;
    
    return [...attendance].sort((a, b) => {
      const aStatus = getAttendanceStatus(a, employees);
      const bStatus = getAttendanceStatus(b, employees);
      
      const priority = {
        'incomplete': 1,
        'not_checked_out': 1,
        'late': 2,
        'completed': 3,
        'leave': 4
      };
      
      return (priority[aStatus.type] || 99) - (priority[bStatus.type] || 99);
    });
  }, [attendance, employees, priorityProblems]);
};
```

**우선순위**: **P0** (기능 정합성 검증 불가)

---

### 4. 💸 급여(Salary) 탭

#### 🔴 문제 4: 급여 처리 로직이 모바일 Wizard UI와 강결합

**위치**: 약 3850-4800 라인

**현재 구조**:
```javascript
{activeTab === 'salary' && (
  <>
    {/* 급여 현황 요약 바 */}
    {salaryData && (() => {
      // ⚠️ 로직: 확정/미확정/발송 상태 계산이 렌더링 내부
      const confirmed = employees.filter(emp => {
        return salaryDeductions[emp.employeeId] || editedSalaries[emp.employeeId];
      });
      const notConfirmed = employees.filter(/* ... */);
      const published = employeeSlips.filter(/* ... */);
      // ...
    })()}
    
    {/* 모바일 Wizard UI */}
    {isMobile ? (
      <div className="mobile-salary-wizard">
        {/* Step1~4 */}
        {/* ⚠️ 하단 고정 버튼도 여기에 */}
      </div>
    ) : (
      /* 데스크톱 UI */
    )}
    
    {/* ⚠️ 공통 영역: 단계 진행 표시 + 테이블 */}
    {/* 방금 수정한 부분 - 액션 버튼을 !isMobile로 감쌈 */}
  </>
)}
```

**문제점**:
1. 급여 상태 계산(confirmed/notConfirmed/published)이 렌더링 블록 내부
2. `salaryFlowStep` 상태가 모바일 Wizard와 강결합
3. PC에서는 4단계 프로세스가 명확하지 않음
4. 자동계산(`calculateDeductions`) 함수가 컴포넌트 레벨에만 존재

**개선안**:
```javascript
// ✅ hooks/useSalaryFlow.js
const useSalaryFlow = (employees, salaryDeductions, editedSalaries, employeeSlips, selectedMonth) => {
  // 상태 계산
  const stats = useMemo(() => {
    const confirmed = employees.filter(emp => 
      salaryDeductions[emp.employeeId] || editedSalaries[emp.employeeId]
    );
    
    const notConfirmed = employees.filter(emp => 
      !salaryDeductions[emp.employeeId] && !editedSalaries[emp.employeeId]
    );
    
    const published = employeeSlips.filter(slip => 
      slip.published && slip.period === selectedMonth
    );
    
    const notPublished = employees.filter(emp => {
      const hasPublished = employeeSlips.some(slip => 
        slip.published && slip.period === selectedMonth && slip.employee_id === emp.employeeId
      );
      return !hasPublished;
    });
    
    return { confirmed, notConfirmed, published, notPublished };
  }, [employees, salaryDeductions, editedSalaries, employeeSlips, selectedMonth]);
  
  return stats;
};

// ✅ services/salaryCalculator.js
export const calculateDeductions = async (salaryAPI, employeeId, grossPay, selectedMonth, dependentsCount = 1) => {
  // 4대보험/소득세 계산 로직을 독립 서비스로
};
```

**우선순위**: **P1** (PC 기능 완성도 검증 필요)

---

### 5. 🔔 알림(Notifications)

#### ✅ 문제 없음

`generateNotifications()` 함수가 공통 로직으로 잘 분리되어 있음.
모바일/PC 모두 동일한 알림 데이터 사용.

---

### 6. ⚙️ 설정(Settings)

#### ✅ 문제 없음

설정 화면은 UI만 다르고, 로직은 공통으로 사용됨.

---

## 📋 종합 문제점 요약

| # | 문제 | 위치 | 우선순위 | 영향 범위 |
|---|------|------|----------|----------|
| 1 | 직원 정렬 로직이 렌더링 내부에서 중복 실행 | Roster 탭 | **P0** | PC/Mobile 정렬 일관성 |
| 2 | 리스크 계산 로직이 각 카드마다 중복 실행 | Roster 탭 | **P0** | 성능 + 유지보수 |
| 3 | 출근 기록 정렬 로직이 렌더링 내부 | Attendance 탭 | **P0** | PC/Mobile 정렬 일관성 |
| 4 | 급여 상태 계산이 렌더링 블록 내부 | Salary 탭 | **P1** | PC 기능 명확성 |
| 5 | 급여 Wizard 로직이 UI와 강결합 | Salary 탭 | **P1** | PC 4단계 프로세스 검증 |
| 6 | 자동계산 함수가 컴포넌트 레벨에만 존재 | Salary 탭 | **P2** | 재사용성 |

---

## 🎯 권장 리팩터링 전략

### Phase 1: 로직 분리 (P0)

```
OwnerDashboard.jsx (8,273 lines)
↓ 분리
├── hooks/
│   ├── useEmployeeSort.js       // 직원 정렬
│   ├── useAttendanceSort.js     // 출근 정렬
│   └── useSalaryFlow.js         // 급여 상태 계산
├── utils/
│   ├── employeeRiskCalculator.js // 리스크 계산
│   └── attendanceStatus.js       // 출근 상태 판단
└── services/
    └── salaryCalculator.js       // 4대보험/세금 계산
```

### Phase 2: PC 기능 검증 (P0)

1. PC 화면에서 전체 플로우 테스트:
   - 출근 → 급여 → 명세서 → 알림
2. 깨진 기능 우선순위 분류
3. PC 먼저 수정 후 Mobile 반영

### Phase 3: UI 컴포넌트 분리 (P1)

```
components/
├── owner/
│   ├── RosterView.jsx          // 직원 목록 (PC)
│   ├── RosterMobileView.jsx    // 직원 목록 (Mobile)
│   ├── AttendanceView.jsx      // 출근 현황 (PC)
│   ├── AttendanceMobileView.jsx // 출근 현황 (Mobile)
│   ├── SalaryView.jsx          // 급여 관리 (PC)
│   └── SalaryMobileView.jsx    // 급여 Wizard (Mobile)
```

---

## 🚨 즉시 수정 필요 항목 (P0)

1. **직원 정렬 로직 분리** (`useEmployeeSort` hook)
2. **출근 정렬 로직 분리** (`useAttendanceSort` hook)
3. **리스크 계산 유틸 분리** (`calculateEmployeeRisks`)
4. **PC 기준 회귀 테스트 실행**

---

## ✅ 다음 단계

1. PC 화면 기능 회귀 테스트 실행 → 깨진 기능 리포트
2. P0 문제부터 순차 수정 (PC 먼저, Mobile 나중)
3. 로직 분리 후 PC/Mobile 동일성 검증
