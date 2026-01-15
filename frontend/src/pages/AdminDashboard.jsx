import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { workplaceAPI, authAPI, employeeAPI, attendanceAPI } from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('owners');
  const [workplaces, setWorkplaces] = useState([]);
  const [owners, setOwners] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [calendarWorkplaceId, setCalendarWorkplaceId] = useState(null);
  const [calendarSummary, setCalendarSummary] = useState([]);

  useEffect(() => {
    loadWorkplaces();
    loadOwners();
  }, []);

  useEffect(() => {
    if (!calendarWorkplaceId && workplaces.length > 0) {
      setCalendarWorkplaceId(workplaces[0].id);
    }
  }, [workplaces, calendarWorkplaceId]);

  useEffect(() => {
    if (activeTab === 'calendar' && calendarWorkplaceId) {
      loadCalendarSummary();
    }
  }, [activeTab, calendarWorkplaceId, calendarMonth]);
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

  const loadCalendarSummary = async () => {
    try {
      const [year, month] = calendarMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${calendarMonth}-01`;
      const endDate = `${calendarMonth}-${String(lastDay).padStart(2, '0')}`;
      const [employeeResponse, attendanceResponse] = await Promise.all([
        employeeAPI.getByWorkplace(calendarWorkplaceId),
        attendanceAPI.getByWorkplace(calendarWorkplaceId, { startDate, endDate })
      ]);

      const employees = employeeResponse.data.filter(
        (emp) => emp.employment_status !== 'resigned' && emp.employment_status !== 'on_leave'
      );
      const attendanceRecords = attendanceResponse.data;
      const selectedWorkplace = workplaces.find(
        (workplace) => workplace.id === calendarWorkplaceId
      );
      const defaultOffDays = selectedWorkplace?.default_off_days
        ? selectedWorkplace.default_off_days.split(',').map((day) => day.trim()).filter(Boolean)
        : [];

      const attendanceByKey = new Map();
      attendanceRecords.forEach((record) => {
        const key = `${record.user_id}-${record.date}`;
        attendanceByKey.set(key, record);
      });

      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const formatDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const summary = [];
      for (let day = 1; day <= lastDay; day += 1) {
        const date = new Date(year, month - 1, day);
        const dateKey = formatDateKey(date);
        const weekday = dayKeys[date.getDay()];

        let expected = 0;
        let normal = 0;
        let late = 0;
        let absent = 0;
        let annualLeave = 0;
        let paidLeave = 0;
        let unpaidLeave = 0;
        const lateNames = [];
        const absentNames = [];

        employees.forEach((emp) => {
          const workDays = emp.work_days ? emp.work_days.split(',') : [];
          const hasDefaultOff = defaultOffDays.length > 0;
          const isScheduled = workDays.length > 0
            ? workDays.includes(weekday)
            : (hasDefaultOff ? !defaultOffDays.includes(weekday) : true);
          if (!isScheduled) return;

          expected += 1;
          const record = attendanceByKey.get(`${emp.id}-${dateKey}`);

          if (record?.leave_type) {
            if (record.leave_type === 'annual') annualLeave += 1;
            if (record.leave_type === 'paid') paidLeave += 1;
            if (record.leave_type === 'unpaid') unpaidLeave += 1;
            return;
          }

          if (!record || !record.check_in_time) {
            absent += 1;
            absentNames.push(emp.name);
            return;
          }

          const checkIn = new Date(record.check_in_time);
          const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;
          const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
          const checkOutMinutes = checkOut ? checkOut.getHours() * 60 + checkOut.getMinutes() : null;

          const startMinutes = emp.work_start_time
            ? Number(emp.work_start_time.split(':')[0]) * 60 + Number(emp.work_start_time.split(':')[1] || 0)
            : null;
          const endMinutes = emp.work_end_time
            ? Number(emp.work_end_time.split(':')[0]) * 60 + Number(emp.work_end_time.split(':')[1] || 0)
            : null;

          const lateCheckIn = startMinutes !== null && checkInMinutes > startMinutes;
          const earlyLeave = endMinutes !== null && (checkOutMinutes === null || checkOutMinutes < endMinutes);

          if (lateCheckIn || earlyLeave) {
            late += 1;
            lateNames.push(emp.name);
          } else {
            normal += 1;
          }
        });

        summary.push({
          date: dateKey,
          weekday,
          expected,
          normal,
          late,
          absent,
          annualLeave,
          paidLeave,
          unpaidLeave,
          lateNames,
          absentNames
        });
      }

      setCalendarSummary(summary);
    } catch (error) {
      console.error('캘린더 요약 조회 오류:', error);
      setCalendarSummary([]);
    }
  };

  const fixedHolidayMap = {
    '01-01': '신정',
    '03-01': '삼일절',
    '05-05': '어린이날',
    '06-06': '현충일',
    '08-15': '광복절',
    '10-03': '개천절',
    '10-09': '한글날',
    '12-25': '성탄절'
  };

  const getHolidayName = (dateKey) => {
    if (!dateKey) return '';
    const monthDay = dateKey.slice(5, 10);
    return fixedHolidayMap[monthDay] || '';
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

  const formatNameList = (names) => {
    if (!names || names.length === 0) return '';
    const display = names.slice(0, 3).join(', ');
    const extra = names.length > 3 ? ` 외 ${names.length - 3}명` : '';
    return `${display}${extra}`;
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
            className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            캘린더
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

        {activeTab === 'calendar' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#374151' }}>캘린더</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  value={calendarWorkplaceId || ''}
                  onChange={(e) => setCalendarWorkplaceId(Number(e.target.value))}
                >
                  {workplaces.map((workplace) => (
                    <option key={workplace.id} value={workplace.id}>
                      {workplace.name}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  className="form-input"
                  value={calendarMonth}
                  onChange={(e) => setCalendarMonth(e.target.value)}
                />
              </div>
            </div>

            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              근무 요일과 근무시간을 기준으로 정상/지각/결근을 표시합니다.
            </p>

            {calendarSummary.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                표시할 데이터가 없습니다.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>일자</th>
                      <th>요일</th>
                      <th>공휴일</th>
                      <th>근무 예정</th>
                      <th>정상 출퇴근</th>
                      <th>지각/조퇴</th>
                      <th>결근</th>
                      <th>연차</th>
                      <th>유급휴가</th>
                      <th>무급휴가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarSummary.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>
                          {{
                            mon: '월',
                            tue: '화',
                            wed: '수',
                            thu: '목',
                            fri: '금',
                            sat: '토',
                            sun: '일'
                          }[row.weekday]}
                        </td>
                        <td style={{ color: getHolidayName(row.date) ? '#dc2626' : '#6b7280' }}>
                          {getHolidayName(row.date) || '-'}
                        </td>
                        <td>{row.expected}명</td>
                        <td style={{ color: row.normal > 0 ? '#16a34a' : '#6b7280' }}>
                          {row.normal}명
                        </td>
                        <td style={{ color: row.late > 0 ? '#f97316' : '#6b7280' }}>
                          {row.late}명
                          {row.late > 0 && (
                            <div style={{ fontSize: '12px', color: '#9a3412', marginTop: '4px' }}>
                              {formatNameList(row.lateNames)}
                            </div>
                          )}
                        </td>
                        <td style={{ color: row.absent > 0 ? '#dc2626' : '#6b7280' }}>
                          {row.absent}명
                          {row.absent > 0 && (
                            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
                              {formatNameList(row.absentNames)}
                            </div>
                          )}
                        </td>
                        <td style={{ color: row.annualLeave > 0 ? '#2563eb' : '#6b7280' }}>
                          {row.annualLeave}명
                        </td>
                        <td style={{ color: row.paidLeave > 0 ? '#0ea5e9' : '#6b7280' }}>
                          {row.paidLeave}명
                        </td>
                        <td style={{ color: row.unpaidLeave > 0 ? '#8b5cf6' : '#6b7280' }}>
                          {row.unpaidLeave}명
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
