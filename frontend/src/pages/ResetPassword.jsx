import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailVerification from '../components/EmailVerification';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: 인증, 2: 비밀번호 재설정
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailVerified = (verifiedEmail) => {
    setIsEmailVerified(true);
    setEmail(verifiedEmail);
  };

  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    setError('');

    if (!username) {
      setError('아이디를 입력해주세요.');
      return;
    }

    if (!isEmailVerified) {
      setError('이메일 인증을 완료해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/account/verify-reset-password', {
        username,
        email
      });

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
      await api.post('/account/reset-password', {
        userId,
        newPassword,
        resetToken
      });

      alert('비밀번호가 재설정되었습니다!\n새 비밀번호로 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          color: '#333',
          fontSize: '28px'
        }}>
          🔐 비밀번호 재설정
        </h2>

        {/* Step 1: 계정 인증 */}
        {step === 1 && (
          <form onSubmit={handleVerifyAccount}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                아이디 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <EmailVerification
              purpose="reset-password"
              onVerified={handleEmailVerified}
              onEmailChange={setEmail}
            />

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb',
                borderRadius: '5px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isEmailVerified}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading || !isEmailVerified ? 'not-allowed' : 'pointer',
                marginBottom: '15px',
                opacity: loading || !isEmailVerified ? 0.6 : 1
              }}
            >
              {loading ? '확인 중...' : '다음'}
            </button>

            <div style={{ 
              display: 'flex', 
              gap: '10px',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                로그인
              </button>
              <span style={{ color: '#ddd' }}>|</span>
              <button
                type="button"
                onClick={() => navigate('/find-username')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                아이디 찾기
              </button>
            </div>
          </form>
        )}

        {/* Step 2: 새 비밀번호 설정 */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={{
              padding: '15px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#155724'
            }}>
              <strong>{userName}</strong>님의 계정이 확인되었습니다.<br />
              새로운 비밀번호를 설정해주세요.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                새 비밀번호 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (4자 이상)"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                비밀번호 확인 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 확인"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb',
                borderRadius: '5px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
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
