import React, { useState, useEffect } from 'react';
import { inviteAPI } from '../services/api';

const EmployeeInviteManager = ({ workplaceId, companyId, ownerId, onClose }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    expiresInDays: 7,
    maxUses: null
  });

  useEffect(() => {
    if (workplaceId) {
      loadInvitations();
    }
  }, [workplaceId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await inviteAPI.getInvites(workplaceId);
      if (response.data.success) {
        setInvitations(response.data.invitations);
      }
    } catch (error) {
      console.error('초대 링크 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!workplaceId || !companyId || !ownerId) {
      alert(`필수 정보가 누락되었습니다.\n- 사업장 ID: ${workplaceId || '없음'}\n- 회사 ID: ${companyId || '없음'}\n- 사업주 ID: ${ownerId || '없음'}\n\n다시 로그인하거나 사업장을 등록해주세요.`);
      return;
    }

    try {
      setCreating(true);
      console.log('📨 초대 링크 생성 요청:', { workplaceId, companyId, ownerId });
      
      const response = await inviteAPI.createInvite({
        workplaceId,
        companyId,
        ownerId,
        expiresInDays: formData.expiresInDays,
        maxUses: formData.maxUses || null
      });

      if (response.data.success) {
        alert('초대 링크가 생성되었습니다!');
        setShowForm(false);
        loadInvitations();
      }
    } catch (error) {
      console.error('❌ 초대 링크 생성 오류:', error);
      const errorMsg = error.response?.data?.message || '초대 링크 생성 중 오류가 발생했습니다.';
      const debugInfo = error.response?.data?.debug ? `\n\n디버그 정보: ${JSON.stringify(error.response.data.debug)}` : '';
      alert(errorMsg + debugInfo);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (token) => {
    if (!confirm('이 초대 링크를 비활성화하시겠습니까?')) return;

    try {
      await inviteAPI.deleteInvite(token);
      alert('초대 링크가 비활성화되었습니다.');
      loadInvitations();
    } catch (error) {
      alert(error.response?.data?.message || '초대 링크 비활성화 중 오류가 발생했습니다.');
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('초대 링크가 클립보드에 복사되었습니다!');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>✉️ 직원 초대 링크 관리</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: '100%',
                padding: '16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '24px'
              }}
            >
              + 새 초대 링크 생성
            </button>
          ) : (
            <div style={{
              background: '#f9fafb',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#374151' }}>새 초대 링크 설정</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4b5563' }}>
                  유효 기간 (일)
                </label>
                <input
                  type="number"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                  min="1"
                  max="365"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#4b5563' }}>
                  최대 사용 횟수 (선택사항)
                </label>
                <input
                  type="number"
                  value={formData.maxUses || ''}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="무제한"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                  비워두면 무제한 사용 가능합니다
                </small>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleCreateInvite}
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: creating ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: creating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {creating ? '생성 중...' : '생성하기'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={creating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'white',
                    color: '#6b7280',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: creating ? 'not-allowed' : 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p>로딩 중...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <p>생성된 초대 링크가 없습니다.</p>
            </div>
          ) : (
            <div>
              <h3 style={{ marginBottom: '16px', color: '#374151' }}>생성된 초대 링크</h3>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    background: inv.is_active && !inv.isExpired && !inv.isMaxed ? '#f0fdf4' : '#f3f4f6',
                    border: `2px solid ${inv.is_active && !inv.isExpired && !inv.isMaxed ? '#86efac' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                          background: inv.is_active && !inv.isExpired && !inv.isMaxed ? '#22c55e' : '#9ca3af',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {inv.is_active && !inv.isExpired && !inv.isMaxed ? '✓ 활성' : '✕ 비활성'}
                        </span>
                        {inv.isExpired && (
                          <span style={{
                            background: '#ef4444',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            만료됨
                          </span>
                        )}
                        {inv.isMaxed && (
                          <span style={{
                            background: '#f59e0b',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            사용 완료
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        생성일: {new Date(inv.created_at).toLocaleDateString('ko-KR')}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        만료일: {new Date(inv.expires_at).toLocaleDateString('ko-KR')}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        사용 횟수: {inv.uses_count} {inv.max_uses ? `/ ${inv.max_uses}` : '/ 무제한'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    wordBreak: 'break-all',
                    marginBottom: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {inv.inviteUrl}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => copyToClipboard(inv.inviteUrl)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      📋 링크 복사
                    </button>
                    {inv.is_active && !inv.isExpired && !inv.isMaxed && (
                      <button
                        onClick={() => handleDeleteInvite(inv.token)}
                        style={{
                          padding: '10px 20px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        비활성화
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeeInviteManager;
