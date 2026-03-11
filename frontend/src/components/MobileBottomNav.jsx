import React from 'react';

const MobileBottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: '🏠', label: '홈' },
    { id: 'attendance', icon: '📊', label: '출근' },
    { id: 'salary', icon: '💰', label: '급여' },
    { id: 'roster', icon: '👥', label: '직원' },
    { id: 'settings', icon: '⚙️', label: '설정' }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`mobile-nav-item${activeTab === tab.id ? ' active' : ''}`}
          style={{ touchAction: 'manipulation' }}
        >
          <span className="mobile-nav-icon">{tab.icon}</span>
          <span className="mobile-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
