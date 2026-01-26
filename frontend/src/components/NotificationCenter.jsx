import React, { useState, useEffect } from 'react';

const NotificationCenter = ({ notifications = [], onClose, onActionClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const urgentCount = notifications.filter(n => n.urgent).length;

  return (
    <div style={{ position: 'relative' }}>
      {/* 알림 벨 아이콘 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          transition: 'all 0.2s',
          boxShadow: notifications.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.borderColor = '#667eea';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = '#e5e7eb';
        }}
      >
        🔔
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: urgentCount > 0 ? '#ef4444' : '#f59e0b',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            border: '2px solid white',
            animation: urgentCount > 0 ? 'pulse 2s infinite' : 'none'
          }}>
            {notifications.length}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
          <div style={{
            position: 'absolute',
            top: '60px',
            right: 0,
            width: '380px',
            maxHeight: '600px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
          }}>
            {/* 헤더 */}
            <div style={{
              padding: '20px',
              borderBottom: '2px solid #f3f4f6',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  🔔 알림 센터
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  닫기
                </button>
              </div>
              {notifications.length > 0 && (
                <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.9 }}>
                  {urgentCount > 0 && `긴급 ${urgentCount}건 포함 · `}
                  총 {notifications.length}건의 알림
                </div>
              )}
            </div>

            {/* 알림 리스트 */}
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    모든 알림을 확인했습니다
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    새로운 알림이 없습니다
                  </div>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: notif.action ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      background: notif.urgent ? '#fef2f2' : 'white'
                    }}
                    onClick={() => {
                      if (notif.action && onActionClick) {
                        onActionClick(notif.action);
                        setIsOpen(false);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (notif.action) {
                        e.currentTarget.style.background = notif.urgent ? '#fee2e2' : '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.urgent ? '#fef2f2' : 'white';
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '28px', lineHeight: 1 }}>
                        {notif.icon || '📌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: notif.urgent ? '#dc2626' : '#374151',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {notif.title}
                          {notif.urgent && (
                            <span style={{
                              background: '#dc2626',
                              color: 'white',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '700'
                            }}>
                              긴급
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: '#6b7280',
                          marginBottom: notif.action ? '8px' : 0
                        }}>
                          {notif.message}
                        </div>
                        {notif.action && (
                          <button
                            style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 16px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              marginTop: '8px'
                            }}
                          >
                            {notif.actionLabel || '바로가기'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
