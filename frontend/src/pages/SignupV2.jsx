import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';
import Toast from '../components/Toast';
import Footer from '../components/Footer';
import EmailVerification from '../components/EmailVerification';

function SignupV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // URL 쿼리 파라미터에서 역할 읽기 (?role=owner or ?role=employee)
  const searchParams = new URLSearchParams(location.search);
  const role = searchParams.get('role') || location.state?.defaultRole || 'employee';

  const isOwner = role === 'owner';

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role,
    business_number: '',
    ssn: '',
    address: '',
    email: ''
  });

  const [errors, setErrors] = useState({});
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    if (!isEmailVerified) {
      newErrors.email = '이메일 인증을 완료해주세요.';
    }

    if (isOwner) {
      if (!formData.business_number.trim()) {
        newErrors.business_number = '사업자등록번호를 입력해주세요.';
      } else if (!/^\d{10}$/.test(formData.business_number.replace(/-/g, ''))) {
        newErrors.business_number = '사업자등록번호는 10자리 숫자여야 합니다.';
      }
    } else {
      if (!formData.ssn.trim()) {
        newErrors.ssn = '주민등록번호를 입력해주세요.';
      } else if (!/^\d{13}$/.test(formData.ssn.replace(/-/g, ''))) {
        newErrors.ssn = '주민등록번호는 13자리 숫자여야 합니다.';
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
    if (!validate()) return;

    setLoading(true);
    try {
      const cleanedData = {
        ...formData,
        phone: '00000000000',
        business_number: formData.business_number ? formData.business_number.replace(/-/g, '') : undefined,
        ssn: formData.ssn ? formData.ssn.replace(/-/g, '') : undefined,
        address: formData.address || undefined
      };

      const response = await apiClient.post('/v2/auth/signup', cleanedData);

      if (response.data.success) {
        setToast({ show: true, message: '회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.', type: 'success' });
        setTimeout(() => navigate('/login-v2'), 2000);
      } else {
        setToast({ show: true, message: response.data.message || '회원가입에 실패했습니다.', type: 'error' });
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      setToast({ show: true, message: error.response?.data?.message || '회원가입 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
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

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '12px 16px',
    border: hasError ? '2px solid #f44336' : '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  });

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  };

  const fieldStyle = { marginBottom: '20px' };

  const errorStyle = { color: '#f44336', fontSize: '12px', marginTop: '4px' };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '40px' }}>

          {/* 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: isOwner ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f6a623 0%, #f05a28 100%)',
              color: 'white',
              borderRadius: '50px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              {isOwner ? '💼 사업주 회원가입' : '👷 근로자 회원가입'}
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#333', marginBottom: '6px' }}>
              회원가입
            </h1>
            <p style={{ color: '#888', fontSize: '13px' }}>
              {isOwner ? '사업주 계정을 생성합니다' : '근로자 계정을 생성합니다'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* 아이디 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>아이디 <span style={{ color: 'red' }}>*</span></label>
              <input type="text" name="username" value={formData.username} onChange={handleChange}
                placeholder="4자 이상 입력" style={inputStyle(errors.username)} />
              {errors.username && <p style={errorStyle}>{errors.username}</p>}
            </div>

            {/* 비밀번호 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>비밀번호 <span style={{ color: 'red' }}>*</span></label>
              <input type="password" name="password" value={formData.password} onChange={handleChange}
                placeholder="6자 이상 입력" style={inputStyle(errors.password)} />
              {errors.password && <p style={errorStyle}>{errors.password}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>비밀번호 확인 <span style={{ color: 'red' }}>*</span></label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                placeholder="비밀번호 재입력" style={inputStyle(errors.confirmPassword)} />
              {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
            </div>

            {/* 이름 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>이름 <span style={{ color: 'red' }}>*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder="실명 입력" style={inputStyle(errors.name)} />
              {errors.name && <p style={errorStyle}>{errors.name}</p>}
            </div>

            {/* 이메일 인증 */}
            <EmailVerification
              purpose="signup"
              onVerified={(verifiedEmail) => {
                setIsEmailVerified(true);
                setFormData(prev => ({ ...prev, email: verifiedEmail }));
                setErrors(prev => ({ ...prev, email: '' }));
              }}
              onEmailChange={(email) => {
                setFormData(prev => ({ ...prev, email }));
              }}
            />
            {errors.email && <p style={{ ...errorStyle, marginTop: '-10px', marginBottom: '10px' }}>{errors.email}</p>}

            {/* 사업자등록번호 (사업주 전용) */}
            {isOwner && (
              <div style={fieldStyle}>
                <label style={labelStyle}>사업자등록번호 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  name="business_number"
                  value={formData.business_number}
                  onChange={(e) => {
                    const formatted = formatBusinessNumber(e.target.value);
                    setFormData(prev => ({ ...prev, business_number: formatted }));
                    if (errors.business_number) setErrors(prev => ({ ...prev, business_number: '' }));
                  }}
                  placeholder="123-45-67890"
                  style={inputStyle(errors.business_number)}
                />
                {errors.business_number && <p style={errorStyle}>{errors.business_number}</p>}
              </div>
            )}

            {/* 주민등록번호 (근로자 전용) */}
            {!isOwner && (
              <div style={fieldStyle}>
                <label style={labelStyle}>주민등록번호 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  name="ssn"
                  value={formData.ssn}
                  onChange={(e) => {
                    const formatted = formatSSN(e.target.value);
                    setFormData(prev => ({ ...prev, ssn: formatted }));
                    if (errors.ssn) setErrors(prev => ({ ...prev, ssn: '' }));
                  }}
                  placeholder="123456-1234567"
                  style={inputStyle(errors.ssn)}
                />
                {errors.ssn && <p style={errorStyle}>{errors.ssn}</p>}
              </div>
            )}

            {/* 주소 (근로자 전용) */}
            {!isOwner && (
              <div style={fieldStyle}>
                <label style={labelStyle}>주소 <span style={{ color: 'red' }}>*</span></label>
                <input type="text" name="address" value={formData.address} onChange={handleChange}
                  placeholder="서울시 강남구 테헤란로 123" style={inputStyle(errors.address)} />
                {errors.address && <p style={errorStyle}>{errors.address}</p>}
              </div>
            )}

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#ccc' : isOwner
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #f6a623 0%, #f05a28 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '10px'
              }}
            >
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </form>

          {/* 다른 유형으로 가입 */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '13px' }}>
              {isOwner ? '근로자로 가입하시려면?' : '사업주로 가입하시려면?'}{' '}
              <span
                onClick={() => navigate(`/signup-v2?role=${isOwner ? 'employee' : 'owner'}`)}
                style={{ color: '#667eea', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isOwner ? '근로자 회원가입' : '사업주 회원가입'}
              </span>
            </p>
          </div>

          {/* 로그인 링크 */}
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
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
