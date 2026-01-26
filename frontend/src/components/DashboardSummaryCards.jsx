import React from 'react';

const DashboardSummaryCards = ({ 
  todayAttendance = 0, 
  totalEmployees = 0, 
  notCheckedOut = 0,
  monthlyPayrollStatus = {}
}) => {
  return (
    <div className="grid grid-3" style={{ marginBottom: '32px', gap: '20px' }}>
      {/* 오늘 출근 인원 */}
      <div className="stat-card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>
          👥 오늘 출근 현황
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '4px' }}>
          {todayAttendance} / {totalEmployees}
        </div>
        <div style={{ fontSize: '13px', opacity: '0.85' }}>
          {totalEmployees > 0 ? `${Math.round((todayAttendance / totalEmployees) * 100)}%` : '0%'} 출근
        </div>
      </div>

      {/* 미퇴근 인원 */}
      <div className="stat-card" style={{ 
        background: notCheckedOut > 0 
          ? 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)'
          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: notCheckedOut > 0 
          ? '0 4px 6px rgba(248, 113, 113, 0.3)'
          : '0 4px 6px rgba(16, 185, 129, 0.3)',
        animation: notCheckedOut > 0 ? 'pulse 2s infinite' : 'none'
      }}>
        <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>
          ⏰ 미퇴근 인원
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '4px' }}>
          {notCheckedOut}명
        </div>
        <div style={{ fontSize: '13px', opacity: '0.85' }}>
          {notCheckedOut > 0 ? '⚠️ 퇴근 확인 필요' : '✅ 모두 퇴근'}
        </div>
      </div>

      {/* 이번 달 급여 진행 상태 */}
      <div className="stat-card" style={{ 
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>
          💰 이번 달 급여명세서
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '4px' }}>
          {monthlyPayrollStatus.published || 0} / {monthlyPayrollStatus.total || 0}
        </div>
        <div style={{ fontSize: '13px', opacity: '0.85' }}>
          {monthlyPayrollStatus.total > 0 && monthlyPayrollStatus.published === monthlyPayrollStatus.total
            ? '✅ 배포 완료'
            : monthlyPayrollStatus.published > 0
            ? '📝 진행 중'
            : '⏳ 대기 중'}
        </div>
      </div>
    </div>
  );
};

export default DashboardSummaryCards;
