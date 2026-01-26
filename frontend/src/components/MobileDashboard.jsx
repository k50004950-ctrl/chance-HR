import React from 'react';

const MobileDashboard = ({ 
  workplaces, 
  selectedWorkplace, 
  onWorkplaceChange,
  notifications,
  stats,
  onNavigate,
  user
}) => {
  return (
    <div>
      {/* 헤더 */}
      <div className="mobile-header">
        <h1 className="mobile-header-title">
          안녕하세요, {user?.name || '사장님'}! 👋
        </h1>
      </div>

      {/* 사업장 선택 */}
      {workplaces.length > 0 && (
        <div className="mobile-workplace-select">
          <select
            value={selectedWorkplace || ''}
            onChange={(e) => onWorkplaceChange(parseInt(e.target.value))}
          >
            {workplaces.map((wp) => (
              <option key={wp.id} value={wp.id}>
                {wp.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 긴급 알림 카드 */}
      {notifications.filter(n => n.urgent).map((notif, idx) => (
        <div
          key={idx}
          className="mobile-action-card urgent"
          onClick={() => onNavigate(notif.action)}
        >
          <div className="mobile-card-header">
            <div className="mobile-card-icon">{notif.icon}</div>
            <div className="mobile-card-badge">긴급</div>
          </div>
          <h3 className="mobile-card-title">{notif.title}</h3>
          <p className="mobile-card-desc">{notif.message}</p>
        </div>
      ))}

      {/* 일반 알림 카드 */}
      {notifications.filter(n => !n.urgent).slice(0, 2).map((notif, idx) => (
        <div
          key={idx}
          className="mobile-action-card warning"
          onClick={() => onNavigate(notif.action)}
        >
          <div className="mobile-card-header">
            <div className="mobile-card-icon">{notif.icon}</div>
          </div>
          <h3 className="mobile-card-title">{notif.title}</h3>
          <p className="mobile-card-desc">{notif.message}</p>
        </div>
      ))}

      {/* 통계 카드 */}
      <div className="mobile-stats-grid">
        <div className="mobile-stat-card" onClick={() => onNavigate('attendance')}>
          <div className="mobile-stat-icon">📊</div>
          <div className="mobile-stat-value">{stats.todayAttendance}/{stats.totalEmployees}</div>
          <div className="mobile-stat-label">오늘 출근</div>
        </div>

        <div className="mobile-stat-card" onClick={() => onNavigate('attendance')}>
          <div className="mobile-stat-icon">
            {stats.notCheckedOut > 0 ? '⚠️' : '✅'}
          </div>
          <div className="mobile-stat-value" style={{ 
            color: stats.notCheckedOut > 0 ? '#ef4444' : '#10b981' 
          }}>
            {stats.notCheckedOut}명
          </div>
          <div className="mobile-stat-label">미퇴근</div>
        </div>

        <div className="mobile-stat-card" onClick={() => onNavigate('roster')}>
          <div className="mobile-stat-icon">👥</div>
          <div className="mobile-stat-value">{stats.totalEmployees}명</div>
          <div className="mobile-stat-label">전체 직원</div>
        </div>

        <div className="mobile-stat-card" onClick={() => onNavigate('salary-slips')}>
          <div className="mobile-stat-icon">💸</div>
          <div className="mobile-stat-value">
            {stats.monthlyPayrollStatus.published}/{stats.monthlyPayrollStatus.total}
          </div>
          <div className="mobile-stat-label">급여 발송</div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="mobile-list">
        <div className="mobile-list-item" onClick={() => onNavigate('attendance')}>
          <div className="mobile-list-item-content">
            <h4 className="mobile-list-item-title">📊 오늘 출근 현황</h4>
            <p className="mobile-list-item-subtitle">
              실시간 출퇴근 확인 및 관리
            </p>
          </div>
          <div className="mobile-list-item-icon">›</div>
        </div>

        <div className="mobile-list-item" onClick={() => onNavigate('salary')}>
          <div className="mobile-list-item-content">
            <h4 className="mobile-list-item-title">💸 급여 계산</h4>
            <p className="mobile-list-item-subtitle">
              이번 달 급여 계산 및 확인
            </p>
          </div>
          <div className="mobile-list-item-icon">›</div>
        </div>

        <div className="mobile-list-item" onClick={() => onNavigate('roster')}>
          <div className="mobile-list-item-content">
            <h4 className="mobile-list-item-title">👥 직원 관리</h4>
            <p className="mobile-list-item-subtitle">
              직원 정보 및 근무 조건 관리
            </p>
          </div>
          <div className="mobile-list-item-icon">›</div>
        </div>

        <div className="mobile-list-item" onClick={() => onNavigate('salary-slips')}>
          <div className="mobile-list-item-content">
            <h4 className="mobile-list-item-title">📝 급여명세서</h4>
            <p className="mobile-list-item-subtitle">
              급여명세서 작성 및 발송
            </p>
          </div>
          <div className="mobile-list-item-icon">›</div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
