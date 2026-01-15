import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { searchAddress, getCoordinatesFromAddress, getGoogleMapsLink } from '../utils/addressSearch';

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    business_name: '',
    business_number: '',
    phone: '',
    email: '',
    address: '',
    additional_info: '',
    latitude: '',
    longitude: '',
    radius: 100
  });
  const [locating, setLocating] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    // 필수 입력 확인
    if (!formData.username || !formData.password || !formData.name || 
        !formData.business_name || !formData.business_number || !formData.phone) {
      setMessage({ type: 'error', text: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    if (!formData.address || !formData.latitude || !formData.longitude) {
      setMessage({ type: 'error', text: '사업장 주소와 좌표를 입력해주세요.' });
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      await authAPI.signup(signupData);
      
      setMessage({ 
        type: 'success', 
        text: '회원가입이 완료되었습니다! 관리자 승인 후 로그인하실 수 있습니다.' 
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '회원가입 중 오류가 발생했습니다.' 
      });
    }

    setLoading(false);
  };

  const handleSearchAddress = async () => {
    try {
      const result = await searchAddress();
      setFormData((prev) => ({
        ...prev,
        address: result.address
      }));

      setMessage({ type: 'info', text: '좌표를 검색하는 중...' });
      const coords = await getCoordinatesFromAddress(result.address);

      setFormData((prev) => ({
        ...prev,
        address: result.address,
        latitude: coords.latitude,
        longitude: coords.longitude
      }));

      if (coords.success) {
        setMessage({ type: 'success', text: '주소와 좌표가 자동으로 입력되었습니다!' });
      } else {
        setMessage({ type: 'info', text: coords.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '주소 검색에 실패했습니다.' });
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: '현재 브라우저에서는 위치 기능을 사용할 수 없습니다.' });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setMessage({ type: 'success', text: '현재 위치가 입력되었습니다.' });
        setLocating(false);
      },
      (error) => {
        const messageMap = {
          1: '위치 권한이 필요합니다.',
          2: '위치 정보를 가져올 수 없습니다.',
          3: '위치 요청 시간이 초과되었습니다.'
        };
        setMessage({ type: 'error', text: messageMap[error.code] || '위치 정보를 가져오지 못했습니다.' });
        setLocating(false);
      }
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#374151' }}>
          대표자 회원가입
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
          사업장 정보를 입력해주세요
        </p>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            로그인 정보
          </h3>
          
          <div className="form-group">
            <label className="form-label">아이디 *</label>
            <input
              type="text"
              name="username"
              className="form-input"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="로그인용 아이디"
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">비밀번호 *</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="비밀번호"
              />
            </div>
            <div className="form-group">
              <label className="form-label">비밀번호 확인 *</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="비밀번호 재입력"
              />
            </div>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            대표자 정보
          </h3>

          <div className="form-group">
            <label className="form-label">대표자 이름 *</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="실명"
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">전화번호 *</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="010-0000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
              />
            </div>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            사업장 정보
          </h3>

          <div className="form-group">
            <label className="form-label">상호 (사업장명) *</label>
            <input
              type="text"
              name="business_name"
              className="form-input"
              value={formData.business_name}
              onChange={handleChange}
              required
              placeholder="예: 홍길동 카페"
            />
          </div>

          <div className="form-group">
            <label className="form-label">사업자등록번호 *</label>
            <input
              type="text"
              name="business_number"
              className="form-input"
              value={formData.business_number}
              onChange={handleChange}
              required
              placeholder="000-00-00000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">주소 *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                name="address"
                className="form-input"
                value={formData.address}
                onChange={handleChange}
                onClick={handleSearchAddress}
                readOnly
                placeholder="주소 검색 버튼을 클릭하세요"
                style={{ flex: '1 1 260px' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSearchAddress}
                style={{ whiteSpace: 'nowrap', minWidth: '140px', flex: '0 0 auto' }}
              >
                🔍 주소 검색
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              주소 검색(다음/카카오)으로 정확한 주소를 선택하면 좌표가 자동 입력됩니다.
            </p>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">위도 *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                className="form-input"
                value={formData.latitude}
                onChange={handleChange}
                required
                placeholder="예: 37.5665"
              />
            </div>
            <div className="form-group">
              <label className="form-label">경도 *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                className="form-input"
                value={formData.longitude}
                onChange={handleChange}
                required
                placeholder="예: 126.9780"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleUseCurrentLocation}
              style={{ flex: 1 }}
              disabled={locating}
            >
              {locating ? '위치 확인 중...' : '📍 현재 위치 사용'}
            </button>
            {formData.latitude && formData.longitude && (
              <a
                href={getGoogleMapsLink(formData.latitude, formData.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
              >
                🗺️ 지도에서 확인
              </a>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">반경 (미터)</label>
            <input
              type="number"
              name="radius"
              className="form-input"
              value={formData.radius}
              onChange={handleChange}
              placeholder="100"
            />
          </div>

          <div className="form-group">
            <label className="form-label">기타 정보</label>
            <textarea
              name="additional_info"
              className="form-input"
              value={formData.additional_info}
              onChange={handleChange}
              rows="3"
              placeholder="추가로 전달할 정보가 있다면 입력해주세요"
            />
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/login')}
              style={{ flex: 1 }}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '14px' }}>
          이미 계정이 있으신가요?{' '}
          <a 
            href="/login" 
            style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
          >
            로그인
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
