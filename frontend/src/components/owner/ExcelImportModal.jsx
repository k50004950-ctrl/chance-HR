import React, { useState, useRef } from 'react';
import { employeeAPI } from '../../services/api';

const ExcelImportModal = ({ isOpen, onClose, workplaceId, onImportComplete, formatCurrency }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
      setResult(null);
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const downloadTemplate = async () => {
    try {
      const res = await employeeAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('템플릿 다운로드 실패');
    }
  };

  const handleImport = async () => {
    if (!file || !workplaceId) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workplace_id', workplaceId);
      const res = await employeeAPI.excelImport(formData);
      const data = res.data.data || res.data;
      setResult(data);
      if (data.success > 0 && onImportComplete) onImportComplete();
    } catch (e) {
      setResult({ success: 0, failed: 0, errors: [e.response?.data?.message || '업로드 실패'] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '28px',
        maxWidth: '540px', width: '100%', maxHeight: '80vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>📊 엑셀 직원 일괄 등록</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
        </div>

        {/* 템플릿 다운로드 */}
        <div style={{
          padding: '14px', background: '#eff6ff', borderRadius: '10px',
          marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d4ed8' }}>📋 템플릿 다운로드</div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
              양식에 맞게 작성 후 업로드하세요
            </div>
          </div>
          <button onClick={downloadTemplate} style={{
            padding: '8px 14px', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
          }}>
            ⬇ 다운로드
          </button>
        </div>

        {/* 파일 업로드 영역 */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: '32px', border: `2px dashed ${dragOver ? '#3b82f6' : '#d1d5db'}`,
            borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? '#eff6ff' : '#f9fafb', marginBottom: '16px',
            transition: 'all 0.2s'
          }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
          {file ? (
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                엑셀 파일을 드래그하거나 클릭하여 선택
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                .xlsx, .xls (최대 200명, 5MB)
              </div>
            </div>
          )}
        </div>

        {/* 필수 컬럼 안내 */}
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px', padding: '0 4px' }}>
          <strong>필수 컬럼:</strong> 이름, 급여형태(시급/일급/월급), 금액<br/>
          <strong>선택 컬럼:</strong> 핸드폰, 입사일, 직위, 부서, 국적, 비자유형, 비자만료일, 메모
        </div>

        {/* 업로드 버튼 */}
        <button
          onClick={handleImport}
          disabled={!file || importing}
          style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: '700', cursor: file ? 'pointer' : 'not-allowed',
            background: file ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
            color: file ? '#fff' : '#9ca3af'
          }}
        >
          {importing ? '업로드 중...' : `📤 ${file ? '일괄 등록하기' : '파일을 선택해주세요'}`}
        </button>

        {/* 결과 */}
        {result && (
          <div style={{
            marginTop: '16px', padding: '14px', borderRadius: '10px',
            background: result.failed === 0 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.failed === 0 ? '#bbf7d0' : '#fecaca'}`
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: result.failed === 0 ? '#16a34a' : '#dc2626', marginBottom: '6px' }}>
              ✅ {result.success}명 등록 완료 {result.failed > 0 && `/ ❌ ${result.failed}명 실패`}
            </div>
            {result.errors?.length > 0 && (
              <div style={{ fontSize: '12px', color: '#dc2626', maxHeight: '120px', overflowY: 'auto' }}>
                {result.errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImportModal;
