import React from 'react';

const PastEmployeesTab = ({
  pastEmployees,
  formatDate,
  handleDeletePastEmployee,
  openModal
}) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#374151' }}>📂 과거 직원 급여 기록</h3>
        <button
          className="btn btn-primary"
          onClick={() => openModal('pastEmployee', {})}
        >
          + 과거 직원 등록
        </button>
      </div>

      <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
        퇴사한 직원의 급여 정보를 입력하고 퇴직금을 계산할 수 있습니다.
      </p>

      {pastEmployees && pastEmployees.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>이름</th>
                <th>입사일</th>
                <th>퇴사일</th>
                <th>근속기간</th>
                <th>평균 월급여</th>
                <th>퇴직금</th>
                <th>비고</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {pastEmployees.map((emp) => {
                const years = ((new Date(emp.resignation_date) - new Date(emp.hire_date)) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
                return (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: '600' }}>{emp.name}</td>
                    <td>{formatDate(emp.hire_date)}</td>
                    <td>{formatDate(emp.resignation_date)}</td>
                    <td>{years}년</td>
                    <td>{Number(emp.average_monthly_salary).toLocaleString()}원</td>
                    <td style={{ color: emp.severance_pay > 0 ? '#f59e0b' : '#9ca3af', fontWeight: '600' }}>
                      {emp.severance_pay > 0 ? `${Number(emp.severance_pay).toLocaleString()}원` : '1년 미만'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.notes || '-'}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDeletePastEmployee(emp.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
          등록된 과거 직원이 없습니다.
        </p>
      )}
    </div>
  );
};

export default PastEmployeesTab;
