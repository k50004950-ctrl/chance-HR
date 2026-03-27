import React from 'react';

/**
 * PremiumLock - overlay/badge shown when a feature is locked behind premium plan
 *
 * Usage:
 *   <PremiumLock feature="excel_import" currentPlan="free" onUpgrade={handleUpgrade}>
 *     <SomeComponent />
 *   </PremiumLock>
 *
 * Or as inline badge:
 *   <PremiumLock.Badge />
 */

const FEATURE_LABELS = {
  excel_import: '엑셀 가져오기',
  email: '급여명세서 이메일',
  contracts: '근로계약서',
  manual_calc: '수기급여계산',
  community: '커뮤니티',
  push: '푸시알림'
};

const PremiumLock = ({ feature, currentPlan, onUpgrade, children }) => {
  const isPremium = currentPlan === 'premium';

  if (isPremium) {
    return <>{children}</>;
  }

  const label = FEATURE_LABELS[feature] || feature;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        opacity: 0.4,
        pointerEvents: 'none',
        userSelect: 'none',
        filter: 'blur(1px)'
      }}>
        {children}
      </div>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: '12px',
        zIndex: 10
      }}>
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '24px 32px',
          textAlign: 'center',
          maxWidth: '360px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>
            프리미엄 기능
          </h4>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
            '{label}' 기능은 프리미엄 플랜에서
            <br />사용할 수 있습니다.
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              style={{
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0369a1'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#0284c7'}
            >
              프리미엄 업그레이드
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Small inline badge for premium features
 */
PremiumLock.Badge = ({ style }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    verticalAlign: 'middle',
    ...style
  }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
    프리미엄
  </span>
);

export default PremiumLock;
