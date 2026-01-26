import React from 'react';

/**
 * AdminLayout - 관리자 전용 레이아웃
 * 
 * 책임:
 * - 네비게이션 (사업주 관리, 사업장 관리, 보험 요율, 공지사항, 커뮤니티)
 * - 관리자 전용 UI
 * 
 * 사용:
 * <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
 *   <YourContent />
 * </AdminLayout>
 */
const AdminLayout = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="admin-layout">
      {/* 네비게이션 탭 */}
      <div className="navigation-tabs">
        <button
          className={activeTab === 'owners' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('owners')}
        >
          사업주 목록
        </button>
        <button
          className={activeTab === 'workplaces' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('workplaces')}
        >
          사업장 목록
        </button>
        <button
          className={activeTab === 'insurance' ? 'tab active' : 'tab'}
          onClick={() => onTabChange('insurance')}
        >
          💼 4대보험 요율
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
          💬 커뮤니티
        </button>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="admin-layout-content">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
