import React from 'react';

const MobileNav = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'attendance', icon: '📊', label: '출근' },
    { id: 'salary', icon: '💸', label: '급여' },
    { id: 'roster', icon: '👥', label: '직원' }
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className="mobile-nav-item-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
