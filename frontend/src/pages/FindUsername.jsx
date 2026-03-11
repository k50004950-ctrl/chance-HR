import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailVerification from '../components/EmailVerification';
import api from '../services/api';

const FindUsername = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [foundUsers, setFoundUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailVerified = (verifiedEmail) => {
    setIsEmailVerified(true);
    setEmail(verifiedEmail);
  };

  const handleFindUsername = async (e) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!isEmailVerified) {
      setError('이메일 인증을 완료해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/account/find-username', {
        name,
        email
      });

      setFoundUsers(response.data.users);
    } catch (err) {
      setError(err.response?.data?.error || '아이디 찾기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: window.innerWidth < 768 ? '24px 20px' : '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: window.innerWidth < 768 ? '24px' : '30px',
          color: '#333',
          fontSize: window.innerWidth < 768 ? '22px' : '28px',
          fontWeight: '700'
        }}>
          🔍 아이디 찾기
        </h2>

        {foundUsers.length === 0 ? (
          <form onSubmit={handleFindUsername}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                이름 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
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
              purpose="find-id"
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
              {loading ? '조회 중...' : '아이디 찾기'}
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
                onClick={() => navigate('/reset-password')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                비밀번호 찾기
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold', color: '#155724' }}>
                ✓ 다음 계정을 찾았습니다:
              </p>
              {foundUsers.map((user, index) => (
                <div key={index} style={{
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '5px',
                  marginBottom: '10px'
                }}>
                  <div style={{ marginBottom: '5px' }}>
                    <strong>아이디:</strong> {user.fullUsername}
                  </div>
                  <div style={{ marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                    <strong>역할:</strong> {user.role}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <strong>가입일:</strong> {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              로그인하기
            </button>

            <button
              onClick={() => navigate('/reset-password')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              비밀번호 재설정
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindUsername;
