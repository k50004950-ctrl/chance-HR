import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import Toast from '../components/Toast';

function LoginV2() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '아이디를 입력해주세요.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/v2/auth/login', formData);

      if (response.data.success) {
        // AuthContext의 login 함수 호출
        login(response.data.token, response.data.user);

        setToast({
          show: true,
          message: '로그인 성공!',
          type: 'success'
        });

        // 역할에 따라 대시보드로 이동
        setTimeout(() => {
          if (response.data.user.role === 'owner') {
            navigate('/owner');
          } else if (response.data.user.role === 'employee') {
            navigate('/employee');
          } else if (response.data.user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1000);
      } else {
        setToast({
          show: true,
          message: response.data.message || '로그인에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || '로그인 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '450px', width: '100%', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '40px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            👋 로그인
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            급여관리 시스템
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* 아이디 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              아이디
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="아이디 입력"
              autoComplete="username"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.username ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.border = '2px solid #667eea'}
              onBlur={(e) => e.target.style.border = errors.username ? '2px solid #f44336' : '2px solid #e0e0e0'}
            />
            {errors.username && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.username}</p>}
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.password ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.border = '2px solid #667eea'}
              onBlur={(e) => e.target.style.border = errors.password ? '2px solid #f44336' : '2px solid #e0e0e0'}
            />
            {errors.password && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.password}</p>}
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              marginBottom: '16px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            아직 계정이 없으신가요?{' '}
            <span
              onClick={() => navigate('/signup-v2')}
              style={{ color: '#667eea', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
            >
              회원가입
            </span>
          </p>
        </div>

        {/* 기존 시스템 링크 */}
        <div style={{ marginTop: '16px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
          <p style={{ color: '#999', fontSize: '12px' }}>
            기존 계정으로 로그인하시겠습니까?{' '}
            <span
              onClick={() => navigate('/login')}
              style={{ color: '#667eea', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
            >
              구버전 로그인
            </span>
          </p>
        </div>
      </div>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
}

export default LoginV2;
