import React from 'react';

const MainActionButtons = ({ 
  onAddEmployee, 
  onViewAttendance, 
  onCreatePayroll 
}) => {
  return (
    <div className="grid grid-3" style={{ gap: '20px', marginBottom: '32px' }}>
      {/* 직원 추가 */}
      <button
        className="btn"
        onClick={onAddEmployee}
        style={{
          padding: '32px 24px',
          fontSize: '18px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
        }}
      >
        <div style={{ fontSize: '48px' }}>👤</div>
        <div>+ 직원 추가</div>
        <div style={{ fontSize: '13px', opacity: '0.9', fontWeight: '400' }}>
          새로운 직원을 등록합니다
        </div>
      </button>

      {/* 오늘 출근 현황 */}
      <button
        className="btn"
        onClick={onViewAttendance}
        style={{
          padding: '32px 24px',
          fontSize: '18px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        }}
      >
        <div style={{ fontSize: '48px' }}>📊</div>
        <div>오늘 출근 현황</div>
        <div style={{ fontSize: '13px', opacity: '0.9', fontWeight: '400' }}>
          실시간 출퇴근 확인
        </div>
      </button>

      {/* 급여명세서 생성 */}
      <button
        className="btn"
        onClick={onCreatePayroll}
        style={{
          padding: '32px 24px',
          fontSize: '18px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        }}
      >
        <div style={{ fontSize: '48px' }}>💰</div>
        <div>급여명세서 생성</div>
        <div style={{ fontSize: '13px', opacity: '0.9', fontWeight: '400' }}>
          이번 달 급여 관리
        </div>
      </button>
    </div>
  );
};

export default MainActionButtons;
