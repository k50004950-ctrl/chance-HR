import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import Toast from './Toast';

function EmploymentHistory({ userId }) {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(true);
  const [employments, setEmployments] = useState([]);
  const [showResignModal, setShowResignModal] = useState(false);
  const [selectedEmployment, setSelectedEmployment] = useState(null);
  const [resignDate, setResignDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignSubmitting, setResignSubmitting] = useState(false);

  useEffect(() => {
    loadEmployments();
  }, [userId]);

  const loadEmployments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/v2/auth/employee/my-employment/${userId}`);
      if (response.data.success) {
        setEmployments(response.data.employments);
      }
    } catch (error) {
      console.error('고용 이력 조회 오류:', error);
      setToast({
        show: true,
        message: '고용 이력을 불러오는데 실패했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResignClick = (employment) => {
    setSelectedEmployment(employment);
    setShowResignModal(true);
  };

  const handleResignSubmit = async () => {
    if (!resignDate) {
      setToast({
        show: true,
        message: '퇴사일을 입력해주세요.',
        type: 'error'
      });
      return;
    }

    setResignSubmitting(true);

    try {
      const response = await apiClient.post('/v2/auth/employee/resign', {
        relationId: selectedEmployment.relation_id,
        endDate: resignDate
      });

      if (response.data.success) {
        setToast({
          show: true,
          message: '퇴사 처리가 완료되었습니다.',
          type: 'success'
        });
        setShowResignModal(false);
        setSelectedEmployment(null);
        loadEmployments(); // 새로고침
      } else {
        setToast({
          show: true,
          message: response.data.message || '퇴사 처리에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('퇴사 처리 오류:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || '퇴사 처리 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setResignSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: { background: '#4caf50', color: 'white', text: '재직중' },
      resigned: { background: '#9e9e9e', color: 'white', text: '퇴사' },
      pending: { background: '#ff9800', color: 'white', text: '승인대기' },
      rejected: { background: '#f44336', color: 'white', text: '거부됨' }
    };

    const style = styles[status] || styles.pending;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        ...style
      }}>
        {style.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      {employments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>고용 이력이 없습니다</h3>
          <p style={{ fontSize: '14px', color: '#999' }}>
            회사 매칭을 요청하여 근무를 시작하세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {employments.map((employment) => (
            <div
              key={employment.relation_id}
              style={{
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.3s'
              }}
            >
              {/* 상단: 회사명 + 상태 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                    {employment.company_name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    {employment.business_number}
                  </p>
                </div>
                {getStatusBadge(employment.status)}
              </div>

              {/* 상세 정보 */}
              <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>입사일</span>
                    <span style={{ color: '#333', fontWeight: '500' }}>
                      {new Date(employment.start_date).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {employment.end_date && (
                    <div>
                      <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>퇴사일</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>
                        {new Date(employment.end_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}

                  {employment.position && (
                    <div>
                      <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>직급/직책</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>{employment.position}</span>
                    </div>
                  )}

                  <div>
                    <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>고용형태</span>
                    <span style={{ color: '#333', fontWeight: '500' }}>
                      {employment.employment_type === 'regular' ? '정규직' :
                       employment.employment_type === 'parttime' ? '시간제' :
                       employment.employment_type === 'contract' ? '계약직' :
                       employment.employment_type === 'freelancer' ? '프리랜서' : employment.employment_type}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>세금 유형</span>
                    <span style={{ color: '#333', fontWeight: '500' }}>{employment.tax_type}</span>
                  </div>

                  {employment.monthly_salary > 0 && (
                    <div>
                      <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>월급</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>
                        {employment.monthly_salary.toLocaleString()}원
                      </span>
                    </div>
                  )}

                  {employment.hourly_rate > 0 && (
                    <div>
                      <span style={{ color: '#999', display: 'block', marginBottom: '4px' }}>시급</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>
                        {employment.hourly_rate.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 퇴사 버튼 (재직중인 경우에만) */}
              {employment.status === 'active' && !employment.end_date && (
                <button
                  onClick={() => handleResignClick(employment)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#d32f2f'}
                  onMouseLeave={(e) => e.target.style.background = '#f44336'}
                >
                  퇴사 처리
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 퇴사 모달 */}
      {showResignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
              퇴사 처리
            </h2>

            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              <strong>{selectedEmployment?.company_name}</strong>에서 퇴사하시겠습니까?
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                퇴사일 <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="date"
                value={resignDate}
                onChange={(e) => setResignDate(e.target.value)}
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

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowResignModal(false);
                  setSelectedEmployment(null);
                }}
                disabled={resignSubmitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: resignSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleResignSubmit}
                disabled={resignSubmitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: resignSubmitting ? '#ccc' : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: resignSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {resignSubmitting ? '처리 중...' : '퇴사 확정'}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default EmploymentHistory;
