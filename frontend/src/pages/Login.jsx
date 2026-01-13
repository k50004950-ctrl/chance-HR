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
          출퇴근 관리 시스템
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
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '14px' }}>
          사업장을 운영하시나요?{' '}
          <a 
            href="/signup" 
            style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/signup');
            }}
          >
            회원가입
          </a>
        </p>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>테스트 계정:</p>
          <p>관리자 - username: <strong>admin</strong> / password: <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
