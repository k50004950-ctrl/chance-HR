import React, { useState } from 'react';
import { authAPI } from '../services/api';

const ChangePassword = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // 유효성 검사
    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setMessage({ type: 'success', text: response.data.message });
      
      // 2초 후 닫기
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      const errorMessage = error.response?.data?.message || '비밀번호 변경에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          🔐 비밀번호 변경
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">현재 비밀번호</label>
            <input
              type="password"
              name="currentPassword"
              className="form-input"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">새 비밀번호</label>
            <input
              type="password"
              name="newPassword"
              className="form-input"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
            <small style={{ color: '#6b7280', fontSize: '12px' }}>
              최소 6자 이상
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">새 비밀번호 확인</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
