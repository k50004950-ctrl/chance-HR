import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCharts from './DashboardCharts';

const DashboardTab = ({
  isMobile,
  user,
  employees,
  attendance,
  notifications,
  salaryData,
  selectedMonth,
  employeeSlips,
  showAttendanceDetail,
  setShowAttendanceDetail,
  handleTabChange,
  handleNotificationAction,
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ ...(isMobile && { padding: '16px' }) }}>
      {!isMobile && (
        <>
          <h2 style={{ marginBottom: '8px', color: '#111827', fontSize: '28px', fontWeight: '700' }}>
            안녕하세요, {user?.name || '사장님'} 대표님! 👋
          </h2>
          <p style={{ marginBottom: '32px', color: '#6b7280', fontSize: '16px' }}>
            오늘도 수고하셨습니다. 확인이 필요한 사항을 정리했습니다.
          </p>
        </>
      )}

      {/* 모바일 홈 화면 "정보 우선순위" 재배치 */}
      {isMobile && (() => {
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.filter(a => a.date && a.date.split('T')[0] === today);
        const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
        const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
        const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
        const notCheckedIn = Math.max(0, activeEmployees.length - checkedInToday);
        const lateToday = todayAttendance.filter(a => {
          if (!a.check_in_time || !a.employee_work_start_time) return false;
          const checkIn = new Date(a.check_in_time);
          const [h, m] = a.employee_work_start_time.split(':');
          const workStart = new Date(checkIn);
          workStart.setHours(parseInt(h), parseInt(m), 0);
          return checkIn > workStart;
        }).length;
        const totalMonthlyCost = activeEmployees.reduce((sum, emp) => sum + (parseFloat(emp.amount) || 0), 0);
        const urgentCount = notifications.filter(n => n.urgent).length;

        return (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* 긴급 알림 배너 */}
            {urgentCount > 0 && (
              <div onClick={() => navigate('/notifications')} style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
              }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>🚨 긴급 알림 {urgentCount}건</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>확인 →</span>
              </div>
            )}

            {/* 오늘 출근 현황 */}
            {(() => {
              // 상세 데이터 준비
              const checkedInRecords = todayAttendance.filter(a => a.check_in_time);
              const lateRecords = todayAttendance.filter(a => {
                if (!a.check_in_time || !a.employee_work_start_time) return false;
                const checkIn = new Date(a.check_in_time);
                const [hh, mm] = a.employee_work_start_time.split(':');
                const ws = new Date(checkIn);
                ws.setHours(parseInt(hh), parseInt(mm), 0);
                return checkIn > ws;
              });
              const notCheckedInEmps = activeEmployees.filter(emp =>
                !todayAttendance.some(a => a.user_id === emp.id)
              );
              const notCheckedOutRecords = todayAttendance.filter(a => a.check_in_time && !a.check_out_time);

              const formatTime = (t) => {
                if (!t) return '-';
                const d = new Date(t);
                return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
              };
              const getEmpName = (userId) => {
                const emp = employees.find(e => e.id === userId);
                return emp ? emp.name : '알수없음';
              };

              return (
                <div style={{
                  background: 'white', borderRadius: '16px', padding: '20px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  border: notCheckedIn > 0 ? '2px solid #fde68a' : '1px solid #f3f4f6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>📊 오늘 출근 현황</span>
                    <span onClick={() => handleTabChange('attendance')} style={{ fontSize: '12px', color: '#667eea', cursor: 'pointer', fontWeight: '600' }}>전체보기 →</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                    {[
                      { key: 'checkedIn', label: '출근', value: checkedInToday, color: '#059669' },
                      { key: 'late', label: '지각', value: lateToday, color: '#f59e0b' },
                      { key: 'notIn', label: '미출근', value: notCheckedIn, color: notCheckedIn > 0 ? '#ef4444' : '#9ca3af' },
                      { key: 'notOut', label: '미퇴근', value: notCheckedOut, color: notCheckedOut > 0 ? '#ef4444' : '#9ca3af' },
                    ].map(({ key, label, value, color }) => (
                      <div
                        key={key}
                        onClick={(e) => { e.stopPropagation(); setShowAttendanceDetail(showAttendanceDetail === key ? null : key); }}
                        style={{
                          background: showAttendanceDetail === key ? '#ede9fe' : '#f9fafb',
                          borderRadius: '10px', padding: '10px 4px', cursor: 'pointer',
                          border: showAttendanceDetail === key ? '2px solid #667eea' : '2px solid transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 상세 리스트 */}
                  {showAttendanceDetail && (
                    <div style={{
                      marginTop: '14px', background: '#f9fafb', borderRadius: '12px',
                      padding: '14px', maxHeight: '200px', overflowY: 'auto'
                    }}>
                      {showAttendanceDetail === 'checkedIn' && (
                        checkedInRecords.length > 0 ? checkedInRecords.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: i < checkedInRecords.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{getEmpName(r.user_id)}</span>
                            <span style={{ fontSize: '14px', color: '#059669', fontWeight: '600' }}>출근 {formatTime(r.check_in_time)}</span>
                          </div>
                        )) : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px', fontSize: '13px' }}>출근 기록 없음</div>
                      )}
                      {showAttendanceDetail === 'late' && (
                        lateRecords.length > 0 ? lateRecords.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: i < lateRecords.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{getEmpName(r.user_id)}</span>
                            <span style={{ fontSize: '14px', color: '#f59e0b', fontWeight: '600' }}>출근 {formatTime(r.check_in_time)} (지각)</span>
                          </div>
                        )) : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px', fontSize: '13px' }}>지각 없음</div>
                      )}
                      {showAttendanceDetail === 'notIn' && (
                        notCheckedInEmps.length > 0 ? notCheckedInEmps.map((emp, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: i < notCheckedInEmps.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{emp.name}</span>
                            <span style={{ fontSize: '13px', color: '#ef4444' }}>미출근</span>
                          </div>
                        )) : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px', fontSize: '13px' }}>모두 출근 완료</div>
                      )}
                      {showAttendanceDetail === 'notOut' && (
                        notCheckedOutRecords.length > 0 ? notCheckedOutRecords.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: i < notCheckedOutRecords.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{getEmpName(r.user_id)}</span>
                            <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: '600' }}>출근 {formatTime(r.check_in_time)} · 미퇴근</span>
                          </div>
                        )) : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px', fontSize: '13px' }}>미퇴근 없음</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 이번달 급여 */}
            <div onClick={() => handleTabChange('salary')} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px', padding: '20px', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(102,126,234,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '6px' }}>💰 이번 달 예상 인건비</div>
                  <div style={{ color: 'white', fontSize: '26px', fontWeight: '800' }}>{totalMonthlyCost.toLocaleString()}원</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>직원 {activeEmployees.length}명</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '8px 12px', color: 'white', fontSize: '13px', fontWeight: '600' }}>
                  급여처리 →
                </div>
              </div>
            </div>

            {/* 빠른 메뉴 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: '직원관리', icon: '👥', tab: 'roster' },
                { label: '소통방', icon: '💬', tab: 'community' },
                { label: '서류보관함', icon: '📁', tab: 'past-employees' },
              ].map(({ label, icon, tab }) => (
                <button key={tab} onClick={() => handleTabChange(tab)} style={{
                  background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px',
                  padding: '16px 8px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '6px', cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  <span style={{ fontSize: '26px' }}>{icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}</span>
                </button>
              ))}
            </div>

          </div>
        );
      })()}

      {/* 데스크톱 홈 화면: ERP KPI + 요약 카드 */}
      {!isMobile && (
        <div>
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const isSameDate = (dateStr, targetDate) => {
              if (!dateStr) return false;
              return dateStr.split('T')[0] === targetDate;
            };
            const todayAttendance = attendance.filter(a => isSameDate(a.date, today));
            const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
            const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
            const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
            const lateToday = todayAttendance.filter(a => {
              if (!a.check_in_time || !a.employee_work_start_time) return false;
              const checkIn = new Date(a.check_in_time);
              const [hours, minutes] = a.employee_work_start_time.split(':');
              const workStart = new Date(checkIn);
              workStart.setHours(parseInt(hours), parseInt(minutes), 0);
              return checkIn > workStart;
            }).length;
            const notCheckedIn = activeEmployees.length - checkedInToday;
            const currentMonth = new Date().toISOString().slice(0, 7);
            const currentMonthSalaryData = salaryData && salaryData.month === currentMonth ? salaryData : null;
            const totalMonthlyCost = currentMonthSalaryData
              ? currentMonthSalaryData.employees.reduce((sum, emp) => sum + (emp.totalPay || emp.calculatedSalary || 0), 0)
              : activeEmployees.reduce((sum, emp) => sum + (parseFloat(emp.amount) || 0), 0);
            const unconfirmedEmployees = currentMonthSalaryData
              ? currentMonthSalaryData.employees.filter(emp => !emp.confirmed).length
              : activeEmployees.length;
            const riskCount = notifications.length;
            const urgentRiskCount = notifications.filter(n => n.urgent).length;

            return (
              <>
                {/* 페이지 타이틀 */}
                <div style={{ marginBottom: '24px' }}>
                  <h2 className="erp-page-title">안녕하세요, {user?.name || '사장님'} 대표님</h2>
                  <p className="erp-page-subtitle">오늘의 출근 현황과 주요 현황을 확인하세요.</p>
                </div>

                {/* KPI 카드 4개 */}
                <div className="erp-kpi-grid" onClick={() => handleTabChange('attendance')} style={{ cursor: 'pointer' }}>
                  <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                    <div className="erp-kpi-label">정상 출근</div>
                    <div className={`erp-kpi-value ${checkedInToday > 0 ? 'blue' : ''}`}>{checkedInToday}명</div>
                    <div className="erp-kpi-footer">오늘 기준</div>
                  </div>
                  <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                    <div className="erp-kpi-label">지각</div>
                    <div className={`erp-kpi-value ${lateToday > 0 ? 'orange' : ''}`}>{lateToday}명</div>
                    <div className="erp-kpi-footer">오늘 기준</div>
                  </div>
                  <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                    <div className="erp-kpi-label">미출근</div>
                    <div className={`erp-kpi-value ${notCheckedIn > 0 ? 'red' : ''}`}>{notCheckedIn}명</div>
                    <div className="erp-kpi-footer">재직 {activeEmployees.length}명 중</div>
                  </div>
                  <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                    <div className="erp-kpi-label">미퇴근</div>
                    <div className={`erp-kpi-value ${notCheckedOut > 0 ? 'orange' : ''}`}>{notCheckedOut}명</div>
                    <div className="erp-kpi-footer">퇴근 미처리</div>
                  </div>
                </div>

                {/* 요약 카드 3개 */}
                <div className="erp-summary-grid">
                  {/* 급여 현황 */}
                  <div className="erp-summary-card" onClick={() => handleTabChange('salary')}>
                    <div className="erp-summary-card-title">💰 이번 달 급여 현황</div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">예상 총 인건비</span>
                      <span className="erp-summary-row-value blue">{totalMonthlyCost.toLocaleString()}원</span>
                    </div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">재직 직원</span>
                      <span className="erp-summary-row-value">{activeEmployees.length}명</span>
                    </div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">미확정</span>
                      <span className={`erp-summary-row-value ${unconfirmedEmployees > 0 ? 'orange' : ''}`}>{unconfirmedEmployees}명</span>
                    </div>
                  </div>

                  {/* 리스크 센터 카드 */}
                  <div className="erp-summary-card" onClick={() => navigate('/notifications')}
                    style={{ borderLeft: urgentRiskCount > 0 ? '3px solid #EF4444' : undefined }}>
                    <div className="erp-summary-card-title">
                      {urgentRiskCount > 0 ? '🚨' : '📋'} 리스크 센터
                    </div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">총 알림</span>
                      <span className={`erp-summary-row-value ${riskCount > 0 ? 'orange' : ''}`}>{riskCount}건</span>
                    </div>
                    {urgentRiskCount > 0 && (
                      <div className="erp-summary-row">
                        <span className="erp-summary-row-label">긴급 알림</span>
                        <span className="erp-summary-row-value red">{urgentRiskCount}건</span>
                      </div>
                    )}
                    {notifications.slice(0, 2).map((notif, idx) => (
                      <div key={idx} className="erp-summary-row">
                        <span className="erp-summary-row-label">{notif.icon} {notif.title}</span>
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{notif.message}</span>
                      </div>
                    ))}
                  </div>
                  {/* 이번 달 진행 카드 */}
                  <div className="erp-summary-card">
                    <div className="erp-summary-card-title">📈 이번 달 진행 현황</div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">급여명세서 발송</span>
                      <span className="erp-summary-row-value blue">
                        {employeeSlips.filter(s => s.published).length} / {employees.filter(e => e.employment_status === 'active').length}명
                      </span>
                    </div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">이번 달 출근율</span>
                      <span className="erp-summary-row-value green">
                        {(() => {
                          const thisMonth = new Date().toISOString().slice(0, 7);
                          const monthAtt = attendance.filter(a => a.date.startsWith(thisMonth));
                          const done = monthAtt.filter(a => a.check_in_time && a.check_out_time).length;
                          return monthAtt.length > 0 ? `${Math.round(done / monthAtt.length * 100)}%` : '0%';
                        })()}
                      </span>
                    </div>
                    <div className="erp-summary-row">
                      <span className="erp-summary-row-label">재직 직원</span>
                      <span className="erp-summary-row-value">{activeEmployees.length}명</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <DashboardCharts
        employees={employees}
        attendance={attendance}
        salaryData={salaryData}
        selectedMonth={selectedMonth}
        isMobile={isMobile}
      />

      {/* 확인 필요 알림 목록 (데스크톱 전용) */}
      {!isMobile && notifications.filter(n => !n.urgent).length > 0 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">📌 확인해주세요</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.filter(n => !n.urgent).map((notif, idx) => (
              <div
                key={idx}
                onClick={() => handleNotificationAction(notif.action)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-page)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  transition: 'background 0.15s',
                  gap: '16px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '20px' }}>{notif.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{notif.title}</span>
                  <span style={{ fontSize: '14px', color: '#2563EB', fontWeight: '600' }}>{notif.message}</span>
                </div>
                <span style={{ fontSize: '13px', color: '#6B7280', flexShrink: 0 }}>자세히 보기 ›</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardTab;
