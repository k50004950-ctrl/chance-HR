import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { workplaceAPI, employeeAPI, attendanceAPI, authAPI } from '../services/api';
import { searchAddress, getCoordinatesFromAddress, getCurrentPosition, getGoogleMapsLink } from '../utils/addressSearch';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [workplaces, setWorkplaces] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadWorkplaces();
    loadOwners();
    loadPendingOwners();
  }, []);

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

  const loadPendingOwners = async () => {
    try {
      const response = await authAPI.getPendingOwners();
      setPendingOwners(response.data);
    } catch (error) {
      console.error('승인 대기 목록 조회 오류:', error);
    }
  };

  const handleApproveOwner = async (ownerId, action) => {
    if (!window.confirm(action === 'approve' ? '승인하시겠습니까?' : '거부하시겠습니까?')) return;

    try {
      await authAPI.approveOwner(ownerId, action);
      setMessage({ 
        type: 'success', 
        text: action === 'approve' ? '승인되었습니다.' : '거부되었습니다.' 
      });
      loadPendingOwners();
      loadOwners();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || '오류가 발생했습니다.' });
    }
  };

  const handleToggleOwnerStatus = async (ownerId, ownerName) => {
    const owner = owners.find(o => o.id === ownerId);
    const action = owner.approval_status === 'approved' ? '일시 중지' : '활성화';
    
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

  const openModal = (type, data = {}) => {
    setModalType(type);
    setFormData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({});
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 주소 검색 기능
  const handleSearchAddress = async () => {
    try {
      const result = await searchAddress();
      setFormData({
        ...formData,
        address: result.address
      });
      
      // 주소로 좌표 찾기
      setMessage({ type: 'info', text: '좌표를 검색하는 중...' });
      const coords = await getCoordinatesFromAddress(result.address);
      
      if (coords.success) {
        setFormData({
          ...formData,
          address: result.address,
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        setMessage({ type: 'success', text: '주소와 좌표가 자동으로 입력되었습니다!' });
      } else {
        setFormData({
          ...formData,
          address: result.address,
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        setMessage({ type: 'info', text: coords.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '주소 검색에 실패했습니다.' });
    }
  };

  // 현재 위치 사용
  const handleUseCurrentLocation = async () => {
    try {
      setMessage({ type: 'info', text: '현재 위치를 가져오는 중...' });
      const position = await getCurrentPosition();
      
      setFormData({
        ...formData,
        latitude: position.latitude,
        longitude: position.longitude
      });
      
      setMessage({ type: 'success', text: `현재 위치가 입력되었습니다. (정확도: ${Math.round(position.accuracy)}m)` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '위치를 가져올 수 없습니다.' });
    }
  };

  const handleSubmitWorkplace = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.id) {
        await workplaceAPI.update(formData.id, formData);
        setMessage({ type: 'success', text: '사업장이 수정되었습니다.' });
      } else {
        await workplaceAPI.create(formData);
        setMessage({ type: 'success', text: '사업장이 등록되었습니다.' });
      }
      closeModal();
      loadWorkplaces();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || '오류가 발생했습니다.' });
    }

    setLoading(false);
  };

  const handleSubmitOwner = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.register({
        ...formData,
        role: 'owner'
      });
      setMessage({ type: 'success', text: '사업주가 등록되었습니다.' });
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || '오류가 발생했습니다.' });
    }

    setLoading(false);
  };

  const handleDeleteWorkplace = async (id) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    try {
      await workplaceAPI.delete(id);
      setMessage({ type: 'success', text: '사업장이 삭제되었습니다.' });
      loadWorkplaces();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || '오류가 발생했습니다.' });
    }
  };

  return (
    <div>
      <Header />
      <div className="container">
        <h2 style={{ marginBottom: '24px', color: '#374151' }}>관리자 대시보드</h2>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {/* 탭 메뉴 */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            🔔 승인 관리 {pendingOwners.length > 0 && `(${pendingOwners.length})`}
          </button>
          <button
            className={`nav-tab ${activeTab === 'workplaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('workplaces')}
          >
            사업장 관리
          </button>
          <button
            className={`nav-tab ${activeTab === 'owners' ? 'active' : ''}`}
            onClick={() => setActiveTab('owners')}
          >
            사업주 관리
          </button>
        </div>

        {/* 승인 관리 */}
        {activeTab === 'pending' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#374151' }}>대표자 승인 대기 목록</h3>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              새로 가입한 대표자를 검토하고 승인 또는 거부하세요.
            </p>

            {pendingOwners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>✅</p>
                <p style={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
                  승인 대기 중인 대표자가 없습니다
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  새로운 가입 신청이 있으면 여기에 표시됩니다
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {pendingOwners.map((owner) => (
                  <div 
                    key={owner.id} 
                    style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      background: 'white',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ color: '#374151', marginBottom: '4px', fontSize: '18px' }}>
                          {owner.business_name}
                        </h4>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                          대표자: {owner.name}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 12px',
                        background: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        승인 대기
                      </span>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '12px',
                      marginBottom: '16px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>사업자등록번호</p>
                        <p style={{ fontWeight: '600', color: '#374151' }}>{owner.business_number}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>전화번호</p>
                        <p style={{ fontWeight: '600', color: '#374151' }}>{owner.phone}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>이메일</p>
                        <p style={{ fontWeight: '600', color: '#374151' }}>{owner.email || '-'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>가입일</p>
                        <p style={{ fontWeight: '600', color: '#374151' }}>
                          {new Date(owner.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>

                    {owner.address && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>주소</p>
                        <p style={{ color: '#374151' }}>{owner.address}</p>
                      </div>
                    )}

                    {owner.additional_info && (
                      <div style={{ marginBottom: '16px', padding: '12px', background: '#fef9e7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                        <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px', fontWeight: '600' }}>기타 정보</p>
                        <p style={{ color: '#78350f', fontSize: '14px' }}>{owner.additional_info}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleApproveOwner(owner.id, 'reject')}
                        style={{ padding: '8px 20px' }}
                      >
                        ❌ 거부
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApproveOwner(owner.id, 'approve')}
                        style={{ padding: '8px 20px' }}
                      >
                        ✅ 승인
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 사업장 관리 */}
        {activeTab === 'workplaces' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#374151' }}>사업장 목록</h3>
              <button
                className="btn btn-primary"
                onClick={() => openModal('workplace')}
              >
                + 사업장 등록
              </button>
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
                      <th>작업</th>
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
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ marginRight: '8px', padding: '6px 12px' }}
                            onClick={() => openModal('workplace', workplace)}
                          >
                            수정
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 12px' }}
                            onClick={() => handleDeleteWorkplace(workplace.id)}
                          >
                            삭제
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

        {/* 사업주 관리 */}
        {activeTab === 'owners' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#374151' }}>사업주 목록</h3>
              <button
                className="btn btn-primary"
                onClick={() => openModal('owner')}
              >
                + 사업주 등록
              </button>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              사업주를 등록하면 해당 사업주가 자신의 사업장과 직원을 관리할 수 있습니다.
            </p>

            {owners.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                등록된 사업주가 없습니다.
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
                      <th>관리 사업장</th>
                      <th>상태</th>
                      <th>등록일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner) => (
                      <tr key={owner.id}>
                        <td style={{ fontWeight: '600' }}>{owner.name}</td>
                        <td>{owner.business_name || '-'}</td>
                        <td>{owner.username}</td>
                        <td>{owner.phone || '-'}</td>
                        <td>{owner.email || '-'}</td>
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
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {modalType === 'workplace' && (formData.id ? '사업장 수정' : '사업장 등록')}
              {modalType === 'owner' && '사업주 등록'}
            </div>

            {modalType === 'workplace' && (
              <form onSubmit={handleSubmitWorkplace}>
                <div className="form-group">
                  <label className="form-label">사업장명 *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">주소 *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      name="address"
                      className="form-input"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      required
                      placeholder="주소 검색 버튼을 클릭하세요"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSearchAddress}
                      style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
                    >
                      🔍 주소 검색
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    주소 검색 버튼을 클릭하면 주소와 좌표가 자동으로 입력됩니다.
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
                      value={formData.latitude || ''}
                      onChange={handleInputChange}
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
                      value={formData.longitude || ''}
                      onChange={handleInputChange}
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
                  >
                    📍 현재 위치 사용
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
                    value={formData.radius || 100}
                    onChange={handleInputChange}
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">사업주</label>
                  <select
                    name="owner_id"
                    className="form-select"
                    value={formData.owner_id || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">사업주 선택 (선택사항)</option>
                    {owners.map(owner => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name} ({owner.username})
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    사업주를 선택하지 않으면 나중에 할당할 수 있습니다.
                  </p>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    취소
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '처리 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'owner' && (
              <form onSubmit={handleSubmitOwner}>
                <div className="form-group">
                  <label className="form-label">사용자명 *</label>
                  <input
                    type="text"
                    name="username"
                    className="form-input"
                    value={formData.username || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">비밀번호 *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-input"
                    value={formData.password || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">이름 *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">전화번호</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">이메일</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    취소
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '처리 중...' : '등록'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
