import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { searchAddress, getCoordinatesFromAddress, getGoogleMapsLink } from '../utils/addressSearch';

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [usernameCheckStatus, setUsernameCheckStatus] = useState('unchecked');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
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
    sales_rep: '',
    tax_office_name: '',
    latitude: '',
    longitude: '',
    radius: 100,
    marketing_consent: false,
    service_consent: false
  });
  const [locating, setLocating] = useState(false);

  const handleChange = (e) => {
    if (e.target.name === 'username') {
      setUsernameCheckStatus('unchecked');
    }
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleCheckUsername = async () => {
    if (!formData.username) {
      setMessage({ type: 'error', text: '아이디를 입력해주세요.' });
      return;
    }
    try {
      setUsernameCheckLoading(true);
      const response = await authAPI.checkUsername(formData.username);
      if (response.data.available) {
        setUsernameCheckStatus('available');
        setMessage({ type: 'success', text: '사용 가능한 아이디입니다.' });
      } else {
        setUsernameCheckStatus('unavailable');
        setMessage({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || '아이디 확인에 실패했습니다.' });
    } finally {
      setUsernameCheckLoading(false);
    }
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
    if (usernameCheckStatus !== 'available') {
      setMessage({ type: 'error', text: '아이디 중복확인을 먼저 해주세요.' });
      return;
    }
    if (!formData.address || !formData.latitude || !formData.longitude) {
      setMessage({ type: 'error', text: '사업장 주소와 좌표를 입력해주세요.' });
      return;
    }
    if (!formData.service_consent) {
      setMessage({ type: 'error', text: '서비스 이용 동의가 필요합니다.' });
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
      
      // 주소 검색에서 이미 좌표를 가져온 경우 사용
      if (result.latitude && result.longitude) {
        setFormData((prev) => ({
          ...prev,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude
        }));
        setMessage({ type: 'success', text: '주소와 좌표가 자동으로 입력되었습니다!' });
      } else {
        // 좌표가 없는 경우에만 주소로 재검색
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="로그인용 아이디"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCheckUsername}
                disabled={usernameCheckLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {usernameCheckLoading ? '확인 중...' : '중복 확인'}
              </button>
            </div>
            {usernameCheckStatus === 'available' && (
              <small style={{ color: '#16a34a', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                사용 가능한 아이디입니다.
              </small>
            )}
            {usernameCheckStatus === 'unavailable' && (
              <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                이미 사용 중인 아이디입니다.
              </small>
            )}
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
            <label className="form-label">추천인</label>
            <input
              type="text"
              name="sales_rep"
              className="form-input"
              value={formData.sales_rep}
              onChange={handleChange}
              placeholder="추천인 이름"
            />
          </div>

          <div className="form-group">
            <label className="form-label">세무사 상호</label>
            <input
              type="text"
              name="tax_office_name"
              className="form-input"
              value={formData.tax_office_name}
              onChange={handleChange}
              placeholder="세무사 사무소 이름"
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              추후 세무사사무실과 연계업데이트 작업을 할수있습니다
            </p>
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

          <div className="form-group">
            <label className="form-label">서비스 이용 동의 (필수)</label>
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', maxHeight: '260px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.7' }}>
              <strong>📄 서비스 이용 동의 및 책임 한계에 대한 안내</strong>
              <p style={{ marginTop: '10px' }}>
                본인은 찬스컴퍼니 인사·노무 관리 솔루션(이하 “본 서비스”)이 사업주의 인사·근태·급여 관리 업무를 보다 편리하게 하기 위한 관리 지원 시스템임을 이해하고 이에 동의합니다.
              </p>
              <p>
                본 서비스에서 제공하는 급여, 수당, 퇴직금 등의 계산 기능은 관리 편의를 위한 참고용 자동 계산 기능이며, 세무 신고·노무 신고·4대보험 신고·법적 신고를 자동으로 처리하거나 이를 보장하는 서비스가 아님을 확인합니다.
              </p>
              <p style={{ marginTop: '10px' }}>
                <strong>⚠️ 중요 확인 사항</strong><br />
                본 서비스의 모든 계산 결과는 최종 확정 자료가 아니며, 실제 급여 지급, 세무·노무 신고, 퇴직금 정산 등은 반드시 세무사, 노무사 등 전문가의 검토 후 진행해야 함에 동의합니다.
              </p>
              <p>
                본인은 본 서비스의 이용 결과에 따른 세무·노무 신고, 법적 판단, 행정 처리, 관공서 제출 자료에 대한 최종 책임이 전적으로 본인(사업주)에게 있음을 확인합니다.
              </p>
              <p>
                본 서비스는 다음 사항에 대해 법적 책임을 지지 않음에 동의합니다.
              </p>
              <ul style={{ paddingLeft: '18px' }}>
                <li>계산 결과를 그대로 사용하여 발생한 손해 또는 분쟁</li>
                <li>입력 정보 오류, 법령 해석 차이, 법령 변경으로 인한 문제</li>
                <li>과태료, 추징금, 분쟁, 행정 제재 등 일체의 문제</li>
              </ul>
              <p style={{ marginTop: '10px' }}>
                <strong>📌 서비스의 성격에 대한 동의</strong><br />
                본인은 본 서비스가 인사·근태·급여 관리를 정리·관리하기 위한 보조 시스템이며, 세무·노무 업무를 대행하거나 법적 책임을 부담하는 서비스가 아님을 명확히 인지하고 이에 동의합니다.
              </p>
              <p style={{ marginTop: '10px' }}>
                <strong>✅ 최종 동의 문구</strong><br />
                본인은 위 내용을 모두 확인하였으며, 본 서비스는 관리 편의 제공 목적의 시스템이고, 모든 법적 책임은 본인에게 있음을 이해하고 이에 동의합니다.
              </p>
            </div>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginTop: '12px' }}>
              <input
                type="checkbox"
                name="service_consent"
                checked={formData.service_consent}
                onChange={handleChange}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                [필수] 위 내용에 동의합니다.
              </span>
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="marketing_consent"
                checked={formData.marketing_consent}
                onChange={handleChange}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                [선택] 마케팅 정보 수신에 동의합니다.
              </span>
            </label>
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
