import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import ChangePassword from './ChangePassword';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return t('header.roleAdmin');
      case 'owner':
        return t('header.roleOwner');
      case 'employee':
        return t('header.roleEmployee');
      default:
        return '';
    }
  };

  const handlePasswordChangeSuccess = () => {
    alert(t('header.passwordChanged'));
    logout();
  };

  return (
    <>
      <div className="header">
        <div className="header-content">
          <div className="header-title">
            {t('header.title')}
          </div>
          
          {/* PC 버전 네비게이션 */}
          <div className="header-nav header-nav-desktop">
            <span className="header-user">
              {user?.name} ({getRoleName(user?.role)})
            </span>
            <Link to="/guide" className="btn btn-secondary" style={{ marginRight: '8px' }}>
              {t('header.guide')}
            </Link>
            <button
              onClick={() => setShowChangePassword(true)}
              className="btn btn-secondary"
              style={{ marginRight: '8px' }}
            >
              {t('header.changePassword')}
            </button>
            <LanguageSwitcher style={{ marginRight: '8px' }} />
            <button onClick={logout} className="btn btn-secondary">
              {t('header.logout')}
            </button>
          </div>

          {/* 모바일 햄버거 메뉴 */}
          <div className="header-nav header-nav-mobile">
            <span className="header-user" style={{ fontSize: '14px', marginRight: '8px' }}>
              {user?.name}
            </span>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
                color: '#667eea'
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {showMobileMenu && (
        <div 
          style={{
            position: 'fixed',
            top: 'calc(60px + env(safe-area-inset-top, 0px))',
            right: '0',
            width: '250px',
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '0 0 0 12px',
            zIndex: 1000,
            animation: 'slideIn 0.2s ease-out'
          }}
        >
          <div style={{ padding: '12px' }}>
            <div style={{ 
              padding: '12px',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '8px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {getRoleName(user?.role)}
              </div>
            </div>
            
            <Link 
              to="/guide" 
              onClick={() => setShowMobileMenu(false)}
              style={{
                display: 'block',
                padding: '12px',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '8px',
                marginBottom: '4px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              {t('header.guide')}
            </Link>

            <div style={{ padding: '8px 12px' }}>
              <LanguageSwitcher style={{ width: '100%' }} />
            </div>

            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowChangePassword(true);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                color: '#333',
                borderRadius: '8px',
                marginBottom: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              {t('header.changePassword')}
            </button>

            <button
              onClick={() => {
                setShowMobileMenu(false);
                logout();
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#fef2f2'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              {t('header.logout')}
            </button>
          </div>
        </div>
      )}

      {/* 모바일 메뉴 오버레이 (메뉴 외부 클릭 시 닫기) */}
      {showMobileMenu && (
        <div
          onClick={() => setShowMobileMenu(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}

      {/* 스타일 추가 */}
      <style>{`
        .header-nav-desktop {
          display: flex;
        }
        .header-nav-mobile {
          display: none;
        }

        @media (max-width: 768px) {
          .header-nav-desktop {
            display: none !important;
          }
          .header-nav-mobile {
            display: flex !important;
            align-items: center;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default Header;
