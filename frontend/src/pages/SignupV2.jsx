import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';
import Toast from '../components/Toast';
import Footer from '../components/Footer';

function SignupV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // 로그인 페이지에서 전달받은 역할 또는 기본값
  const defaultRole = location.state?.defaultRole || 'employee';

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: defaultRole,  // 로그인 페이지에서 선택한 역할 또는 기본값
    business_number: '',
    ssn: '',  // 주민등록번호
    email: '',  // 이메일
    address: ''  // 주소
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
    } else if (formData.username.length < 4) {
      newErrors.username = '아이디는 4자 이상이어야 합니다.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요.';
    } else if (!/^01[0-9]{8,9}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '올바른 전화번호 형식이 아닙니다.';
    }

    if (formData.role === 'owner' && !formData.business_number.trim()) {
      newErrors.business_number = '사업자등록번호를 입력해주세요.';
    }

    if (formData.business_number && !/^\d{10}$/.test(formData.business_number.replace(/-/g, ''))) {
      newErrors.business_number = '사업자등록번호는 10자리 숫자여야 합니다.';
    }

    // 근로자 필수 항목 검증
    if (formData.role === 'employee') {
      if (!formData.ssn.trim()) {
        newErrors.ssn = '주민등록번호를 입력해주세요.';
      } else if (!/^\d{13}$/.test(formData.ssn.replace(/-/g, ''))) {
        newErrors.ssn = '주민등록번호는 13자리 숫자여야 합니다.';
      }

      if (!formData.email.trim()) {
        newErrors.email = '이메일을 입력해주세요.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '올바른 이메일 형식이 아닙니다.';
      }

      if (!formData.address.trim()) {
        newErrors.address = '주소를 입력해주세요.';
      }
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
      // 전화번호, 사업자등록번호, 주민등록번호에서 하이픈 제거
      const cleanedData = {
        ...formData,
        phone: formData.phone.replace(/-/g, ''),
        business_number: formData.business_number ? formData.business_number.replace(/-/g, '') : undefined,
        ssn: formData.ssn ? formData.ssn.replace(/-/g, '') : undefined,
        email: formData.email || undefined,
        address: formData.address || undefined
      };

      const response = await apiClient.post('/v2/auth/signup', cleanedData);

      if (response.data.success) {
        setToast({
          show: true,
          message: '회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.',
          type: 'success'
        });

        setTimeout(() => {
          navigate('/login-v2');
        }, 2000);
      } else {
        setToast({
          show: true,
          message: response.data.message || '회원가입에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || '회원가입 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatBusinessNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const formatSSN = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 6) return cleaned;
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 13)}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '40px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            🎉 회원가입
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            급여관리 시스템에 오신 것을 환영합니다
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* 역할 선택 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              가입 유형 <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'employee' }))}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: formData.role === 'employee' ? '2px solid #667eea' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  background: formData.role === 'employee' ? '#f0f4ff' : 'white',
                  color: formData.role === 'employee' ? '#667eea' : '#666',
                  fontWeight: formData.role === 'employee' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                👷 근로자
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'owner' }))}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: formData.role === 'owner' ? '2px solid #667eea' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  background: formData.role === 'owner' ? '#f0f4ff' : 'white',
                  color: formData.role === 'owner' ? '#667eea' : '#666',
                  fontWeight: formData.role === 'owner' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                💼 사업주
              </button>
            </div>
          </div>

          {/* 아이디 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              아이디 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="4자 이상 입력"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.username ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
            />
            {errors.username && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.username}</p>}
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              비밀번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="6자 이상 입력"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.password ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
            />
            {errors.password && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.password}</p>}
          </div>

          {/* 비밀번호 확인 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              비밀번호 확인 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호 재입력"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.confirmPassword ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
            />
            {errors.confirmPassword && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.confirmPassword}</p>}
          </div>

          {/* 이름 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              이름 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="실명 입력"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.name ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
            />
            {errors.name && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.name}</p>}
          </div>

          {/* 전화번호 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              전화번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setFormData(prev => ({ ...prev, phone: formatted }));
              }}
              placeholder="010-1234-5678"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.phone ? '2px solid #f44336' : '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
            />
            {errors.phone && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.phone}</p>}
          </div>

          {/* 주민등록번호 (근로자만) */}
          {formData.role === 'employee' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                주민등록번호 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="ssn"
                value={formData.ssn}
                onChange={(e) => {
                  const formatted = formatSSN(e.target.value);
                  setFormData(prev => ({ ...prev, ssn: formatted }));
                }}
                placeholder="123456-1234567"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.ssn ? '2px solid #f44336' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
              />
              {errors.ssn && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.ssn}</p>}
            </div>
          )}

          {/* 이메일 (근로자만) */}
          {formData.role === 'employee' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                이메일 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.email ? '2px solid #f44336' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
              />
              {errors.email && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.email}</p>}
            </div>
          )}

          {/* 주소 (근로자만) */}
          {formData.role === 'employee' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                주소 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="서울시 강남구 테헤란로 123"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.address ? '2px solid #f44336' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
              />
              {errors.address && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.address}</p>}
            </div>
          )}

          {/* 사업자등록번호 (사업주만) */}
          {formData.role === 'owner' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                사업자등록번호 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="business_number"
                value={formData.business_number}
                onChange={(e) => {
                  const formatted = formatBusinessNumber(e.target.value);
                  setFormData(prev => ({ ...prev, business_number: formatted }));
                }}
                placeholder="123-45-67890"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.business_number ? '2px solid #f44336' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
              />
              {errors.business_number && <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>{errors.business_number}</p>}
            </div>
          )}

          {/* 회원가입 버튼 */}
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
              marginTop: '10px'
            }}
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        {/* 로그인 링크 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            이미 계정이 있으신가요?{' '}
            <span
              onClick={() => navigate('/login-v2')}
              style={{ color: '#667eea', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
            >
              로그인
            </span>
          </p>
        </div>
        </div>
      </div>

      <Footer simple={true} />

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

export default SignupV2;
