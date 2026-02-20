import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailVerification from '../components/EmailVerification';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: 인증, 2: 비밀번호 재설정
  const [method, setMethod] = useState('email'); // 'email' | 'name'
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    setError('');

    if (!username) {
      setError('아이디를 입력해주세요.');
      return;
    }

    if (method === 'email' && !isEmailVerified) {
      setError('이메일 인증을 완료해주세요.');
      return;
    }

    if (method === 'name' && !name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (method === 'email') {
        response = await api.post('/account/verify-reset-password', { username, email });
      } else {
        response = await api.post('/account/verify-reset-by-name', { username, name });
      }

      setResetToken(response.data.resetToken);
      setUserId(response.data.userId);
      setUserName(response.data.name);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || '계정 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/account/reset-password', { userId, newPassword, resetToken });
      alert('비밀번호가 재설정되었습니다!\n새 비밀번호로 로그인해주세요.');
      navigate('/login-v2');
    } catch (err) {
      setError(err.response?.data?.error || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px 28px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#333', fontSize: '24px', fontWeight: '700' }}>
          🔐 비밀번호 재설정
        </h2>

        {/* Step 1: 계정 인증 */}
        {step === 1 && (
          <form onSubmit={handleVerifyAccount}>

            {/* 인증 방법 선택 탭 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f3f4f6', borderRadius: '10px', padding: '4px' }}>
              <button
                type="button"
                onClick={() => { setMethod('email'); setError(''); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                  background: method === 'email' ? 'white' : 'transparent',
                  color: method === 'email' ? '#667eea' : '#6b7280',
                  boxShadow: method === 'email' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📧 이메일로 찾기
              </button>
              <button
                type="button"
                onClick={() => { setMethod('name'); setError(''); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                  background: method === 'name' ? 'white' : 'transparent',
                  color: method === 'name' ? '#667eea' : '#6b7280',
                  boxShadow: method === 'name' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                👤 이름으로 찾기
              </button>
            </div>

            {/* 아이디 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>아이디 <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                style={inputStyle}
              />
            </div>

            {/* 이메일 인증 방법 */}
            {method === 'email' && (
              <EmailVerification
                purpose="reset-password"
                onVerified={(verifiedEmail) => { setIsEmailVerified(true); setEmail(verifiedEmail); }}
                onEmailChange={setEmail}
              />
            )}

            {/* 이름 인증 방법 */}
            {method === 'name' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>이름 (실명) <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="가입 시 입력한 실명을 입력하세요"
                    style={inputStyle}
                  />
                </div>
                <div style={{
                  padding: '12px 14px',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  ⚠️ 아이디와 가입 시 등록한 <strong>실명</strong>이 일치해야 합니다.
                </div>
              </>
            )}

            {error && (
              <div style={{
                padding: '12px', background: '#fef2f2', color: '#b91c1c',
                border: '1px solid #fca5a5', borderRadius: '8px',
                marginBottom: '16px', fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (method === 'email' && !isEmailVerified)}
              style={{
                width: '100%', padding: '14px',
                background: (loading || (method === 'email' && !isEmailVerified)) ? '#c7d2fe' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '16px', fontWeight: 'bold',
                cursor: (loading || (method === 'email' && !isEmailVerified)) ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {loading ? '확인 중...' : '다음'}
            </button>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', fontSize: '14px' }}>
              <button type="button" onClick={() => navigate('/login-v2')}
                style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>
                로그인
              </button>
              <span style={{ color: '#d1d5db' }}>|</span>
              <button type="button" onClick={() => navigate('/find-username')}
                style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>
                아이디 찾기
              </button>
            </div>
          </form>
        )}

        {/* Step 2: 새 비밀번호 설정 */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={{
              padding: '14px', background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '8px', marginBottom: '24px', fontSize: '14px', color: '#166534'
            }}>
              ✅ <strong>{userName}</strong>님의 계정이 확인되었습니다.<br />
              새로운 비밀번호를 설정해주세요.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>새 비밀번호 <span style={{ color: 'red' }}>*</span></label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (4자 이상)"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>비밀번호 확인 <span style={{ color: 'red' }}>*</span></label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 확인"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px', background: '#fef2f2', color: '#b91c1c',
                border: '1px solid #fca5a5', borderRadius: '8px',
                marginBottom: '16px', fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#c7d2fe' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '16px', fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '재설정 중...' : '비밀번호 재설정'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
