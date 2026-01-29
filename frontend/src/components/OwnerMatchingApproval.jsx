import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiClient } from '../services/api';
import Toast from './Toast';

function OwnerMatchingApproval({ companyId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (companyId) {
      loadMatchingRequests();
    }
  }, [companyId]);

  const loadMatchingRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/v2/auth/owner/match-requests/${companyId}`);
      if (response.data.success) {
        setRequests(response.data.requests || []);
      }
    } catch (error) {
      console.error('매칭 요청 목록 로드 오류:', error);
      setToast({
        show: true,
        message: '매칭 요청 목록을 불러오는 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (relationId, employeeName) => {
    if (!confirm(`${employeeName} 님의 매칭 요청을 승인하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiClient.post('/v2/auth/owner/match-approve', {
        relationId,
        approve: true
      });

      if (response.data.success) {
        setToast({
          show: true,
          message: '매칭이 승인되었습니다.',
          type: 'success'
        });
        loadMatchingRequests(); // 목록 새로고침
      } else {
        setToast({
          show: true,
          message: response.data.message || '승인에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('매칭 승인 오류:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || '승인 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  const handleReject = async (relationId, employeeName) => {
    if (!confirm(`${employeeName} 님의 매칭 요청을 거부하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiClient.post('/v2/auth/owner/match-approve', {
        relationId,
        approve: false
      });

      if (response.data.success) {
        setToast({
          show: true,
          message: '매칭이 거부되었습니다.',
          type: 'success'
        });
        loadMatchingRequests(); // 목록 새로고침
      } else {
        setToast({
          show: true,
          message: response.data.message || '거부에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('매칭 거부 오류:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || '거부 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', background: '#f5f5f5', borderRadius: '12px' }}>
        <p style={{ color: '#666', fontSize: '16px' }}>📭 대기 중인 매칭 요청이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
        🔔 매칭 요청 ({requests.length}건)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {requests.map((request) => (
          <div
            key={request.id}
            style={{
              background: 'white',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {/* 직원 정보 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
                {request.employee_name} <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({request.employee_username})</span>
              </h4>
              <p style={{ color: '#666', fontSize: '14px' }}>📞 {request.employee_phone}</p>
            </div>

            {/* 근무 정보 */}
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>입사일</p>
                  <p style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>
                    {new Date(request.start_date).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div>
                  <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>고용형태</p>
                  <p style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>
                    {request.employment_type === 'regular' ? '정규직' :
                     request.employment_type === 'parttime' ? '시간제' :
                     request.employment_type === 'contract' ? '계약직' : '프리랜서'}
                  </p>
                </div>

                {request.position && (
                  <div>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>직급/직책</p>
                    <p style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>
                      {request.position}
                    </p>
                  </div>
                )}

                <div>
                  <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>세금 유형</p>
                  <p style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>
                    {request.tax_type || '4대보험'}
                  </p>
                </div>

                {request.monthly_salary > 0 && (
                  <div>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>월급</p>
                    <p style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>
                      {request.monthly_salary.toLocaleString()}원
                    </p>
                  </div>
                )}

                {request.hourly_rate > 0 && (
                  <div>
                    <p style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>시급</p>
                    <p style={{ color: '#333', fontSize: '14px', fontWeight: '600' }}>
                      {request.hourly_rate.toLocaleString()}원
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 요청 일시 */}
            <p style={{ color: '#999', fontSize: '12px', marginBottom: '16px' }}>
              요청 일시: {new Date(request.created_at).toLocaleString('ko-KR')}
            </p>

            {/* 승인/거부 버튼 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleApprove(request.id, request.employee_name)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#059669'}
                onMouseLeave={(e) => e.target.style.background = '#10b981'}
              >
                ✅ 승인
              </button>

              <button
                onClick={() => handleReject(request.id, request.employee_name)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                onMouseLeave={(e) => e.target.style.background = '#ef4444'}
              >
                ❌ 거부
              </button>
            </div>
          </div>
        ))}
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

OwnerMatchingApproval.propTypes = {
  companyId: PropTypes.number.isRequired
};

export default OwnerMatchingApproval;
