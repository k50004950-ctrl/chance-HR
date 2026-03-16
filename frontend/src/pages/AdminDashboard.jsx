import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { workplaceAPI, authAPI, announcementsAPI, insuranceAPI, communityAPI, ratesMasterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

const AdminDashboard = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
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
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [insuranceRates, setInsuranceRates] = useState([]);
  const [rateForm, setRateForm] = useState({
    year: new Date().getFullYear(),
    national_pension_rate: 0.0475,
    national_pension_min: 400000,
    national_pension_max: 6370000,
    health_insurance_rate: 0.03595,
    health_insurance_min: 279266,
    health_insurance_max: 127056982,
    long_term_care_rate: 0.1295,
    employment_insurance_rate: 0.009,
    effective_from: '',
    effective_to: '',
    notes: ''
  });
  const [editingRate, setEditingRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState('all'); // all, owner, employee
  
  // 요율 관리 (rates_master)
  const [ratesList, setRatesList] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesForm, setRatesForm] = useState({
    effective_yyyymm: '',
    nps_employee_rate_percent: 4.5,
    nhis_employee_rate_percent: 3.545,
    ltci_rate_of_nhis_percent: 12.95,
    ei_employee_rate_percent: 0.9,
    freelancer_withholding_rate_percent: 3.3,
    memo: ''
  });
  const [editingRatesMonth, setEditingRatesMonth] = useState(null);

  // 계정 관리 상태
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userLoading, setUserLoading] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPwInput, setNewPwInput] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const loadAllUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const res = await authAPI.getAllUsers({ search: userSearch, role: userRoleFilter });
      setAllUsers(res.data.users || []);
    } catch (e) {
      console.error('사용자 목록 로드 오류:', e);
    } finally {
      setUserLoading(false);
    }
  }, [userSearch, userRoleFilter]);

  useEffect(() => {
    if (activeTab === 'accounts') loadAllUsers();
  }, [activeTab, loadAllUsers]);

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`⚠️ [${user.username}] ${user.name} 계정을 완전 삭제하시겠습니까?\n\n모든 출퇴근, 급여 데이터가 함께 삭제됩니다.`)) return;
    try {
      await authAPI.deleteUser(user.id);
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      setMessage({ type: 'success', text: `${user.username} 계정이 삭제되었습니다.` });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || '삭제에 실패했습니다.' });
    }
  };

  const handleResetUserPassword = async () => {
    if (!newPwInput || newPwInput.length < 4) { alert('비밀번호를 4자 이상 입력해주세요.'); return; }
    try {
      await authAPI.adminResetUserPassword({ userId: resetTargetUser.id, newPassword: newPwInput });
      alert(`${resetTargetUser.username} 비밀번호가 초기화되었습니다.`);
      setShowResetModal(false);
      setNewPwInput('');
      setResetTargetUser(null);
    } catch (e) {
      alert(e.response?.data?.message || '초기화에 실패했습니다.');
    }
  };

  useEffect(() => {
    loadWorkplaces();
    loadOwners();
    loadAnnouncements();
    loadInsuranceRates();
    loadRatesList();
  }, []);

  useEffect(() => {
    if (activeTab === 'community' && isSuperAdmin) {
      loadCommunityPosts();
    }
  }, [activeTab, communityFilter]);

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

  const handleDeleteOwner = async (ownerId, ownerName, ownerRole = '사업주') => {
    const roleText = ownerRole === 'employee' ? '직원' : 
                     ownerRole === 'owner' ? '사업주' : '사용자';
    
    if (!window.confirm(`⚠️ ${ownerName} ${roleText} 계정을 완전히 삭제하시겠습니까?\n\n다음 데이터가 모두 삭제됩니다:\n- 출퇴근 기록\n- 급여 정보\n- 급여 명세서\n- 직원 상세정보\n${ownerRole === 'owner' ? '- 소유한 사업장 및 모든 직원 데이터\n' : ''}\n⚠️ 이 작업은 되돌릴 수 없습니다!`)) {
      return;
    }

    // 추가 확인
    if (!window.confirm(`정말로 "${ownerName}" 계정을 삭제하시겠습니까?\n마지막 확인입니다.`)) {
      return;
    }

    try {
      const response = await authAPI.deleteUser(ownerId);
      setMessage({ type: 'success', text: response.data.message || '계정이 완전히 삭제되었습니다.' });
      loadOwners();
      loadWorkplaces();
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '계정 삭제 중 오류가 발생했습니다.' });
    }
  };


  const loadWorkplaces = async () => {
    try {
      const response = await workplaceAPI.getAll();
      setWorkplaces(response.data.data || response.data);
    } catch (error) {
      console.error('사업장 조회 오류:', error);
    }
  };

  const loadOwners = async () => {
    try {
      const response = await authAPI.getOwners();
      setOwners(response.data.data || response.data);
    } catch (error) {
      console.error('사업주 조회 오류:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getAll();
      setAnnouncements(response.data.data || response.data);
    } catch (error) {
      console.error('공지사항 조회 오류:', error);
    }
  };

  const loadInsuranceRates = async () => {
    try {
      const response = await insuranceAPI.getAll();
      setInsuranceRates(response.data);
    } catch (error) {
      console.error('보험 요율 조회 오류:', error);
    }
  };

  const handleCreateRate = async (e) => {
    e.preventDefault();
    if (!rateForm.effective_from) {
      setMessage({ type: 'error', text: '적용 시작일을 입력해주세요.' });
      return;
    }

    try {
      setRateLoading(true);
      await insuranceAPI.create(rateForm);
      setMessage({ type: 'success', text: '보험 요율이 등록되었습니다.' });
      loadInsuranceRates();
      setRateForm({
        year: new Date().getFullYear(),
        national_pension_rate: 0.0475,
        national_pension_min: 400000,
        national_pension_max: 6370000,
        health_insurance_rate: 0.03595,
        health_insurance_min: 279266,
        health_insurance_max: 127056982,
        long_term_care_rate: 0.1295,
        employment_insurance_rate: 0.009,
        effective_from: '',
        effective_to: '',
        notes: ''
      });
    } catch (error) {
      console.error('보험 요율 생성 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '보험 요율 등록 중 오류가 발생했습니다.' });
    } finally {
      setRateLoading(false);
    }
  };

  const handleUpdateRate = async (e) => {
    e.preventDefault();
    if (!editingRate) return;

    try {
      setRateLoading(true);
      await insuranceAPI.update(editingRate.id, rateForm);
      setMessage({ type: 'success', text: '보험 요율이 수정되었습니다.' });
      loadInsuranceRates();
      setEditingRate(null);
      setRateForm({
        year: new Date().getFullYear(),
        national_pension_rate: 0.0475,
        national_pension_min: 400000,
        national_pension_max: 6370000,
        health_insurance_rate: 0.03595,
        health_insurance_min: 279266,
        health_insurance_max: 127056982,
        long_term_care_rate: 0.1295,
        employment_insurance_rate: 0.009,
        effective_from: '',
        effective_to: '',
        notes: ''
      });
    } catch (error) {
      console.error('보험 요율 수정 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '보험 요율 수정 중 오류가 발생했습니다.' });
    } finally {
      setRateLoading(false);
    }
  };

  const handleDeleteRate = async (id) => {
    if (!window.confirm('이 보험 요율을 삭제하시겠습니까?')) return;

    try {
      await insuranceAPI.delete(id);
      setMessage({ type: 'success', text: '보험 요율이 삭제되었습니다.' });
      loadInsuranceRates();
    } catch (error) {
      console.error('보험 요율 삭제 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '보험 요율 삭제 중 오류가 발생했습니다.' });
    }
  };

  const handleEditRate = (rate) => {
    setEditingRate(rate);
    setRateForm({
      year: rate.year,
      national_pension_rate: rate.national_pension_rate,
      national_pension_min: rate.national_pension_min,
      national_pension_max: rate.national_pension_max,
      health_insurance_rate: rate.health_insurance_rate,
      health_insurance_min: rate.health_insurance_min,
      health_insurance_max: rate.health_insurance_max,
      long_term_care_rate: rate.long_term_care_rate,
      employment_insurance_rate: rate.employment_insurance_rate,
      effective_from: rate.effective_from,
      effective_to: rate.effective_to || '',
      notes: rate.notes || ''
    });
    setActiveTab('insurance');
  };

  const loadCommunityPosts = async () => {
    try {
      setCommunityLoading(true);
      const response = await communityAPI.getPosts(communityFilter === 'all' ? null : communityFilter);
      setCommunityPosts(response.data);
    } catch (error) {
      console.error('커뮤니티 게시글 로드 오류:', error);
      setMessage({ type: 'error', text: '게시글을 불러오는데 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  const handleDeleteCommunityPost = async (postId) => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;

    try {
      setCommunityLoading(true);
      await communityAPI.deletePost(postId);
      setMessage({ type: 'success', text: '게시글이 삭제되었습니다.' });
      loadCommunityPosts();
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '게시글 삭제에 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) {
      setMessage({ type: 'error', text: '제목과 내용을 모두 입력해주세요.' });
      return;
    }

    try {
      setAnnouncementLoading(true);
      await announcementsAPI.create(announcementForm);
      setMessage({ type: 'success', text: '공지사항이 생성되었습니다.' });
      setAnnouncementForm({ title: '', content: '' });
      loadAnnouncements();
    } catch (error) {
      console.error('공지사항 생성 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '공지사항 생성에 실패했습니다.' });
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('이 공지사항을 삭제하시겠습니까?')) return;

    try {
      await announcementsAPI.delete(id);
      setMessage({ type: 'success', text: '공지사항이 삭제되었습니다.' });
      loadAnnouncements();
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    }
  };

  const handleDeactivateAnnouncement = async (id) => {
    try {
      await announcementsAPI.deactivate(id);
      setMessage({ type: 'success', text: '공지사항이 비활성화되었습니다.' });
      loadAnnouncements();
    } catch (error) {
      console.error('공지사항 비활성화 오류:', error);
      setMessage({ type: 'error', text: '비활성화에 실패했습니다.' });
    }
  };

  // 요율 관리 함수들
  const loadRatesList = async () => {
    try {
      setRatesLoading(true);
      const response = await ratesMasterAPI.getList();
      setRatesList(response.data || []);
    } catch (error) {
      console.error('요율 목록 로드 오류:', error);
      setMessage({ type: 'error', text: '요율 목록을 불러오는데 실패했습니다.' });
    } finally {
      setRatesLoading(false);
    }
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    
    if (!ratesForm.effective_yyyymm || !/^\d{6}$/.test(ratesForm.effective_yyyymm)) {
      setMessage({ type: 'error', text: '적용 시작월을 YYYYMM 형식으로 입력해주세요 (예: 202601)' });
      return;
    }
    
    try {
      setRatesLoading(true);
      await ratesMasterAPI.save(ratesForm);
      setMessage({ type: 'success', text: editingRatesMonth ? '요율이 수정되었습니다.' : '요율이 등록되었습니다.' });
      setRatesForm({
        effective_yyyymm: '',
        nps_employee_rate_percent: 4.5,
        nhis_employee_rate_percent: 3.545,
        ltci_rate_of_nhis_percent: 12.95,
        ei_employee_rate_percent: 0.9,
        freelancer_withholding_rate_percent: 3.3,
        memo: ''
      });
      setEditingRatesMonth(null);
      loadRatesList();
    } catch (error) {
      console.error('요율 저장 오류:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = error.response?.data?.message || '요율 저장에 실패했습니다.';
      if (error.response?.data?.detail) {
        errorMessage += ` (상세: ${error.response.data.detail})`;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setRatesLoading(false);
    }
  };

  const handleEditRates = (rate) => {
    setRatesForm({
      effective_yyyymm: rate.effective_yyyymm,
      nps_employee_rate_percent: parseFloat(rate.nps_employee_rate_percent),
      nhis_employee_rate_percent: parseFloat(rate.nhis_employee_rate_percent),
      ltci_rate_of_nhis_percent: parseFloat(rate.ltci_rate_of_nhis_percent),
      ei_employee_rate_percent: parseFloat(rate.ei_employee_rate_percent),
      freelancer_withholding_rate_percent: parseFloat(rate.freelancer_withholding_rate_percent),
      memo: rate.memo || ''
    });
    setEditingRatesMonth(rate.effective_yyyymm);
  };

  const handleDeleteRates = async (yyyymm) => {
    if (!window.confirm(`${yyyymm} 요율을 삭제하시겠습니까?`)) return;
    
    try {
      setRatesLoading(true);
      await ratesMasterAPI.delete(yyyymm);
      setMessage({ type: 'success', text: '요율이 삭제되었습니다.' });
      loadRatesList();
    } catch (error) {
      console.error('요율 삭제 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '요율 삭제에 실패했습니다.' });
    } finally {
      setRatesLoading(false);
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
      // 등록일 기준 최신순 (내림차순)
      return new Date(b.created_at) - new Date(a.created_at);
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
          {isSuperAdmin && (
            <>
              <button
                className={`nav-tab ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounts')}
                style={{ background: activeTab === 'accounts' ? '#dc2626' : '', color: activeTab === 'accounts' ? 'white' : '' }}
              >
                👥 계정 관리
              </button>
              <button
                className={`nav-tab ${activeTab === 'rates' ? 'active' : ''}`}
                onClick={() => setActiveTab('rates')}
              >
                💼 요율 관리
              </button>
              <button
                className={`nav-tab ${activeTab === 'insurance' ? 'active' : ''}`}
                onClick={() => setActiveTab('insurance')}
                style={{ fontSize: '11px', opacity: 0.6 }}
              >
                (구)4대보험
              </button>
              <button
                className={`nav-tab ${activeTab === 'announcements' ? 'active' : ''}`}
                onClick={() => setActiveTab('announcements')}
              >
                📢 공지사항
              </button>
              <button
                className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
                onClick={() => setActiveTab('community')}
              >
                💬 커뮤니티
              </button>
            </>
          )}
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
                placeholder="이름/상호/사용자명/전화/이메일/추천인 검색"
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
                <table className="table" style={{ minWidth: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '80px' }}>이름</th>
                      <th style={{ minWidth: '120px' }}>상호</th>
                      <th style={{ minWidth: '100px' }}>사용자명</th>
                      <th style={{ minWidth: '110px' }}>전화번호</th>
                      <th style={{ minWidth: '150px' }}>이메일</th>
                      <th style={{ minWidth: '80px' }}>추천인</th>
                      <th style={{ minWidth: '100px' }}>세무사</th>
                      <th style={{ minWidth: '80px', textAlign: 'center' }}>동의</th>
                      <th style={{ minWidth: '80px', textAlign: 'center' }}>사업장</th>
                      <th style={{ minWidth: '70px', textAlign: 'center' }}>직원</th>
                      <th style={{ minWidth: '70px', textAlign: 'center' }}>상태</th>
                      <th style={{ minWidth: '100px' }}>등록일</th>
                      <th style={{ minWidth: '220px', width: '220px' }}>작업</th>
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
                        <td>{owner.tax_office_name || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: owner.service_consent ? '#d1fae5' : '#fee2e2',
                            color: owner.service_consent ? '#065f46' : '#991b1b',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {owner.service_consent ? '동의' : '미동의'}
                          </span>
                        </td>
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
                        <td style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>
                          {owner.approval_status === 'approved' && (
                            <button
                              className="btn btn-sm"
                              style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '5px 10px',
                                border: '1px solid #fecaca',
                                fontSize: '13px'
                              }}
                              onClick={() => handleToggleOwnerStatus(owner.id, owner.name)}
                            >
                              ⏸️ 중지
                            </button>
                          )}
                          {owner.approval_status === 'suspended' && (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ padding: '5px 10px', fontSize: '13px' }}
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
                              padding: '5px 10px',
                              border: '1px solid #fecdd3',
                              marginLeft: '6px',
                              fontSize: '13px'
                            }}
                            onClick={() => handleDeleteOwner(owner.id, owner.name, owner.role)}
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

        {/* 요율 관리 (간소화 버전) */}
        {activeTab === 'rates' && isSuperAdmin && (
          <div>
            {/* 요율 등록/수정 폼 */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💼</span>
                <span>{editingRatesMonth ? '요율 수정' : '요율 등록'}</span>
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                귀속월(YYYY-MM) 기준으로 4대보험/3.3% 요율을 등록합니다. 급여 계산 시 해당 귀속월에 맞는 요율이 자동으로 적용됩니다.
              </p>
              
              <form onSubmit={handleSaveRates}>
                <div className="grid grid-2" style={{ gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      적용 시작월 * <span style={{ color: '#6b7280', fontSize: '12px' }}>(예: 202601)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={ratesForm.effective_yyyymm}
                      onChange={(e) => setRatesForm({ ...ratesForm, effective_yyyymm: e.target.value })}
                      placeholder="YYYYMM (예: 202601)"
                      pattern="\d{6}"
                      required
                      disabled={editingRatesMonth}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">프리랜서 원천징수율 (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={ratesForm.freelancer_withholding_rate_percent}
                      onChange={(e) => setRatesForm({ ...ratesForm, freelancer_withholding_rate_percent: parseFloat(e.target.value) })}
                      step="0.001"
                      required
                    />
                  </div>
                </div>

                <h4 style={{ marginBottom: '12px', color: '#374151', fontSize: '15px', fontWeight: '600' }}>
                  4대보험 근로자 부담률 (%)
                </h4>
                <div className="grid grid-2" style={{ gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">국민연금 (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={ratesForm.nps_employee_rate_percent}
                      onChange={(e) => setRatesForm({ ...ratesForm, nps_employee_rate_percent: parseFloat(e.target.value) })}
                      step="0.001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">건강보험 (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={ratesForm.nhis_employee_rate_percent}
                      onChange={(e) => setRatesForm({ ...ratesForm, nhis_employee_rate_percent: parseFloat(e.target.value) })}
                      step="0.001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      장기요양 (%) <span style={{ color: '#6b7280', fontSize: '12px' }}>건강보험료의 %</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={ratesForm.ltci_rate_of_nhis_percent}
                      onChange={(e) => setRatesForm({ ...ratesForm, ltci_rate_of_nhis_percent: parseFloat(e.target.value) })}
                      step="0.001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">고용보험 (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={ratesForm.ei_employee_rate_percent}
                      onChange={(e) => setRatesForm({ ...ratesForm, ei_employee_rate_percent: parseFloat(e.target.value) })}
                      step="0.001"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">메모</label>
                  <textarea
                    className="form-input"
                    value={ratesForm.memo}
                    onChange={(e) => setRatesForm({ ...ratesForm, memo: e.target.value })}
                    placeholder="요율 변경 사유 등"
                    rows="2"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingRatesMonth && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setRatesForm({
                          effective_yyyymm: '',
                          nps_employee_rate_percent: 4.5,
                          nhis_employee_rate_percent: 3.545,
                          ltci_rate_of_nhis_percent: 12.95,
                          ei_employee_rate_percent: 0.9,
                          freelancer_withholding_rate_percent: 3.3,
                          memo: ''
                        });
                        setEditingRatesMonth(null);
                      }}
                    >
                      취소
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={ratesLoading}
                  >
                    {ratesLoading ? '처리 중...' : (editingRatesMonth ? '✅ 수정' : '✅ 등록')}
                  </button>
                </div>
              </form>
            </div>

            {/* 요율 목록 */}
            <div className="card">
              <h3 style={{ color: '#374151', marginBottom: '16px' }}>등록된 요율 목록</h3>
              {ratesLoading ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                  로딩 중...
                </p>
              ) : ratesList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                  등록된 요율이 없습니다.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>적용 시작월</th>
                        <th>국민연금(%)</th>
                        <th>건강보험(%)</th>
                        <th>장기요양(%)</th>
                        <th>고용보험(%)</th>
                        <th>3.3%(%)</th>
                        <th>메모</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratesList.map((rate) => (
                        <tr key={rate.id}>
                          <td style={{ fontWeight: '600' }}>
                            {rate.effective_yyyymm.slice(0, 4)}-{rate.effective_yyyymm.slice(4, 6)}
                          </td>
                          <td>{parseFloat(rate.nps_employee_rate_percent).toFixed(3)}</td>
                          <td>{parseFloat(rate.nhis_employee_rate_percent).toFixed(3)}</td>
                          <td>{parseFloat(rate.ltci_rate_of_nhis_percent).toFixed(3)}</td>
                          <td>{parseFloat(rate.ei_employee_rate_percent).toFixed(3)}</td>
                          <td>{parseFloat(rate.freelancer_withholding_rate_percent).toFixed(3)}</td>
                          <td style={{ fontSize: '12px', color: '#6b7280' }}>{rate.memo || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '12px', padding: '4px 12px' }}
                                onClick={() => handleEditRates(rate)}
                              >
                                수정
                              </button>
                              <button
                                className="btn"
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '4px 12px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none'
                                }}
                                onClick={() => handleDeleteRates(rate.effective_yyyymm)}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4대보험 요율 관리 */}
        {activeTab === 'insurance' && isSuperAdmin && (
          <div>
            {/* 보험 요율 등록/수정 폼 */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '16px' }}>
                💼 {editingRate ? '보험 요율 수정' : '보험 요율 등록'}
              </h3>
              <form onSubmit={editingRate ? handleUpdateRate : handleCreateRate}>
                <div className="grid grid-2" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">적용 연도 *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.year}
                      onChange={(e) => setRateForm({ ...rateForm, year: parseInt(e.target.value) })}
                      required
                      min="2020"
                      max="2099"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">적용 시작일 *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={rateForm.effective_from}
                      onChange={(e) => setRateForm({ ...rateForm, effective_from: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>
                  🏥 국민연금
                </h4>
                <div className="grid grid-3" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">요율 (%) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.national_pension_rate * 100}
                      onChange={(e) => setRateForm({ ...rateForm, national_pension_rate: parseFloat(e.target.value) / 100 })}
                      step="0.01"
                      required
                      placeholder="4.75"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">하한액 (원)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.national_pension_min}
                      onChange={(e) => setRateForm({ ...rateForm, national_pension_min: parseInt(e.target.value) })}
                      placeholder="400000"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">상한액 (원)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.national_pension_max}
                      onChange={(e) => setRateForm({ ...rateForm, national_pension_max: parseInt(e.target.value) })}
                      placeholder="6370000"
                    />
                  </div>
                </div>

                <h4 style={{ marginTop: '24px', marginBottom: '12px', color: '#374151', fontSize: '16px' }}>
                  🏥 건강보험
                </h4>
                <div className="grid grid-3" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">요율 (%) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.health_insurance_rate * 100}
                      onChange={(e) => setRateForm({ ...rateForm, health_insurance_rate: parseFloat(e.target.value) / 100 })}
                      step="0.001"
                      required
                      placeholder="3.595"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">하한액 (원)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.health_insurance_min}
                      onChange={(e) => setRateForm({ ...rateForm, health_insurance_min: parseInt(e.target.value) })}
                      placeholder="279266"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">상한액 (원)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.health_insurance_max}
                      onChange={(e) => setRateForm({ ...rateForm, health_insurance_max: parseInt(e.target.value) })}
                      placeholder="127056982"
                    />
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: '16px', marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">장기요양보험 요율 (%) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.long_term_care_rate * 100}
                      onChange={(e) => setRateForm({ ...rateForm, long_term_care_rate: parseFloat(e.target.value) / 100 })}
                      step="0.01"
                      required
                      placeholder="12.95"
                    />
                    <small style={{ color: '#6b7280', fontSize: '12px' }}>건강보험료의 비율</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">고용보험 요율 (%) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={rateForm.employment_insurance_rate * 100}
                      onChange={(e) => setRateForm({ ...rateForm, employment_insurance_rate: parseFloat(e.target.value) / 100 })}
                      step="0.01"
                      required
                      placeholder="0.9"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">적용 종료일</label>
                  <input
                    type="date"
                    className="form-input"
                    value={rateForm.effective_to}
                    onChange={(e) => setRateForm({ ...rateForm, effective_to: e.target.value })}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>비워두면 무기한 적용</small>
                </div>

                <div className="form-group">
                  <label className="form-label">비고</label>
                  <textarea
                    className="form-input"
                    value={rateForm.notes}
                    onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                    placeholder="요율 변경 사유 등 메모"
                    rows="3"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  {editingRate && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingRate(null);
                        setRateForm({
                          year: new Date().getFullYear(),
                          national_pension_rate: 0.0475,
                          national_pension_min: 400000,
                          national_pension_max: 6370000,
                          health_insurance_rate: 0.03595,
                          health_insurance_min: 279266,
                          health_insurance_max: 127056982,
                          long_term_care_rate: 0.1295,
                          employment_insurance_rate: 0.009,
                          effective_from: '',
                          effective_to: '',
                          notes: ''
                        });
                      }}
                    >
                      취소
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={rateLoading}
                  >
                    {rateLoading ? '처리 중...' : (editingRate ? '✅ 수정' : '✅ 등록')}
                  </button>
                </div>
              </form>
            </div>

            {/* 보험 요율 목록 */}
            <div className="card">
              <h3 style={{ color: '#374151', marginBottom: '16px' }}>보험 요율 이력</h3>
              {insuranceRates.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                  등록된 보험 요율이 없습니다.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>연도</th>
                        <th>국민연금</th>
                        <th>건강보험</th>
                        <th>장기요양</th>
                        <th>고용보험</th>
                        <th>적용 시작일</th>
                        <th>적용 종료일</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuranceRates.map((rate) => (
                        <tr key={rate.id}>
                          <td>{rate.year}년</td>
                          <td>{(rate.national_pension_rate * 100).toFixed(2)}%</td>
                          <td>{(rate.health_insurance_rate * 100).toFixed(3)}%</td>
                          <td>{(rate.long_term_care_rate * 100).toFixed(2)}%</td>
                          <td>{(rate.employment_insurance_rate * 100).toFixed(2)}%</td>
                          <td>{rate.effective_from}</td>
                          <td>{rate.effective_to || '무기한'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleEditRate(rate)}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                ✏️ 수정
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteRate(rate.id)}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                🗑️ 삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 공지사항 관리 */}
        {activeTab === 'announcements' && isSuperAdmin && (
          <div>
            {/* 공지사항 작성 */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '16px' }}>📢 공지사항 작성</h3>
              <form onSubmit={handleCreateAnnouncement}>
                <div className="form-group">
                  <label className="form-label">제목 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    placeholder="공지사항 제목을 입력하세요"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">내용 *</label>
                  <textarea
                    className="form-input"
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                    placeholder="공지사항 내용을 입력하세요"
                    rows="6"
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={announcementLoading}
                >
                  {announcementLoading ? '전송 중...' : '📤 모든 사용자에게 전송'}
                </button>
              </form>
            </div>

            {/* 공지사항 목록 */}
            <div className="card">
              <h3 style={{ color: '#374151', marginBottom: '16px' }}>공지사항 목록</h3>
              {announcements.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                  등록된 공지사항이 없습니다.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      style={{
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: announcement.is_active ? '#ffffff' : '#f9fafb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '8px' 
                          }}>
                            <h4 style={{ margin: 0, color: '#374151', fontSize: '16px' }}>
                              {announcement.title}
                            </h4>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: announcement.is_active ? '#dbeafe' : '#f3f4f6',
                              color: announcement.is_active ? '#1e40af' : '#6b7280'
                            }}>
                              {announcement.is_active ? '활성' : '비활성'}
                            </span>
                          </div>
                          <div style={{ 
                            color: '#6b7280', 
                            fontSize: '14px',
                            whiteSpace: 'pre-wrap',
                            marginBottom: '8px'
                          }}>
                            {announcement.content.length > 100 
                              ? announcement.content.substring(0, 100) + '...' 
                              : announcement.content}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            작성: {announcement.creator_name} | {' '}
                            {new Date(announcement.created_at).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                          {announcement.is_active && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleDeactivateAnnouncement(announcement.id)}
                              style={{ fontSize: '13px', padding: '6px 12px' }}
                            >
                              비활성화
                            </button>
                          )}
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            style={{ fontSize: '13px', padding: '6px 12px' }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 커뮤니티 관리 */}
        {activeTab === 'community' && isSuperAdmin && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#374151' }}>💬 커뮤니티 관리</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn ${communityFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCommunityFilter('all')}
                  style={{ padding: '8px 16px' }}
                >
                  전체
                </button>
                <button
                  className={`btn ${communityFilter === 'owner' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCommunityFilter('owner')}
                  style={{ padding: '8px 16px' }}
                >
                  사업주
                </button>
                <button
                  className={`btn ${communityFilter === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCommunityFilter('employee')}
                  style={{ padding: '8px 16px' }}
                >
                  근로자
                </button>
              </div>
            </div>

            {communityLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                로딩 중...
              </div>
            ) : communityPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                게시글이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {communityPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                            {post.title}
                          </h4>
                          <span style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            background: post.category === 'owner' ? '#dbeafe' : '#fef3c7',
                            color: post.category === 'owner' ? '#1e40af' : '#92400e'
                          }}>
                            {post.category === 'owner' ? '사업주' : '근로자'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn"
                        style={{ padding: '4px 12px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                        onClick={() => handleDeleteCommunityPost(post.id)}
                      >
                        삭제
                      </button>
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {post.content}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
                      <span>작성자: {post.author_name} ({post.author_role})</span>
                      <span>{new Date(post.created_at).toLocaleDateString('ko-KR')} {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
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
              <label className="form-label">추천인</label>
              <div>{selectedOwner.sales_rep || '-'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">세무사 상호</label>
              <div>{selectedOwner.tax_office_name || '-'}</div>
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
            <div className="form-group">
              <label className="form-label">서비스 이용 동의</label>
              <div>
                {selectedOwner.service_consent ? '동의함' : '미동의'}
                {selectedOwner.service_consent_date && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
                    ({new Date(selectedOwner.service_consent_date).toLocaleString('ko-KR')})
                  </span>
                )}
              </div>
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

      {/* 계정 관리 탭 */}
      {activeTab === 'accounts' && isSuperAdmin && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ color: '#374151', margin: 0 }}>👥 전체 계정 관리</h3>
            <button className="btn btn-primary" onClick={loadAllUsers} disabled={userLoading}>
              {userLoading ? '로딩 중...' : '🔄 새로고침'}
            </button>
          </div>

          {/* 검색 / 필터 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="아이디 / 이름 / 이메일 검색"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAllUsers()}
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
            />
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="all">전체 역할</option>
              <option value="employee">근로자</option>
              <option value="owner">사업주</option>
              <option value="admin">관리자</option>
              <option value="super_admin">총관리자</option>
            </select>
            <button className="btn btn-primary" onClick={loadAllUsers}>검색</button>
          </div>

          {/* 통계 요약 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { label: '전체', count: allUsers.length, color: '#6366f1' },
              { label: '근로자', count: allUsers.filter(u => u.role === 'employee').length, color: '#10b981' },
              { label: '사업주', count: allUsers.filter(u => u.role === 'owner').length, color: '#f59e0b' },
              { label: '이메일 미등록', count: allUsers.filter(u => !u.has_email).length, color: '#ef4444' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ padding: '10px 16px', background: '#f9fafb', border: `2px solid ${color}20`, borderRadius: '8px', textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color }}>{count}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 사용자 목록 테이블 */}
          {userLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>로딩 중...</div>
          ) : allUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>검색 결과가 없습니다.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    {['ID', '아이디', '이름', '역할', '소속 사업장', '이메일', '주민번호', '가입일', '관리'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: '600', color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '12px' }}>{u.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>{u.username}</td>
                      <td style={{ padding: '10px 12px' }}>{u.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                          background: u.role === 'owner' ? '#fef3c7' : u.role === 'employee' ? '#d1fae5' : u.role === 'super_admin' ? '#fee2e2' : '#ede9fe',
                          color: u.role === 'owner' ? '#92400e' : u.role === 'employee' ? '#065f46' : u.role === 'super_admin' ? '#991b1b' : '#5b21b6'
                        }}>
                          {u.role === 'owner' ? '사업주' : u.role === 'employee' ? '근로자' : u.role === 'super_admin' ? '총관리자' : '관리자'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '12px' }}>{u.workplace_name || '-'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.has_email
                          ? <span style={{ color: '#10b981', fontSize: '12px' }}>✅ 등록됨</span>
                          : <span style={{ color: '#ef4444', fontSize: '12px' }}>❌ 미등록</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.has_ssn
                          ? <span style={{ color: '#10b981', fontSize: '12px' }}>✅ 등록됨</span>
                          : <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => { setResetTargetUser(u); setNewPwInput(''); setShowResetModal(true); }}
                            style={{ padding: '5px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                          >
                            🔑 비번초기화
                          </button>
                          {u.role !== 'super_admin' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              🗑️ 삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 비밀번호 초기화 모달 */}
      {showResetModal && resetTargetUser && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">🔑 비밀번호 초기화</div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px', fontSize: '14px' }}>
                <strong>{resetTargetUser.username}</strong> ({resetTargetUser.name})
                <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                  {resetTargetUser.role === 'owner' ? '사업주' : '근로자'} 계정
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>새 비밀번호</label>
                <input
                  type="password"
                  value={newPwInput}
                  onChange={(e) => setNewPwInput(e.target.value)}
                  placeholder="4자 이상 입력"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetUserPassword()}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowResetModal(false)} style={{ flex: 1 }}>취소</button>
                <button
                  onClick={handleResetUserPassword}
                  style={{ flex: 1, padding: '10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;
