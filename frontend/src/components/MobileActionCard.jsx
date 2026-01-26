import React from 'react';

const MobileActionCard = ({ icon, title, count, color = '#667eea', urgent = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        background: urgent ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'white',
        border: urgent ? '2px solid #ef4444' : '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        touchAction: 'manipulation',
        minHeight: '88px',
        boxShadow: urgent ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
        ...(urgent && { animation: 'pulse 2s infinite' })
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div style={{
        fontSize: '48px',
        lineHeight: 1,
        filter: urgent ? 'none' : 'grayscale(0.2)'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          color: urgent ? '#991b1b' : '#6b7280',
          marginBottom: '4px',
          fontWeight: '500',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word'
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '28px',
          fontWeight: '700',
          color: urgent ? '#dc2626' : color,
          wordBreak: 'keep-all'
        }}>
          {count}
        </div>
      </div>
      {urgent && (
        <div style={{
          background: '#dc2626',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '700',
          whiteSpace: 'nowrap'
        }}>
          긴급
        </div>
      )}
      <div style={{
        fontSize: '20px',
        color: '#9ca3af'
      }}>
        ›
      </div>
    </div>
  );
};

export default MobileActionCard;
