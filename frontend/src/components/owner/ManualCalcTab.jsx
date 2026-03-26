import React, { useState, useCallback } from 'react';

const ManualCalcTab = ({ formatCurrency, isMobile }) => {
  const [workers, setWorkers] = useState([createEmptyWorker()]);
  const [results, setResults] = useState(null);

  function createEmptyWorker() {
    return {
      id: Date.now() + Math.random(),
      name: '',
      salaryType: 'hourly',
      amount: '',
      totalHours: '',
      overtimeHours: '0',
      taxType: '4대보험',
      dependents: 1
    };
  }

  const addWorker = () => setWorkers(prev => [...prev, createEmptyWorker()]);

  const removeWorker = (id) => {
    if (workers.length <= 1) return;
    setWorkers(prev => prev.filter(w => w.id !== id));
    if (results) setResults(null);
  };

  const updateWorker = (id, field, value) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
    if (results) setResults(null);
  };

  const calculate = useCallback(() => {
    const calculated = workers.map(w => {
      const amount = parseFloat(w.amount) || 0;
      const totalHours = parseFloat(w.totalHours) || 0;
      const days = parseFloat(w.daysPerMonth) || 22;
      const overtime = parseFloat(w.overtimeHours) || 0;

      let monthlyPay = 0;
      if (w.salaryType === 'hourly') {
        monthlyPay = amount * totalHours;
        if (overtime > 0) monthlyPay += amount * 1.5 * overtime;
      } else if (w.salaryType === 'daily') {
        monthlyPay = amount * days;
      } else {
        monthlyPay = amount;
      }

      // 4대보험 계산
      let nationalPension = 0, healthInsurance = 0, longTermCare = 0, employmentInsurance = 0;
      let incomeTax = 0, localIncomeTax = 0;

      if (w.taxType === '4대보험') {
        nationalPension = Math.round(monthlyPay * 0.045);
        healthInsurance = Math.round(monthlyPay * 0.03545);
        longTermCare = Math.round(healthInsurance * 0.1295);
        employmentInsurance = Math.round(monthlyPay * 0.009);

        // 간이세액 추정 (간략화)
        const taxBase = monthlyPay - nationalPension - healthInsurance - longTermCare - employmentInsurance;
        if (taxBase > 1500000) {
          incomeTax = Math.round((taxBase - 1500000) * 0.06 + (Math.min(taxBase, 1500000) - 1060000) * 0.06);
          if (incomeTax < 0) incomeTax = 0;
        }
        localIncomeTax = Math.round(incomeTax * 0.1);
      } else if (w.taxType === '프리랜서') {
        incomeTax = Math.round(monthlyPay * 0.03);
        localIncomeTax = Math.round(incomeTax * 0.1);
      }

      const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax;
      const netPay = monthlyPay - totalDeductions;

      return {
        ...w,
        monthlyPay,
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        incomeTax,
        localIncomeTax,
        totalDeductions,
        netPay
      };
    });

    setResults(calculated);
  }, [workers]);

  const totalGross = results ? results.reduce((s, r) => s + r.monthlyPay, 0) : 0;
  const totalNet = results ? results.reduce((s, r) => s + r.netPay, 0) : 0;
  const totalDeductions = results ? results.reduce((s, r) => s + r.totalDeductions, 0) : 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>✏️ 수기 급여계산</h3>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
              직원 등록 없이 빠르게 급여를 계산합니다
            </p>
          </div>
          <button onClick={addWorker} style={{
            padding: '8px 16px', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
          }}>
            + 직원 추가
          </button>
        </div>

        {workers.map((w, idx) => (
          <div key={w.id} style={{
            padding: '16px', marginBottom: '12px', background: '#f9fafb',
            borderRadius: '10px', border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                직원 {idx + 1}
              </span>
              {workers.length > 1 && (
                <button onClick={() => removeWorker(w.id)} style={{
                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px'
                }}>삭제</button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>이름</label>
                <input value={w.name} onChange={e => updateWorker(w.id, 'name', e.target.value)}
                  placeholder="직원명" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>급여 형태</label>
                <select value={w.salaryType} onChange={e => updateWorker(w.id, 'salaryType', e.target.value)} style={inputStyle}>
                  <option value="hourly">시급</option>
                  <option value="daily">일급</option>
                  <option value="monthly">월급</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  {w.salaryType === 'hourly' ? '시급 (원)' : w.salaryType === 'daily' ? '일급 (원)' : '월급 (원)'}
                </label>
                <input type="number" value={w.amount} onChange={e => updateWorker(w.id, 'amount', e.target.value)}
                  placeholder={w.salaryType === 'hourly' ? '10320' : w.salaryType === 'daily' ? '82560' : '2200000'}
                  style={inputStyle} />
              </div>
            </div>

            {w.salaryType === 'hourly' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={labelStyle}>총 근무시간</label>
                  <input type="number" value={w.totalHours} onChange={e => updateWorker(w.id, 'totalHours', e.target.value)}
                    placeholder="176" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>연장근로(시간)</label>
                  <input type="number" value={w.overtimeHours} onChange={e => updateWorker(w.id, 'overtimeHours', e.target.value)}
                    placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>세금 유형</label>
                  <select value={w.taxType} onChange={e => updateWorker(w.id, 'taxType', e.target.value)} style={inputStyle}>
                    <option value="4대보험">4대보험</option>
                    <option value="프리랜서">프리랜서 (3.3%)</option>
                    <option value="없음">세금 없음</option>
                  </select>
                </div>
              </div>
            )}
            {w.salaryType === 'daily' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={labelStyle}>월 근무일수</label>
                  <input type="number" value={w.daysPerMonth} onChange={e => updateWorker(w.id, 'daysPerMonth', e.target.value)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>세금 유형</label>
                  <select value={w.taxType} onChange={e => updateWorker(w.id, 'taxType', e.target.value)} style={inputStyle}>
                    <option value="4대보험">4대보험</option>
                    <option value="프리랜서">프리랜서 (3.3%)</option>
                    <option value="없음">세금 없음</option>
                  </select>
                </div>
              </div>
            )}

            {w.salaryType === 'monthly' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={labelStyle}>세금 유형</label>
                  <select value={w.taxType} onChange={e => updateWorker(w.id, 'taxType', e.target.value)} style={inputStyle}>
                    <option value="4대보험">4대보험</option>
                    <option value="프리랜서">프리랜서 (3.3%)</option>
                    <option value="없음">세금 없음</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}

        <button onClick={calculate} style={{
          width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px',
          fontWeight: '700', cursor: 'pointer', marginTop: '8px'
        }}>
          급여 계산하기
        </button>
      </div>

      {results && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#1f2937', fontSize: '18px' }}>📊 계산 결과</h3>

          {/* 총계 요약 */}
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
            gap: '12px', marginBottom: '20px'
          }}>
            <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#3b82f6', marginBottom: '4px' }}>총 지급액</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1d4ed8' }}>{formatCurrency(totalGross)}</div>
            </div>
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#ef4444', marginBottom: '4px' }}>총 공제액</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(totalDeductions)}</div>
            </div>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#10b981', marginBottom: '4px' }}>총 실수령액</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{formatCurrency(totalNet)}</div>
            </div>
          </div>

          {/* 개인별 상세 */}
          {results.map((r, idx) => (
            <div key={r.id} style={{
              padding: '16px', marginBottom: '10px', background: '#f9fafb',
              borderRadius: '10px', border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontWeight: '700', color: '#1f2937', marginBottom: '10px', fontSize: '15px' }}>
                {r.name || `직원 ${idx + 1}`}
                <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '13px', marginLeft: '8px' }}>
                  ({r.salaryType === 'hourly' ? '시급' : r.salaryType === 'daily' ? '일급' : '월급'} {formatCurrency(parseFloat(r.amount) || 0)})
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div><span style={{ color: '#6b7280' }}>월 지급액</span><br /><strong>{formatCurrency(r.monthlyPay)}</strong></div>
                {r.taxType === '4대보험' && (
                  <>
                    <div><span style={{ color: '#6b7280' }}>국민연금</span><br />{formatCurrency(r.nationalPension)}</div>
                    <div><span style={{ color: '#6b7280' }}>건강보험</span><br />{formatCurrency(r.healthInsurance)}</div>
                    <div><span style={{ color: '#6b7280' }}>장기요양</span><br />{formatCurrency(r.longTermCare)}</div>
                    <div><span style={{ color: '#6b7280' }}>고용보험</span><br />{formatCurrency(r.employmentInsurance)}</div>
                    <div><span style={{ color: '#6b7280' }}>소득세</span><br />{formatCurrency(r.incomeTax)}</div>
                    <div><span style={{ color: '#6b7280' }}>지방소득세</span><br />{formatCurrency(r.localIncomeTax)}</div>
                  </>
                )}
                {r.taxType === '프리랜서' && (
                  <>
                    <div><span style={{ color: '#6b7280' }}>소득세(3%)</span><br />{formatCurrency(r.incomeTax)}</div>
                    <div><span style={{ color: '#6b7280' }}>지방소득세</span><br />{formatCurrency(r.localIncomeTax)}</div>
                  </>
                )}
                <div><span style={{ color: '#ef4444' }}>공제합계</span><br /><strong style={{ color: '#ef4444' }}>{formatCurrency(r.totalDeductions)}</strong></div>
                <div><span style={{ color: '#059669' }}>실수령액</span><br /><strong style={{ color: '#059669', fontSize: '15px' }}>{formatCurrency(r.netPay)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const labelStyle = { display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' };
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
  fontSize: '14px', boxSizing: 'border-box', background: '#fff'
};

export default ManualCalcTab;
