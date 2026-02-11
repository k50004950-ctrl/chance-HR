import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(credentials);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          찬스HR
        </h1>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">사용자명</label>
            <input
              type="text"
              name="username"
              className="form-input"
              value={credentials.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {/* 아이디/비밀번호 찾기 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/find-username')}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0'
              }}
            >
              아이디 찾기
            </button>
            <span style={{ color: '#ddd' }}>|</span>
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0'
              }}
            >
              비밀번호 찾기
            </button>
          </div>
        </form>

        {/* 회원가입 구분 */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ textAlign: 'center', marginBottom: '12px', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>
            아직 계정이 없으신가요?
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <button
              onClick={() => navigate('/signup-v2?role=owner')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '18px' }}>💼</span>
              <span>사업주 회원가입</span>
            </button>
            <button
              onClick={() => navigate('/signup-v2?role=employee')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f0f4ff';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '18px' }}>👷</span>
              <span>근로자 회원가입</span>
            </button>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <p style={{ fontWeight: '600' }}>문의: 카카오톡 채널 "찬스컴퍼니"</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
