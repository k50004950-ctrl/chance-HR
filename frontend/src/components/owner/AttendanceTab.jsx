import React from 'react';

const toDateStr = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

/**
 * AttendanceTab - Extracted from OwnerDashboard.jsx (lines 4061-4670)
 *
 * Required props:
 *
 * State:
 *   - attendance          : array of attendance records
 *   - employees           : array of employee objects
 *   - isMobile            : boolean
 *   - selectedMonth       : string (YYYY-MM)
 *   - qrCollapsed         : boolean
 *   - qrLoading           : boolean
 *   - qrData              : object | null  ({ checkInQr, checkOutQr })
 *   - qrPrintMessage      : string
 *   - qrPrintSaving       : boolean
 *   - attendanceStats     : object | null  ({ totalRecords, completedRecords, incompleteRecords, totalWorkHours, employeeStats })
 *   - highlightedRecordId : number | null
 *
 * Setters:
 *   - setActiveTab        : function
 *   - setSelectedMonth    : function
 *   - setQrCollapsed      : function
 *   - setQrPrintMessage   : function
 *
 * Handlers:
 *   - handleGenerateQr       : function(bool)
 *   - handlePrintQr          : function
 *   - handleSaveQrPrintMessage : function
 *   - openModal              : function(type, data)
 *
 * Utilities:
 *   - getAttendanceStatus : function(record) => { type, label, color, bgColor }
 *   - formatDate          : function(dateStr) => string
 *   - formatTime          : function(timeStr) => string
 */

const AttendanceTab = ({
  attendance,
  employees,
  isMobile,
  selectedMonth,
  qrCollapsed,
  qrLoading,
  qrData,
  qrPrintMessage,
  qrPrintSaving,
  attendanceStats,
  highlightedRecordId,
  setActiveTab,
  setSelectedMonth,
  setQrCollapsed,
  setQrPrintMessage,
  handleGenerateQr,
  handlePrintQr,
  handleSaveQrPrintMessage,
  openModal,
  getAttendanceStatus,
  formatDate,
  formatTime,
}) => {
  return (
              <div>
                {/* 오늘 출근 상황 요약 바 */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRecords = attendance.filter(a => toDateStr(a.date) === today);
                  const completedToday = todayRecords.filter(a => {
                    const status = getAttendanceStatus(a);
                    return status.type === 'completed';
                  });
                  const lateToday = todayRecords.filter(a => {
                    const status = getAttendanceStatus(a);
                    return status.type === 'late';
                  });
                  const notCheckedIn = employees.filter(emp =>
                    emp.employment_status === 'active' &&
                    !todayRecords.some(r => r.employee_name === emp.name)
                  );
                  const notCheckedOut = todayRecords.filter(a => a.check_in_time && !a.check_out_time && !a.leave_type);

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '16px',
                      padding: isMobile ? '20px 16px' : '24px 28px',
                      marginBottom: '24px',
                      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{
                        color: 'white',
                        fontSize: isMobile ? '18px' : '20px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>📊</span>
                        <span>오늘 출근 상황</span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: isMobile ? '12px' : '16px'
                      }}>
                        {/* 정상 */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>✓ 정상</div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#059669' }}>
                            {completedToday.length}
                          </div>
                        </div>

                        {/* 지각 */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>🕐 지각</div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#f59e0b' }}>
                            {lateToday.length}
                          </div>
                        </div>

                        {/* 미출근 - 강조 */}
                        <div style={{
                          background: notCheckedIn.length > 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: notCheckedIn.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: notCheckedIn.length > 0 ? '2px solid #dc2626' : 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: notCheckedIn.length > 0 ? '#fff' : '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            ❌ 미출근
                          </div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: notCheckedIn.length > 0 ? '#fff' : '#6b7280' }}>
                            {notCheckedIn.length}
                          </div>
                        </div>

                        {/* 미퇴근 - 강조 */}
                        <div style={{
                          background: notCheckedOut.length > 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: notCheckedOut.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: notCheckedOut.length > 0 ? '2px solid #dc2626' : 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: notCheckedOut.length > 0 ? '#fff' : '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            ⚠️ 미퇴근
                          </div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: notCheckedOut.length > 0 ? '#fff' : '#6b7280' }}>
                            {notCheckedOut.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: '#374151', margin: 0 }}>📊 당월 출근현황</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('calendar')}
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      📅 출근 달력
                    </button>
                    <input
                      type="month"
                      className="form-input"
                      style={{ width: 'auto' }}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                </div>

              {/* QR 출퇴근 */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: '#374151' }}>📷 QR 출퇴근</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setQrCollapsed(!qrCollapsed)}
                    >
                      {qrCollapsed ? '열기' : '접기'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleGenerateQr(false)}
                      disabled={qrLoading}
                    >
                      {qrLoading ? '생성 중...' : (qrData ? 'QR 새로고침' : 'QR 생성')}
                    </button>
                    {qrData && (
                      <button
                        className="btn btn-secondary"
                        onClick={handlePrintQr}
                      >
                        🖨️ 인쇄
                      </button>
                    )}
                  </div>
                </div>

                {!qrCollapsed && (
                  <>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                      위치 인식이 어려운 경우 직원이 QR을 스캔해서 출퇴근을 기록할 수 있습니다. QR은 사업장별로 고정됩니다.
                    </div>

                    {qrData ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#065f46' }}>출근 QR</div>
                          <img src={qrData.checkInQr} alt="출근 QR" style={{ width: '180px', height: '180px' }} />
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#92400e' }}>퇴근 QR</div>
                          <img src={qrData.checkOutQr} alt="퇴근 QR" style={{ width: '180px', height: '180px' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                        QR을 생성하면 이곳에 출근/퇴근 QR이 표시됩니다.
                      </div>
                    )}

                    <div style={{ marginTop: '16px' }}>
                      <label className="form-label">인쇄용 문구 (선택)</label>
                      <textarea
                        className="form-input"
                        rows={5}
                        value={qrPrintMessage}
                        onChange={(e) => setQrPrintMessage(e.target.value)}
                        placeholder={`예시\n1. 퇴근 전 보일러 체크!\n2. 출근 후 청소상태 확인\n3.\n4.`}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={handleSaveQrPrintMessage}
                          disabled={qrPrintSaving}
                        >
                          {qrPrintSaving ? '저장 중...' : '문구 저장'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

                {/* 통계 카드 */}
                {attendanceStats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>총 출근 기록</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{attendanceStats.totalRecords}건</div>
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>정상 출퇴근</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{attendanceStats.completedRecords}건</div>
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>미완료</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{attendanceStats.incompleteRecords}건</div>
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>총 근무시간</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{(Number(attendanceStats.totalWorkHours) || 0).toFixed(1)}h</div>
                    </div>
                  </div>
                )}

                {/* 직원별 통계 */}
                {attendanceStats && attendanceStats.employeeStats.length > 0 && (
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '16px', color: '#374151' }}>직원별 출근 통계</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>직원명</th>
                            <th>총 출근일</th>
                            <th>정상 출퇴근</th>
                            <th>미완료</th>
                            <th>총 근무시간</th>
                            <th>평균 근무시간</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceStats.employeeStats.map((stat, index) => (
                            <tr key={index}>
                              <td style={{ fontWeight: '600' }}>{stat.employeeName}</td>
                              <td>{stat.totalDays}일</td>
                              <td>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  fontWeight: '600',
                                  fontSize: '12px'
                                }}>
                                  {stat.completedDays}일
                                </span>
                              </td>
                              <td>
                                {stat.incompleteDays > 0 ? (
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    fontWeight: '600',
                                    fontSize: '12px'
                                  }}>
                                    {stat.incompleteDays}일
                                  </span>
                                ) : (
                                  <span style={{ color: '#6b7280' }}>-</span>
                                )}
                              </td>
                              <td style={{ fontWeight: '600' }}>{(Number(stat.totalHours) || 0).toFixed(1)}h</td>
                              <td>{stat.completedDays > 0 ? (Number(stat.totalHours) / stat.completedDays).toFixed(1) : '0'}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 미퇴근 직원 Alert */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRecords = attendance.filter(a => toDateStr(a.date) === today);
                  const notCheckedOut = todayRecords.filter(a => a.check_in_time && !a.check_out_time);

                  if (notCheckedOut.length > 0) {
                    return (
                      <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        border: '2px solid #f87171',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 6px rgba(248, 113, 113, 0.2)'
                      }}>
                        <div style={{ fontSize: '32px' }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#991b1b', marginBottom: '4px' }}>
                            오늘 미퇴근 직원이 {notCheckedOut.length}명 있습니다
                          </div>
                          <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                            {notCheckedOut.map(r => r.employee_name).join(', ')}
                          </div>
                        </div>
                        <button
                          className="btn"
                          onClick={() => setActiveTab('attendance')}
                          style={{
                            background: '#dc2626',
                            color: 'white',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          확인하기
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 상세 출퇴근 기록 */}
                <div className="card">
                  <h4 style={{ marginBottom: '16px', color: '#374151' }}>상세 출퇴근 기록</h4>

                  {attendance.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px' }}>
                      <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
                      <p style={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
                        출퇴근 기록이 없습니다
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        직원들이 출퇴근을 기록하면 여기에 표시됩니다
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 데스크톱 테이블 뷰 */}
                      <div className="attendance-table-view" style={{ overflowX: 'auto' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>직원명</th>
                              <th>날짜</th>
                              <th>출근</th>
                              <th>퇴근</th>
                              <th>근무시간</th>
                              <th>상태</th>
                              <th>관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // 정렬 우선순위: 미출근/미퇴근 > 지각 > 정상
                              const sortedAttendance = [...attendance].sort((a, b) => {
                                const statusA = getAttendanceStatus(a);
                                const statusB = getAttendanceStatus(b);

                                const priorityMap = {
                                  'notCheckedOut': 1,
                                  'incomplete': 1,
                                  'late': 2,
                                  'completed': 3
                                };

                                const priorityA = priorityMap[statusA.type] || 4;
                                const priorityB = priorityMap[statusB.type] || 4;

                                // 우선순위가 같으면 날짜 최신순
                                if (priorityA === priorityB) {
                                  return new Date(b.date) - new Date(a.date);
                                }

                                return priorityA - priorityB;
                              });

                              return sortedAttendance.map((record) => {
                              const status = getAttendanceStatus(record);
                              return (
                                <tr
                                  key={record.id}
                                  className="attendance-row"
                                  style={{
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '';
                                  }}
                                >
                                  <td style={{ fontWeight: '600' }}>{record.employee_name}</td>
                                  <td>{formatDate(record.date)}</td>
                                  <td>{formatTime(record.check_in_time)}</td>
                                  <td>{formatTime(record.check_out_time)}</td>
                                  <td style={{ fontWeight: '600' }}>{record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}</td>
                                  <td>
                                    <span style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      background: status.bgColor || '#f3f4f6',
                                      color: status.color,
                                      display: 'inline-block'
                                    }}>
                                      {status.label}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ fontSize: '12px', padding: '6px 12px' }}
                                      onClick={() => openModal('editAttendance', record)}
                                    >
                                      ✏️ 수정
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* 모바일 카드 뷰 */}
                      <div className="attendance-card-view">
                        {(() => {
                          // 정렬 우선순위: 미출근/미퇴근 > 지각 > 정상
                          const sortedAttendance = [...attendance].sort((a, b) => {
                            const statusA = getAttendanceStatus(a);
                            const statusB = getAttendanceStatus(b);

                            const priorityMap = {
                              'notCheckedOut': 1,
                              'incomplete': 1,
                              'late': 2,
                              'completed': 3
                            };

                            const priorityA = priorityMap[statusA.type] || 4;
                            const priorityB = priorityMap[statusB.type] || 4;

                            // 우선순위가 같으면 날짜 최신순
                            if (priorityA === priorityB) {
                              return new Date(b.date) - new Date(a.date);
                            }

                            return priorityA - priorityB;
                          });

                          return sortedAttendance.map((record) => {
                          const status = getAttendanceStatus(record);
                          const isProblem = status.type === 'incomplete' || status.type === 'notCheckedOut';
                          return (
                            <div
                              key={record.id}
                              className={`attendance-card ${highlightedRecordId === record.id ? 'card-highlight' : ''}`}
                              style={{
                                ...(isProblem && {
                                  border: '2px solid #ef4444',
                                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                })
                              }}
                            >
                              {/* 상단: 직원명 + 상태배지 */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                minHeight: '32px'
                              }}>
                                <div style={{
                                  fontSize: '17px',
                                  fontWeight: '700',
                                  color: '#111827',
                                  flex: 1,
                                  minWidth: 0,
                                  paddingRight: '12px'
                                }}>
                                  {record.employee_name}
                                </div>
                                <span style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  background: status.bgColor || '#f3f4f6',
                                  color: status.color,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {status.label}
                                </span>
                              </div>

                              {/* 본문: 2열 그리드 */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '16px 12px',
                                marginBottom: '16px',
                                padding: '12px',
                                background: '#f9fafb',
                                borderRadius: '8px'
                              }}>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>📅 날짜</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#374151' }}>{formatDate(record.date)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>⏱️ 근무시간</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#374151' }}>
                                    {record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>🟢 출근</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#059669' }}>{formatTime(record.check_in_time)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>🔴 퇴근</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>{formatTime(record.check_out_time)}</div>
                                </div>
                              </div>

                              {/* 하단: 수정 버튼 full-width */}
                              <button
                                className="btn"
                                style={{
                                  width: '100%',
                                  fontSize: '14px',
                                  fontWeight: '700',
                                  padding: '14px 16px',
                                  minHeight: '48px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  ...(isProblem && {
                                    background: '#dc2626',
                                    color: 'white',
                                    boxShadow: '0 4px 8px rgba(220, 38, 38, 0.3)',
                                    border: 'none'
                                  })
                                }}
                                onClick={() => openModal('editAttendance', record)}
                              >
                                <span style={{ fontSize: '16px' }}>✏️</span>
                                <span>{isProblem ? '즉시 수정 필요' : '출근기록 수정'}</span>
                              </button>
                            </div>
                          );
                        });
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
  );
};

export default AttendanceTab;
