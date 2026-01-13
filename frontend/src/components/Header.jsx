import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ChangePassword from './ChangePassword';

const Header = () => {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

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

  const handlePasswordChangeSuccess = () => {
    alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
    logout();
  };

  return (
    <>
      <div className="header">
        <div className="header-content">
          <div className="header-title">
            📋 출퇴근 관리 시스템 HR
          </div>
          <div className="header-nav">
            <span className="header-user">
              {user?.name} ({getRoleName(user?.role)})
            </span>
            <button 
              onClick={() => setShowChangePassword(true)} 
              className="btn btn-secondary"
              style={{ marginRight: '8px' }}
            >
              🔐 비밀번호 변경
            </button>
            <button onClick={logout} className="btn btn-secondary">
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}
    </>
  );
};

export default Header;
