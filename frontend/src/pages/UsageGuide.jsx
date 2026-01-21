import React from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const UsageGuide = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.role === 'owner';
  const isEmployee = user?.role === 'employee';
  const showOwner = !user || isOwner;
  const showEmployee = !user || isEmployee;
  const handleTocClick = (event, targetId) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return (
    <div>
      {user && <Header />}
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <div />
          <h2 style={{ margin: 0, color: '#374151', textAlign: 'center' }}>사용방법 안내서</h2>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            style={{ minWidth: '120px', justifySelf: 'end' }}
          >
            대시보드로
          </button>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>목차</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '14px', justifyContent: 'center' }}>
            <a href="#common" onClick={(event) => handleTocClick(event, 'common')}>공통</a>
            {showOwner && <a href="#owner" onClick={(event) => handleTocClick(event, 'owner')}>사업주</a>}
            {showEmployee && <a href="#employee" onClick={(event) => handleTocClick(event, 'employee')}>직원</a>}
            <a href="#homescreen" onClick={(event) => handleTocClick(event, 'homescreen')}>홈 화면 추가</a>
            <a href="#troubleshooting" onClick={(event) => handleTocClick(event, 'troubleshooting')}>자주 발생하는 문제</a>
          </div>
        </div>

        <div id="common" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>공통</h3>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li>모든 계정은 로그인 후 역할에 맞는 대시보드로 이동합니다.</li>
            <li>상단 헤더에서 <strong>비밀번호 변경</strong>과 <strong>로그아웃</strong>을 할 수 있습니다.</li>
            <li>모바일 사용 시 위치 권한을 "허용"해야 출퇴근 체크가 가능합니다.</li>
            <li><strong>모바일 최적화</strong>: 캘린더, 버튼, 텍스트 크기가 모바일에 최적화되어 있습니다.</li>
            <li><strong>홈 화면 추가 권장</strong>: 앱처럼 사용하려면 홈 화면에 추가하세요 (아래 안내 참고).</li>
          </ul>
        </div>

        {showOwner && (
          <div id="owner" className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#374151' }}>사업주 사용 방법</h3>
            
            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>기본 관리</h4>
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
            </ol>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>출퇴근 관리</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>캘린더</strong>:
                해당 월의 직원 출근 완료/미완료/결근/휴가 현황을 요약해서 확인합니다.
              </li>
              <li>
                <strong>당월 출근현황</strong>:
                직원별 출퇴근 기록을 확인하고, 필요한 경우 근무 기록을 수정할 수 있습니다.
              </li>
            </ol>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>급여 관리</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>급여 계산</strong>:
                월별/연별 급여, 주휴수당, 과거 급여 입력, 퇴직금(당일퇴사 기준)을 확인합니다.
                <ul style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                  <li>과거 급여 기록 추가 가능</li>
                  <li>과거 급여 → 급여명세서 변환 가능 (📝 명세서 생성 버튼)</li>
                </ul>
              </li>
              <li>
                <strong>급여명세서</strong>:
                직원별 급여명세서를 작성하고 배포합니다.
                <ul style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                  <li><strong>📅 월별 자동 생성</strong>: 모든 직원의 귀속월 급여명세서 일괄 생성</li>
                  <li><strong>📋 입사일부터 일괄 생성</strong>: 선택한 직원의 입사일~현재까지 자동 생성</li>
                  <li><strong>인건비 구분</strong>: 프리랜서(3.3% 자동계산) / 4대보험(수동입력)</li>
                  <li><strong>배포</strong>: 배포 버튼을 눌러야 근로자가 확인 가능</li>
                  <li>수정/삭제 가능 (미배포 상태에서만 수정 권장)</li>
                </ul>
              </li>
              <li>
                <strong>퇴직금 계산</strong>:
                1년 이상 근무자의 당일 퇴사 기준 퇴직금을 확인합니다.
              </li>
            </ol>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>과거 데이터</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>과거 직원</strong>:
                시스템 도입 이전 퇴사자의 과거 급여/퇴직금 기록을 입력합니다.
              </li>
              <li>
                <strong>퇴사 처리</strong>:
                퇴사일, 퇴사 구분, 비고를 입력하여 퇴사 처리합니다.
              </li>
            </ol>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>⚙️ 설정</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>사업장 주소/위치 수정</strong>:
                사업장 주소를 검색하면 위도/경도가 자동으로 입력됩니다.
              </li>
              <li>
                <strong>🔔 출퇴근 알림</strong>:
                직원이 출근/퇴근하면 브라우저로 알림을 받습니다.
                <ul style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                  <li>알림 켜기/끄기 버튼으로 설정</li>
                  <li>테스트 알림 보내기로 동작 확인</li>
                  <li>브라우저 알림 허용 필요</li>
                </ul>
              </li>
              <li>
                <strong>🧪 테스트 계정 생성</strong>:
                개발/테스트 용도의 샘플 근로자 계정(김월급, 박시급)을 생성합니다.
              </li>
            </ol>
          </div>
        )}

        {showEmployee && (
          <div id="employee" className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#374151' }}>직원 사용 방법</h3>
            
            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>최초 설정</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>개인정보/위치 동의</strong>:
                최초 로그인 시 동의 창이 표시되며, 동의해야 출퇴근 기능을 사용할 수 있습니다.
              </li>
            </ol>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>출퇴근</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>위치 확인</strong>:
                "위치 확인" 버튼으로 현재 위치를 먼저 확인합니다.
              </li>
              <li>
                <strong>출근/퇴근 체크</strong>:
                사업장 반경 내에서 출근/퇴근 버튼을 누릅니다.
              </li>
              <li>
                <strong>QR코드 출퇴근</strong>:
                사업주가 생성한 QR코드를 스캔하여 출퇴근할 수 있습니다.
              </li>
            </ol>

            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>확인 및 발급</h4>
            <ol style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
              <li>
                <strong>출퇴근 캘린더</strong>:
                본인의 출근 기록과 휴무일이 표시됩니다.
              </li>
              <li>
                <strong>재직증명서 발급</strong>:
                상단 버튼으로 즉시 발급 가능합니다.
              </li>
              <li>
                <strong>급여명세서 확인</strong>:
                사업주가 배포한 급여명세서를 월별로 확인할 수 있습니다.
                <ul style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                  <li>귀속월, 지급일, 기본급 확인</li>
                  <li>공제 항목 상세 내역 확인</li>
                  <li>실수령액 확인</li>
                  <li>과거 급여명세서 조회 가능</li>
                </ul>
              </li>
              <li>
                <strong>급여일 D-day</strong>:
                다음 급여 지급일까지 남은 일수가 표시됩니다.
              </li>
            </ol>
          </div>
        )}

        <div id="homescreen" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>홈 화면 추가 (앱처럼 사용하기)</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            홈 화면에 추가하면 앱처럼 빠르게 접속하고 알림을 받을 수 있습니다.
          </p>
          
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '15px' }}>📱 안드로이드 (Chrome)</h4>
            <ol style={{ paddingLeft: '18px', marginTop: '8px' }}>
              <li>웹사이트 접속 후 우측 상단 <strong>⋮</strong> 메뉴를 누릅니다.</li>
              <li><strong>홈 화면에 추가</strong>를 선택합니다.</li>
              <li>추가 완료 후 홈 화면 아이콘으로 실행합니다.</li>
              <li><strong>알림 허용</strong>을 눌러 출퇴근 알림을 받으세요.</li>
            </ol>
            
            <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '15px' }}>🍎 아이폰 (Safari, iOS 16.4+)</h4>
            <ol style={{ paddingLeft: '18px', marginTop: '8px' }}>
              <li>Safari에서 웹사이트에 접속합니다.</li>
              <li>하단 중앙의 <strong>공유 버튼 (📤)</strong>을 누릅니다.</li>
              <li>아래로 스크롤하여 <strong>홈 화면에 추가</strong>를 선택합니다.</li>
              <li>우측 상단의 <strong>추가</strong>를 누릅니다.</li>
              <li>홈 화면 아이콘으로 실행한 뒤 <strong>알림 허용</strong>을 눌러주세요.</li>
            </ol>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}>
              <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                💡 <strong>팁</strong>: 홈 화면에 추가하면 브라우저 주소창 없이 전체 화면으로 사용할 수 있어 더 편리합니다!
              </p>
            </div>
          </div>
        </div>

        <div id="troubleshooting" className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>자주 발생하는 문제</h3>
          
          <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>출퇴근</h4>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li><strong>출근 체크가 안돼요</strong>: 위치 권한 허용, GPS 켬 상태, 반경 설정을 확인하세요.</li>
            <li><strong>사업장 범위 내인데 실패해요</strong>: GPS 정확도가 낮을 수 있습니다. 잠시 이동 후 재시도하세요.</li>
            <li><strong>QR코드가 유효하지 않아요</strong>: QR코드는 10분마다 갱신됩니다. 사업주가 새로 생성해주세요.</li>
          </ul>

          <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>급여/명세서</h4>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li><strong>급여명세서가 안 보여요</strong>: 사업주가 배포하기 전에는 근로자 화면에 표시되지 않습니다.</li>
            <li><strong>급여가 0원으로 계산돼요</strong>: 출근 기록이 없거나 급여 정보가 입력되지 않았을 수 있습니다.</li>
            <li><strong>과거 급여가 반영되지 않아요</strong>: "퇴직금 계산" 탭의 과거 급여 입력 섹션에 입력 후 저장했는지 확인하세요.</li>
          </ul>

          <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>데이터/화면</h4>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li><strong>직원 목록이 안 보여요</strong>: 사업장 선택이 되어 있는지 확인하세요.</li>
            <li><strong>변경사항이 반영 안 돼요</strong>: 브라우저 새로고침(Ctrl+F5 또는 ⌘+Shift+R)을 해보세요.</li>
            <li><strong>모바일에서 화면이 작아요</strong>: 최신 업데이트로 모바일 화면이 최적화되었습니다. 새로고침 해보세요.</li>
          </ul>

          <h4 style={{ marginTop: '16px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>알림</h4>
          <ul style={{ paddingLeft: '18px', lineHeight: '1.8' }}>
            <li><strong>알림이 안 와요</strong>: 브라우저 알림 권한이 허용되어 있는지 확인하세요.</li>
            <li><strong>알림 설정을 어디서 하나요?</strong>: 사업주 대시보드 → ⚙️ 설정 탭 → 출퇴근 알림 설정</li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageGuide;
