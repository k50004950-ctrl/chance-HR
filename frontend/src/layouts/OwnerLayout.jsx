import React, { useState } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import MobileLayout from '../components/MobileLayout';
import Header from '../components/Header';

/**
 * OwnerLayout - 사업주 전용 레이아웃
 * 
 * 책임:
 * - Header 표시
 * - 네비게이션 (PC: 상단 탭, Mobile: 하단 탭바)
 * - 반응형 UI 전환
 * - 탭 변경 이벤트 전달
 * 
 * 비책임 (Dashboard에서 처리):
 * - 데이터 로딩
 * - 비즈니스 로직
 * - API 호출
 * 
 * 사용:
 * <OwnerLayout user={user} activeTab={activeTab} onTabChange={setActiveTab}>
 *   <YourDashboardContent />
 * </OwnerLayout>
 */
const OwnerLayout = ({ user, activeTab, onTabChange, children }) => {
  const isMobile = useIsMobile();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 모바일: MobileLayout 사용
  if (isMobile) {
    return (
      <MobileLayout activeTab={activeTab} onTabChange={onTabChange}>
        {children}
      </MobileLayout>
    );
  }

  // PC: 기존 상단 탭 네비게이션
  return (
    <div className="owner-layout">
      <Header user={user} />
      {/* 상단 네비게이션 */}
      <div className="navigation-tabs">
        <button
          className={activeTab === 'dashboard' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('dashboard')}
        >
          🏠 메인
        </button>
        <button
          className={activeTab === 'attendance' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('attendance')}
        >
          📊 오늘 출근
        </button>
        <button
          className={activeTab === 'salary-slips' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('salary-slips')}
        >
          💸 급여 보내기
        </button>

        {/* 더보기 드롭다운 */}
        <div className="more-menu-container" style={{ position: 'relative' }}>
          <button
            className={showMoreMenu || activeTab === 'more' ? 'tab active' : 'tab'}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            ⋯ 더보기 ▼
          </button>

          {showMoreMenu && (
            <>
              <div
                className="more-menu-backdrop"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9999,
                  background: 'transparent'
                }}
                onClick={() => setShowMoreMenu(false)}
              />
              <div
                className="more-menu-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  minWidth: '200px',
                  zIndex: 10000,
                  marginTop: '8px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => {
                    onTabChange('calendar');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'calendar' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'calendar' ? '#f0f0f0' : 'white'}
                >
                  📅 출근 달력
                </button>
                <button
                  onClick={() => {
                    onTabChange('employees');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'employees' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'employees' ? '#f0f0f0' : 'white'}
                >
                  👥 직원 관리
                </button>
                <button
                  onClick={() => {
                    onTabChange('salary');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'salary' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'salary' ? '#f0f0f0' : 'white'}
                >
                  🧮 급여 계산
                </button>
                <button
                  onClick={() => {
                    onTabChange('retirement');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'retirement' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'retirement' ? '#f0f0f0' : 'white'}
                >
                  🧾 퇴사 처리
                </button>
                <button
                  onClick={() => {
                    onTabChange('documents');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'documents' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'documents' ? '#f0f0f0' : 'white'}
                >
                  📁 서류 보관함
                </button>
                <button
                  onClick={() => {
                    onTabChange('community');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'community' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'community' ? '#f0f0f0' : 'white'}
                >
                  💬 소통방
                </button>
                <button
                  onClick={() => {
                    onTabChange('settings');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'settings' ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f8f8f8'}
                  onMouseOut={(e) => e.target.style.background = activeTab === 'settings' ? '#f0f0f0' : 'white'}
                >
                  ⚙️ 설정
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="owner-layout-content">
        {children}
      </div>
    </div>
  );
};

export default OwnerLayout;
