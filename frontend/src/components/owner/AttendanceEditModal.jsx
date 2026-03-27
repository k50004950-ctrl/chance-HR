import React from 'react';

const AttendanceEditModal = ({
  showModal,
  modalType,
  formData,
  loading,
  closeModal,
  handleSubmitAttendance,
  handleInputChange,
  formatDate,
}) => {
  if (!(showModal && modalType === 'editAttendance')) return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          근무시간 수정
        </div>

        <form onSubmit={handleSubmitAttendance}>
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
              직원: {formData.employee_name}
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              날짜: {formatDate(formData.date)}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">휴가 유형</label>
            <select
              className="form-select"
              name="leave_type"
              value={formData.leave_type || ''}
              onChange={handleInputChange}
            >
              <option value="">근무</option>
              <option value="annual">연차</option>
              <option value="paid">유급휴가</option>
              <option value="unpaid">무급휴가</option>
            </select>
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              휴가를 선택하면 출퇴근 시간은 저장하지 않습니다.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">출근 시간 *</label>
            <input
              type="datetime-local"
              name="check_in_time"
              className="form-input"
              value={formData.check_in_time ? formData.check_in_time.slice(0, 16) : ''}
              onChange={handleInputChange}
              required={!formData.leave_type}
              disabled={!!formData.leave_type}
            />
          </div>

          <div className="form-group">
            <label className="form-label">퇴근 시간</label>
            <input
              type="datetime-local"
              name="check_out_time"
              className="form-input"
              value={formData.check_out_time ? formData.check_out_time.slice(0, 16) : ''}
              onChange={handleInputChange}
              disabled={!!formData.leave_type}
            />
            <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              퇴근 시간을 비워두면 미완료 상태로 저장됩니다.
            </small>
          </div>

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
              <span style={{ visibility: loading ? 'hidden' : 'visible' }}>저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceEditModal;
