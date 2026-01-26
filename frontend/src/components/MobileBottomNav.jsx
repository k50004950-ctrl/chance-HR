import React from 'react';

const MobileBottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: '🏠', label: '홈' },
    { id: 'attendance', icon: '📊', label: '출근' },
    { id: 'salary', icon: '💰', label: '급여' },
    { id: 'roster', icon: '👥', label: '직원' },
    { id: 'more', icon: '⋯', label: '더보기' }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: activeTab === tab.id ? '#667eea' : '#6b7280',
            minWidth: '60px',
            touchAction: 'manipulation'
          }}
        >
          <span style={{ fontSize: '24px', lineHeight: 1 }}>{tab.icon}</span>
          <span style={{
            fontSize: '11px',
            fontWeight: activeTab === tab.id ? '700' : '500',
            whiteSpace: 'nowrap'
          }}>
            {tab.label}
          </span>
          {activeTab === tab.id && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '32px',
              height: '3px',
              background: '#667eea',
              borderRadius: '0 0 3px 3px'
            }} />
          )}
        </button>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
