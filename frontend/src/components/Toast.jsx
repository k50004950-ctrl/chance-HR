import React, { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' 
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : type === 'error'
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  // 모바일: 하단 중앙, 데스크톱: 우상단
  const positionStyle = isMobile ? {
    bottom: 'calc(80px + env(safe-area-inset-bottom))', // 하단 네비(65px) + 여유(15px) + safe-area
    left: '50%',
    transform: 'translateX(-50%)',
    animation: 'slideInUp 0.3s ease-out'
  } : {
    top: '24px',
    right: '24px',
    animation: 'slideInRight 0.3s ease-out'
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 10000,
        minWidth: isMobile ? 'calc(100% - 32px)' : '300px',
        maxWidth: isMobile ? 'calc(100% - 32px)' : '500px',
        background: bgColor,
        color: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...positionStyle
      }}
    >
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ 
        flex: 1, 
        fontSize: '15px', 
        fontWeight: '600',
        minWidth: 0,
        wordBreak: 'keep-all',
        overflowWrap: 'break-word'
      }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0',
          minWidth: '24px',
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: '0.8',
          flexShrink: 0
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
