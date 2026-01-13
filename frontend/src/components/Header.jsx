import React from 'react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return '총관리자';
      case 'owner':
        return '사업주';
      case 'employee':
        return '직원';
      default:
        return '';
    }
  };

  return (
    <div className="header">
      <div className="header-content">
        <div className="header-title">
          📋 출퇴근 관리 시스템
        </div>
        <div className="header-nav">
          <span className="header-user">
            {user?.name} ({getRoleName(user?.role)})
          </span>
          <button onClick={logout} className="btn btn-secondary">
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
