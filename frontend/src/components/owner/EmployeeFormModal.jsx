import React from 'react';
import ConsentInfo from '../ConsentInfo';

const EmployeeFormModal = ({
  showModal,
  modalType,
  formData,
  setFormData,
  formErrors,
  message,
  loading,
  closeModal,
  handleSubmitEmployee,
  handleInputChange,
  handleFileChange,
  handleCheckUsername,
  usernameCheckStatus,
  usernameCheckLoading,
  getFileUrl,
  formatDate,
  getSalaryTypeName,
  pastPayrollEnabled,
  setPastPayrollEnabled,
  pastPayrollForm,
  setPastPayrollForm,
  pastPayrollRecords,
  pendingPastPayroll,
  setPendingPastPayroll,
  handleAddPastPayroll,
  handleDeletePastPayroll,
  setMessage,
  apiClient,
}) => {
  if (!(showModal && modalType === 'employee')) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          {formData.id ? '직원 정보 수정' : '직원 등록'}
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
            {message.text}
          </div>
        )}

        <div style={{
          padding: '12px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>*</strong> 표시는 필수 입력 항목입니다.
        </div>

        {Object.keys(formErrors).length > 0 && (
          <div style={{
            padding: '12px',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#991b1b'
          }}>
            <strong>입력 오류:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              {Object.values(formErrors).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmitEmployee}>
          {/* 수기 등록 모드 토글 (신규 등록 시만) */}
          {!formData.id && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', background: formData.is_manual ? '#eff6ff' : '#f9fafb',
              border: `1px solid ${formData.is_manual ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '10px', marginBottom: '20px', cursor: 'pointer',
              transition: 'all 0.2s'
            }} onClick={() => setFormData(prev => ({ ...prev, is_manual: !prev.is_manual }))}>
              <div style={{
                width: '44px', height: '24px', borderRadius: '12px',
                background: formData.is_manual ? '#3b82f6' : '#d1d5db',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '2px',
                  left: formData.is_manual ? '22px' : '2px',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <div>
                <strong style={{ color: formData.is_manual ? '#1d4ed8' : '#374151', fontSize: '14px' }}>
                  수기 등록 모드
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {formData.is_manual
                    ? '계정 없이 이름 + 급여 정보만으로 등록합니다 (급여 계산 전용)'
                    : '직원 로그인 계정을 함께 생성합니다'}
                </p>
              </div>
            </div>
          )}

          <h4 style={{ marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            기본 정보
          </h4>

          {/* 계정 정보 - 수기 모드가 아닐 때만 표시 */}
          {!formData.is_manual && (
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">사용자명 (로그인 ID) *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                  required={!formData.is_manual}
                  disabled={formData.id}
                  placeholder="로그인할 때 사용할 아이디를 입력하세요"
                  style={formErrors.username ? { borderColor: '#ef4444' } : {}}
                />
                {!formData.id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCheckUsername}
                    disabled={usernameCheckLoading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {usernameCheckLoading ? '확인 중...' : '중복 확인'}
                  </button>
                )}
              </div>
              {formErrors.username && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                  {formErrors.username}
                </small>
              )}
              {!formData.id && usernameCheckStatus === 'available' && (
                <small style={{ color: '#16a34a', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                  사용 가능한 아이디입니다.
                </small>
              )}
              {!formData.id && usernameCheckStatus === 'unavailable' && (
                <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                  이미 사용 중인 아이디입니다.
                </small>
              )}
            </div>
            {formData.id ? (
              <div className="form-group">
                <label className="form-label">비밀번호 초기화</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    className="form-input"
                    value={formData._newPassword || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, _newPassword: e.target.value }))}
                    placeholder="새 비밀번호 입력 (선택)"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }}
                    onClick={async () => {
                      if (!formData._newPassword || formData._newPassword.length < 4) {
                        alert('새 비밀번호를 4자 이상 입력해주세요.');
                        return;
                      }
                      if (!window.confirm(`${formData.username} 직원의 비밀번호를 초기화하시겠습니까?`)) return;
                      try {
                        const res = await apiClient.put('/auth/owner/reset-employee-password', {
                          username: formData.username,
                          newPassword: formData._newPassword
                        });
                        alert(res.data.message || '비밀번호가 초기화되었습니다.');
                        setFormData(prev => ({ ...prev, _newPassword: '' }));
                      } catch (err) {
                        alert(err.response?.data?.message || '비밀번호 초기화에 실패했습니다.');
                      }
                    }}
                  >
                    초기화
                  </button>
                </div>
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  비워두면 비밀번호가 변경되지 않습니다.
                </small>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">비밀번호 *</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="초기 비밀번호를 입력하세요"
                  style={formErrors.password ? { borderColor: '#ef4444' } : {}}
                />
                {formErrors.password && (
                  <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    {formErrors.password}
                  </small>
                )}
              </div>
            )}
          </div>
          )}

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">이름 *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
                placeholder="직원의 실명을 입력하세요"
                style={formErrors.name ? { borderColor: '#ef4444' } : {}}
              />
              {formErrors.name && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.name}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">입사일 *</label>
              <input
                type="date"
                name="hire_date"
                className="form-input"
                value={formData.hire_date || ''}
                onChange={handleInputChange}
                required
                placeholder="입사일을 선택하세요"
                style={formErrors.hire_date ? { borderColor: '#ef4444' } : {}}
              />
              {formErrors.hire_date && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.hire_date}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">주민등록번호 *</label>
              <input
                type="text"
                name="ssn"
                className="form-input"
                value={formData.ssn || ''}
                onChange={handleInputChange}
                required
                placeholder="주민등록번호를 입력하세요 (예: 901010-1234567)"
                style={formErrors.ssn ? { borderColor: '#ef4444' } : {}}
              />
              {formErrors.ssn && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.ssn}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">휴대폰 *</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone || ''}
                onChange={handleInputChange}
                required
                placeholder="전화번호를 입력하세요 (예: 010-1234-5678)"
                style={formErrors.phone ? { borderColor: '#ef4444' } : {}}
              />
              {formErrors.phone && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.phone}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="이메일 주소를 입력하세요 (예: hong@example.com)"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">주소 *</label>
            <input
              type="text"
              name="address"
              className="form-input"
              value={formData.address || ''}
              onChange={handleInputChange}
              required
              placeholder="전체 주소를 입력하세요 (예: 서울시 강남구 테헤란로 123)"
              style={formErrors.address ? { borderColor: '#ef4444' } : {}}
            />
            {formErrors.address && (
              <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                {formErrors.address}
              </small>
            )}
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            근로자 명부 필수사항
          </h4>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">성별</label>
              <select
                name="gender"
                className="form-input"
                value={formData.gender || ''}
                onChange={handleInputChange}
              >
                <option value="">선택</option>
                <option value="male">남</option>
                <option value="female">여</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">생년월일</label>
              <input
                type="date"
                name="birth_date"
                className="form-input"
                value={formData.birth_date || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">이력</label>
            <textarea
              name="career"
              className="form-input"
              value={formData.career || ''}
              onChange={handleInputChange}
              rows="3"
              placeholder="주요 이력 사항을 입력하세요"
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">종사하는 업무의 종류</label>
              <input
                type="text"
                name="job_type"
                className="form-input"
                value={formData.job_type || ''}
                onChange={handleInputChange}
                placeholder="예: 홀서빙, 바리스타"
              />
            </div>
            <div className="form-group">
              <label className="form-label">고용/고용갱신 연월일 (입사일과 동일)</label>
              <input
                type="date"
                name="employment_renewal_date"
                className="form-input"
                value={formData.hire_date || formData.employment_renewal_date || ''}
                readOnly
              />
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                고용/갱신일은 입사일과 동일하게 자동 입력됩니다.
              </small>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">계약 시작일 (입사일과 동일)</label>
              <input
                type="date"
                name="contract_start_date"
                className="form-input"
                value={formData.hire_date || formData.contract_start_date || ''}
                readOnly
              />
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                계약 시작일은 입사일과 동일하게 자동 입력됩니다.
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">계약 종료일</label>
              <input
                type="date"
                name="contract_end_date"
                className="form-input"
                value={formData.contract_end_date || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">그 밖의 고용에 관한 사항</label>
            <textarea
              name="employment_notes"
              className="form-input"
              value={formData.employment_notes || ''}
              onChange={handleInputChange}
              rows="2"
              placeholder="고용 관련 참고 사항을 입력하세요"
            />
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            비상 연락망
          </h4>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">비상연락처 (이름)</label>
              <input
                type="text"
                name="emergency_contact"
                className="form-input"
                value={formData.emergency_contact || ''}
                onChange={handleInputChange}
                placeholder="비상연락처 이름과 관계를 입력하세요 (예: 홍길동 (부))"
              />
            </div>
            <div className="form-group">
              <label className="form-label">비상연락처 (전화번호)</label>
              <input
                type="tel"
                name="emergency_phone"
                className="form-input"
                value={formData.emergency_phone || ''}
                onChange={handleInputChange}
                placeholder="비상연락처 전화번호를 입력하세요 (예: 010-1234-5678)"
              />
            </div>
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            근무 정보
          </h4>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">재직 상태</label>
              <select
                name="employment_status"
                className="form-input"
                value={formData.employment_status || 'active'}
                onChange={handleInputChange}
              >
                <option value="active">재직중</option>
                <option value="on_leave">휴직</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">직책</label>
              <input
                type="text"
                name="position"
                className="form-input"
                value={formData.position || ''}
                onChange={handleInputChange}
                placeholder="직책을 입력하세요 (예: 매니저, 사원)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">부서</label>
              <input
                type="text"
                name="department"
                className="form-input"
                value={formData.department || ''}
                onChange={handleInputChange}
                placeholder="부서를 입력하세요 (예: 영업부, 관리부)"
              />
            </div>
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            근무 요일/시간
          </h4>

          <div className="form-group">
            <label className="form-label">근무 요일 선택</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
              gap: '12px',
              marginTop: '8px'
            }}>
              {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => {
                const dayValue = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][index];
                const workDays = Array.isArray(formData.work_days)
                  ? formData.work_days
                  : (formData.work_days ? formData.work_days.split(',') : []);
                const isChecked = workDays.includes(dayValue);

                return (
                  <label
                    key={dayValue}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      border: isChecked ? '2px solid #667eea' : '2px solid #e5e7eb',
                      background: isChecked ? '#f0f4ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: isChecked ? '600' : '400',
                      color: isChecked ? '#667eea' : '#6b7280'
                    }}
                  >
                    <input
                      type="checkbox"
                      name="work_days"
                      value={dayValue}
                      checked={isChecked}
                      onChange={(e) => {
                        let newWorkDays = [...workDays];
                        if (e.target.checked) {
                          if (!newWorkDays.includes(dayValue)) {
                            newWorkDays.push(dayValue);
                          }
                        } else {
                          newWorkDays = newWorkDays.filter(d => d !== dayValue);
                        }
                        setFormData({ ...formData, work_days: newWorkDays.join(',') });
                      }}
                      style={{ marginRight: '6px' }}
                    />
                    {day}
                  </label>
                );
              })}
            </div>
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', display: 'block' }}>
              직원이 근무하는 요일을 선택하세요. 선택하지 않으면 전체 요일 근무로 간주됩니다.
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="flexible_hours"
                checked={formData.flexible_hours === true || formData.flexible_hours === 1 || formData.flexible_hours === '1'}
                onChange={(e) => handleInputChange({ target: { name: 'flexible_hours', value: e.target.checked } })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                유동 근무 (출퇴근 시간 자율 - 아르바이트 등)
              </span>
            </label>
            <small style={{ color: '#6b7280', fontSize: '12px', marginLeft: '26px' }}>
              체크하면 고정 출퇴근 시간 없이 자유롭게 출퇴근합니다.
            </small>
          </div>

          {!(formData.flexible_hours === true || formData.flexible_hours === 1 || formData.flexible_hours === '1') && (
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">근무 시작 시간</label>
              <input
                type="time"
                name="work_start_time"
                className="form-input"
                value={formData.work_start_time || ''}
                onChange={handleInputChange}
                placeholder="09:00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">근무 종료 시간</label>
              <input
                type="time"
                name="work_end_time"
                className="form-input"
                value={formData.work_end_time || ''}
                onChange={handleInputChange}
                placeholder="18:00"
              />
            </div>
          </div>
          )}

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            첨부 서류
          </h4>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">근로계약서</label>
              <input
                type="file"
                name="contract_file"
                className="form-input"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {formData.contract_file && typeof formData.contract_file === 'string' && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <small style={{ color: '#6b7280' }}>현재 파일: {formData.contract_file}</small>
                  <button
                    type="button"
                    onClick={() => window.open(`${getFileUrl(formData.contract_file)}`, '_blank')}
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#667eea', color: 'white',
                      border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    보기
                  </button>
                  <a
                    href={`${getFileUrl(formData.contract_file)}`}
                    download
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#10b981', color: 'white',
                      border: 'none', borderRadius: '4px',
                      textDecoration: 'none', cursor: 'pointer'
                    }}
                  >
                    다운로드
                  </a>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">이력서</label>
              <input
                type="file"
                name="resume_file"
                className="form-input"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {formData.resume_file && typeof formData.resume_file === 'string' && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <small style={{ color: '#6b7280' }}>현재 파일: {formData.resume_file}</small>
                  <button
                    type="button"
                    onClick={() => window.open(`${getFileUrl(formData.resume_file)}`, '_blank')}
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#667eea', color: 'white',
                      border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    보기
                  </button>
                  <a
                    href={`${getFileUrl(formData.resume_file)}`}
                    download
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#10b981', color: 'white',
                      border: 'none', borderRadius: '4px',
                      textDecoration: 'none', cursor: 'pointer'
                    }}
                  >
                    다운로드
                  </a>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">신분증 사본</label>
              <input
                type="file"
                name="id_card_file"
                className="form-input"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {formData.id_card_file && typeof formData.id_card_file === 'string' && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <small style={{ color: '#6b7280' }}>현재 파일: {formData.id_card_file}</small>
                  <button
                    type="button"
                    onClick={() => window.open(`${getFileUrl(formData.id_card_file)}`, '_blank')}
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#667eea', color: 'white',
                      border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    보기
                  </button>
                  <a
                    href={`${getFileUrl(formData.id_card_file)}`}
                    download
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#10b981', color: 'white',
                      border: 'none', borderRadius: '4px',
                      textDecoration: 'none', cursor: 'pointer'
                    }}
                  >
                    다운로드
                  </a>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">가족관계증명서/등본</label>
              <input
                type="file"
                name="family_cert_file"
                className="form-input"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {formData.family_cert_file && typeof formData.family_cert_file === 'string' && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <small style={{ color: '#6b7280' }}>현재 파일: {formData.family_cert_file}</small>
                  <button
                    type="button"
                    onClick={() => window.open(`${getFileUrl(formData.family_cert_file)}`, '_blank')}
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#667eea', color: 'white',
                      border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    보기
                  </button>
                  <a
                    href={`${getFileUrl(formData.family_cert_file)}`}
                    download
                    style={{
                      padding: '4px 8px', fontSize: '12px',
                      backgroundColor: '#10b981', color: 'white',
                      border: 'none', borderRadius: '4px',
                      textDecoration: 'none', cursor: 'pointer'
                    }}
                  >
                    다운로드
                  </a>
                </div>
              )}
            </div>
          </div>

          {formData.id && (
            <ConsentInfo
              privacyConsent={formData.privacy_consent}
              locationConsent={formData.location_consent}
              privacyConsentDate={formData.privacy_consent_date}
              locationConsentDate={formData.location_consent_date}
            />
          )}

          {!formData.id && (
            <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fbbf24' }}>
              <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                <strong>개인정보 수집 동의</strong>는 직원이 최초 로그인 시 직접 진행합니다.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                시스템 도입 전 과거 급여 기록
              </h4>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                이 직원이 시스템 도입 전부터 근무했다면 과거 급여 이력을 입력해주세요. 퇴직금 계산에 활용됩니다.
              </p>

              <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px', background: '#f9fafb' }}>
                <p style={{ fontSize: '13px', margin: 0, color: '#374151' }}>
                  과거 급여 이력을 입력하시겠습니까?
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${pastPayrollEnabled ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPastPayrollEnabled(true)}
                  >
                    예
                  </button>
                  <button
                    type="button"
                    className={`btn ${!pastPayrollEnabled ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPastPayrollEnabled(false)}
                  >
                    아니오
                  </button>
                </div>
              </div>

              {pastPayrollEnabled && (
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
                    <label className="form-label">비고 <span style={{ fontWeight: 400, color: '#9ca3af' }}>(급여 변경 이력 등)</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="예: 2024년 이전 급여, 2025.03 급여 인상 등"
                      value={pastPayrollForm.notes}
                      onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, notes: e.target.value })}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginBottom: '16px' }}
                    onClick={() => {
                      if (!pastPayrollForm.start_date || !pastPayrollForm.end_date || !pastPayrollForm.amount) {
                        setMessage({ type: 'error', text: '기간과 금액을 입력해주세요.' });
                        return;
                      }
                      if (formData.id) {
                        handleAddPastPayroll(formData.id);
                      } else {
                        const newRecord = {
                          ...pastPayrollForm,
                          amount: Number(pastPayrollForm.amount),
                          _tempId: Date.now()
                        };
                        setPendingPastPayroll(prev => [...prev, newRecord]);
                        setPastPayrollForm({ start_date: '', end_date: '', salary_type: 'monthly', amount: '', notes: '' });
                        setMessage({ type: 'success', text: '추가됐습니다. 직원 저장 시 함께 등록됩니다.' });
                      }
                    }}
                  >
                    + 과거 급여 기록 추가
                  </button>

                  {(() => {
                    const records = formData.id ? pastPayrollRecords : pendingPastPayroll;
                    return records.length > 0 ? (
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
                            {records.map((record) => (
                              <tr key={record.id || record._tempId}>
                                <td style={{ fontSize: '12px' }}>
                                  {formatDate(record.start_date)} ~ {formatDate(record.end_date)}
                                </td>
                                <td>{getSalaryTypeName(record.salary_type)}</td>
                                <td>{Number(record.amount).toLocaleString()}원</td>
                                <td style={{ fontSize: '12px', color: '#6b7280' }}>{record.notes || '-'}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                    onClick={() => {
                                      if (formData.id) {
                                        handleDeletePastPayroll(formData.id, record.id);
                                      } else {
                                        setPendingPastPayroll(prev => prev.filter(r => r._tempId !== record._tempId));
                                      }
                                    }}
                                  >
                                    삭제
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: '#9ca3af', fontSize: '12px' }}>등록된 과거 급여 기록이 없습니다.</p>
                    );
                  })()}
                </>
              )}
            </div>

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151' }}>급여 지급 기준</h4>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">지급 기준</label>
              <select
                name="pay_schedule_type"
                className="form-select"
                value={formData.pay_schedule_type || ''}
                onChange={handleInputChange}
              >
                <option value="">선택하세요</option>
                <option value="monthly_fixed">매월 지급일</option>
                <option value="hire_date_based">입사일 기준</option>
              </select>
            </div>
            {formData.pay_schedule_type === 'monthly_fixed' && (
              <div className="form-group">
                <label className="form-label">급여 지급일</label>
                <input
                  type="number"
                  name="pay_day"
                  className="form-input"
                  value={formData.pay_day || ''}
                  onChange={handleInputChange}
                  placeholder="말일=0"
                  min="0"
                  max="31"
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  말일 지급은 0으로 입력하세요.
                </small>
              </div>
            )}
          </div>

          {formData.pay_schedule_type === 'monthly_fixed' && (
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">급여 기간 시작일</label>
                <input
                  type="number"
                  name="payroll_period_start_day"
                  className="form-input"
                  value={formData.payroll_period_start_day || ''}
                  onChange={handleInputChange}
                  placeholder="예: 1"
                  min="1"
                  max="31"
                />
              </div>
              <div className="form-group">
                <label className="form-label">급여 기간 종료일</label>
                <input
                  type="number"
                  name="payroll_period_end_day"
                  className="form-input"
                  value={formData.payroll_period_end_day || ''}
                  onChange={handleInputChange}
                  placeholder="말일=0"
                  min="0"
                  max="31"
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  말일 종료는 0으로 입력하세요.
                </small>
              </div>
            </div>
          )}

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">무단결근 차감</label>
              <select
                name="deduct_absence"
                className="form-select"
                value={formData.deduct_absence ?? '0'}
                onChange={handleInputChange}
              >
                <option value="0">N</option>
                <option value="1">Y</option>
              </select>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                무단결근 시 월급에서 일할 차감 여부
              </small>
            </div>
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>급여 정보</h4>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">급여 형태 *</label>
              <select
                name="salary_type"
                className="form-select"
                value={formData.salary_type || ''}
                onChange={handleInputChange}
                required
                style={formErrors.salary_type ? { borderColor: '#ef4444' } : {}}
              >
                <option value="">선택하세요</option>
                <option value="hourly">시급</option>
                <option value="monthly">월급</option>
                <option value="annual">연봉</option>
              </select>
              {formErrors.salary_type && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.salary_type}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">
                {formData.salary_type === 'hourly' ? '시급' :
                 formData.salary_type === 'monthly' ? '월급' :
                 formData.salary_type === 'annual' ? '연봉' : '급여액'} *
              </label>
              <input
                type="number"
                name="amount"
                className="form-input"
                value={formData.amount || ''}
                onChange={handleInputChange}
                placeholder="원"
                required
                style={formErrors.amount ? { borderColor: '#ef4444' } : {}}
              />
              {formErrors.amount && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.amount}
                </small>
              )}
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">급여 신고 *</label>
              <select
                name="tax_type"
                className="form-select"
                value={formData.tax_type || '4대보험'}
                onChange={handleInputChange}
                required
                style={formErrors.tax_type ? { borderColor: '#ef4444' } : {}}
              >
                <option value="4대보험">4대보험</option>
                <option value="3.3%">3.3% (프리랜서)</option>
                <option value="일용직">일용직</option>
              </select>
              {formErrors.tax_type && (
                <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {formErrors.tax_type}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">초과근무수당 (시급)</label>
              <input
                type="number"
                name="overtime_pay"
                className="form-input"
                value={formData.overtime_pay || ''}
                onChange={handleInputChange}
                placeholder="원 (1시간당)"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                기본 근무시간 초과 시 적용되는 시급을 입력하세요
              </small>
            </div>
          </div>

          {formData.salary_type === 'hourly' && (
            <div className="form-group">
              <label className="form-label">주휴수당 설정</label>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="weekly_holiday_type"
                    value="included"
                    checked={formData.weekly_holiday_type === 'included' || !formData.weekly_holiday_type}
                    onChange={(e) => setFormData({
                      ...formData,
                      weekly_holiday_type: e.target.value,
                      weekly_holiday_pay: 1
                    })}
                    style={{ marginRight: '6px' }}
                  />
                  주휴수당 포함
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="weekly_holiday_type"
                    value="separate"
                    checked={formData.weekly_holiday_type === 'separate'}
                    onChange={(e) => setFormData({
                      ...formData,
                      weekly_holiday_type: e.target.value,
                      weekly_holiday_pay: 1
                    })}
                    style={{ marginRight: '6px' }}
                  />
                  주휴수당 별도
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="weekly_holiday_type"
                    value="none"
                    checked={formData.weekly_holiday_type === 'none'}
                    onChange={(e) => setFormData({
                      ...formData,
                      weekly_holiday_type: e.target.value,
                      weekly_holiday_pay: 0
                    })}
                    style={{ marginRight: '6px' }}
                  />
                  미적용
                </label>
              </div>
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                포함: 시급에 주휴수당 포함 / 별도: 주휴수당 별도 계산 / 미적용: 주휴수당 없음
              </small>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={loading}>
              취소
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
              style={{ position: 'relative' }}
            >
              <span style={{ visibility: loading ? 'hidden' : 'visible' }}>저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;
