import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { searchAddress, getCoordinatesFromAddress, getGoogleMapsLink } from '../utils/addressSearch';

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    service_consent: false,
    privacy_consent: false
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
      setMessage({ type: 'error', text: t('signup.msgEnterUsername') });
      return;
    }
    try {
      setUsernameCheckLoading(true);
      const response = await authAPI.checkUsername(formData.username);
      if (response.data.available) {
        setUsernameCheckStatus('available');
        setMessage({ type: 'success', text: t('signup.usernameAvailable') });
      } else {
        setUsernameCheckStatus('unavailable');
        setMessage({ type: 'error', text: t('signup.usernameUnavailable') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('signup.msgCheckUsername') });
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: t('signup.msgPasswordMismatch') });
      return;
    }

    if (!formData.username || !formData.password || !formData.name ||
        !formData.business_name || !formData.business_number || !formData.phone) {
      setMessage({ type: 'error', text: t('signup.msgRequiredFields') });
      return;
    }
    if (usernameCheckStatus !== 'available') {
      setMessage({ type: 'error', text: t('signup.msgCheckDuplicate') });
      return;
    }
    if (!formData.address || !formData.latitude || !formData.longitude) {
      setMessage({ type: 'error', text: t('signup.msgAddressRequired') });
      return;
    }
    if (!formData.privacy_consent) {
      setMessage({ type: 'error', text: t('signup.msgPrivacyRequired') });
      return;
    }
    if (!formData.service_consent) {
      setMessage({ type: 'error', text: t('signup.msgServiceRequired') });
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      await authAPI.signup(signupData);
      
      setMessage({
        type: 'success',
        text: t('signup.msgSignupSuccess')
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || t('signup.msgSignupError')
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
        setMessage({ type: 'success', text: t('signup.msgAddressCoordSuccess') });
      } else {
        setFormData((prev) => ({
          ...prev,
          address: result.address
        }));

        setMessage({ type: 'info', text: t('signup.msgSearchingCoord') });
        const coords = await getCoordinatesFromAddress(result.address);

        setFormData((prev) => ({
          ...prev,
          address: result.address,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));

        if (coords.success) {
          setMessage({ type: 'success', text: t('signup.msgAddressCoordSuccess') });
        } else {
          setMessage({ type: 'info', text: coords.message });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || t('signup.msgAddressSearchFailed') });
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: t('signup.msgLocationUnavailable') });
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
        setMessage({ type: 'success', text: t('signup.msgLocationSet') });
        setLocating(false);
      },
      (error) => {
        const messageMap = {
          1: t('signup.msgLocationPermission'),
          2: t('signup.msgLocationError'),
          3: t('signup.msgLocationTimeout')
        };
        setMessage({ type: 'error', text: messageMap[error.code] || t('signup.msgLocationFailed') });
        setLocating(false);
      }
    );
  };

  return (
    <div style={{ 
      minHeight: '100dvh',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#374151' }}>
          {t('signup.title')}
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
          {t('signup.subtitle')}
        </p>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            {t('signup.loginInfo')}
          </h3>
          
          <div className="form-group">
            <label className="form-label">{t('signup.usernameLabel')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder={t('signup.usernamePlaceholder')}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCheckUsername}
                disabled={usernameCheckLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {usernameCheckLoading ? t('signup.checking') : t('signup.checkDuplicate')}
              </button>
            </div>
            {usernameCheckStatus === 'available' && (
              <small style={{ color: '#16a34a', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                {t('signup.usernameAvailable')}
              </small>
            )}
            {usernameCheckStatus === 'unavailable' && (
              <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                {t('signup.usernameUnavailable')}
              </small>
            )}
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('signup.passwordLabel')}</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t('signup.passwordPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup.confirmPasswordLabel')}</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder={t('signup.confirmPasswordPlaceholder')}
              />
            </div>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            {t('signup.ownerInfo')}
          </h3>

          <div className="form-group">
            <label className="form-label">{t('signup.ownerNameLabel')}</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder={t('signup.ownerNamePlaceholder')}
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('signup.phoneLabel')}</label>
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
              <label className="form-label">{t('signup.emailLabel')}</label>
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
            {t('signup.businessInfo')}
          </h3>

          <div className="form-group">
            <label className="form-label">{t('signup.businessNameLabel')}</label>
            <input
              type="text"
              name="business_name"
              className="form-input"
              value={formData.business_name}
              onChange={handleChange}
              required
              placeholder={t('signup.businessNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.businessNumberLabel')}</label>
            <input
              type="text"
              name="business_number"
              className="form-input"
              value={formData.business_number}
              onChange={handleChange}
              required
              placeholder={t('signup.businessNumberPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.referrerLabel')}</label>
            <input
              type="text"
              name="sales_rep"
              className="form-input"
              value={formData.sales_rep}
              onChange={handleChange}
              placeholder={t('signup.referrerPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.taxOfficeLabel')}</label>
            <input
              type="text"
              name="tax_office_name"
              className="form-input"
              value={formData.tax_office_name}
              onChange={handleChange}
              placeholder={t('signup.taxOfficePlaceholder')}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {t('signup.taxOfficeNote')}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.addressLabel')}</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                name="address"
                className="form-input"
                value={formData.address}
                onChange={handleChange}
                onClick={handleSearchAddress}
                readOnly
                placeholder={t('signup.addressPlaceholder')}
                style={{ flex: '1 1 260px' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSearchAddress}
                style={{ whiteSpace: 'nowrap', minWidth: '140px', flex: '0 0 auto' }}
              >
                {t('signup.searchAddress')}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {t('signup.addressNote')}
            </p>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">{t('signup.latitudeLabel')}</label>
              <input
                type="number"
                step="any"
                name="latitude"
                className="form-input"
                value={formData.latitude}
                onChange={handleChange}
                required
                placeholder={t('signup.latitudePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('signup.longitudeLabel')}</label>
              <input
                type="number"
                step="any"
                name="longitude"
                className="form-input"
                value={formData.longitude}
                onChange={handleChange}
                required
                placeholder={t('signup.longitudePlaceholder')}
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
              {locating ? t('signup.locating') : t('signup.useCurrentLocation')}
            </button>
            {formData.latitude && formData.longitude && (
              <a
                href={getGoogleMapsLink(formData.latitude, formData.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
              >
                {t('signup.viewOnMap')}
              </a>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.radiusLabel')}</label>
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
            <label className="form-label">{t('signup.additionalInfoLabel')}</label>
            <textarea
              name="additional_info"
              className="form-input"
              value={formData.additional_info}
              onChange={handleChange}
              rows="3"
              placeholder={t('signup.additionalInfoPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.privacyConsentTitle')}</label>
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', maxHeight: '200px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.7' }}>
              <strong>개인정보 수집·이용 안내</strong>
              <p style={{ marginTop: '8px' }}><strong>수집 항목:</strong> 대표자 성명, 아이디, 비밀번호, 전화번호, 이메일, 사업자등록번호, 사업장 주소 및 좌표</p>
              <p><strong>수집 목적:</strong> 회원가입 및 본인 확인, 사업장 등록 및 근태관리 서비스 제공, 급여·인사관리 업무 지원</p>
              <p><strong>보유 기간:</strong> 회원 탈퇴 시 또는 관련 법령에 따른 보존 기간 경과 후 파기</p>
              <p style={{ marginTop: '8px' }}>동의를 거부할 수 있으나, 이 경우 회원가입이 제한됩니다.</p>
            </div>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', marginTop: '12px' }}>
              <input
                type="checkbox"
                name="privacy_consent"
                checked={formData.privacy_consent}
                onChange={handleChange}
                style={{ marginTop: '4px' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                {t('signup.privacyConsentCheck')}
              </span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">{t('signup.serviceConsentTitle')}</label>
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
                {t('signup.serviceConsentCheck')}
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
                {t('signup.marketingConsentCheck')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? t('signup.processing') : t('signup.submitButton')}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '14px' }}>
          {t('signup.hasAccount')}{' '}
          <a
            href="/login"
            style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600' }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
          >
            {t('signup.goToLogin')}
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
