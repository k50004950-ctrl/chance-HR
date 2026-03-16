import React from 'react';

/**
 * SalarySlipsTab - Extracted from OwnerDashboard.jsx (lines 6041-6513)
 *
 * Required props:
 *
 * State:
 *   - payrollLedgerCollapsed (boolean)
 *   - payrollLedgerMonth (string)
 *   - payrollLedgerData (object|null)
 *   - selectedWorkplace (number|string)
 *   - selectedSlipEmployee (number|null)
 *   - employeeSlips (array)
 *   - employees (array)
 *   - loading (boolean)
 *
 * State setters:
 *   - setPayrollLedgerCollapsed
 *   - setPayrollLedgerMonth
 *   - setPayrollLedgerData
 *   - setLoading
 *   - setMessage
 *   - setSelectedSlipEmployee
 *   - setEmployeeSlips
 *   - setEditingSlipId
 *   - setSlipFormData
 *   - setShowSlipModal
 *   - setSlipToPublish
 *   - setShowPublishWarning
 *
 * API:
 *   - salaryAPI (object with getPayrollLedger, generateMonthlySlips, getEmployeeSlips, generateEmployeeHistory, deleteSlip)
 *
 * Helpers:
 *   - formatDate (function)
 *   - formatCurrency (function)
 */

const SalarySlipsTab = ({
  payrollLedgerCollapsed,
  payrollLedgerMonth,
  payrollLedgerData,
  selectedWorkplace,
  selectedSlipEmployee,
  employeeSlips,
  employees,
  loading,
  setPayrollLedgerCollapsed,
  setPayrollLedgerMonth,
  setPayrollLedgerData,
  setLoading,
  setMessage,
  setSelectedSlipEmployee,
  setEmployeeSlips,
  setEditingSlipId,
  setSlipFormData,
  setShowSlipModal,
  setSlipToPublish,
  setShowPublishWarning,
  salaryAPI,
  formatDate,
  formatCurrency,
}) => {
  return (
    <>
      {/* 당월 급여대장 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#374151', margin: 0 }}>📊 당월 급여대장</h3>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '14px', padding: '6px 16px' }}
            onClick={() => {
              setPayrollLedgerCollapsed(!payrollLedgerCollapsed);
            }}
          >
            {payrollLedgerCollapsed ? '▼ 펼치기' : '▲ 접기'}
          </button>
        </div>

        {!payrollLedgerCollapsed && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="month"
                className="form-input"
                value={payrollLedgerMonth}
                onChange={(e) => setPayrollLedgerMonth(e.target.value)}
                style={{ flex: 1, maxWidth: '300px' }}
              />
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    setLoading(true);
                    console.log('🔍 급여대장 조회 시작:', { workplaceId: selectedWorkplace, month: payrollLedgerMonth });
                    const response = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                    console.log('✅ 급여대장 응답:', response.data);
                    console.log('   - slips 개수:', response.data?.slips?.length || 0);
                    console.log('   - totals:', response.data?.totals);
                    setPayrollLedgerData(response.data);
                    setMessage({ type: 'success', text: `${payrollLedgerMonth} 급여대장을 조회했습니다. (${response.data?.slips?.length || 0}개)` });
                  } catch (error) {
                    console.error('❌ 급여대장 조회 오류:', error);
                    console.error('   - 상태 코드:', error.response?.status);
                    console.error('   - 에러 메시지:', error.response?.data?.message);
                    setMessage({ type: 'error', text: error.response?.data?.message || '조회에 실패했습니다.' });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                조회
              </button>
              {payrollLedgerData && payrollLedgerData.slips && payrollLedgerData.slips.length > 0 && (
                <button
                  className="btn btn-success"
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                  onClick={() => {
                    try {
                      // CSV 데이터 생성
                      const headers = [
                        '직원명', '구분', '기본급',
                        '국민연금(근로자)', '건강보험(근로자)', '고용보험(근로자)', '장기요양(근로자)',
                        '소득세', '지방세', '공제합계', '실수령액',
                        '국민연금(사업주)', '건강보험(사업주)', '고용보험(사업주)', '장기요양(사업주)', '사업주부담합계'
                      ];

                      const rows = payrollLedgerData.slips.map(slip => [
                        slip.employee_name,
                        slip.tax_type,
                        Number(slip.base_pay || 0),
                        Number(slip.national_pension || 0),
                        Number(slip.health_insurance || 0),
                        Number(slip.employment_insurance || 0),
                        Number(slip.long_term_care || 0),
                        Number(slip.income_tax || 0),
                        Number(slip.local_income_tax || 0),
                        Number(slip.total_deductions || 0),
                        Number(slip.net_pay || 0),
                        Number(slip.employer_national_pension || 0),
                        Number(slip.employer_health_insurance || 0),
                        Number(slip.employer_employment_insurance || 0),
                        Number(slip.employer_long_term_care || 0),
                        Number(slip.total_employer_burden || 0)
                      ]);

                      // 합계 행 추가
                      const totals = payrollLedgerData.totals;
                      rows.push([
                        '합계', '',
                        Number(totals.total_base_pay || 0),
                        Number(totals.total_national_pension || 0),
                        Number(totals.total_health_insurance || 0),
                        Number(totals.total_employment_insurance || 0),
                        Number(totals.total_long_term_care || 0),
                        Number(totals.total_income_tax || 0),
                        Number(totals.total_local_income_tax || 0),
                        Number(totals.total_deductions || 0),
                        Number(totals.total_net_pay || 0),
                        Number(totals.total_employer_national_pension || 0),
                        Number(totals.total_employer_health_insurance || 0),
                        Number(totals.total_employer_employment_insurance || 0),
                        Number(totals.total_employer_long_term_care || 0),
                        Number(totals.total_employer_burden || 0)
                      ]);

                      // CSV 문자열 생성 (UTF-8 BOM 추가)
                      const csvContent = '\uFEFF' + [
                        headers.join(','),
                        ...rows.map(row => row.join(','))
                      ].join('\n');

                      // 다운로드
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `급여대장_${payrollLedgerMonth}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      setMessage({ type: 'success', text: '급여대장을 다운로드했습니다.' });
                    } catch (error) {
                      console.error('다운로드 오류:', error);
                      setMessage({ type: 'error', text: '다운로드에 실패했습니다.' });
                    }
                  }}
                >
                  📥 엑셀 다운로드
                </button>
              )}
            </div>

            {payrollLedgerData && payrollLedgerData.slips && payrollLedgerData.slips.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>직원명</th>
                        <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>구분</th>
                        <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>기본급</th>
                        <th colSpan={4} style={{ borderRight: '2px solid #d1d5db' }}>근로자 공제</th>
                        <th colSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>세금</th>
                        <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>공제 합계</th>
                        <th rowSpan={2} style={{ borderRight: '3px solid #059669', background: '#d1fae5' }}>실수령액</th>
                        <th colSpan={4} style={{ background: '#fef3c7', borderRight: '2px solid #f59e0b' }}>🏢 사업주 부담</th>
                        <th rowSpan={2} style={{ background: '#fef3c7', fontWeight: 'bold' }}>사업주 합계</th>
                      </tr>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th>국민연금</th>
                        <th>건강보험</th>
                        <th>고용보험</th>
                        <th style={{ borderRight: '2px solid #d1d5db' }}>장기요양</th>
                        <th>소득세</th>
                        <th style={{ borderRight: '2px solid #d1d5db' }}>지방세</th>
                        <th style={{ background: '#fef3c7' }}>국민연금</th>
                        <th style={{ background: '#fef3c7' }}>건강보험</th>
                        <th style={{ background: '#fef3c7' }}>고용보험</th>
                        <th style={{ background: '#fef3c7', borderRight: '2px solid #f59e0b' }}>장기요양</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollLedgerData.slips.map((slip, idx) => (
                        <tr key={idx}>
                          <td>{slip.employee_name}</td>
                          <td>{slip.tax_type}</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.base_pay || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.national_pension || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.health_insurance || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.employment_insurance || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.long_term_care || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.income_tax || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.local_income_tax || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right' }}>{Number(slip.total_deductions || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{Number(slip.net_pay || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_national_pension || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_health_insurance || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_employment_insurance || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_long_term_care || 0).toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', background: '#fef3c7', fontWeight: 'bold' }}>{Number(slip.total_employer_burden || 0).toLocaleString()}원</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                        <td colSpan={2}>합계</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_base_pay || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_national_pension || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_health_insurance || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_employment_insurance || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_long_term_care || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_income_tax || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_local_income_tax || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_deductions || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>{Number(payrollLedgerData.totals.total_net_pay || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_national_pension || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_health_insurance || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_employment_insurance || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_long_term_care || 0).toLocaleString()}원</td>
                        <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_burden || 0).toLocaleString()}원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                {!payrollLedgerData ? '월을 선택하고 조회 버튼을 클릭하세요.' : '해당 월에 배포된 급여명세서가 없습니다.'}
              </p>
            )}
          </>
        )}
      </div>

      {/* 급여명세서 배포 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ color: '#374151', margin: 0 }}>📝 급여명세서 배포</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-success"
              onClick={async () => {
                const payrollMonth = prompt('급여명세서를 생성할 귀속월을 입력하세요 (예: 2026-01)');
                if (!payrollMonth) return;

                const payDate = prompt('지급일을 입력하세요 (예: 2026-02-05, 선택사항)');

                if (window.confirm(`${payrollMonth} 월 급여명세서를 자동 생성하시겠습니까?\n\n- 모든 직원의 출근 기록 기반으로 세전 급여 자동 계산\n- 공제 항목은 0원으로 생성되므로 나중에 수정 필요\n- 이미 생성된 직원은 건너뜁니다`)) {
                  try {
                    const response = await salaryAPI.generateMonthlySlips(selectedWorkplace, {
                      payrollMonth,
                      payDate: payDate || null
                    });
                    setMessage({
                      type: 'success',
                      text: `${response.data.created}개 생성, ${response.data.skipped}개 건너뜀. 직원을 선택하여 공제 항목을 수정한 후 배포하세요.`
                    });
                    // 선택된 직원 새로고침
                    if (selectedSlipEmployee) {
                      const slipsResponse = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                      setEmployeeSlips(slipsResponse.data.data || slipsResponse.data || []);
                    }
                    // 당월 급여대장 자동 갱신
                    if (payrollMonth === payrollLedgerMonth) {
                      const ledgerResponse = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                      setPayrollLedgerData(ledgerResponse.data);
                    }
                  } catch (error) {
                    console.error('자동 생성 오류:', error);
                    setMessage({ type: 'error', text: error.response?.data?.message || '자동 생성에 실패했습니다.' });
                  }
                }
              }}
            >
              📅 월별 자동 생성
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingSlipId(null);
                setSlipFormData({
                  userId: '',
                  payrollMonth: (() => {
                    const now = new Date();
                    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  })(),
                  payDate: '',
                  taxType: '4대보험',
                  basePay: '',
                  dependentsCount: 1,
                  nationalPension: '',
                  healthInsurance: '',
                  employmentInsurance: '',
                  longTermCare: '',
                  incomeTax: '',
                  localIncomeTax: ''
                });
                setShowSlipModal(true);
              }}
            >
              + 급여명세서 작성
            </button>
          </div>
        </div>

        <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
          💡 <strong>월별 자동 생성</strong>: 모든 직원의 출근 기록 기반으로 세전 급여가 자동 계산됩니다 (공제 항목 0원). 수정 후 배포하세요.<br/>
          📝 프리랜서(3.3%)는 원천징수가 자동 계산되며, 4대보험은 공제 항목을 직접 입력하세요.
        </p>

      {/* 직원 선택 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">직원 선택</label>
            <select
              className="form-select"
              value={selectedSlipEmployee || ''}
              onChange={async (e) => {
                const userId = e.target.value;
                setSelectedSlipEmployee(userId ? parseInt(userId) : null);
                if (userId) {
                  try {
                    const response = await salaryAPI.getEmployeeSlips(userId);
                    setEmployeeSlips(response.data.data || response.data || []);
                  } catch (error) {
                    console.error('급여명세서 조회 오류:', error);
                    setEmployeeSlips([]);
                  }
                } else {
                  setEmployeeSlips([]);
                }
              }}
            >
              <option value="">전체 직원</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.username})
                </option>
              ))}
            </select>
          </div>
          {selectedSlipEmployee && (
            <button
              className="btn btn-success"
              style={{ whiteSpace: 'nowrap' }}
              onClick={async () => {
                const selectedEmp = employees.find(e => e.id === selectedSlipEmployee);
                if (!selectedEmp) return;

                if (window.confirm(`${selectedEmp.name}님의 입사일(${formatDate(selectedEmp.hire_date)})부터 현재까지의 급여명세서를 일괄 생성하시겠습니까?\n\n- 출근 기록 기반으로 세전 급여 자동 계산\n- 공제 항목은 0원 (3.3%는 자동)\n- 이미 생성된 월은 건너뜁니다`)) {
                  try {
                    const response = await salaryAPI.generateEmployeeHistory(selectedSlipEmployee);
                    setMessage({
                      type: 'success',
                      text: `${response.data.employee.name}님의 과거 급여명세서 ${response.data.created}개 생성, ${response.data.skipped}개 건너뜀. 공제 항목을 수정한 후 배포하세요.`
                    });
                    // 급여명세서 목록 새로고침
                    const slipsResponse = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                    setEmployeeSlips(slipsResponse.data.data || slipsResponse.data || []);
                  } catch (error) {
                    console.error('과거 급여 일괄 생성 오류:', error);
                    setMessage({ type: 'error', text: error.response?.data?.message || '일괄 생성에 실패했습니다.' });
                  }
                }
              }}
            >
              📋 입사일부터 일괄 생성
            </button>
          )}
        </div>
      </div>

      {selectedSlipEmployee && (
        <div style={{ overflowX: 'auto' }}>
          {employeeSlips.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
              등록된 급여명세서가 없습니다.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>귀속월</th>
                  <th>지급일</th>
                  <th>인건비 구분</th>
                  <th>기본급</th>
                  <th>공제합계</th>
                  <th>실수령액</th>
                  <th>배포 상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {employeeSlips.map((slip) => (
                  <tr key={slip.id}>
                    <td style={{ fontWeight: '600' }}>{slip.payroll_month}</td>
                    <td>{formatDate(slip.pay_date)}</td>
                    <td style={{ fontSize: '12px', color: '#6366f1' }}>{slip.tax_type || '4대보험'}</td>
                    <td>{formatCurrency(slip.base_pay)}</td>
                    <td style={{ color: '#ef4444' }}>-{formatCurrency(slip.total_deductions)}</td>
                    <td style={{ fontWeight: '700', color: '#667eea' }}>{formatCurrency(slip.net_pay)}</td>
                    <td>
                      {slip.published || slip.published === 1 ? (
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          배포됨
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          미배포
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {!(slip.published || slip.published === 1) && (
                          <button
                            className="btn btn-success"
                            style={{ fontSize: '12px', padding: '4px 12px' }}
                            onClick={() => {
                              setSlipToPublish(slip);
                              setShowPublishWarning(true);
                            }}
                          >
                            배포
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                          onClick={() => {
                            setEditingSlipId(slip.id);
                            setSlipFormData({
                              userId: slip.user_id,
                              payrollMonth: slip.payroll_month,
                              payDate: slip.pay_date,
                              taxType: slip.tax_type || '4대보험',
                              basePay: slip.base_pay,
                              dependentsCount: slip.dependents_count || 1,
                              nationalPension: slip.national_pension,
                              healthInsurance: slip.health_insurance,
                              employmentInsurance: slip.employment_insurance,
                              longTermCare: slip.long_term_care,
                              incomeTax: slip.income_tax,
                              localIncomeTax: slip.local_income_tax
                            });
                            setShowSlipModal(true);
                          }}
                        >
                          수정
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                          onClick={async () => {
                            if (window.confirm('급여명세서를 삭제하시겠습니까?')) {
                              try {
                                await salaryAPI.deleteSlip(slip.id);
                                setMessage({ type: 'success', text: '급여명세서가 삭제되었습니다.' });
                                const response = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                                setEmployeeSlips(response.data.data || response.data || []);
                              } catch (error) {
                                console.error('삭제 오류:', error);
                                setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
                              }
                            }
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      </div>
    </>
  );
};

export default SalarySlipsTab;
