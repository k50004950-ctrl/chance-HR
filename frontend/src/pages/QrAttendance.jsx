import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QrAttendance = () => {
  const location = useLocation();
  const { user, login, logout } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [processing, setProcessing] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [keepLogin, setKeepLogin] = useState(true);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') || '';
  }, [location.search]);

  useEffect(() => {
    setHasChecked(false);
  }, [token]);

  const handleQrCheck = async () => {
    if (!token) {
      setMessage({ type: 'error', text: 'QR 정보가 올바르지 않습니다.' });
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await attendanceAPI.checkQr({ token });
      setMessage({ type: 'success', text: response.data.message });
      setHasChecked(true);
      if (!keepLogin) {
        logout();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'QR 출퇴근 처리에 실패했습니다.'
      });
      setHasChecked(true);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (user && token && !processing && !hasChecked) {
      handleQrCheck();
    }
  }, [user, token, processing, hasChecked]);

  const handleLoginAndCheck = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setProcessing(true);

    const result = await login(credentials);
    if (!result.success) {
      setMessage({ type: 'error', text: result.message });
      setProcessing(false);
      return;
    }

    await handleQrCheck();
    setProcessing(false);
  };

  return (
    <div className="container" style={{ maxWidth: '520px', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '12px', color: '#374151' }}>📷 QR 출퇴근</h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
          QR을 스캔하면 로그인 후 자동으로 출근/퇴근이 기록됩니다.
        </p>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
            {message.text}
          </div>
        )}

        {!token && (
          <div style={{ color: '#dc2626', fontSize: '14px' }}>
            유효하지 않은 QR입니다. 다시 스캔해주세요.
          </div>
        )}

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              로그인됨: <strong>{user.name}</strong>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleQrCheck}
              disabled={processing || !token}
            >
              {processing ? '처리 중...' : '출퇴근 기록하기'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
              <input
                type="checkbox"
                checked={keepLogin}
                onChange={(e) => setKeepLogin(e.target.checked)}
              />
              자동 로그인 유지
            </label>
          </div>
        ) : (
          <form onSubmit={handleLoginAndCheck}>
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">아이디</label>
              <input
                className="form-input"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">비밀번호</label>
              <input
                type="password"
                className="form-input"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              <input
                type="checkbox"
                checked={keepLogin}
                onChange={(e) => setKeepLogin(e.target.checked)}
              />
              자동 로그인 유지
            </label>
            <button className="btn btn-primary" type="submit" disabled={processing || !token}>
              {processing ? '처리 중...' : '로그인 후 출퇴근 기록'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default QrAttendance;
