import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useIsMobile from '../hooks/useIsMobile';
import MobileBottomNav from '../components/MobileBottomNav';
import { notificationsAPI } from '../services/api';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('알림 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('읽음 처리 오류:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('전체 읽음 처리 오류:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('알림 삭제 오류:', error);
    }
  };

  const handleTabChange = (tabId) => {
    navigate('/', { state: { activeTab: tabId } });
  };

  const getTypeIcon = (type, urgent) => {
    if (urgent) return '🚨';
    switch (type) {
      case 'attendance': return '📋';
      case 'salary': return '💰';
      case 'approval': return '✅';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      minHeight: '100dvh',
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
        justifyContent: 'space-between'
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
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
            알림 {unreadCount > 0 && <span style={{
              background: '#ef4444',
              color: 'white',
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '10px',
              verticalAlign: 'middle'
            }}>{unreadCount}</span>}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            로딩 중...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              알림이 없습니다
            </div>
            <div style={{ fontSize: '14px' }}>
              새로운 알림이 도착하면 여기에 표시됩니다
            </div>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.is_read) handleMarkRead(notif.id);
                if (notif.action_url) navigate(notif.action_url);
              }}
              style={{
                background: notif.is_read ? 'white' : '#f0f4ff',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                borderLeft: notif.urgent ? '4px solid #ef4444' : notif.is_read ? '4px solid transparent' : '4px solid #667eea',
                cursor: notif.action_url ? 'pointer' : 'default',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>
                  {getTypeIcon(notif.type, notif.urgent)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: notif.is_read ? '500' : '700',
                      color: notif.urgent ? '#dc2626' : '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {notif.title}
                      {notif.urgent && (
                        <span style={{
                          background: '#dc2626',
                          color: 'white',
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}>긴급</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0 4px',
                        flexShrink: 0
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {notif.message && (
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      lineHeight: '1.4',
                      marginBottom: '4px'
                    }}>
                      {notif.message}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {formatTime(notif.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isMobile && (
        <MobileBottomNav activeTab="" onTabChange={handleTabChange} />
      )}
    </div>
  );
};

export default NotificationsPage;
