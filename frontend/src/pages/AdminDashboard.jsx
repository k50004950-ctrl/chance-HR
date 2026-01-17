import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { workplaceAPI, authAPI } from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('owners');
  const [workplaces, setWorkplaces] = useState([]);
  const [owners, setOwners] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    loadWorkplaces();
    loadOwners();
  }, []);

  const handleToggleOwnerStatus = async (ownerId, ownerName) => {
    const owner = owners.find((item) => item.id === ownerId);
    const action = owner?.approval_status === 'approved' ? '일시 중지' : '활성화';

    if (!window.confirm(`${ownerName} 사업주를 ${action}하시겠습니까?`)) return;

    try {
      const response = await authAPI.toggleOwnerStatus(ownerId);
      setMessage({ type: 'success', text: response.data.message });
      loadOwners();
    } catch (error) {
      console.error('상태 변경 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '상태 변경 중 오류가 발생했습니다.' });
    }
  };

  const handleDeleteOwner = async (ownerId, ownerName) => {
    if (!window.confirm(`${ownerName} 사업주 계정을 삭제하면 해당 사업장의 직원/급여/출퇴근 데이터가 모두 삭제됩니다.\n정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await authAPI.deleteOwner(ownerId);
      setMessage({ type: 'success', text: response.data.message });
      loadOwners();
      loadWorkplaces();
    } catch (error) {
      console.error('사업주 삭제 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '사업주 삭제 중 오류가 발생했습니다.' });
    }
  };


  const loadWorkplaces = async () => {
    try {
      const response = await workplaceAPI.getAll();
      setWorkplaces(response.data);
    } catch (error) {
      console.error('사업장 조회 오류:', error);
    }
  };

  const loadOwners = async () => {
    try {
      const response = await authAPI.getOwners();
      setOwners(response.data);
    } catch (error) {
      console.error('사업주 조회 오류:', error);
    }
  };


  const openModal = (type, data = null) => {
    setModalType(type);
    setSelectedOwner(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOwner(null);
  };

  const getOwnerWorkplaces = (ownerId) =>
    workplaces.filter((workplace) => workplace.owner_id === ownerId);

  const handleRefresh = () => {
    loadOwners();
    loadWorkplaces();
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetUsername || !resetPassword) {
      setMessage({ type: 'error', text: '사용자명과 새 비밀번호를 입력해주세요.' });
      return;
    }

    try {
      setResetLoading(true);
      const response = await authAPI.resetPassword({
        username: resetUsername,
        newPassword: resetPassword
      });
      setMessage({ type: 'success', text: response.data.message });
      setResetUsername('');
      setResetPassword('');
    } catch (error) {
      console.error('비밀번호 초기화 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '비밀번호 초기화에 실패했습니다.' });
    } finally {
      setResetLoading(false);
    }
  };


  const ownerCollator = new Intl.Collator('ko-KR', { sensitivity: 'base' });
  const normalizedSearch = ownerSearch.trim().toLowerCase();
  const filteredOwners = owners
    .filter((owner) => {
      if (!normalizedSearch) return true;
      const fields = [
        owner.name,
        owner.business_name,
        owner.username,
        owner.phone,
        owner.email,
        owner.sales_rep
      ];
      return fields.some((value) =>
        (value ?? '').toString().toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((a, b) => {
      const nameCompare = ownerCollator.compare(a.name || '', b.name || '');
      if (nameCompare !== 0) return nameCompare;
      return ownerCollator.compare(a.business_name || '', b.business_name || '');
    });

  return (
    <div>
      <Header />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#374151' }}>관리자 대시보드</h2>
          <button className="btn btn-secondary" onClick={handleRefresh}>
            ↻ 새로고침
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {/* 탭 메뉴 */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'owners' ? 'active' : ''}`}
            onClick={() => setActiveTab('owners')}
          >
            사업주 목록
          </button>
          <button
            className={`nav-tab ${activeTab === 'workplaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('workplaces')}
          >
            사업장 목록
          </button>
        </div>

        {/* 사업장 관리 */}
        {activeTab === 'workplaces' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#374151' }}>사업장 목록</h3>
            </div>

            {workplaces.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                등록된 사업장이 없습니다.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>사업장명</th>
                      <th>주소</th>
                      <th>사업주</th>
                      <th>직원 수</th>
                      <th>위도</th>
                      <th>경도</th>
                      <th>반경(m)</th>
                      <th>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workplaces.map((workplace) => (
                      <tr key={workplace.id}>
                        <td style={{ fontWeight: '600' }}>{workplace.name}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {workplace.address}
                        </td>
                        <td>
                          {workplace.owner_name ? (
                            <div>
                              <div style={{ fontWeight: '600' }}>{workplace.owner_name}</div>
                              {workplace.owner_phone && (
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{workplace.owner_phone}</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#6b7280' }}>미할당</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: workplace.employee_count > 0 ? '#dbeafe' : '#f3f4f6',
                            color: workplace.employee_count > 0 ? '#1e40af' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {workplace.employee_count}명
                          </span>
                        </td>
                        <td>{workplace.latitude}</td>
                        <td>{workplace.longitude}</td>
                        <td>{workplace.radius}</td>
                        <td>{new Date(workplace.created_at).toLocaleDateString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {/* 사업주 관리 */}
        {activeTab === 'owners' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: '#374151' }}>사업주 목록</h3>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="이름/상호/사용자명/전화/이메일/영업사원 검색"
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                style={{ maxWidth: '320px' }}
              />
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc' }}>
              <h4 style={{ margin: '0 0 12px', color: '#374151' }}>비밀번호 초기화</h4>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="사용자명"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  style={{ minWidth: '180px' }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="새 비밀번호"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  style={{ minWidth: '180px' }}
                />
                <button className="btn btn-primary" type="submit" disabled={resetLoading}>
                  {resetLoading ? '처리 중...' : '초기화'}
                </button>
              </form>
              <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                💡 관리자 전용 기능입니다. 사용자명을 정확히 입력해주세요.
              </small>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              사업주를 등록하면 해당 사업주가 자신의 사업장과 직원을 관리할 수 있습니다.
            </p>

            {filteredOwners.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                {owners.length === 0 ? '등록된 사업주가 없습니다.' : '검색 결과가 없습니다.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>상호</th>
                      <th>사용자명</th>
                      <th>전화번호</th>
                      <th>이메일</th>
                      <th>담당 영업사원</th>
                      <th>관리 사업장</th>
                      <th>직원 수</th>
                      <th>상태</th>
                      <th>등록일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOwners.map((owner) => (
                      <tr key={owner.id}>
                        <td style={{ fontWeight: '600' }}>
                          <button
                            type="button"
                            onClick={() => openModal('owner-view', owner)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            {owner.name}
                          </button>
                        </td>
                        <td>{owner.business_name || '-'}</td>
                        <td>{owner.username}</td>
                        <td>{owner.phone || '-'}</td>
                        <td>{owner.email || '-'}</td>
                        <td>{owner.sales_rep || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: owner.workplace_count > 0 ? '#dbeafe' : '#f3f4f6',
                            color: owner.workplace_count > 0 ? '#1e40af' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {owner.workplace_count}개
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: owner.employee_count > 0 ? '#dcfce7' : '#f3f4f6',
                            color: owner.employee_count > 0 ? '#166534' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {owner.employee_count || 0}명
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '12px',
                            background: 
                              owner.approval_status === 'approved' ? '#d1fae5' :
                              owner.approval_status === 'suspended' ? '#fee2e2' :
                              owner.approval_status === 'pending' ? '#fef3c7' :
                              '#f3f4f6',
                            color:
                              owner.approval_status === 'approved' ? '#065f46' :
                              owner.approval_status === 'suspended' ? '#991b1b' :
                              owner.approval_status === 'pending' ? '#92400e' :
                              '#6b7280'
                          }}>
                            {owner.approval_status === 'approved' ? '활성' :
                             owner.approval_status === 'suspended' ? '중지' :
                             owner.approval_status === 'pending' ? '대기' :
                             '거부'}
                          </span>
                        </td>
                        <td>{new Date(owner.created_at).toLocaleDateString('ko-KR')}</td>
                        <td>
                          {owner.approval_status === 'approved' && (
                            <button
                              className="btn btn-sm"
                              style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '6px 12px',
                                border: '1px solid #fecaca'
                              }}
                              onClick={() => handleToggleOwnerStatus(owner.id, owner.name)}
                            >
                              ⏸️ 일시 중지
                            </button>
                          )}
                          {owner.approval_status === 'suspended' && (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ padding: '6px 12px' }}
                              onClick={() => handleToggleOwnerStatus(owner.id, owner.name)}
                            >
                              ▶️ 활성화
                            </button>
                          )}
                          <button
                            className="btn btn-sm"
                            style={{
                              background: '#fff1f2',
                              color: '#be123c',
                              padding: '6px 12px',
                              border: '1px solid #fecdd3',
                              marginLeft: '8px'
                            }}
                            onClick={() => handleDeleteOwner(owner.id, owner.name)}
                          >
                            🗑️ 삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && modalType === 'owner-view' && selectedOwner && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              사업주 정보
            </div>
            <div className="form-group">
              <label className="form-label">대표자 이름</label>
              <div>{selectedOwner.name}</div>
            </div>
            <div className="form-group">
              <label className="form-label">상호</label>
              <div>{selectedOwner.business_name || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">사업자등록번호</label>
              <div>{selectedOwner.business_number || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">담당 영업사원</label>
              <div>{selectedOwner.sales_rep || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">전화번호</label>
              <div>{selectedOwner.phone || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <div>{selectedOwner.email || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">주소</label>
              <div>{selectedOwner.address || '-'}</div>
            </div>
            {selectedOwner.additional_info && (
              <div className="form-group">
                <label className="form-label">기타 정보</label>
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedOwner.additional_info}</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">사업장 정보</label>
              {getOwnerWorkplaces(selectedOwner.id).length === 0 ? (
                <div>등록된 사업장이 없습니다.</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {getOwnerWorkplaces(selectedOwner.id).map((workplace) => (
                    <div
                      key={workplace.id}
                      style={{
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>{workplace.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{workplace.address}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        위도 {workplace.latitude} / 경도 {workplace.longitude} / 반경 {workplace.radius}m
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">직원 수</label>
              <div>{selectedOwner.employee_count || 0}명</div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
