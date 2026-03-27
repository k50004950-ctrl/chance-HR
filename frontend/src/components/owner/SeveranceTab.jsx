import React from 'react';

const SeveranceTab = ({
  employees,
  getSeverancePayById,
  getYearsOfService,
  formatDate,
  formatCurrency,
  pastPayrollEmployeeId,
  setPastPayrollEmployeeId,
  pastPayrollYear,
  setPastPayrollYear,
  pastPayrollMonth,
  setPastPayrollMonth,
  pastPayrollForm,
  setPastPayrollForm,
  handleAddPastPayroll,
  handleDeletePastPayroll,
  pastPayrollRecords,
  getMonthRange,
  getSalaryTypeName,
  selectedWorkplace,
  salaryAPI,
  setMessage
}) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#374151' }}>🧮 퇴직금 계산</h3>
      </div>
      <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
        퇴직금은 오늘 기준으로 계산됩니다. (1년 이상 근무자만 표시)
      </p>

      {employees.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
          등록된 직원이 없습니다.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>직원명</th>
                <th>입사일</th>
                <th>근속기간(년)</th>
                <th>퇴직금(당일퇴사)</th>
              </tr>
            </thead>
            <tbody>
              {employees
                .filter((emp) => emp.employment_status !== 'resigned')
                .map((emp) => {
                  const severancePay = getSeverancePayById(emp.id);
                  return (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: '600' }}>{emp.name}</td>
                      <td>{formatDate(emp.hire_date)}</td>
                      <td>{getYearsOfService(emp.hire_date)}</td>
                      <td style={{ color: severancePay > 0 ? '#f59e0b' : '#9ca3af', fontWeight: severancePay > 0 ? '600' : '400' }}>
                        {severancePay > 0 ? formatCurrency(severancePay) : '1년 미만'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <h4 style={{ color: '#374151', marginBottom: '12px' }}>🧾 과거 급여 수기 입력/조회</h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <select
            className="form-select"
            value={pastPayrollEmployeeId || ''}
            onChange={(e) => setPastPayrollEmployeeId(e.target.value)}
          >
            <option value="">직원 선택</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.username})
              </option>
            ))}
          </select>
          <input
            type="number"
            className="form-input"
            style={{ width: '110px' }}
            value={pastPayrollYear}
            onChange={(e) => setPastPayrollYear(Number(e.target.value))}
            min="2000"
            max="2100"
          />
          <select
            className="form-select"
            value={pastPayrollMonth}
            onChange={(e) => setPastPayrollMonth(e.target.value)}
          >
            <option value="">전체 월</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                {i + 1}월
              </option>
            ))}
          </select>
        </div>

        {pastPayrollEmployeeId && (
          <>
            <div className="grid grid-2" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">시작일</label>
                <input
                  type="date"
                  className="form-input"
                  value={pastPayrollForm.start_date}
                  onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">종료일</label>
                <input
                  type="date"
                  className="form-input"
                  value={pastPayrollForm.end_date}
                  onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, end_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">급여 유형</label>
                <select
                  className="form-input"
                  value={pastPayrollForm.salary_type}
                  onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, salary_type: e.target.value })}
                >
                  <option value="hourly">시급</option>
                  <option value="monthly">월급</option>
                  <option value="annual">연봉</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">금액</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="예: 2500000"
                  value={pastPayrollForm.amount}
                  onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">비고</label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 2023년 5월 수기 입력"
                value={pastPayrollForm.notes}
                onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, notes: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginBottom: '16px' }}
              onClick={() => handleAddPastPayroll(pastPayrollEmployeeId)}
            >
              + 과거 급여 기록 추가
            </button>

            {pastPayrollRecords.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>기간</th>
                      <th>급여유형</th>
                      <th>금액</th>
                      <th>비고</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastPayrollRecords
                      .filter((record) => {
                        if (!pastPayrollYear) return true;
                        const range = pastPayrollMonth
                          ? getMonthRange(pastPayrollYear, Number(pastPayrollMonth))
                          : {
                              start: new Date(pastPayrollYear, 0, 1),
                              end: new Date(pastPayrollYear, 11, 31, 23, 59, 59, 999)
                            };
                        if (!range) return true;
                        const start = new Date(record.start_date);
                        const end = new Date(record.end_date);
                        return start <= range.end && end >= range.start;
                      })
                      .map((record) => (
                        <tr key={record.id}>
                          <td style={{ fontSize: '12px' }}>
                            {formatDate(record.start_date)} ~ {formatDate(record.end_date)}
                          </td>
                          <td>{getSalaryTypeName(record.salary_type)}</td>
                          <td>{Number(record.amount).toLocaleString()}원</td>
                          <td>{record.notes || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                onClick={async () => {
                                  if (window.confirm('이 과거 급여 기록을 급여명세서로 생성하시겠습니까?')) {
                                    try {
                                      const endDate = new Date(record.end_date);
                                      const payrollMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

                                      await salaryAPI.createSlip({
                                        workplaceId: selectedWorkplace,
                                        userId: pastPayrollEmployeeId,
                                        payrollMonth: payrollMonth,
                                        payDate: record.end_date,
                                        taxType: '4대보험',
                                        basePay: record.amount,
                                        nationalPension: 0,
                                        healthInsurance: 0,
                                        employmentInsurance: 0,
                                        longTermCare: 0,
                                        incomeTax: 0,
                                        localIncomeTax: 0
                                      });

                                      setMessage({
                                        type: 'success',
                                        text: `급여명세서가 생성되었습니다 (귀속월: ${payrollMonth}). 급여명세서 탭에서 확인하고 공제 항목을 수정한 후 배포하세요.`
                                      });
                                    } catch (error) {
                                      console.error('급여명세서 생성 오류:', error);
                                      setMessage({ type: 'error', text: error.response?.data?.message || '급여명세서 생성에 실패했습니다.' });
                                    }
                                  }
                                }}
                              >
                                📝 명세서 생성
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                onClick={() => handleDeletePastPayroll(record.id)}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: '12px' }}>등록된 과거 급여 기록이 없습니다.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SeveranceTab;
