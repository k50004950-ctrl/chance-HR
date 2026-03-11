import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inviteAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const InviteSignup = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const { login } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    ssn: '',
    address: '',
    bank_name: '',
    account_number: '',
    account_holder: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkInvite();
  }, [token]);

  const checkInvite = async () => {
    try {
      setLoading(true);
      const response = await inviteAPI.checkInvite(token);
      if (response.data.success) {
        setInvitation(response.data.invitation);
      } else {
        setError(response.data.message || '유효하지 않은 초대 링크입니다.');
      }
    } catch (err) {
      setError(err.response?.data?.message || '초대 링크 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await inviteAPI.signupWithInvite({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        ssn: formData.ssn,
        address: formData.address,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder: formData.account_holder,
        inviteToken: token
      });

      if (response.data.success) {
        alert('회원가입이 완료되었습니다! 로그인됩니다.');
        // 자동 로그인
        await login(formData.username, formData.password);
        navigate('/employee/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>초대 링크 확인 중...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ marginBottom: '12px', color: '#dc2626' }}>초대 링크 오류</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✉️</div>
          <h2 style={{ marginBottom: '8px', color: '#1f2937' }}>직원 초대 회원가입</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            <strong>{invitation.companyName}</strong>에서 초대했습니다
          </p>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>사업장:</strong> {invitation.workplaceName}
          </div>
          {invitation.workplaceAddress && (
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              📍 {invitation.workplaceAddress}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              아이디 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="영문, 숫자 조합"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              비밀번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="최소 4자 이상"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              비밀번호 확인 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호 재입력"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              이름 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="실명"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              전화번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="010-1234-5678"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              주민등록번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="ssn"
              value={formData.ssn}
              onChange={handleChange}
              placeholder="000000-0000000"
              required
              maxLength="14"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
              급여 계산 및 4대보험 가입에 필요합니다
            </small>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
              거주 주소 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="서울시 강남구..."
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{
            background: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h4 style={{ marginBottom: '12px', color: '#374151', fontSize: '14px' }}>
              💳 급여 통장 정보
            </h4>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4b5563', fontSize: '13px' }}>
                은행명 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="예: 국민은행, 신한은행"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4b5563', fontSize: '13px' }}>
                계좌번호 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                placeholder="'-' 없이 숫자만 입력"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '0' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4b5563', fontSize: '13px' }}>
                예금주 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="account_holder"
                value={formData.account_holder}
                onChange={handleChange}
                placeholder="본인 이름"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              background: submitting ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginBottom: '12px'
            }}
          >
            {submitting ? '가입 중...' : '✅ 회원가입 완료'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            로그인 페이지로
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InviteSignup;
