import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useIsMobile from '../hooks/useIsMobile';
import MobileBottomNav from '../components/MobileBottomNav';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Production: Empty state (API 연동 대기)
  const notifications = [];

  // 탭 전환 핸들러
  const handleTabChange = (tabId) => {
    navigate('/', { state: { activeTab: tabId } }); // OwnerDashboard로 이동 및 탭 상태 전달
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      paddingBottom: isMobile ? 'calc(70px + env(safe-area-inset-bottom))' : '0',
      background: '#f9fafb'
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
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <button
          onClick={() => navigate('/', { state: { activeTab: 'community' } })}
          style={{
            padding: '8px 16px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          💬 소통방
        </button>
      </div>

      {/* 알림 목록 */}
      <div style={{ padding: '16px' }}>
        {notifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              알림이 없습니다
            </div>
            <div style={{ fontSize: '14px' }}>
              새로운 알림이 도착하면 여기에 표시됩니다
            </div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: notification.urgent ? '4px solid #ef4444' : '4px solid #f59e0b'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ fontSize: '24px' }}>
                  {notification.urgent ? '⚠️' : 'ℹ️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#374151',
                    marginBottom: '8px',
                    lineHeight: '1.5'
                  }}>
                    {notification.message}
                  </div>
                  {notification.actionText && (
                    <button
                      onClick={() => {
                        if (notification.action) {
                          navigate(`/owner`);
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        background: notification.urgent ? '#ef4444' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {notification.actionText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 네비게이션 (모바일) */}
      {isMobile && (
        <MobileBottomNav activeTab="" onTabChange={handleTabChange} />
      )}
    </div>
  );
};

export default NotificationsPage;
