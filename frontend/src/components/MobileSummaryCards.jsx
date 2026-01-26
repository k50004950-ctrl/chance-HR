import React from 'react';

const MobileSummaryCards = ({ summaryData }) => {
  const {
    notCheckedOut = 0,
    lateToday = 0,
    absentToday = 0,
    contractExpiring = 0,
    unpublishedPayroll = 0
  } = summaryData || {};

  const cards = [];

  // 긴급: 미퇴근
  if (notCheckedOut > 0) {
    cards.push({
      type: 'urgent',
      icon: '⚠️',
      title: '미퇴근 직원',
      value: `${notCheckedOut}명`,
      label: '퇴근 확인이 필요합니다',
      action: 'attendance'
    });
  }

  // 경고: 지각
  if (lateToday > 0) {
    cards.push({
      type: 'warning',
      icon: '⏰',
      title: '오늘 지각',
      value: `${lateToday}명`,
      label: '지각한 직원이 있습니다',
      action: 'attendance'
    });
  }

  // 경고: 결근
  if (absentToday > 0) {
    cards.push({
      type: 'warning',
      icon: '❌',
      title: '오늘 결근',
      value: `${absentToday}명`,
      label: '출근 기록이 없습니다',
      action: 'attendance'
    });
  }

  // 주의: 계약 만료
  if (contractExpiring > 0) {
    cards.push({
      type: 'warning',
      icon: '📋',
      title: '계약 만료 예정',
      value: `${contractExpiring}명`,
      label: '30일 이내 만료',
      action: 'roster'
    });
  }

  // 주의: 미발송 급여
  if (unpublishedPayroll > 0) {
    cards.push({
      type: 'warning',
      icon: '💸',
      title: '급여명세서 미발송',
      value: `${unpublishedPayroll}명`,
      label: '급여일이 다가옵니다',
      action: 'salary-slips'
    });
  }

  // 모든 게 정상인 경우
  if (cards.length === 0) {
    cards.push({
      type: 'success',
      icon: '✓',
      title: '모두 정상',
      value: '완료',
      label: '확인이 필요한 사항이 없습니다',
      action: null
    });
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '700', 
        color: '#374151', 
        marginBottom: '12px',
        paddingLeft: '4px'
      }}>
        📌 해야 할 일
      </h3>
      {cards.map((card, index) => (
        <div
          key={index}
          className={`summary-card summary-card-${card.type}`}
          onClick={() => card.action && card.onAction?.(card.action)}
          style={{ cursor: card.action ? 'pointer' : 'default' }}
        >
          <div className="summary-card-header">
            <div className="summary-card-icon">{card.icon}</div>
            <div>
              <div className="summary-card-title">{card.title}</div>
              <div className="summary-card-label">{card.label}</div>
            </div>
          </div>
          <div className="summary-card-value">{card.value}</div>
        </div>
      ))}
    </div>
  );
};

export default MobileSummaryCards;
