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
  const [company, setCompany] = useState(null);
  const [showMatchForm, setShowMatchForm] = useState(false);

  const [matchData, setMatchData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    position: '',
    employmentType: 'regular',
    taxType: '4대보험',
    monthlySalary: '',
    hourlyRate: ''
  });

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

    setSearching(true);

    try {
      const cleaned = businessNumber.replace(/-/g, '');
      const response = await apiClient.get(`/v2/auth/companies/search?business_number=${cleaned}`);

      if (response.data.success) {
        setCompany(response.data.company);
        setShowMatchForm(true);
        setToast({
          show: true,
          message: '회사를 찾았습니다!',
          type: 'success'
        });
      } else {
        setCompany(null);
        setShowMatchForm(false);
        setToast({
          show: true,
          message: response.data.message || '회사를 찾을 수 없습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('회사 검색 오류:', error);
      setCompany(null);
      setShowMatchForm(false);
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
    if (!matchData.startDate) {
      setToast({
        show: true,
        message: '입사일을 입력해주세요.',
        type: 'error'
      });
      return;
    }

    if (matchData.employmentType === 'regular' && !matchData.monthlySalary) {
      setToast({
        show: true,
        message: '월급을 입력해주세요.',
        type: 'error'
      });
      return;
    }

    if (matchData.employmentType === 'parttime' && !matchData.hourlyRate) {
      setToast({
        show: true,
        message: '시급을 입력해주세요.',
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        userId: user.id,
        companyId: company.id,
        startDate: matchData.startDate,
        position: matchData.position,
        employmentType: matchData.employmentType,
        taxType: matchData.taxType,
        monthlySalary: matchData.monthlySalary ? parseFloat(matchData.monthlySalary) : 0,
        hourlyRate: matchData.hourlyRate ? parseFloat(matchData.hourlyRate) : 0
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
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
            사업자등록번호 입력
          </h2>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
              placeholder="123-45-67890"
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.border = '2px solid #667eea'}
              onBlur={(e) => e.target.style.border = '2px solid #e0e0e0'}
            />
            <button
              onClick={handleSearchCompany}
              disabled={searching}
              style={{
                padding: '12px 24px',
                background: searching ? '#ccc' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: searching ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {searching ? '검색 중...' : '검색'}
            </button>
          </div>

          <p style={{ color: '#666', fontSize: '14px' }}>
            💡 사업주에게 사업자등록번호를 확인하세요.
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
          </div>
        )}

        {/* 매칭 요청 폼 */}
        {showMatchForm && company && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
              📝 근무 정보 입력
            </h2>

            {/* 입사일 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                입사일 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="date"
                value={matchData.startDate}
                onChange={(e) => setMatchData(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* 직급/직책 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                직급/직책
              </label>
              <input
                type="text"
                value={matchData.position}
                onChange={(e) => setMatchData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="예: 주방보조, 서빙"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* 고용형태 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                고용형태 <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={matchData.employmentType}
                onChange={(e) => setMatchData(prev => ({ ...prev, employmentType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="regular">정규직 (월급제)</option>
                <option value="parttime">시간제 (시급제)</option>
                <option value="contract">계약직</option>
                <option value="freelancer">프리랜서</option>
              </select>
            </div>

            {/* 세금 유형 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                세금 유형 <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={matchData.taxType}
                onChange={(e) => setMatchData(prev => ({ ...prev, taxType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="4대보험">4대보험</option>
                <option value="3.3%">3.3% 원천징수</option>
              </select>
            </div>

            {/* 월급 (정규직인 경우) */}
            {matchData.employmentType === 'regular' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                  월급 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  value={matchData.monthlySalary}
                  onChange={(e) => setMatchData(prev => ({ ...prev, monthlySalary: e.target.value }))}
                  placeholder="예: 2500000"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* 시급 (시간제인 경우) */}
            {matchData.employmentType === 'parttime' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                  시급 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  value={matchData.hourlyRate}
                  onChange={(e) => setMatchData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                  placeholder="예: 10000"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

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
                marginTop: '10px'
              }}
            >
              {loading ? '요청 중...' : '매칭 요청하기'}
            </button>
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
