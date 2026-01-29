import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import Toast from './Toast';

function AllPayslips({ userId }) {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadPayslips();
  }, [userId]);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/v2/auth/employee/my-payslips/${userId}`);
      if (response.data.success) {
        setPayslips(response.data.payslips);
      }
    } catch (error) {
      console.error('급여명세서 조회 오류:', error);
      setToast({
        show: true,
        message: '급여명세서를 불러오는데 실패했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayslipClick = (payslip) => {
    setSelectedPayslip(payslip);
    setShowDetailModal(true);
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
      {payslips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>급여명세서가 없습니다</h3>
          <p style={{ fontSize: '14px', color: '#999' }}>
            급여가 발급되면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            총 <strong style={{ color: '#667eea' }}>{payslips.length}</strong>개의 급여명세서
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {payslips.map((slip) => (
              <div
                key={slip.id}
                onClick={() => handlePayslipClick(slip)}
                style={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                      {slip.company_name || '회사명 없음'}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#999' }}>
                      {slip.business_number || '-'}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: slip.published ? '#4caf50' : '#ff9800',
                    color: 'white'
                  }}>
                    {slip.published ? '발급됨' : '미발급'}
                  </span>
                </div>

                <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#999', display: 'block', fontSize: '12px' }}>급여월</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>{slip.payroll_month}</span>
                    </div>
                    <div>
                      <span style={{ color: '#999', display: 'block', fontSize: '12px' }}>지급일</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>
                        {slip.pay_date ? new Date(slip.pay_date).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#999', display: 'block', fontSize: '12px' }}>기본급</span>
                      <span style={{ color: '#333', fontWeight: '500' }}>
                        {slip.base_pay ? slip.base_pay.toLocaleString() : '0'}원
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#999', display: 'block', fontSize: '12px' }}>실수령액</span>
                      <span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '16px' }}>
                        {slip.net_pay ? slip.net_pay.toLocaleString() : '0'}원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetailModal && selectedPayslip && (
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
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                급여명세서
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPayslip(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </div>

            {/* 회사 정보 */}
            <div style={{ background: '#f0f4ff', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                {selectedPayslip.company_name || '회사명 없음'}
              </h3>
              <p style={{ fontSize: '14px', color: '#666' }}>
                사업자등록번호: {selectedPayslip.business_number || '-'}
              </p>
            </div>

            {/* 급여 정보 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <span style={{ color: '#666' }}>급여월</span>
                  <span style={{ fontWeight: '600', color: '#333' }}>{selectedPayslip.payroll_month}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <span style={{ color: '#666' }}>지급일</span>
                  <span style={{ fontWeight: '600', color: '#333' }}>
                    {selectedPayslip.pay_date ? new Date(selectedPayslip.pay_date).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <span style={{ color: '#666' }}>세금 유형</span>
                  <span style={{ fontWeight: '600', color: '#333' }}>{selectedPayslip.tax_type}</span>
                </div>

                <div style={{ borderTop: '2px dashed #e0e0e0', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#e8f5e9', borderRadius: '8px' }}>
                    <span style={{ color: '#2e7d32', fontWeight: '600' }}>기본급</span>
                    <span style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '18px' }}>
                      {selectedPayslip.base_pay ? selectedPayslip.base_pay.toLocaleString() : '0'}원
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#ffebee', borderRadius: '8px' }}>
                  <span style={{ color: '#c62828', fontWeight: '600' }}>총 공제액</span>
                  <span style={{ fontWeight: 'bold', color: '#c62828' }}>
                    -{selectedPayslip.total_deductions ? selectedPayslip.total_deductions.toLocaleString() : '0'}원
                  </span>
                </div>

                <div style={{ borderTop: '2px solid #667eea', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px' }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>실수령액</span>
                    <span style={{ fontWeight: 'bold', color: 'white', fontSize: '24px' }}>
                      {selectedPayslip.net_pay ? selectedPayslip.net_pay.toLocaleString() : '0'}원
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedPayslip(null);
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              닫기
            </button>
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

export default AllPayslips;
