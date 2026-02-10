import React, { useState, useEffect } from 'react';
import api from '../services/api';

const EmailVerification = ({ purpose = 'signup', onVerified, onEmailChange }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState('');

  // 타이머 카운트다운
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && isCodeSent) {
      setError('인증번호가 만료되었습니다. 다시 요청해주세요.');
      setIsCodeSent(false);
    }
  }, [timer, isCodeSent]);

  // 시간 포맷팅 (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 이메일 변경 핸들러
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (onEmailChange) {
      onEmailChange(value);
    }
  };

  // 인증번호 전송
  const handleSendCode = async () => {
    setError('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 간단한 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/email/send-code', { 
        email: trimmedEmail,
        purpose 
      });
      
      setIsCodeSent(true);
      setTimer(300); // 5분
      setError('');
      
      // 개발용 코드 표시
      if (response.data.devCode) {
        setDevCode(response.data.devCode);
        alert(`[개발용] 인증번호: ${response.data.devCode}`);
      }
      
      alert(response.data.message || '인증번호가 이메일로 전송되었습니다.');
    } catch (err) {
      setError(err.response?.data?.error || '인증번호 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    setError('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!code || code.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/verify-code', { 
        email: trimmedEmail, 
        code 
      });
      
      setIsVerified(true);
      setError('');
      alert('인증이 완료되었습니다!');
      
      if (onVerified) {
        onVerified(trimmedEmail);
      }
    } catch (err) {
      setError(err.response?.data?.error || '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        이메일 {purpose === 'signup' && <span style={{ color: 'red' }}>*</span>}
      </label>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: window.innerWidth < 400 ? 'wrap' : 'nowrap' }}>
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="example@email.com"
          disabled={isVerified}
          style={{
            flex: 1,
            minWidth: window.innerWidth < 400 ? '100%' : '200px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px',
            backgroundColor: isVerified ? '#f0f0f0' : 'white',
            boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={handleSendCode}
          disabled={loading || isVerified || (isCodeSent && timer > 0)}
          style={{
            padding: window.innerWidth < 400 ? '12px 16px' : '12px 20px',
            backgroundColor: isVerified ? '#28a745' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading || isVerified ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            opacity: loading || isVerified ? 0.6 : 1,
            minWidth: window.innerWidth < 400 ? '100%' : 'auto',
            fontWeight: '600'
          }}
        >
          {isVerified ? '✓ 인증완료' : isCodeSent && timer > 0 ? '재전송' : '인증번호 전송'}
        </button>
      </div>

      {/* 개발용 인증번호 표시 */}
      {devCode && (
        <div style={{
          padding: '8px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '5px',
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          🔧 <strong>[개발용]</strong> 인증번호: <strong>{devCode}</strong>
        </div>
      )}

      {/* 인증번호 입력 */}
      {isCodeSent && !isVerified && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: window.innerWidth < 400 ? 'wrap' : 'nowrap' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="인증번호 6자리"
            maxLength={6}
            inputMode="numeric"
            style={{
              flex: 1,
              minWidth: window.innerWidth < 400 ? '100%' : '200px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px',
              textAlign: 'center',
              letterSpacing: '4px',
              fontWeight: 'bold',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            style={{
              padding: window.innerWidth < 400 ? '12px 16px' : '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              opacity: loading || code.length !== 6 ? 0.6 : 1,
              minWidth: window.innerWidth < 400 ? '100%' : 'auto',
              fontWeight: '600'
            }}
          >
            확인
          </button>
        </div>
      )}

      {/* 타이머 표시 */}
      {isCodeSent && !isVerified && timer > 0 && (
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          ⏱️ 남은 시간: <strong style={{ color: timer < 60 ? 'red' : '#667eea' }}>{formatTime(timer)}</strong>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          fontSize: '14px',
          marginTop: '10px'
        }}>
          {error}
        </div>
      )}

      {/* 인증 완료 메시지 */}
      {isVerified && (
        <div style={{
          padding: '10px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          fontSize: '14px',
          marginTop: '10px'
        }}>
          ✓ 이메일 인증이 완료되었습니다.
        </div>
      )}
    </div>
  );
};

export default EmailVerification;
