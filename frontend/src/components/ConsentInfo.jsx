import React from 'react';

const ConsentInfo = ({ privacyConsent, locationConsent, privacyConsentDate, locationConsentDate }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h4 style={{ marginBottom: '16px', color: '#374151', fontSize: '16px', fontWeight: '600', borderBottom: '2px solid #d1d5db', paddingBottom: '8px' }}>
        🔒 개인정보 수집·이용 동의 기록
      </h4>
      
      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {privacyConsent ? (
              <span style={{ color: '#10b981', fontSize: '20px', marginRight: '8px' }}>✅</span>
            ) : (
              <span style={{ color: '#dc2626', fontSize: '20px', marginRight: '8px' }}>❌</span>
            )}
            <strong style={{ fontSize: '14px', color: '#374151' }}>개인정보 수집·이용 동의</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '28px' }}>
            {privacyConsent ? (
              <>
                <div>✓ 동의 완료</div>
                <div>동의 일시: {formatDate(privacyConsentDate)}</div>
              </>
            ) : (
              <div style={{ color: '#dc2626' }}>직원이 아직 동의하지 않았습니다.</div>
            )}
          </div>
        </div>

        <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {locationConsent ? (
              <span style={{ color: '#10b981', fontSize: '20px', marginRight: '8px' }}>✅</span>
            ) : (
              <span style={{ color: '#dc2626', fontSize: '20px', marginRight: '8px' }}>❌</span>
            )}
            <strong style={{ fontSize: '14px', color: '#374151' }}>위치정보 수집·이용 동의 (출퇴근 확인 전용)</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '28px' }}>
            {locationConsent ? (
              <>
                <div>✓ 동의 완료</div>
                <div>동의 일시: {formatDate(locationConsentDate)}</div>
              </>
            ) : (
              <div style={{ color: '#dc2626' }}>직원이 아직 동의하지 않았습니다.</div>
            )}
          </div>
        </div>
      </div>

      {(!privacyConsent || !locationConsent) && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24' }}>
          <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
            💡 <strong>안내:</strong> 직원이 최초 로그인 시 개인정보 및 위치정보 수집·이용 동의 절차를 진행합니다.<br/>
            동의가 완료되면 이 화면에 동의 일시가 자동으로 기록됩니다.
          </p>
        </div>
      )}

      <div style={{ marginTop: '16px', padding: '12px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #7dd3fc' }}>
        <p style={{ fontSize: '12px', color: '#0c4a6e', margin: 0, lineHeight: '1.6' }}>
          📌 <strong>법적 보관 안내:</strong> 동의 기록과 근로관계·급여 관련 기록은 관계 법령상 보존이 필요한 기간 동안 분리 보관될 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default ConsentInfo;
