import React from 'react';

const MobileLayout = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="mobile-layout">
      {/* 메인 컨텐츠 영역 */}
      <div className="mobile-content">
        {children}
      </div>

      {/* 하단 네비게이션 바 */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <div className="mobile-nav-icon">🏠</div>
          <div className="mobile-nav-label">Home</div>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => onTabChange('attendance')}
        >
          <div className="mobile-nav-icon">📊</div>
          <div className="mobile-nav-label">출근</div>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'salary' ? 'active' : ''}`}
          onClick={() => onTabChange('salary')}
        >
          <div className="mobile-nav-icon">💸</div>
          <div className="mobile-nav-label">급여</div>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => onTabChange('roster')}
        >
          <div className="mobile-nav-icon">👥</div>
          <div className="mobile-nav-label">직원</div>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => onTabChange('more')}
        >
          <div className="mobile-nav-icon">⋯</div>
          <div className="mobile-nav-label">더보기</div>
        </button>
      </nav>
    </div>
  );
};

export default MobileLayout;
