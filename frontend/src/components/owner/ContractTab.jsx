import React, { useState, useEffect } from 'react';
import { contractsAPI } from '../../services/api';

const STATUS_LABELS = {
  draft: { text: '초안', color: '#6b7280', bg: '#f3f4f6' },
  pending: { text: '서명 대기', color: '#d97706', bg: '#fef3c7' },
  signed: { text: '서명 완료', color: '#059669', bg: '#d1fae5' },
  expired: { text: '만료', color: '#dc2626', bg: '#fee2e2' }
};

const SALARY_TYPE_LABELS = {
  hourly: '시급',
  monthly: '월급',
  annual: '연봉'
};

const ContractTab = ({ selectedWorkplace, employees }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    employer_name: '',
    employee_name: '',
    contract_start_date: '',
    contract_end_date: '',
    job_description: '',
    work_location: '',
    work_days: '월~금',
    work_start_time: '09:00',
    work_end_time: '18:00',
    salary_type: 'monthly',
    salary_amount: '',
    payment_date: '매월 10일',
    social_insurance: true,
    special_terms: ''
  });

  useEffect(() => {
    if (selectedWorkplace) {
      loadContracts();
    }
  }, [selectedWorkplace]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await contractsAPI.getByWorkplace(selectedWorkplace);
      setContracts(res.data.contracts || []);
    } catch (error) {
      console.error('계약서 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const emp = employees?.find(e => e.id === Number(employeeId));
    setForm(prev => ({
      ...prev,
      employee_id: employeeId,
      employee_name: emp?.name || ''
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.contract_start_date) {
      alert('직원과 계약 시작일을 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      await contractsAPI.create({
        ...form,
        workplace_id: selectedWorkplace,
        salary_amount: form.salary_amount ? Number(form.salary_amount) : null
      });
      alert('근로계약서가 생성되었습니다.');
      setShowForm(false);
      resetForm();
      loadContracts();
    } catch (error) {
      console.error('계약서 생성 실패:', error);
      alert('계약서 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      employee_id: '',
      employer_name: '',
      employee_name: '',
      contract_start_date: '',
      contract_end_date: '',
      job_description: '',
      work_location: '',
      work_days: '월~금',
      work_start_time: '09:00',
      work_end_time: '18:00',
      salary_type: 'monthly',
      salary_amount: '',
      payment_date: '매월 10일',
      social_insurance: true,
      special_terms: ''
    });
  };

  const handleDownload = async (contractId) => {
    try {
      const res = await contractsAPI.downloadPdf(contractId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `labor_contract_${contractId}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('다운로드에 실패했습니다.');
    }
  };

  const handleViewContract = async (id) => {
    try {
      const res = await contractsAPI.getById(id);
      setSelectedContract(res.data.contract);
    } catch (error) {
      console.error('계약서 조회 실패:', error);
    }
  };

  const statusBadge = (status) => {
    const s = STATUS_LABELS[status] || STATUS_LABELS.draft;
    return (
      <span style={{
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        color: s.color,
        backgroundColor: s.bg
      }}>
        {s.text}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#374151' }}>근로계약서 관리</h3>
        <button
          className="btn btn-primary"
          onClick={() => { setShowForm(!showForm); setSelectedContract(null); }}
        >
          {showForm ? '목록으로' : '새 계약서 작성'}
        </button>
      </div>

      {/* 계약서 상세 보기 모달 */}
      {selectedContract && !showForm && (
        <div className="card" style={{ marginBottom: '16px', border: '2px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>계약서 상세</h4>
            <button className="btn btn-secondary" onClick={() => setSelectedContract(null)} style={{ fontSize: '13px' }}>
              닫기
            </button>
          </div>
          <div className="grid grid-2" style={{ gap: '8px', fontSize: '14px' }}>
            <div><strong>사업주:</strong> {selectedContract.employer_name || '-'}</div>
            <div><strong>근로자:</strong> {selectedContract.employee_name || selectedContract.employee_display_name || '-'}</div>
            <div><strong>계약기간:</strong> {selectedContract.contract_start_date} ~ {selectedContract.contract_end_date || '무기한'}</div>
            <div><strong>상태:</strong> {statusBadge(selectedContract.status)}</div>
            <div><strong>업무:</strong> {selectedContract.job_description || '-'}</div>
            <div><strong>근무장소:</strong> {selectedContract.work_location || '-'}</div>
            <div><strong>근무일:</strong> {selectedContract.work_days || '-'}</div>
            <div><strong>근무시간:</strong> {selectedContract.work_start_time || '-'} ~ {selectedContract.work_end_time || '-'}</div>
            <div><strong>급여:</strong> {SALARY_TYPE_LABELS[selectedContract.salary_type] || selectedContract.salary_type} {selectedContract.salary_amount?.toLocaleString()}원</div>
            <div><strong>지급일:</strong> {selectedContract.payment_date || '-'}</div>
            <div><strong>4대보험:</strong> {selectedContract.social_insurance ? '적용' : '미적용'}</div>
            <div><strong>사업주 서명:</strong> {selectedContract.employer_signed ? 'O' : 'X'}</div>
            <div><strong>근로자 서명:</strong> {selectedContract.employee_signed ? 'O' : 'X'}</div>
          </div>
          {selectedContract.special_terms && (
            <div style={{ marginTop: '8px' }}>
              <strong>특약사항:</strong>
              <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '13px' }}>{selectedContract.special_terms}</p>
            </div>
          )}
          <div style={{ marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={() => handleDownload(selectedContract.id)}>
              다운로드
            </button>
          </div>
        </div>
      )}

      {/* 계약서 작성 폼 */}
      {showForm && (
        <div className="card">
          <h4 style={{ marginTop: 0, color: '#374151' }}>새 근로계약서 작성</h4>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">직원 선택 *</label>
                <select
                  name="employee_id"
                  className="form-input"
                  value={form.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  required
                >
                  <option value="">선택</option>
                  {(employees || []).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">사업주명</label>
                <input type="text" name="employer_name" className="form-input" value={form.employer_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">근로자명</label>
                <input type="text" name="employee_name" className="form-input" value={form.employee_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">계약 시작일 *</label>
                <input type="date" name="contract_start_date" className="form-input" value={form.contract_start_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">계약 종료일 (무기한이면 비워두세요)</label>
                <input type="date" name="contract_end_date" className="form-input" value={form.contract_end_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">업무 내용</label>
                <input type="text" name="job_description" className="form-input" value={form.job_description} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">근무 장소</label>
                <input type="text" name="work_location" className="form-input" value={form.work_location} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">근무일</label>
                <input type="text" name="work_days" className="form-input" value={form.work_days} onChange={handleChange} placeholder="예: 월~금" />
              </div>
              <div className="form-group">
                <label className="form-label">출근 시간</label>
                <input type="time" name="work_start_time" className="form-input" value={form.work_start_time} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">퇴근 시간</label>
                <input type="time" name="work_end_time" className="form-input" value={form.work_end_time} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">급여 유형</label>
                <select name="salary_type" className="form-input" value={form.salary_type} onChange={handleChange}>
                  <option value="hourly">시급</option>
                  <option value="monthly">월급</option>
                  <option value="annual">연봉</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">급여 금액 (원)</label>
                <input type="number" name="salary_amount" className="form-input" value={form.salary_amount} onChange={handleChange} placeholder="예: 2500000" />
              </div>
              <div className="form-group">
                <label className="form-label">급여 지급일</label>
                <input type="text" name="payment_date" className="form-input" value={form.payment_date} onChange={handleChange} placeholder="예: 매월 10일" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                <input type="checkbox" name="social_insurance" checked={form.social_insurance} onChange={handleChange} id="social_insurance" />
                <label htmlFor="social_insurance" style={{ fontSize: '14px' }}>4대보험 적용</label>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">특약사항</label>
              <textarea name="special_terms" className="form-input" value={form.special_terms} onChange={handleChange} rows={3} placeholder="추가 특약사항을 입력하세요" />
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '저장 중...' : '계약서 생성'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 계약서 목록 */}
      {!showForm && (
        <div className="card">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>로딩 중...</p>
          ) : contracts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>등록된 근로계약서가 없습니다.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>근로자</th>
                    <th style={{ padding: '8px' }}>계약기간</th>
                    <th style={{ padding: '8px' }}>급여</th>
                    <th style={{ padding: '8px' }}>상태</th>
                    <th style={{ padding: '8px' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px' }}>{c.employee_name || c.employee_display_name}</td>
                      <td style={{ padding: '8px' }}>
                        {c.contract_start_date} ~ {c.contract_end_date || '무기한'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {SALARY_TYPE_LABELS[c.salary_type] || c.salary_type} {c.salary_amount?.toLocaleString()}원
                      </td>
                      <td style={{ padding: '8px' }}>{statusBadge(c.status)}</td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            onClick={() => handleViewContract(c.id)}
                          >
                            보기
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                            onClick={() => handleDownload(c.id)}
                          >
                            다운로드
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractTab;
