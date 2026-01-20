import React from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

const UsageGuide = () => {
  const { user } = useAuth();
  return (
    <div>
      {user && <Header />}
      <div className="container">
        <h2 style={{ marginBottom: '20px', color: '#374151' }}>사용방법 안내서</h2>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>목차</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '14px' }}>
            <a href="#common">공통</a>
            <a href="#owner">사업주</a>
            <a href="#employee">직원</a>
            <a href="#homescreen">홈 화면 추가</a>
            <a href="#troubleshooting">자주 발생하는 문제</a>
          </div>
        </div>

        <div id="common" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>공통</h3>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li>모든 계정은 로그인 후 역할에 맞는 대시보드로 이동합니다.</li>
            <li>상단 헤더에서 <strong>비밀번호 변경</strong>과 <strong>로그아웃</strong>을 할 수 있습니다.</li>
            <li>모바일 사용 시 위치 권한을 “허용”해야 출퇴근 체크가 가능합니다.</li>
          </ul>
        </div>

        <div id="owner" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>사업주 사용 방법</h3>
          <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li>
              <strong>사업장 선택</strong>: 사업주가 가진 사업장 중 관리할 사업장을 선택합니다.
            </li>
            <li>
              <strong>근로자 명부</strong>:
              직원 등록/수정/삭제, 근무 요일, 근무시간, 급여 유형, 고용 정보, 동의 상태를 관리합니다.
            </li>
            <li>
              <strong>근무 요일 설정</strong>:
              직원의 근무 요일과 시작/종료 시간을 설정하면 출퇴근 정상/지각/결근 판단에 반영됩니다.
            </li>
            <li>
              <strong>근로계약서/서류 업로드</strong>:
              업로드된 이미지 파일은 바로 보기/다운로드가 가능합니다.
            </li>
            <li>
              <strong>캘린더</strong>:
              해당 월의 직원 출근 완료/미완료/결근/휴가 현황을 요약해서 확인합니다.
            </li>
            <li>
              <strong>당월 출근현황</strong>:
              직원별 출퇴근 기록을 확인하고, 필요한 경우 근무 기록을 수정할 수 있습니다.
            </li>
            <li>
              <strong>급여 계산</strong>:
              월별/연별 급여, 주휴수당, 과거 급여 입력, 퇴직금(당일퇴사 기준)을 확인합니다.
            </li>
            <li>
              <strong>과거 직원</strong>:
              시스템 도입 이전 근무자의 과거 급여를 입력해 퇴직금 계산에 반영합니다.
            </li>
            <li>
              <strong>퇴사</strong>:
              퇴사 처리와 퇴사자 목록 관리를 진행합니다.
            </li>
          </ol>
        </div>

        <div id="employee" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>직원 사용 방법</h3>
          <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li>
              <strong>개인정보/위치 동의</strong>:
              최초 로그인 시 동의 창이 표시되며, 동의해야 출퇴근 기능을 사용할 수 있습니다.
            </li>
            <li>
              <strong>위치 확인</strong>:
              “위치 확인” 버튼으로 현재 위치를 먼저 확인합니다.
            </li>
            <li>
              <strong>출근/퇴근 체크</strong>:
              사업장 반경 내에서 출근/퇴근 버튼을 누릅니다.
            </li>
            <li>
              <strong>재직증명서 발급</strong>:
              상단 버튼으로 즉시 발급 가능합니다.
            </li>
            <li>
              <strong>출퇴근 캘린더</strong>:
              본인의 출근 기록과 휴무일이 표시됩니다.
            </li>
          </ol>
        </div>

        <div id="homescreen" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>홈 화면 추가 (알림 사용 권장)</h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <strong>안드로이드 (Chrome)</strong>
            <ol style={{ paddingLeft: '18px', marginTop: '8px' }}>
              <li>웹사이트 접속 후 우측 상단 <strong>⋮</strong> 메뉴를 누릅니다.</li>
              <li><strong>홈 화면에 추가</strong>를 선택합니다.</li>
              <li>추가 완료 후 홈 화면 아이콘으로 실행합니다.</li>
            </ol>
            <strong>아이폰 (Safari, iOS 16.4+)</strong>
            <ol style={{ paddingLeft: '18px', marginTop: '8px' }}>
              <li>웹사이트 접속 후 하단 <strong>공유</strong> 버튼을 누릅니다.</li>
              <li><strong>홈 화면에 추가</strong>를 선택합니다.</li>
              <li>홈 화면 아이콘으로 실행한 뒤 <strong>알림 허용</strong>을 눌러주세요.</li>
            </ol>
          </div>
        </div>

        <div id="troubleshooting" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>자주 발생하는 문제</h3>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li><strong>출근 체크가 안돼요</strong>: 위치 권한 허용, GPS 켬 상태, 반경 설정을 확인하세요.</li>
            <li><strong>사업장 범위 내인데 실패해요</strong>: GPS 정확도가 낮을 수 있습니다. 잠시 이동 후 재시도하세요.</li>
            <li><strong>직원 목록이 안 보여요</strong>: 사업장 선택이 되어 있는지 확인하세요.</li>
            <li><strong>과거 급여가 반영되지 않아요</strong>: “과거 직원” 탭에 입력 후 저장했는지 확인하세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UsageGuide;
