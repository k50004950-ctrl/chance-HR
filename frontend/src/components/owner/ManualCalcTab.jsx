import React, { useState, useCallback, useEffect } from 'react';
import { manualCalcAPI, insuranceAPI, employeeAPI } from '../../services/api';

const ManualCalcTab = ({ formatCurrency, isMobile, selectedWorkplace, onEmployeeSaved }) => {
  const [workers, setWorkers] = useState([createEmptyWorker()]);
  const [results, setResults] = useState(null);
  const [rates, setRates] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);

  function createEmptyWorker() {
    return {
      id: Date.now() + Math.random(),
      name: '',
      salaryType: 'hourly',
      amount: '',
      totalHours: '',
      weeklyHours: '40',
      daysPerMonth: '22',
      overtimeHours: '0',
      taxType: '4대보험',
      includeWeeklyHoliday: true,
    };
  }

  // DB에서 최신 보험 요율 로드
  useEffect(() => {
    loadRates();
    loadHistory();
  }, []);

  const loadRates = async () => {
    try {
      const res = await insuranceAPI.getCurrent();
      const data = res.data.data || res.data;
      if (data) setRates(data);
    } catch (e) {
      console.log('요율 로드 실패, 기본값 사용');
    }
  };

  const loadHistory = async () => {
    try {
      const res = await manualCalcAPI.getList();
      setHistory(res.data.data || res.data || []);
    } catch (e) {
      console.log('이력 로드 실패');
    }
  };

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

  // 요율 가져오기 (DB 우선, 없으면 기본값)
  // DB는 소수점 형태로 저장 (예: 0.0475 = 4.75%)
  const getRate = (key, fallback) => {
    if (!rates) return fallback;
    const val = parseFloat(rates[key]);
    return isNaN(val) ? fallback : val;
  };

  const calculate = useCallback(() => {
    // 2026년 요율 (DB 우선, 없으면 2026년 법정 기본값)
    const npsRate = getRate('national_pension_rate', 0.0475);      // 국민연금 4.75% (2026년)
    const nhisRate = getRate('health_insurance_rate', 0.03595);    // 건강보험 3.595% (2026년)
    const ltciRate = getRate('long_term_care_rate', 0.1314);       // 장기요양 13.14% (건강보험료 대비, 2026년)
    const eiRate = getRate('employment_insurance_rate', 0.009);    // 고용보험 0.9% (2026년)

    const calculated = workers.map(w => {
      const amount = parseFloat(w.amount) || 0;
      const totalHours = parseFloat(w.totalHours) || 0;
      // 주당 근무시간: 입력값 사용 (기본값 40)
      const weeklyHours = parseFloat(w.weeklyHours) || 40;
      const days = parseFloat(w.daysPerMonth) || 22;
      const overtime = parseFloat(w.overtimeHours) || 0;

      let basePay = 0;
      let weeklyHolidayPay = 0;
      let overtimePay = 0;

      if (w.salaryType === 'hourly') {
        basePay = amount * totalHours;
        overtimePay = overtime > 0 ? Math.round(amount * 1.5 * overtime) : 0;

        // 주휴수당: 주 15시간 이상 + 토글 ON일 때 지급 (근로기준법 제55조)
        // 공식: (주 소정근로시간 / 40) × 8 × 시급 × (월/주 환산 ≒ 4.345주)
        if (w.includeWeeklyHoliday && weeklyHours >= 15) {
          const weeklyAllowance = (Math.min(weeklyHours, 40) / 40) * 8 * amount;
          weeklyHolidayPay = Math.round(weeklyAllowance * 4.345); // 월 평균 4.345주
        }
      } else if (w.salaryType === 'daily') {
        basePay = amount * days;
        // 일급자: 주 15시간 이상 + 토글 ON일 때 주휴수당
        if (w.includeWeeklyHoliday && weeklyHours >= 15) {
          const dailyWeeklyHours = weeklyHours; // 주당 근무시간 입력값 사용
          const weeklyAllowance = (Math.min(dailyWeeklyHours, 40) / 40) * amount;
          weeklyHolidayPay = Math.round(weeklyAllowance * 4.345);
        }
      } else {
        basePay = amount;
        // 월급자: 주휴수당 이미 포함된 것으로 간주
      }

      const monthlyPay = basePay + weeklyHolidayPay + overtimePay;

      let nationalPension = 0, healthInsurance = 0, longTermCare = 0, employmentInsurance = 0;
      let incomeTax = 0, localIncomeTax = 0;

      if (w.taxType === '4대보험') {
        nationalPension = Math.round(monthlyPay * npsRate);
        healthInsurance = Math.round(monthlyPay * nhisRate);
        longTermCare = Math.round(healthInsurance * ltciRate);
        employmentInsurance = Math.round(monthlyPay * eiRate);

        // 과세표준 = 총 지급액 - 4대보험 근로자 부담분
        const taxBase = monthlyPay - nationalPension - healthInsurance - longTermCare - employmentInsurance;

        // 2026년 근로소득 간이세액표 (부양가족 1명/본인 기준)
        if (taxBase > 5000000) {
          // 500만원 초과: 731,400 + (과세표준 - 500만) × 35%
          incomeTax = Math.round(731400 + (taxBase - 5000000) * 0.35);
        } else if (taxBase > 3000000) {
          // 300만~500만원: 251,400 + (과세표준 - 300만) × 24%
          incomeTax = Math.round(251400 + (taxBase - 3000000) * 0.24);
        } else if (taxBase > 1500000) {
          // 150만~300만원: 26,400 + (과세표준 - 150만) × 15%
          incomeTax = Math.round(26400 + (taxBase - 1500000) * 0.15);
        } else if (taxBase > 1060000) {
          // 106만~150만원: (과세표준 - 106만) × 6%
          incomeTax = Math.round((taxBase - 1060000) * 0.06);
        }
        // ~106만원: 0원 (기본값 유지)
        localIncomeTax = Math.round(incomeTax * 0.1);
      } else if (w.taxType === '프리랜서') {
        incomeTax = Math.round(monthlyPay * 0.03);
        localIncomeTax = Math.round(incomeTax * 0.1);
      }

      const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax;
      const netPay = monthlyPay - totalDeductions;

      return {
        ...w, basePay, weeklyHolidayPay, overtimePay, monthlyPay,
        nationalPension, healthInsurance, longTermCare,
        employmentInsurance, incomeTax, localIncomeTax, totalDeductions, netPay
      };
    });

    setResults(calculated);
  }, [workers, rates]);

  const totalGross = results ? results.reduce((s, r) => s + r.monthlyPay, 0) : 0;
  const totalNet = results ? results.reduce((s, r) => s + r.netPay, 0) : 0;
  const totalDed = results ? results.reduce((s, r) => s + r.totalDeductions, 0) : 0;

  // 서버에 저장
  const saveToServer = async () => {
    if (!results) return;
    setSaving(true);
    try {
      await manualCalcAPI.save({
        workplace_id: selectedWorkplace,
        workers, results,
        total_gross: totalGross,
        total_deductions: totalDed,
        total_net: totalNet
      });
      setToast('저장되었습니다');
      loadHistory();
    } catch (e) {
      setToast('저장 실패');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2000);
    }
  };

  // 이력 불러오기
  const loadFromHistory = async (id) => {
    try {
      const res = await manualCalcAPI.getById(id);
      const data = res.data.data || res.data;
      if (data) {
        const w = typeof data.workers === 'string' ? JSON.parse(data.workers) : data.workers;
        const r = typeof data.results === 'string' ? JSON.parse(data.results) : data.results;
        setWorkers(w);
        setResults(r);
        setShowHistory(false);
      }
    } catch (e) {
      setToast('불러오기 실패');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const deleteFromHistory = async (id) => {
    try {
      await manualCalcAPI.delete(id);
      loadHistory();
    } catch (e) {
      setToast('삭제 실패');
      setTimeout(() => setToast(null), 2000);
    }
  };

  // 수기 직원을 정식 직원으로 DB 저장
  const saveAsEmployee = async (r) => {
    if (!r.name) {
      setToast('이름을 입력해주세요');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    try {
      await employeeAPI.createManual({
        name: r.name,
        workplace_id: selectedWorkplace,
        salary_type: r.salaryType,
        amount: parseFloat(r.amount) || 0,
        tax_type: r.taxType === '4대보험' ? 'full' : r.taxType === '프리랜서' ? 'freelancer' : 'none'
      });
      setToast(`${r.name} 님이 직원으로 등록되었습니다`);
      if (onEmployeeSaved) onEmployeeSaved();
    } catch (e) {
      setToast(e.response?.data?.message || '직원 등록 실패');
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '12px 20px', background: '#1f2937', color: '#fff',
          borderRadius: '8px', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>{toast}</div>
      )}

      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>✏️ 수기 급여계산</h3>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
              직원 등록 없이 빠르게 급여를 계산합니다
              {rates
                ? <span style={{ color: '#3b82f6' }}> (DB 요율 적용중)</span>
                : <span style={{ color: '#9ca3af' }}> (2026년 법정 기본요율 적용)</span>
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{
              padding: '8px 12px', background: showHistory ? '#4b5563' : '#f3f4f6',
              color: showHistory ? '#fff' : '#374151',
              border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
            }}>
              📋 이력 {history.length > 0 && `(${history.length})`}
            </button>
            <button onClick={addWorker} style={{
              padding: '8px 16px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
            }}>
              + 직원 추가
            </button>
          </div>
        </div>

        {/* 이력 패널 */}
        {showHistory && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#374151' }}>저장된 계산 이력</h4>
            {history.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>저장된 이력이 없습니다</p>
            ) : (
              history.map(h => (
                <div key={h.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => loadFromHistory(h.id)}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                      {h.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      지급 {formatCurrency(h.total_gross)} → 실수령 {formatCurrency(h.total_net)}
                      <span style={{ marginLeft: '8px' }}>{new Date(h.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteFromHistory(h.id)} style={{
                    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px'
                  }}>삭제</button>
                </div>
              ))
            )}
          </div>
        )}

        {workers.map((w, idx) => (
          <div key={w.id} style={{
            padding: '16px', marginBottom: '12px', background: '#f9fafb',
            borderRadius: '10px', border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>직원 {idx + 1}</span>
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
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
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
                    <label style={labelStyle}>주당 근무시간</label>
                    <input type="number" value={w.weeklyHours} onChange={e => updateWorker(w.id, 'weeklyHours', e.target.value)}
                      placeholder="40" style={inputStyle} />
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>미입력 시 40시간</span>
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
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: w.includeWeeklyHoliday ? '#3b82f6' : '#9ca3af' }}>
                    <input type="checkbox" checked={w.includeWeeklyHoliday}
                      onChange={e => updateWorker(w.id, 'includeWeeklyHoliday', e.target.checked)} />
                    주휴수당 {w.includeWeeklyHoliday ? '포함' : '미포함'}
                  </label>
                  {w.includeWeeklyHoliday && (
                    <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                      (주 {parseFloat(w.weeklyHours) || 40}시간 기준, 근로기준법 제55조)
                    </span>
                  )}
                  {!w.includeWeeklyHoliday && (
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>
                      주 15시간 미만 또는 주휴수당 미적용 대상
                    </span>
                  )}
                </div>
              </>
            )}
            {w.salaryType === 'daily' && (
              <><div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={labelStyle}>월 근무일수</label>
                  <input type="number" value={w.daysPerMonth} onChange={e => updateWorker(w.id, 'daysPerMonth', e.target.value)}
                    placeholder="22" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>주당 근무시간</label>
                  <input type="number" value={w.weeklyHours} onChange={e => updateWorker(w.id, 'weeklyHours', e.target.value)}
                    placeholder="40" style={inputStyle} />
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
              {parseFloat(w.weeklyHours) >= 15 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#3b82f6' }}>
                  주휴수당 자동 적용 (근로기준법 제55조, 주 15시간 이상)
                </div>
              )}</>
            )}
            {w.salaryType === 'monthly' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '10px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>📊 계산 결과</h3>
            <button onClick={saveToServer} disabled={saving} style={{
              padding: '8px 16px', background: saving ? '#9ca3af' : '#10b981', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
            }}>
              {saving ? '저장중...' : '💾 서버에 저장'}
            </button>
          </div>

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
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(totalDed)}</div>
            </div>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#10b981', marginBottom: '4px' }}>총 실수령액</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{formatCurrency(totalNet)}</div>
            </div>
          </div>

          {results.map((r, idx) => (
            <div key={r.id} style={{
              padding: '16px', marginBottom: '10px', background: '#f9fafb',
              borderRadius: '10px', border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '15px' }}>
                  {r.name || `직원 ${idx + 1}`}
                  <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '13px', marginLeft: '8px' }}>
                    ({r.salaryType === 'hourly' ? '시급' : r.salaryType === 'daily' ? '일급' : '월급'} {formatCurrency(parseFloat(r.amount) || 0)})
                  </span>
                </div>
                <button onClick={() => saveAsEmployee(r)} style={{
                  padding: '5px 10px', background: '#667eea', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
                }}>
                  👤 직원으로 저장
                </button>
              </div>
              {/* 지급 내역 (주휴수당 포함) */}
              {(r.weeklyHolidayPay > 0 || r.overtimePay > 0) && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span>기본급 {formatCurrency(r.basePay)}</span>
                  {r.weeklyHolidayPay > 0 && <span style={{ color: '#3b82f6' }}>+ 주휴수당 {formatCurrency(r.weeklyHolidayPay)}</span>}
                  {r.overtimePay > 0 && <span style={{ color: '#f59e0b' }}>+ 연장수당 {formatCurrency(r.overtimePay)}</span>}
                  <span>= 총 {formatCurrency(r.monthlyPay)}</span>
                </div>
              )}
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
