import React from 'react';
import ReactDOM from 'react-dom';

/**
 * SalaryTab - Extracted from OwnerDashboard.jsx (lines 4673-6038)
 *
 * Required props:
 *
 * State:
 *   salaryData, salaryFlowStep, salaryConfirmed, salaryDeductions,
 *   editedSalaries, calculatingEmployeeId, salaryViewMode,
 *   selectedMonth, selectedYear, selectedWorkplace,
 *   employeeSlips, isMobile, showConfirmWarning, loading,
 *   salaryPeriodRange, payrollLedgerMonth, payrollLedgerData
 *
 * Setters:
 *   setSalaryFlowStep, setSalaryConfirmed, setSalaryDeductions,
 *   setEditedSalaries, setSalaryViewMode, setSelectedMonth,
 *   setSelectedYear, setShowConfirmWarning, setLoading,
 *   setMessage, setToast, setEmployeeSlips, setPayrollLedgerData
 *
 * Handlers / Utilities:
 *   calculateDeductions, formatCurrency, getSalaryTypeName,
 *   downloadExcel, loadEmployeeSlips, loadSalary, salaryAPI
 */

const SalaryTab = ({
  salaryData,
  salaryFlowStep,
  setSalaryFlowStep,
  salaryConfirmed,
  setSalaryConfirmed,
  salaryDeductions,
  setSalaryDeductions,
  editedSalaries,
  setEditedSalaries,
  calculatingEmployeeId,
  calculateDeductions,
  salaryViewMode,
  setSalaryViewMode,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedWorkplace,
  employeeSlips,
  isMobile,
  showConfirmWarning,
  setShowConfirmWarning,
  loading,
  setLoading,
  setMessage,
  setToast,
  formatCurrency,
  getSalaryTypeName,
  downloadExcel,
  loadEmployeeSlips,
  loadSalary,
  salaryAPI,
  salaryPeriodRange,
  setEmployeeSlips,
  payrollLedgerMonth,
  payrollLedgerData,
  setPayrollLedgerData
}) => {
  return (
              <div className="card">
                {/* 이번 달 급여 현황 요약 바 */}
                {salaryData && (() => {
                  const totalSalary = salaryData.totalSalary || 0;
                  const employees = salaryData.employees || [];

                  // 미확정 직원: salary_slips에 데이터가 없는 직원
                  const notConfirmed = employees.filter(emp => {
                    // salary_slips에 해당 월 급여명세서가 있는지 확인
                    const hasSlip = employeeSlips.some(slip =>
                      slip.user_id === emp.employeeId &&
                      slip.payroll_month === selectedMonth
                    );

                    // 급여명세서가 없으면 미확정
                    return !hasSlip;
                  });
                  // 실제 DB에 급여명세서가 발송된 직원 수 (employeeSlips 사용)
                  const published = employeeSlips.filter(slip =>
                    slip.published &&
                    slip.period === selectedMonth &&
                    employees.some(emp => emp.employeeId === slip.employee_id)
                  );
                  const notPublished = employees.filter(emp => {
                    const hasPublished = employeeSlips.some(slip =>
                      slip.published &&
                      slip.period === selectedMonth &&
                      slip.employee_id === emp.employeeId
                    );
                    return !hasPublished;
                  });

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
                        <span>💰</span>
                        <span>이번 달 급여 현황</span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                        gap: isMobile ? '12px' : '16px'
                      }}>
                        {/* 총 인건비 */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>💸 총 인건비</div>
                          <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '700', color: '#667eea' }}>
                            {formatCurrency(totalSalary)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {employees.length}명
                          </div>
                        </div>

                        {/* 미확정 - 강조 */}
                        <div style={{
                          background: notConfirmed.length > 0 ? 'rgba(245, 158, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: notConfirmed.length > 0 ? '0 4px 12px rgba(245, 158, 11, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: notConfirmed.length > 0 ? '2px solid #d97706' : 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: notConfirmed.length > 0 ? '#fff' : '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            ⚠️ 미확정
                          </div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: notConfirmed.length > 0 ? '#fff' : '#6b7280' }}>
                            {notConfirmed.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 모바일 Wizard UI */}
                {isMobile ? (
                  <div className="mobile-salary-wizard">
                    {/* 상단: 진행 단계 */}
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px 12px 0 0',
                      color: 'white',
                      textAlign: 'center',
                      marginBottom: '20px'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>
                        급여 처리
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700' }}>
                        {salaryFlowStep}/4 단계
                      </div>
                    </div>

                    {/* 확정 상태 배지 (모바일) */}
                    {salaryConfirmed && (
                      <div style={{
                        padding: '12px',
                        background: '#10b981',
                        borderRadius: '8px',
                        color: 'white',
                        marginBottom: '16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        ✓ 급여 확정됨
                      </div>
                    )}

                    {/* 현재 단계 제목 */}
                    <h3 style={{
                      color: '#374151',
                      fontSize: '18px',
                      fontWeight: '700',
                      marginBottom: '16px'
                    }}>
                      {salaryFlowStep === 1 && '📋 근무 내역 확인'}
                      {salaryFlowStep === 2 && '💰 급여 미리보기'}
                      {salaryFlowStep === 3 && '✅ 급여 확정 및 배포'}
                    </h3>

                    {/* Step별 컨텐츠 */}
                    {salaryData ? (
                      <>
                        {/* 총 지급액 요약 */}
                        <div style={{
                          padding: '16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '12px',
                          color: 'white',
                          marginBottom: '20px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '12px', opacity: '0.9', marginBottom: '4px' }}>
                            총 지급 급여 (세전)
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: '700' }}>
                            {formatCurrency(salaryData.totalSalary)}
                          </div>
                          <div style={{ fontSize: '12px', opacity: '0.8', marginTop: '4px' }}>
                            {salaryData.employees?.length || 0}명
                          </div>
                        </div>

                        {/* 직원별 급여 카드 리스트 */}
                        {salaryData.employees && salaryData.employees.length > 0 ? (
                          <div style={{ marginBottom: '80px' }}>
                            {(() => {
                              // 정렬 우선순위: 미확정/미지급 > 계산 완료 대기 > 지급 완료
                              const sortedEmployees = [...salaryData.employees].sort((a, b) => {
                                const aConfirmed = !!(salaryDeductions[a.employeeId] || editedSalaries[a.employeeId]);
                                const bConfirmed = !!(salaryDeductions[b.employeeId] || editedSalaries[b.employeeId]);
                                const aPublished = employeeSlips.some(slip =>
                                  slip.published &&
                                  slip.period === selectedMonth &&
                                  slip.employee_id === a.employeeId
                                );
                                const bPublished = employeeSlips.some(slip =>
                                  slip.published &&
                                  slip.period === selectedMonth &&
                                  slip.employee_id === b.employeeId
                                );

                                // 우선순위 계산
                                const getPriority = (confirmed, published) => {
                                  if (!confirmed) return 1; // 미확정
                                  if (confirmed && !published) return 2; // 확정됐지만 미지급
                                  return 3; // 지급 완료
                                };

                                const aPriority = getPriority(aConfirmed, aPublished);
                                const bPriority = getPriority(bConfirmed, bPublished);

                                return aPriority - bPriority;
                              });

                              return sortedEmployees.map((emp) => {
                              // 총 지급액 (세전) = 기본급여 + 주휴수당
                              const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                              const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                              const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                              const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                              const isConfirmed = !!(salaryDeductions[emp.employeeId] || editedSalaries[emp.employeeId]);
                              const isPublished = employeeSlips.some(slip =>
                                slip.published &&
                                slip.period === selectedMonth &&
                                slip.employee_id === emp.employeeId
                              );
                              const isProblem = !isConfirmed || (isConfirmed && !isPublished);

                              const getPayDayText = () => {
                                if (emp.payScheduleType === 'monthly') {
                                  if (emp.payDay === 0) return '말일';
                                  return `매월 ${emp.payDay}일`;
                                } else if (emp.payScheduleType === 'hire_date') {
                                  return `입사일 기준`;
                                }
                                return '-';
                              };

                              return (
                                <div
                                  key={emp.employeeId}
                                  style={{
                                    padding: '16px',
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    marginBottom: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    ...(isProblem && {
                                      border: !isConfirmed ? '2px solid #f59e0b' : '2px solid #ef4444',
                                      background: !isConfirmed ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                      boxShadow: !isConfirmed ? '0 4px 12px rgba(245, 158, 11, 0.3)' : '0 4px 12px rgba(239, 68, 68, 0.3)'
                                    })
                                  }}
                                >
                                  {/* 카드 헤더: 직원명 + 급여유형 */}
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    paddingBottom: '12px',
                                    borderBottom: '1px solid #f3f4f6'
                                  }}>
                                    <div>
                                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                                        {emp.employeeName}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        {getSalaryTypeName(emp.salaryType)} · {emp.taxType || '4대보험'}
                                      </div>
                                    </div>
                                    <div style={{
                                      padding: '4px 12px',
                                      background: '#eff6ff',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#2563eb'
                                    }}>
                                      {getPayDayText()}
                                    </div>
                                  </div>

                                  {/* 카드 본문: 급여 정보 */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '8px',
                                    marginBottom: '12px'
                                  }}>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>기본급</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {formatCurrency(emp.baseAmount)}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>근무일수</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {emp.totalWorkDays}일
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>근무시간</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {emp.totalWorkHours}h
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>주휴수당</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: emp.weeklyHolidayPayAmount > 0 ? '#10b981' : '#9ca3af' }}>
                                        {emp.weeklyHolidayPayAmount > 0 ? `+${Number(emp.weeklyHolidayPayAmount).toLocaleString()}원` : '-'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 총 지급액 (Step2에서는 수정 가능) */}
                                  <div style={{
                                    padding: '12px',
                                    background: '#f9fafb',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                      총 지급액
                                    </span>
                                    {salaryFlowStep === 2 ? (
                                      <input
                                        type="number"
                                        className="form-input"
                                        value={editedSalaries[emp.employeeId] ?? totalPay}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          setEditedSalaries(prev => ({
                                            ...prev,
                                            [emp.employeeId]: value
                                          }));
                                        }}
                                        style={{
                                          width: '140px',
                                          padding: '6px 8px',
                                          fontSize: '14px',
                                          fontWeight: '700',
                                          textAlign: 'right'
                                        }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#667eea' }}>
                                        {formatCurrency(totalPay)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Step2: 자동계산 버튼 */}
                                  {salaryFlowStep === 2 && (
                                    <div style={{ marginTop: '12px' }}>
                                      <button
                                        className="btn"
                                        onClick={() => calculateDeductions(
                                          emp.employeeId,
                                          editedSalaries[emp.employeeId] ?? totalPay,
                                          1 // dependentsCount, 나중에 직원 정보에서 가져올 수 있음
                                        )}
                                        disabled={calculatingEmployeeId === emp.employeeId}
                                        style={{
                                          width: '100%',
                                          fontSize: '14px',
                                          fontWeight: '700',
                                          padding: '10px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          ...(isProblem && {
                                            background: !isConfirmed ? '#f59e0b' : '#667eea',
                                            color: 'white',
                                            boxShadow: !isConfirmed ? '0 4px 8px rgba(245, 158, 11, 0.3)' : '0 4px 8px rgba(102, 126, 234, 0.3)',
                                            border: 'none'
                                          })
                                        }}
                                      >
                                        {calculatingEmployeeId === emp.employeeId ? (
                                          <>
                                            <span className="btn-loading-spinner"></span>
                                            계산 중...
                                          </>
                                        ) : (
                                          <>{isProblem && !isConfirmed ? '⚠️ 즉시 계산 필요' : '🧮 4대보험/세금 자동계산'}</>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {/* 자동계산 결과 표시 */}
                                  {salaryDeductions[emp.employeeId] && (
                                    <div style={{
                                      marginTop: '12px',
                                      padding: '12px',
                                      background: '#f0fdf4',
                                      border: '1px solid #86efac',
                                      borderRadius: '8px'
                                    }}>
                                      <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#166534',
                                        marginBottom: '8px'
                                      }}>
                                        💰 공제 항목 ({selectedMonth} 기준)
                                      </div>
                                      <div style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>국민연금</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.nationalPension.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>건강보험</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.healthInsurance.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>장기요양</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.longTermCare.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>고용보험</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.employmentInsurance.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>소득세</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.incomeTax.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>지방소득세</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.localIncomeTax.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          paddingTop: '8px',
                                          marginTop: '8px',
                                          borderTop: '1px solid #86efac'
                                        }}>
                                          <span style={{ fontWeight: '600', color: '#166534' }}>공제 합계</span>
                                          <span style={{ fontWeight: '700', color: '#ef4444' }}>
                                            -{salaryDeductions[emp.employeeId].totalDeductions.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          paddingTop: '8px',
                                          marginTop: '4px',
                                          borderTop: '1px solid #86efac'
                                        }}>
                                          <span style={{ fontWeight: '700', fontSize: '14px', color: '#166534' }}>실수령액</span>
                                          <span style={{ fontWeight: '700', fontSize: '16px', color: '#10b981' }}>
                                            {salaryDeductions[emp.employeeId].netPay.toLocaleString()}원
                                          </span>
                                        </div>
                                      </div>

                                      {/* Step3: 배포 버튼 */}
                                      {salaryFlowStep === 3 && salaryDeductions[emp.employeeId] && !isPublished && (
                                        <div style={{ marginTop: '12px' }}>
                                          <button
                                            className="btn btn-success"
                                            onClick={async () => {
                                              try {
                                                // 1. 급여명세서 생성 (이미 있다면 건너뜀)
                                                const existingSlip = employeeSlips.find(slip =>
                                                  slip.user_id === emp.employeeId &&
                                                  slip.payroll_month === selectedMonth
                                                );

                                                let slipId = existingSlip?.id;

                                                if (!existingSlip) {
                                                  const createResponse = await salaryAPI.createSlip({
                                                    workplaceId: selectedWorkplace,
                                                    userId: emp.employeeId,
                                                    payrollMonth: selectedMonth,
                                                    taxType: emp.taxType || '4대보험',
                                                    basePay: totalPay,
                                                    dependentsCount: 1,
                                                    nationalPension: salaryDeductions[emp.employeeId].deductions.nationalPension,
                                                    healthInsurance: salaryDeductions[emp.employeeId].deductions.healthInsurance,
                                                    employmentInsurance: salaryDeductions[emp.employeeId].deductions.employmentInsurance,
                                                    longTermCare: salaryDeductions[emp.employeeId].deductions.longTermCare,
                                                    incomeTax: salaryDeductions[emp.employeeId].deductions.incomeTax,
                                                    localIncomeTax: salaryDeductions[emp.employeeId].deductions.localIncomeTax,
                                                    totalDeductions: salaryDeductions[emp.employeeId].totalDeductions,
                                                    netPay: salaryDeductions[emp.employeeId].netPay,
                                                    employerNationalPension: salaryDeductions[emp.employeeId].employerBurden?.nationalPension || 0,
                                                    employerHealthInsurance: salaryDeductions[emp.employeeId].employerBurden?.healthInsurance || 0,
                                                    employerEmploymentInsurance: salaryDeductions[emp.employeeId].employerBurden?.employmentInsurance || 0,
                                                    employerLongTermCare: salaryDeductions[emp.employeeId].employerBurden?.longTermCare || 0,
                                                    totalEmployerBurden: (salaryDeductions[emp.employeeId].employerBurden?.nationalPension || 0) +
                                                      (salaryDeductions[emp.employeeId].employerBurden?.healthInsurance || 0) +
                                                      (salaryDeductions[emp.employeeId].employerBurden?.employmentInsurance || 0) +
                                                      (salaryDeductions[emp.employeeId].employerBurden?.longTermCare || 0)
                                                  });
                                                  slipId = createResponse.data.slipId;
                                                }

                                                // 2. 배포
                                                await salaryAPI.publishSlip(slipId);
                                                setMessage({ type: 'success', text: `${emp.employeeName}님의 급여명세서가 배포되었습니다.` });

                                                // 3. 목록 새로고침
                                                await loadEmployeeSlips();
                                              } catch (error) {
                                                console.error('배포 오류:', error);
                                                setMessage({ type: 'error', text: '배포에 실패했습니다.' });
                                              }
                                            }}
                                            style={{
                                              width: '100%',
                                              fontSize: '14px',
                                              fontWeight: '700',
                                              padding: '10px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '6px'
                                            }}
                                          >
                                            📤 급여명세서 배포
                                          </button>
                                        </div>
                                      )}

                                      {/* 배포 완료 상태 */}
                                      {salaryFlowStep === 3 && isPublished && (
                                        <div style={{
                                          marginTop: '12px',
                                          padding: '10px',
                                          background: '#10b981',
                                          color: 'white',
                                          borderRadius: '8px',
                                          textAlign: 'center',
                                          fontSize: '14px',
                                          fontWeight: '600'
                                        }}>
                                          ✅ 배포 완료
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                            })()}
                          </div>
                        ) : (
                          <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#9ca3af'
                          }}>
                            급여 데이터가 없습니다.
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#9ca3af'
                      }}>
                        월을 선택하면 급여 데이터가 표시됩니다.
                      </div>
                    )}

                    {/* 하단 고정 버튼 (모바일) */}
                    {salaryData && salaryData.employees && salaryData.employees.length > 0 && (
                      <div style={{
                        position: 'fixed',
                        bottom: 'calc(72px + var(--safe-bottom, 34px))',
                        left: '0',
                        right: '0',
                        padding: '16px',
                        background: 'white',
                        borderTop: '1px solid #e5e7eb',
                        boxShadow: '0 -4px 6px rgba(0,0,0,0.05)',
                        zIndex: 100
                      }}>
                        <div style={{ display: 'flex', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
                          {salaryFlowStep === 1 && (
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, fontSize: '16px', fontWeight: '700', minHeight: '48px' }}
                              onClick={() => setSalaryFlowStep(2)}
                            >
                              다음: 급여 미리보기 →
                            </button>
                          )}

                          {salaryFlowStep === 2 && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ flex: 1, fontSize: '16px', minHeight: '48px' }}
                                onClick={() => setSalaryFlowStep(1)}
                              >
                                ← 이전
                              </button>
                              <button
                                className="btn"
                                style={{
                                  flex: 1,
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  minHeight: '48px',
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  border: 'none'
                                }}
                                onClick={() => setShowConfirmWarning(true)}
                              >
                                급여 확정
                              </button>
                            </>
                          )}

                          {salaryFlowStep === 3 && (
                            <button
                              className="btn btn-secondary"
                              style={{ flex: 1, fontSize: '16px', minHeight: '48px' }}
                              onClick={() => {
                                setSalaryFlowStep(2);
                                setSalaryConfirmed(false);
                              }}
                            >
                              ← 이전 단계
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 데스크탑: 기존 UI 유지 */}
                    {/* 확정 상태 배지 */}
                    {salaryConfirmed && (
                      <div style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '12px',
                        color: 'white',
                        marginBottom: '24px',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}>
                        ✓ 이번 달 급여가 확정되었습니다
                      </div>
                    )}

                    {/* 단계 진행 표시 */}
                  </>
                )}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    {[
                      { num: 1, label: '근무 내역 확인' },
                      { num: 2, label: '급여 미리보기' },
                      { num: 3, label: '급여 확정 및 배포' }
                    ].map((step, idx) => (
                      <div key={step.num} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: salaryFlowStep >= step.num
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#e5e7eb',
                          color: salaryFlowStep >= step.num ? 'white' : '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: '700',
                          margin: '0 auto 12px',
                          boxShadow: salaryFlowStep >= step.num ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
                          transition: 'all 0.3s'
                        }}>
                          {salaryFlowStep > step.num ? '✓' : step.num}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: salaryFlowStep === step.num ? '700' : '500',
                          color: salaryFlowStep >= step.num ? '#374151' : '#9ca3af'
                        }}>
                          {step.label}
                        </div>
                        {idx < 2 && (
                          <div style={{
                            position: 'absolute',
                            top: '24px',
                            left: 'calc(50% + 24px)',
                            right: 'calc(-50% + 24px)',
                            height: '3px',
                            background: salaryFlowStep > step.num
                              ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                              : '#e5e7eb',
                            zIndex: 0,
                            transition: 'all 0.3s'
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ color: '#374151', margin: 0 }}>
                    {salaryFlowStep === 1 && 'Step 1. 이번 달 근무 내역 확인'}
                    {salaryFlowStep === 2 && 'Step 2. 급여 미리보기'}
                    {salaryFlowStep === 3 && 'Step 3. 급여 확정 및 배포'}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className={`btn ${salaryViewMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        type="button"
                        onClick={() => setSalaryViewMode('month')}
                      >
                        월별
                      </button>
                      <button
                        className={`btn ${salaryViewMode === 'year' ? 'btn-primary' : 'btn-secondary'}`}
                        type="button"
                        onClick={() => setSalaryViewMode('year')}
                      >
                        연별
                      </button>
                    </div>
                    {salaryViewMode === 'month' ? (
                      <input
                        type="month"
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      />
                    ) : (
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '100px' }}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        min="2000"
                        max="2100"
                      />
                    )}
                    {salaryData && salaryData.employees && salaryData.employees.length > 0 && (
                      <button
                        className="btn btn-success"
                        onClick={downloadExcel}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        📥 엑셀 다운로드
                      </button>
                    )}
                  </div>
                </div>
                {salaryViewMode === 'month' && salaryPeriodRange && (
                  <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '12px' }}>
                    급여 기간: {salaryPeriodRange.startDate} ~ {salaryPeriodRange.endDate}
                    {!salaryPeriodRange.hasCommonPeriod && (
                      <span style={{ marginLeft: '6px', color: '#ef4444' }}>
                        (직원별 기준이 달라 기본 1~말일로 계산)
                      </span>
                    )}
                  </div>
                )}

                {salaryData && (
                  <>
                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '8px',
                      color: 'white',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '8px', opacity: '0.9' }}>
                        총 지급 급여 (세전)
                      </div>
                      <div style={{ fontSize: '36px', fontWeight: '700' }}>
                        {formatCurrency(salaryData.totalSalary)}
                      </div>
                    </div>

                    {(!salaryData.employees || salaryData.employees.length === 0) ? (
                      <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                        급여 데이터가 없습니다.
                      </p>
                    ) : (
                      <>
                        {salaryFlowStep === 2 && (
                          <div style={{
                            padding: '16px',
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            color: '#166534',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div>
                              💡 <strong>급여 수정:</strong> 각 직원의 "수정" 버튼을 눌러 4대보험/공제액을 계산하거나, 전체 자동계산 버튼을 사용하세요.
                            </div>
                            <button
                              className="btn"
                              style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontWeight: '600'
                              }}
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  const newDeductions = {};

          for (const emp of salaryData.employees) {
            // 총 지급액 (세전) = 기본급여 + 주휴수당
            const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
            const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
            const calculatedTotalPay = baseSalary + weeklyHolidayPay;
            const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
            const taxType = emp.taxType || '4대보험';

            console.log(`🔍 Step2 자동계산: ${emp.employeeName}`, {
              totalPay,
              taxType,
              hasValue: !!totalPay && totalPay > 0
            });

            // 급여액이 없으면 스킵
            if (!totalPay || totalPay <= 0) {
              console.warn(`⚠️ ${emp.employeeName}: 급여액 없음, 자동계산 스킵`);
              continue;
            }

            try {
              const response = await salaryAPI.calculateInsurance({
                basePay: totalPay,
                payrollMonth: selectedMonth,
                taxType: taxType
              });

                                      newDeductions[emp.employeeId] = {
                                        basePay: totalPay,
                                        taxType: taxType,
                                        deductions: response.data.deductions,
                                        totalDeductions: response.data.totalDeductions,
                                        netPay: response.data.netPay
                                      };
                                    } catch (error) {
                                      console.error(`${emp.employeeName} 계산 오류:`, error);
                                    }
                                  }

                                  setSalaryDeductions(newDeductions);
                                  setToast({
                                    message: `✓ 전체 ${Object.keys(newDeductions).length}명의 공제액이 계산되었습니다.`,
                                    type: 'success'
                                  });
                                } catch (error) {
                                  console.error('전체 계산 오류:', error);
                                  setToast({
                                    message: '전체 계산에 실패했습니다.',
                                    type: 'error'
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                            >
                              {loading ? '계산 중...' : '🔄 전체 자동계산'}
                            </button>
                          </div>
                        )}
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>직원명</th>
                                <th>급여유형</th>
                                <th>인건비 신고</th>
                                <th>급여일</th>
                                <th>기본급</th>
                                <th>근무일수</th>
                                <th>근무시간</th>
                                <th>기본 급여</th>
                              <th>주휴수당</th>
                                <th>총 지급액 (세전)</th>
                                {(salaryFlowStep === 2 || salaryFlowStep === 4) && (
                                  <>
                                    <th>공제 합계</th>
                                    <th>실수령액 (세후)</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {salaryData.employees.map((emp) => {
                                // 총 지급액 (세전) = 기본급여 + 주휴수당
                                const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                                const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                                const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                                const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                                // 급여일 계산
                                const getPayDayText = () => {
                                  if (emp.payScheduleType === 'monthly') {
                                    if (emp.payDay === 0) return '말일';
                                    return `매월 ${emp.payDay}일`;
                                  } else if (emp.payScheduleType === 'hire_date') {
                                    return `입사일 기준`;
                                  }
                                  return '-';
                                };
                                return (
                                  <tr key={emp.employeeId}>
                                    <td style={{ fontWeight: '600' }}>{emp.employeeName}</td>
                                    <td>{getSalaryTypeName(emp.salaryType)}</td>
                                    <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.taxType || '4대보험'}</td>
                                    <td style={{ fontSize: '12px', color: '#6366f1' }}>{getPayDayText()}</td>
                                <td>{formatCurrency(emp.baseAmount)}</td>
                                    <td>{emp.totalWorkDays}일</td>
                                    <td>{emp.totalWorkHours}h</td>
                                <td>{formatCurrency(emp.baseSalaryAmount ?? emp.baseSalary ?? emp.calculatedSalary)}</td>
                                <td style={{ color: emp.weeklyHolidayPayAmount > 0 ? '#10b981' : '#9ca3af' }}>
                                  {emp.weeklyHolidayPayAmount > 0 ? `+${Number(emp.weeklyHolidayPayAmount).toLocaleString()}원` : '-'}
                                </td>
                                    <td style={{ fontWeight: '700', color: '#667eea' }}>
                                      {salaryFlowStep === 2 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <input
                                            type="number"
                                            value={editedSalaries[emp.employeeId] ?? totalPay}
                                            onChange={(e) => {
                                              const value = parseInt(e.target.value) || 0;
                                              setEditedSalaries(prev => ({ ...prev, [emp.employeeId]: value }));
                                            }}
                                            style={{
                                              width: '120px',
                                              padding: '4px 8px',
                                              fontSize: '13px',
                                              fontWeight: '700',
                                              border: '1px solid #d1d5db',
                                              borderRadius: '4px',
                                              color: '#667eea',
                                              textAlign: 'right'
                                            }}
                                          />
                                          <button
                                            className="btn btn-sm"
                                            style={{
                                              padding: '4px 12px',
                                              fontSize: '12px',
                                              background: '#667eea',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              whiteSpace: 'nowrap'
                                            }}
                                            onClick={async () => {
                                              try {
                                                const taxType = emp.taxType || '4대보험';
                                                const currentPay = editedSalaries[emp.employeeId] ?? totalPay;
                                                const response = await salaryAPI.calculateInsurance({
                                                  basePay: currentPay,
                                                  payrollMonth: selectedMonth,
                                                  taxType: taxType
                                                });

                                                setSalaryDeductions(prev => ({
                                                  ...prev,
                                                  [emp.employeeId]: {
                                                    basePay: currentPay,
                                                    taxType: taxType,
                                                    deductions: response.data.deductions,
                                                    totalDeductions: response.data.totalDeductions,
                                                    netPay: response.data.netPay
                                                  }
                                                }));

                                                setToast({
                                                  message: `✓ ${emp.employeeName} 공제액이 계산되었습니다.`,
                                                  type: 'success'
                                                });
                                              } catch (error) {
                                                console.error('공제액 계산 오류:', error);
                                                setToast({
                                                  message: '공제액 계산에 실패했습니다.',
                                                  type: 'error'
                                                });
                                              }
                                            }}
                                          >
                                            수정
                                          </button>
                                        </div>
                                      ) : (
                                        formatCurrency(totalPay)
                                      )}
                                    </td>
                                    {(salaryFlowStep === 2 || salaryFlowStep === 4) && (
                                      <>
                                        <td style={{ fontWeight: '600', color: '#ef4444' }}>
                                          {salaryDeductions[emp.employeeId] ?
                                            formatCurrency(salaryDeductions[emp.employeeId].totalDeductions) :
                                            '-'
                                          }
                                        </td>
                                        <td style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>
                                          {salaryDeductions[emp.employeeId] ?
                                            formatCurrency(salaryDeductions[emp.employeeId].netPay) :
                                            formatCurrency(totalPay)
                                          }
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* 단계별 액션 버튼 (데스크톱 전용) */}
                        {!isMobile && (
                          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                            {salaryFlowStep === 1 && (
                              <button
                                className="btn btn-primary"
                                style={{ fontSize: '16px', padding: '16px 48px', fontWeight: '700' }}
                                onClick={() => setSalaryFlowStep(2)}
                              >
                                다음: 급여 미리보기 →
                              </button>
                            )}

                            {salaryFlowStep === 2 && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '16px', padding: '16px 32px' }}
                                  onClick={() => setSalaryFlowStep(1)}
                                >
                                  ← 이전
                                </button>
                                <button
                                  className="btn"
                                  style={{
                                    fontSize: '16px',
                                    padding: '16px 48px',
                                    fontWeight: '700',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    border: 'none'
                                  }}
                                  onClick={() => setShowConfirmWarning(true)}
                                >
                                  급여 확정하기
                                </button>
                              </>
                            )}

                            {salaryFlowStep === 3 && (
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '16px', padding: '16px 32px' }}
                                onClick={() => {
                                  setSalaryFlowStep(2);
                                  setSalaryConfirmed(false);
                                }}
                              >
                                ← 이전 단계
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                  </>
                )}

                {/* 급여 확정 경고 모달 - Portal 사용 */}
                {showConfirmWarning && ReactDOM.createPortal(
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 999999
                    }}
                    onClick={() => setShowConfirmWarning(false)}
                  >
                    <div
                      style={{
                        maxWidth: '500px',
                        width: '90%',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ background: '#fef3c7', color: '#92400e', padding: '16px', fontWeight: '600' }}>
                        ⚠️ 급여 확정 확인
                      </div>
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                          ⚠️
                        </div>
                        <p style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
                          확정 후에는 수정이 어렵습니다.
                        </p>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                          급여 내역을 최종 확인하셨습니까?<br />
                          확정 후 수정이 필요한 경우, 개별적으로 급여명세서를 수정해야 합니다.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              padding: '10px 20px',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            onClick={() => setShowConfirmWarning(false)}
                            disabled={loading}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              padding: '10px 20px',
                              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontWeight: '700',
                              opacity: loading ? 0.6 : 1
                            }}
                            onClick={async () => {
                              if (!loading) {
                                setLoading(true);
                                try {
                                  // 누락된 직원의 공제액 즉시 계산
                                  const updatedDeductions = { ...salaryDeductions };

                                  for (const emp of salaryData.employees) {
                                    if (!updatedDeductions[emp.employeeId] || !updatedDeductions[emp.employeeId].deductions || Object.keys(updatedDeductions[emp.employeeId].deductions).length === 0) {
                                      // 총 지급액 (세전) = 기본급여 + 주휴수당
                                      const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                                      const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                                      const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                                      const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                                      const taxType = emp.taxType || '4대보험';

                                      console.log(`🔍 ${emp.employeeName} 계산 시작:`, {
                                        employeeId: emp.employeeId,
                                        id: emp.id,
                                        totalPay,
                                        taxType,
                                        selectedMonth
                                      });

                                      // 데이터 검증
                                      if (!totalPay || totalPay <= 0) {
                                        console.error(`❌ ${emp.employeeName}: totalPay가 유효하지 않음 (${totalPay})`);
                                        setToast({
                                          message: `${emp.employeeName}의 급여액이 설정되지 않았습니다. 금액을 입력해주세요.`,
                                          type: 'error'
                                        });
                                        setLoading(false);
                                        return;
                                      }

                                      try {
                                        const response = await salaryAPI.calculateInsurance({
                                          basePay: totalPay,
                                          payrollMonth: selectedMonth,
                                          taxType: taxType
                                        });

                                        updatedDeductions[emp.employeeId] = {
                                          basePay: totalPay,
                                          taxType: taxType,
                                          deductions: response.data.deductions,
                                          totalDeductions: response.data.totalDeductions,
                                          netPay: response.data.netPay
                                        };
                                        console.log(`✓ ${emp.employeeName} 공제액 자동계산 완료`);
                                      } catch (calcError) {
                                        console.error(`${emp.employeeName} 계산 오류:`, calcError);
                                        setToast({
                                          message: `${emp.employeeName}의 공제액 계산에 실패했습니다. 수정 버튼을 눌러주세요.`,
                                          type: 'error'
                                        });
                                        setLoading(false);
                                        return;
                                      }
                                    }
                                  }

                                  // 모든 직원 데이터 준비 (급여액이 있고 공제액이 계산된 직원만)
                                  const employees = salaryData.employees
                                    .filter(emp => {
                                      // 급여액이 있는 직원
                                      // 총 지급액 (세전) = 기본급여 + 주휴수당
                                      const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                                      const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                                      const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                                      const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                                      if (!totalPay || totalPay <= 0) {
                                        console.warn(`⚠️ ${emp.employeeName}: 급여액 없음 (${totalPay}), 확정에서 제외`);
                                        return false;
                                      }

                                      // 공제액이 계산된 직원
                                      const empDeductions = updatedDeductions[emp.employeeId];
                                      if (!empDeductions || !empDeductions.deductions || Object.keys(empDeductions.deductions).length === 0) {
                                        console.error(`❌ ${emp.employeeName}: 공제액 데이터 누락`);
                                        return false;
                                      }

                                      return true;
                                    })
                                    .map(emp => {
                                      const empDeductions = updatedDeductions[emp.employeeId];

                                      console.log(`✅ ${emp.employeeName} 확정 데이터:`, {
                                        employeeId: emp.employeeId,
                                        id: emp.id,
                                        basePay: empDeductions.basePay
                                      });

                                      return {
                                        employeeId: emp.employeeId,
                                        basePay: empDeductions.basePay,
                                        deductions: empDeductions.deductions,
                                        totalPay: empDeductions.basePay,
                                        totalDeductions: empDeductions.totalDeductions,
                                        netPay: empDeductions.netPay,
                                        taxType: empDeductions.taxType
                                      };
                                    });

                                  // 확정할 직원이 없으면 경고
                                  if (employees.length === 0) {
                                    setToast({
                                      message: '확정할 급여 데이터가 없습니다. 급여액을 입력하고 수정 버튼을 눌러주세요.',
                                      type: 'error'
                                    });
                                    setLoading(false);
                                    return;
                                  }

                                  console.log(`✅ ${employees.length}명의 급여 확정 준비 완료`);

                                  console.log('📤 급여 확정 요청:', {
                                    workplaceId: selectedWorkplace,
                                    payrollMonth: selectedMonth,
                                    employeesCount: employees.length
                                  });

                                  const response = await salaryAPI.finalize({
                                    workplaceId: selectedWorkplace,
                                    payrollMonth: selectedMonth,
                                    employees: employees,
                                    appliedEffectiveYyyymm: selectedMonth?.replace('-', ''),
                                    appliedRatesJson: JSON.stringify({ rates_applied: true, month: selectedMonth })
                                  });

                                  setSalaryDeductions(updatedDeductions);
                                  setSalaryConfirmed(true);
                                  setSalaryFlowStep(3);
                                  setShowConfirmWarning(false);
                                  setToast({
                                    message: `✓ 급여가 확정되었습니다. 이제 각 직원별로 배포해주세요. (${employees.length}명)`,
                                    type: 'success'
                                  });

                                  // 급여 데이터 리로드
                                  await loadSalary();

                                  // 사업장의 모든 급여명세서 리로드 (미확정 숫자 업데이트용)
                                  try {
                                    const slipsResponse = await salaryAPI.getWorkplaceSlips(selectedWorkplace, { month: selectedMonth });
                                    if (slipsResponse && slipsResponse.data) {
                                      const slipsData = slipsResponse.data.data || slipsResponse.data;
                                      setEmployeeSlips(slipsData);
                                      console.log(`✅ 급여명세서 ${slipsData.length}개 로드됨`);
                                    }
                                  } catch (slipError) {
                                    console.error('급여명세서 리로드 오류:', slipError);
                                  }

                                  // 급여대장도 리로드
                                  if (payrollLedgerMonth === selectedMonth) {
                                    try {
                                      const ledgerResponse = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                                      setPayrollLedgerData(ledgerResponse.data);
                                    } catch (ledgerError) {
                                      console.error('급여대장 리로드 오류:', ledgerError);
                                    }
                                  }
                                } catch (error) {
                                  console.error('급여 확정 오류:', error);
                                  setToast({
                                    message: error.response?.data?.message || error.message || '급여 확정에 실패했습니다.',
                                    type: 'error'
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            disabled={loading}
                          >
                            {loading ? '처리 중...' : '확정하기'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
  );
};

export default SalaryTab;
