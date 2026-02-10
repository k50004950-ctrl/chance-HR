import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PhoneVerification = ({ purpose = 'signup', onVerified, onPhoneChange }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState(''); // 개발용

  // 타이머 카운트다운
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && isCodeSent) {
      setError('인증번호가 만료되었습니다. 다시 요청해주세요.');
      setIsCodeSent(false);
    }
  }, [timer, isCodeSent]);

  // 전화번호 포맷팅
  const formatPhone = (value) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    if (onPhoneChange) {
      onPhoneChange(formatted.replace(/[^0-9]/g, ''));
    }
  };

  // 인증번호 전송
  const handleSendCode = async () => {
    setError('');
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
      setError('올바른 전화번호 형식이 아닙니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/sms/send-code', { 
        phone: cleanPhone,
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
      
      alert(response.data.message || '인증번호가 전송되었습니다.');
    } catch (err) {
      setError(err.response?.data?.error || '인증번호 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    setError('');
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!code || code.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/sms/verify-code', { 
        phone: cleanPhone,
        code 
      });
      
      setIsVerified(true);
      setError('');
      alert('인증이 완료되었습니다!');
      
      if (onVerified) {
        onVerified(cleanPhone);
      }
    } catch (err) {
      setError(err.response?.data?.error || '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        전화번호 {purpose === 'signup' && <span style={{ color: 'red' }}>*</span>}
      </label>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="010-0000-0000"
          disabled={isVerified}
          maxLength={13}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px',
            backgroundColor: isVerified ? '#f0f0f0' : 'white'
          }}
        />
        <button
          type="button"
          onClick={handleSendCode}
          disabled={loading || isVerified || (isCodeSent && timer > 0)}
          style={{
            padding: '10px 20px',
            backgroundColor: isVerified ? '#28a745' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading || isVerified ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            opacity: loading || isVerified ? 0.6 : 1
          }}
        >
          {isVerified ? '✓ 인증완료' : isCodeSent && timer > 0 ? '재전송' : '인증번호 전송'}
        </button>
      </div>

      {/* 개발용 코드 표시 */}
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

      {isCodeSent && !isVerified && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="인증번호 6자리"
            maxLength={6}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              opacity: loading || code.length !== 6 ? 0.6 : 1
            }}
          >
            확인
          </button>
        </div>
      )}

      {isCodeSent && !isVerified && timer > 0 && (
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          ⏱️ 남은 시간: <strong style={{ color: timer < 60 ? 'red' : '#667eea' }}>{formatTime(timer)}</strong>
        </div>
      )}

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
          ✓ 전화번호 인증이 완료되었습니다.
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;
