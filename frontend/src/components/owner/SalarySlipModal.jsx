import React from 'react';
import { salaryAPI } from '../../services/api';

const SalarySlipModal = ({
  showSlipModal,
  editingSlipId,
  setShowSlipModal,
  setEditingSlipId,
  slipFormData,
  setSlipFormData,
  employees,
  selectedWorkplace,
  selectedSlipEmployee,
  setEmployeeSlips,
  payrollLedgerMonth,
  setPayrollLedgerData,
  message,
  setMessage,
  formatCurrency,
}) => {
  if (!showSlipModal) return null;

  return (
    <div className="modal-overlay" onClick={() => {
      setShowSlipModal(false);
      setEditingSlipId(null);
    }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h3>{editingSlipId ? '급여명세서 수정' : '급여명세서 작성'}</h3>
            <button
              className="modal-close"
              onClick={() => {
                setShowSlipModal(false);
                setEditingSlipId(null);
              }}
            >
              x
            </button>
          </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">직원 선택 *</label>
            <select
              className="form-select"
              value={slipFormData.userId}
              disabled={editingSlipId !== null}
              onChange={(e) => {
                const selectedUserId = e.target.value;
                const selectedEmployee = employees.find(emp => emp.id === parseInt(selectedUserId));

                // 직원 선택 시 급여 지급일 자동 계산
                let calculatedPayDate = '';
                if (selectedEmployee && slipFormData.payrollMonth) {
                  const [year, month] = slipFormData.payrollMonth.split('-').map(Number);

                  if (selectedEmployee.pay_schedule_type === '월말' && selectedEmployee.pay_day !== null && selectedEmployee.pay_day !== undefined) {
                    const nextMonth = month === 12 ? 1 : month + 1;
                    const nextYear = month === 12 ? year + 1 : year;
                    const payDay = selectedEmployee.pay_day === 0 ? new Date(nextYear, nextMonth, 0).getDate() : selectedEmployee.pay_day;
                    calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                  } else if (selectedEmployee.pay_schedule_type === '입사일 기준' && selectedEmployee.hire_date) {
                    const hireDate = new Date(selectedEmployee.hire_date);
                    const hireDay = hireDate.getDate();
                    const nextMonth = month === 12 ? 1 : month + 1;
                    const nextYear = month === 12 ? year + 1 : year;
                    const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
                    const payDay = Math.min(hireDay, lastDayOfNextMonth);
                    calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                  }
                }

                setSlipFormData({
                  ...slipFormData,
                  userId: selectedUserId,
                  payDate: calculatedPayDate || slipFormData.payDate
                });
              }}
              required
            >
              <option value="">선택하세요</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.username})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">귀속월 *</label>
              <input
                type="month"
                className="form-input"
                value={slipFormData.payrollMonth}
                onChange={(e) => {
                  const newPayrollMonth = e.target.value;
                  const selectedEmployee = employees.find(emp => emp.id === parseInt(slipFormData.userId));

                  let calculatedPayDate = '';
                  if (selectedEmployee && newPayrollMonth) {
                    const [year, month] = newPayrollMonth.split('-').map(Number);

                    if (selectedEmployee.pay_schedule_type === '월말' && selectedEmployee.pay_day !== null && selectedEmployee.pay_day !== undefined) {
                      const nextMonth = month === 12 ? 1 : month + 1;
                      const nextYear = month === 12 ? year + 1 : year;
                      const payDay = selectedEmployee.pay_day === 0 ? new Date(nextYear, nextMonth, 0).getDate() : selectedEmployee.pay_day;
                      calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                    } else if (selectedEmployee.pay_schedule_type === '입사일 기준' && selectedEmployee.hire_date) {
                      const hireDate = new Date(selectedEmployee.hire_date);
                      const hireDay = hireDate.getDate();
                      const nextMonth = month === 12 ? 1 : month + 1;
                      const nextYear = month === 12 ? year + 1 : year;
                      const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
                      const payDay = Math.min(hireDay, lastDayOfNextMonth);
                      calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                    }
                  }

                  setSlipFormData({
                    ...slipFormData,
                    payrollMonth: newPayrollMonth,
                    payDate: calculatedPayDate || slipFormData.payDate
                  });
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">지급일</label>
              <input
                type="date"
                className="form-input"
                value={slipFormData.payDate}
                onChange={(e) => setSlipFormData({ ...slipFormData, payDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">인건비 신고 구분 *</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="taxType"
                  value="4대보험"
                  checked={slipFormData.taxType === '4대보험'}
                  onChange={(e) => setSlipFormData({ ...slipFormData, taxType: e.target.value })}
                  style={{ marginRight: '6px' }}
                />
                4대보험
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="taxType"
                  value="3.3%"
                  checked={slipFormData.taxType === '3.3%'}
                  onChange={(e) => setSlipFormData({ ...slipFormData, taxType: e.target.value })}
                  style={{ marginRight: '6px' }}
                />
                프리랜서 (3.3%)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">기본급 (세전) *</label>
            <input
              type="number"
              className="form-input"
              value={slipFormData.basePay}
              onChange={(e) => setSlipFormData({ ...slipFormData, basePay: e.target.value })}
              placeholder="0"
              required
            />
          </div>

          {slipFormData.taxType === '4대보험' && (
            <div className="form-group">
              <label className="form-label">부양가족 수 (본인 포함)</label>
              <input
                type="number"
                className="form-input"
                value={slipFormData.dependentsCount}
                onChange={(e) => setSlipFormData({ ...slipFormData, dependentsCount: Math.max(1, parseInt(e.target.value) || 1) })}
                placeholder="1"
                min="1"
                style={{ maxWidth: '200px' }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                부양가족 수는 소득세 계산에 사용됩니다 (본인 포함)
              </small>
            </div>
          )}

          {slipFormData.taxType === '3.3%' ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                자동 계산 (프리랜서)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#374151' }}>원천징수 (3.3%)</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                  {formatCurrency(Math.round((parseFloat(slipFormData.basePay) || 0) * 0.033))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>실수령액</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#667eea' }}>
                  {formatCurrency((parseFloat(slipFormData.basePay) || 0) - Math.round((parseFloat(slipFormData.basePay) || 0) * 0.033))}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  공제 항목 (4대보험)
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    if (!slipFormData.basePay || parseFloat(slipFormData.basePay) <= 0) {
                      setMessage({ type: 'error', text: '기본급(세전)을 먼저 입력해주세요.' });
                      return;
                    }
                    try {
                      setMessage({ type: 'info', text: '4대보험료 및 소득세 자동 계산 중...' });

                      const insuranceResponse = await salaryAPI.calculateInsurance({
                        basePay: parseFloat(slipFormData.basePay),
                        payrollMonth: slipFormData.payrollMonth,
                        taxType: '4대보험'
                      });
                      const insurance = insuranceResponse.data.insurance;
                      const employerBurden = insuranceResponse.data.employerBurden;

                      const afterInsurance = parseFloat(slipFormData.basePay) - insurance.total;
                      const taxResponse = await salaryAPI.calculateTax(
                        afterInsurance,
                        parseInt(slipFormData.dependentsCount) || 1
                      );

                      const incomeTax = taxResponse.data.incomeTax || 0;
                      const localIncomeTax = Math.floor(incomeTax * 0.1);

                      setSlipFormData({
                        ...slipFormData,
                        nationalPension: insurance.nationalPension,
                        healthInsurance: insurance.healthInsurance,
                        longTermCare: insurance.longTermCare,
                        employmentInsurance: insurance.employmentInsurance,
                        incomeTax: incomeTax,
                        localIncomeTax: localIncomeTax,
                        employerNationalPension: employerBurden.nationalPension,
                        employerHealthInsurance: employerBurden.healthInsurance,
                        employerLongTermCare: employerBurden.longTermCare,
                        employerEmploymentInsurance: employerBurden.employmentInsurance
                      });
                      setMessage({ type: 'success', text: `4대보험료 및 소득세가 자동 계산되었습니다! (${slipFormData.payrollMonth || '현재'} 기준 요율 적용)` });
                    } catch (error) {
                      console.error('자동 계산 오류:', error);
                      setMessage({ type: 'error', text: error.response?.data?.message || '자동 계산에 실패했습니다.' });
                    }
                  }}
                  style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                >
                  자동 계산
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">국민연금</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.nationalPension}
                    onChange={(e) => setSlipFormData({ ...slipFormData, nationalPension: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">건강보험</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.healthInsurance}
                    onChange={(e) => setSlipFormData({ ...slipFormData, healthInsurance: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">장기요양보험</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.longTermCare}
                    onChange={(e) => setSlipFormData({ ...slipFormData, longTermCare: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">고용보험</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.employmentInsurance}
                    onChange={(e) => setSlipFormData({ ...slipFormData, employmentInsurance: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">소득세</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.incomeTax}
                    onChange={(e) => setSlipFormData({ ...slipFormData, incomeTax: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">지방소득세</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.localIncomeTax}
                    onChange={(e) => setSlipFormData({ ...slipFormData, localIncomeTax: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 사업주 부담금 (4대보험인 경우만 표시) */}
              {slipFormData.taxType === '4대보험' && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  border: '1px solid #fbbf24',
                  marginTop: '16px'
                }}>
                  <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', marginBottom: '12px' }}>
                    사업주 부담금 (참고용)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#78350f' }}>국민연금:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerNationalPension) || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#78350f' }}>건강보험:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerHealthInsurance) || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#78350f' }}>고용보험:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerEmploymentInsurance) || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#78350f' }}>장기요양:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerLongTermCare) || 0)}</span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '2px solid #fbbf24'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>사업주 부담금 합계</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                      {formatCurrency(
                        (parseFloat(slipFormData.employerNationalPension) || 0) +
                        (parseFloat(slipFormData.employerHealthInsurance) || 0) +
                        (parseFloat(slipFormData.employerEmploymentInsurance) || 0) +
                        (parseFloat(slipFormData.employerLongTermCare) || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                marginTop: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  계산 결과
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#374151' }}>총 공제액</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                    {formatCurrency(
                      (parseFloat(slipFormData.nationalPension) || 0) +
                      (parseFloat(slipFormData.healthInsurance) || 0) +
                      (parseFloat(slipFormData.employmentInsurance) || 0) +
                      (parseFloat(slipFormData.longTermCare) || 0) +
                      (parseFloat(slipFormData.incomeTax) || 0) +
                      (parseFloat(slipFormData.localIncomeTax) || 0)
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>실수령액</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#667eea' }}>
                    {formatCurrency(
                      (parseFloat(slipFormData.basePay) || 0) -
                      ((parseFloat(slipFormData.nationalPension) || 0) +
                      (parseFloat(slipFormData.healthInsurance) || 0) +
                      (parseFloat(slipFormData.employmentInsurance) || 0) +
                      (parseFloat(slipFormData.longTermCare) || 0) +
                      (parseFloat(slipFormData.incomeTax) || 0) +
                      (parseFloat(slipFormData.localIncomeTax) || 0))
                    )}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowSlipModal(false);
              setEditingSlipId(null);
            }}
          >
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!slipFormData.userId || !slipFormData.payrollMonth || !slipFormData.basePay) {
                setMessage({ type: 'error', text: '필수 항목을 모두 입력해주세요.' });
                return;
              }

              try {
                if (editingSlipId) {
                  await salaryAPI.updateSlip(editingSlipId, slipFormData);
                  setMessage({ type: 'success', text: '급여명세서가 수정되었습니다.' });
                } else {
                  await salaryAPI.createSlip({
                    ...slipFormData,
                    workplaceId: selectedWorkplace
                  });
                  setMessage({ type: 'success', text: '급여명세서가 작성되었습니다.' });
                }

                setShowSlipModal(false);
                setEditingSlipId(null);

                // 선택된 직원의 급여명세서 새로고침
                if (selectedSlipEmployee) {
                  const response = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                  setEmployeeSlips(response.data.data || response.data || []);
                }

                // 월별 급여대장 자동 갱신
                if (slipFormData.payrollMonth === payrollLedgerMonth) {
                  try {
                    const ledgerResponse = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                    setPayrollLedgerData(ledgerResponse.data);
                  } catch (error) {
                    console.error('급여대장 자동 갱신 오류:', error);
                  }
                }
              } catch (error) {
                console.error('급여명세서 저장 오류:', error);
                setMessage({ type: 'error', text: '저장에 실패했습니다.' });
              }
            }}
          >
            {editingSlipId ? '수정' : '저장'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SalarySlipModal;
