import React from 'react';

/**
 * RosterTab - Extracted from OwnerDashboard.jsx (lines 3166-3616)
 *
 * Required props:
 *   State:
 *     - employees                 : Array    - full employees list
 *     - isMobile                  : Boolean  - mobile viewport flag
 *     - employmentStatusFilter    : String   - current filter ('all'|'active'|'on_leave'|'resigned')
 *     - rosterViewMode            : String   - 'table' | 'cards'
 *
 *   State setters:
 *     - setEmploymentStatusFilter : Function - update employmentStatusFilter
 *     - setRosterViewMode         : Function - update rosterViewMode
 *     - setActiveTab              : Function - switch dashboard tab (used for 'resigned', 'past-employees')
 *
 *   Handlers:
 *     - openModal                 : Function - (type, emp?) => void  - opens employee modal
 *     - openResignationModal      : Function - (emp) => void         - opens resignation modal
 *     - handleViewSalaryHistory   : Function - (empId, empName) => void
 *
 *   Utilities:
 *     - formatDate                : Function - (dateStr) => string
 *     - formatCurrency            : Function - (amount) => string
 *     - getSalaryTypeName         : Function - (salaryType) => string
 */

const RosterTab = ({
  employees,
  isMobile,
  employmentStatusFilter,
  rosterViewMode,
  setEmploymentStatusFilter,
  setRosterViewMode,
  setActiveTab,
  openModal,
  openResignationModal,
  handleViewSalaryHistory,
  formatDate,
  formatCurrency,
  getSalaryTypeName,
}) => {
  return (
              <div className="card">
                {/* 직원현황 요약 바 */}
                {(() => {
                  const totalEmployees = employees.length;
                  const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
                  const onLeaveEmployees = employees.filter(emp => emp.employment_status === 'on_leave');
                  const resignedEmployees = employees.filter(emp => emp.employment_status === 'resigned');

                  // 리스크 판단 로직
                  const getEmployeeRisks = (emp) => {
                    const risks = [];
                    // 서류 필요
                    if (!emp.contract_file_url) {
                      risks.push({ type: 'contract', label: '서류 필요', color: '#f59e0b' });
                    }
                    // 급여 미설정
                    if (!emp.salary_type || !emp.amount || emp.amount === 0 || emp.amount === '0' || emp.amount === '0.00') {
                      risks.push({ type: 'salary', label: '급여 미설정', color: '#ef4444' });
                    }
                    // 퇴사 처리 필요 (퇴사 상태인데 퇴사일 없음)
                    if (emp.employment_status === 'resigned' && !emp.resignation_date) {
                      risks.push({ type: 'resignation', label: '퇴사 처리 필요', color: '#ef4444' });
                    }
                    return risks;
                  };

                  const employeesWithRisks = employees.filter(emp => getEmployeeRisks(emp).length > 0);
                  const riskCount = employeesWithRisks.length;

                  return !isMobile ? (
                    <div className="erp-roster-summary">
                      <div className="erp-roster-summary-title">👥 직원 현황</div>
                      <div className="erp-roster-stats">
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">전체</div>
                          <div className="erp-roster-stat-value" style={{ color: '#2563EB' }}>{totalEmployees}</div>
                        </div>
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">재직</div>
                          <div className="erp-roster-stat-value" style={{ color: '#10B981' }}>{activeEmployees.length}</div>
                        </div>
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">휴직</div>
                          <div className="erp-roster-stat-value">{onLeaveEmployees.length}</div>
                        </div>
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">퇴사</div>
                          <div className="erp-roster-stat-value" style={{ color: '#9CA3AF' }}>{resignedEmployees.length}</div>
                        </div>
                        <div className={`erp-roster-stat ${riskCount > 0 ? 'risk' : ''}`}>
                          <div className="erp-roster-stat-label">⚠️ 주의 필요</div>
                          <div className="erp-roster-stat-value">{riskCount}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '16px',
                      padding: '20px 16px',
                      marginBottom: '24px',
                      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>👥 직원현황</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>👤 전체</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea' }}>{totalEmployees}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>✓ 재직</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>{activeEmployees.length}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>🔵 휴직</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{onLeaveEmployees.length}</div>
                        </div>
                        <div style={{ background: riskCount > 0 ? 'rgba(245,158,11,0.95)' : 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center', gridColumn: 'span 2' }}>
                          <div style={{ fontSize: '12px', color: riskCount > 0 ? '#fff' : '#6b7280', marginBottom: '8px' }}>⚠️ 주의 필요</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: riskCount > 0 ? '#fff' : '#6b7280' }}>{riskCount}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 모바일 전용 헤더 */}
                {isMobile ? (
                  <div className="mobile-employee-header">
                    <div className="mobile-tabs">
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('all')}
                      >
                        전체
                      </button>
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('active')}
                      >
                        재직
                      </button>
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'on_leave' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('on_leave')}
                      >
                        휴직
                      </button>
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'resigned' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('resigned')}
                      >
                        퇴사
                      </button>
                    </div>
                    <button
                      className="mobile-add-btn"
                      onClick={() => openModal('employee')}
                    >
                      <span>+</span>
                    </button>
                  </div>
                ) : (
                  /* 데스크톱 헤더 */
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>
                      <div>
                        <h3 style={{ color: '#374151', marginBottom: '12px' }}>📋 근로자 명부</h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className={`btn ${employmentStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setEmploymentStatusFilter('all')}
                          >
                            전체
                          </button>
                          <button
                            className={`btn ${employmentStatusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setEmploymentStatusFilter('active')}
                          >
                            재직중
                          </button>
                          <button
                            className={`btn ${employmentStatusFilter === 'on_leave' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setEmploymentStatusFilter('on_leave')}
                          >
                            휴직
                          </button>
                          <button
                            className={`btn ${employmentStatusFilter === 'resigned' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setEmploymentStatusFilter('resigned')}
                          >
                            퇴사
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className={`btn ${rosterViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setRosterViewMode('table')}
                          >
                            표 보기
                          </button>
                          <button
                            className={`btn ${rosterViewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setRosterViewMode('cards')}
                          >
                            카드 보기
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('resigned')}
                          style={{ fontSize: '14px', padding: '8px 16px' }}
                        >
                          🧾 퇴사 처리
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('past-employees')}
                          style={{ fontSize: '14px', padding: '8px 16px' }}
                        >
                          📁 서류 보관함
                        </button>
                        {/* V2: 초대 링크 대신 매칭 승인 사용 */}
                      </div>
                    </div>

                    <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
                      📌 등록된 모든 직원의 상세 정보를 한눈에 확인할 수 있습니다.
                    </p>
                  </>
                )}

                {employees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    등록된 직원이 없습니다.
                  </p>
                ) : (
                  <>
                    {!isMobile && rosterViewMode === 'table' ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table table-mobile-cards">
                          <thead>
                            <tr>
                              <th>이름</th>
                              <th>상태</th>
                              <th>주민번호</th>
                              <th>생일</th>
                              <th>전화번호</th>
                              <th>주소</th>
                              <th>직책</th>
                              <th>입사일</th>
                              <th>급여유형</th>
                              <th>급여</th>
                              <th>인건비 신고</th>
                              <th>개인정보동의</th>
                              <th>비상연락망</th>
                              <th>관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // 리스크 판단 로직
                              const getEmployeeRisks = (emp) => {
                                const risks = [];
                                if (!emp.contract_file_url) {
                                  risks.push({ type: 'contract', label: '서류 필요', color: '#f59e0b' });
                                }
                                if (!emp.salary_type || !emp.amount || emp.amount === 0 || emp.amount === '0' || emp.amount === '0.00') {
                                  risks.push({ type: 'salary', label: '급여 미설정', color: '#ef4444' });
                                }
                                if (emp.employment_status === 'resigned' && !emp.resignation_date) {
                                  risks.push({ type: 'resignation', label: '퇴사 처리 필요', color: '#ef4444' });
                                }
                                return risks;
                              };

                              // 정렬: 리스크 있음 > 정상
                              const sortedEmployees = [...employees]
                                .filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter)
                                .sort((a, b) => {
                                  const aRisks = getEmployeeRisks(a).length;
                                  const bRisks = getEmployeeRisks(b).length;

                                  // 리스크가 있는 직원 우선
                                  if (aRisks > 0 && bRisks === 0) return -1;
                                  if (aRisks === 0 && bRisks > 0) return 1;

                                  // 같은 경우 이름순
                                  return a.name.localeCompare(b.name);
                                });

                              return sortedEmployees.map((emp) => (
                              <tr key={emp.id}>
                                <td data-label="이름" style={{ fontWeight: '600' }}>{emp.name}</td>
                                <td data-label="상태">
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    background: emp.employment_status === 'active' ? '#d1fae5' : emp.employment_status === 'on_leave' ? '#fef3c7' : '#fee2e2',
                                    color: emp.employment_status === 'active' ? '#065f46' : emp.employment_status === 'on_leave' ? '#92400e' : '#991b1b'
                                  }}>
                                    {emp.employment_status === 'active' ? '재직중' : emp.employment_status === 'on_leave' ? '휴직' : '퇴사'}
                                  </span>
                                </td>
                                <td data-label="주민번호">{emp.ssn || '-'}</td>
                                <td data-label="생일">{formatDate(emp.birth_date)}</td>
                                <td data-label="전화번호">{emp.phone || '-'}</td>
                                <td data-label="주소" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {emp.address || '-'}
                                </td>
                                <td data-label="직책">{emp.position || '-'}</td>
                                <td data-label="입사일">{formatDate(emp.hire_date)}</td>
                                <td data-label="급여유형">{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</td>
                                <td data-label="급여">{formatCurrency(emp.amount)}</td>
                                <td data-label="인건비 신고" style={{ fontSize: '12px', color: '#6b7280' }}>{emp.tax_type || '4대보험'}</td>
                                <td data-label="개인정보동의" style={{ textAlign: 'center' }}>
                                  {emp.privacy_consent && emp.location_consent ? (
                                    <div style={{ fontSize: '11px' }}>
                                      <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                                      <div style={{ color: '#6b7280', marginTop: '4px' }}>동의완료</div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '11px' }}>
                                      <span style={{ color: '#dc2626', fontSize: '16px' }}>❌</span>
                                      <div style={{ color: '#dc2626', marginTop: '4px' }}>미동의</div>
                                    </div>
                                  )}
                                </td>
                                <td data-label="비상연락망">
                                  {emp.emergency_contact ? (
                                    <div style={{ fontSize: '12px' }}>
                                      <div>{emp.emergency_contact}</div>
                                      <div style={{ color: '#6b7280' }}>{emp.emergency_phone || '-'}</div>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td data-label="관리">
                                  <button
                                    className="btn btn-secondary"
                                    style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px' }}
                                    onClick={() => openModal('employee', emp)}
                                  >
                                    수정
                                  </button>
                                  {emp.employment_status !== 'resigned' && (
                                    <button
                                      className="btn"
                                      style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                                      onClick={() => openResignationModal(emp)}
                                    >
                                      퇴사 처리
                                    </button>
                                  )}
                                  <button
                                    className="btn"
                                    style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px', background: '#f59e0b', color: 'white' }}
                                    onClick={() => handleViewSalaryHistory(emp.id, emp.name)}
                                  >
                                    이력
                                  </button>
                                </td>
                              </tr>
                            ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="employee-card-grid">
                        {(() => {
                          // 리스크 판단 로직
                          const getEmployeeRisks = (emp) => {
                            const risks = [];
                            if (!emp.contract_file_url) {
                              risks.push({ type: 'contract', label: '서류 필요', color: '#f59e0b' });
                            }
                            if (!emp.salary_type || !emp.amount || emp.amount === 0 || emp.amount === '0' || emp.amount === '0.00') {
                              risks.push({ type: 'salary', label: '급여 미설정', color: '#ef4444' });
                            }
                            if (emp.employment_status === 'resigned' && !emp.resignation_date) {
                              risks.push({ type: 'resignation', label: '퇴사 처리 필요', color: '#ef4444' });
                            }
                            return risks;
                          };

                          // 정렬: 리스크 있음 > 정상
                          const sortedEmployees = [...employees]
                            .filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter)
                            .sort((a, b) => {
                              const aRisks = getEmployeeRisks(a).length;
                              const bRisks = getEmployeeRisks(b).length;

                              // 리스크가 있는 직원 우선
                              if (aRisks > 0 && bRisks === 0) return -1;
                              if (aRisks === 0 && bRisks > 0) return 1;

                              // 같은 경우 이름순
                              return a.name.localeCompare(b.name);
                            });

                          return sortedEmployees.map((emp) => {
                            const risks = getEmployeeRisks(emp);
                            const hasRisk = risks.length > 0;

                            return (
                          <div key={emp.id} className="employee-card" style={{
                            ...(hasRisk && {
                              border: '2px solid #f59e0b',
                              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                            })
                          }}>
                            <div className="employee-card-header">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div style={{ fontWeight: '700', fontSize: '16px' }}>{emp.name}</div>
                                {/* 리스크 배지 */}
                                {risks.length > 0 && (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {risks.map((risk, idx) => (
                                      <span key={idx} style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        background: risk.color === '#f59e0b' ? '#fef3c7' : '#fee2e2',
                                        color: risk.color === '#f59e0b' ? '#92400e' : '#991b1b',
                                        border: `1px solid ${risk.color}`
                                      }}>
                                        {risk.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className={`employee-status ${emp.employment_status}`}>
                                {emp.employment_status === 'active' ? '재직중' : emp.employment_status === 'on_leave' ? '휴직' : '퇴사'}
                              </span>
                            </div>
                            <div className="employee-card-meta">
                              <div><span>직책</span>{emp.position || '-'}</div>
                              <div><span>입사일</span>{formatDate(emp.hire_date)}</div>
                              <div><span>연락처</span>{emp.phone || '-'}</div>
                              <div><span>급여</span>{formatCurrency(emp.amount)}</div>
                              <div><span>급여유형</span>{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</div>
                              <div><span>동의</span>{emp.privacy_consent && emp.location_consent ? '완료' : '미동의'}</div>
                            </div>
                            <div className="employee-card-actions">
                              <button
                                className="btn btn-secondary"
                                onClick={() => openModal('employee', emp)}
                              >
                                수정
                              </button>
                              {emp.employment_status !== 'resigned' && (
                                <button
                                  className="btn"
                                  style={{ background: '#ef4444', color: 'white' }}
                                  onClick={() => openResignationModal(emp)}
                                >
                                  퇴사 처리
                                </button>
                              )}
                              <button
                                className="btn"
                                style={{ background: '#f59e0b', color: 'white' }}
                                onClick={() => handleViewSalaryHistory(emp.id, emp.name)}
                              >
                                이력
                              </button>
                            </div>
                          </div>
                          );
                        });
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
  );
};

export default RosterTab;
