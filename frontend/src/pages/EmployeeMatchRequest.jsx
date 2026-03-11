import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import Toast from '../components/Toast';

function EmployeeMatchRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [businessNumber, setBusinessNumber] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [company, setCompany] = useState(null);

  const formatBusinessNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const handleSearchCompany = async () => {
    if (!businessNumber.trim()) {
      setToast({
        show: true,
        message: '사업자등록번호를 입력해주세요.',
        type: 'error'
      });
      return;
    }

    if (!ownerPhone.trim()) {
      setToast({
        show: true,
        message: '사업주 핸드폰번호를 입력해주세요.',
        type: 'error'
      });
      return;
    }

    setSearching(true);

    try {
      const cleanedBusiness = businessNumber.replace(/-/g, '');
      const cleanedPhone = ownerPhone.replace(/-/g, '');
      const response = await apiClient.get(`/v2/auth/companies/search?business_number=${cleanedBusiness}&owner_phone=${cleanedPhone}`);

      if (response.data.success) {
        setCompany(response.data.company);
        setToast({
          show: true,
          message: '회사를 찾았습니다! 매칭을 요청하시겠습니까?',
          type: 'success'
        });
      } else {
        setCompany(null);
        setToast({
          show: true,
          message: response.data.message || '회사를 찾을 수 없습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('회사 검색 오류:', error);
      setCompany(null);
      setToast({
        show: true,
        message: error.response?.data?.message || '회사 검색 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleMatchRequest = async () => {
    if (!company) {
      setToast({
        show: true,
        message: '먼저 회사를 검색해주세요.',
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        userId: user.id,
        companyId: company.id
      };

      const response = await apiClient.post('/v2/auth/employee/match-request', requestData);

      if (response.data.success) {
        setToast({
          show: true,
          message: '매칭 요청이 완료되었습니다! 사업주의 승인을 기다려주세요.',
          type: 'success'
        });

        setTimeout(() => {
          navigate('/employee');
        }, 2000);
      } else {
        setToast({
          show: true,
          message: response.data.message || '매칭 요청에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('매칭 요청 오류:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || '매칭 요청 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
        
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            🏢 회사 찾기
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            사업자등록번호로 회사를 검색하고 매칭 요청하세요
          </p>
        </div>

        {/* 검색 카드 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
            사업주 정보 입력
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              사업자등록번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
              placeholder="123-45-67890"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.border = '2px solid #667eea'}
              onBlur={(e) => e.target.style.border = '2px solid #e0e0e0'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
              사업주 핸드폰번호 <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="tel"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="010-1234-5678"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.border = '2px solid #667eea'}
              onBlur={(e) => e.target.style.border = '2px solid #e0e0e0'}
            />
          </div>

          <button
            onClick={handleSearchCompany}
            disabled={searching}
            style={{
              width: '100%',
              padding: '14px',
              background: searching ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: searching ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              marginBottom: '16px'
            }}
          >
            {searching ? '검색 중...' : '🔍 회사 찾기'}
          </button>

          <p style={{ color: '#666', fontSize: '14px' }}>
            💡 사업주에게 사업자등록번호와 핸드폰번호를 확인하세요.
          </p>
        </div>

        {/* 회사 정보 */}
        {company && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '30px', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
              ✅ 회사 정보
            </h2>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>회사명</span>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
                  {company.company_name}
                </p>
              </div>

              {company.representative_name && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>대표자명</span>
                  <p style={{ fontSize: '16px', color: '#333', marginTop: '4px' }}>
                    {company.representative_name}
                  </p>
                </div>
              )}

              {company.owner_name && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>사업주</span>
                  <p style={{ fontSize: '16px', color: '#333', marginTop: '4px' }}>
                    {company.owner_name}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>사업자등록번호</span>
                <p style={{ fontSize: '16px', color: '#333', marginTop: '4px' }}>
                  {company.business_number}
                </p>
              </div>

              {company.phone && (
                <div>
                  <span style={{ color: '#666', fontSize: '14px' }}>전화번호</span>
                  <p style={{ fontSize: '16px', color: '#333', marginTop: '4px' }}>
                    {company.phone}
                  </p>
                </div>
              )}
            </div>

            {/* 매칭 요청 버튼 */}
            <button
              onClick={handleMatchRequest}
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
                marginTop: '20px'
              }}
            >
              {loading ? '요청 중...' : '🤝 매칭 요청하기'}
            </button>

            <p style={{ color: '#666', fontSize: '14px', marginTop: '16px', textAlign: 'center' }}>
              💼 근무 정보는 사업주가 승인할 때 입력합니다
            </p>
          </div>
        )}

        {/* 뒤로 가기 */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => navigate('/employee')}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            ← 대시보드로 돌아가기
          </button>
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

export default EmployeeMatchRequest;
