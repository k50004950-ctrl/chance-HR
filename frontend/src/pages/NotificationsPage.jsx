import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationCenter from '../components/NotificationCenter';
import useIsMobile from '../hooks/useIsMobile';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div style={{ 
      minHeight: '100vh',
      paddingBottom: isMobile ? 'calc(70px + env(safe-area-inset-bottom))' : '0'
    }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          ←
        </button>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: '700', 
          color: '#111827',
          margin: 0 
        }}>
          알림
        </h1>
      </div>

      {/* 알림 센터 */}
      <div style={{ padding: isMobile ? '0' : '20px' }}>
        <NotificationCenter />
      </div>
    </div>
  );
};

export default NotificationsPage;
