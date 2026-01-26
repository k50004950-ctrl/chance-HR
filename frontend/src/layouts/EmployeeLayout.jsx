import React from 'react';

/**
 * EmployeeLayout - 직원 전용 레이아웃
 * 
 * 책임:
 * - 네비게이션 (출퇴근, 급여명세서, 공지사항)
 * - 모바일 최적화
 * 
 * 사용:
 * <EmployeeLayout activeTab={activeTab} onTabChange={setActiveTab}>
 *   <YourContent />
 * </EmployeeLayout>
 */
const EmployeeLayout = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="employee-layout">
      {/* 네비게이션 탭 */}
      <div className="navigation-tabs">
        <button
          className={activeTab === 'attendance' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('attendance')}
        >
          📍 출퇴근
        </button>
        <button
          className={activeTab === 'salary' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('salary')}
        >
          💰 급여명세서
        </button>
        <button
          className={activeTab === 'announcements' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('announcements')}
        >
          📢 공지사항
        </button>
        <button
          className={activeTab === 'community' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('community')}
        >
          💬 소통방
        </button>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="employee-layout-content">
        {children}
      </div>
    </div>
  );
};

export default EmployeeLayout;
