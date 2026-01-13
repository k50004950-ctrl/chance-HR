import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { workplaceAPI, employeeAPI, attendanceAPI, salaryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState('2025-12'); // 샘플 데이터를 위해 2025-12로 설정
  const [attendanceStats, setAttendanceStats] = useState(null);

  useEffect(() => {
    loadWorkplaces();
  }, []);

  useEffect(() => {
    if (selectedWorkplace) {
      loadEmployees();
      if (activeTab === 'attendance') {
        loadAttendance();
      }
      if (activeTab === 'salary') {
        loadSalary();
      }
    }
  }, [selectedWorkplace, activeTab, selectedMonth]);

  const loadWorkplaces = async () => {
    try {
      const response = await workplaceAPI.getMy();
      setWorkplaces(response.data);
      if (response.data.length > 0) {
        setSelectedWorkplace(response.data[0].id);
      }
    } catch (error) {
      console.error('사업장 조회 오류:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getByWorkplace(selectedWorkplace);
      setEmployees(response.data);
    } catch (error) {
      console.error('직원 조회 오류:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      const response = await attendanceAPI.getByWorkplace(selectedWorkplace, { startDate, endDate });
      setAttendance(response.data);
      calculateAttendanceStats(response.data);
    } catch (error) {
      console.error('출퇴근 기록 조회 오류:', error);
    }
  };

  const calculateAttendanceStats = (attendanceData) => {
    // 직원별 출근 통계 계산
    const employeeStats = {};
    
    attendanceData.forEach(record => {
      if (!employeeStats[record.user_id]) {
        employeeStats[record.user_id] = {
          employeeName: record.employee_name,
          totalDays: 0,
          completedDays: 0,
          totalHours: 0,
          incompleteDays: 0
        };
      }
      
      employeeStats[record.user_id].totalDays++;
      if (record.status === 'completed') {
        employeeStats[record.user_id].completedDays++;
        employeeStats[record.user_id].totalHours += record.work_hours || 0;
      } else {
        employeeStats[record.user_id].incompleteDays++;
      }
    });

    setAttendanceStats({
      totalRecords: attendanceData.length,
      completedRecords: attendanceData.filter(r => r.status === 'completed').length,
      incompleteRecords: attendanceData.filter(r => r.status !== 'completed').length,
      totalWorkHours: attendanceData.reduce((sum, r) => sum + (r.work_hours || 0), 0),
      employeeStats: Object.values(employeeStats)
    });
  };

  const loadSalary = async () => {
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      const response = await salaryAPI.calculateWorkplace(selectedWorkplace, { startDate, endDate });
      setSalaryData(response.data);
    } catch (error) {
      console.error('급여 계산 오류:', error);
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    setFormData({
      ...data,
      workplace_id: selectedWorkplace
    });
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

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData({
      ...formData,
      [name]: files[0]
    });
  };

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' }); // 이전 메시지 초기화

    try {
      const formDataToSend = new FormData();
      
      // 모든 텍스트 필드 추가
      Object.keys(formData).forEach(key => {
        if (key !== 'contract_file' && key !== 'resume_file' && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // 파일 추가
      if (formData.contract_file instanceof File) {
        formDataToSend.append('contract_file', formData.contract_file);
      }
      if (formData.resume_file instanceof File) {
        formDataToSend.append('resume_file', formData.resume_file);
      }

      console.log('전송할 데이터:', Object.fromEntries(formDataToSend.entries()));

      if (formData.id) {
        const response = await employeeAPI.update(formData.id, formDataToSend);
        console.log('수정 성공:', response);
        setMessage({ type: 'success', text: '직원 정보가 수정되었습니다.' });
        closeModal();
        loadEmployees();
      } else {
        const response = await employeeAPI.create(formDataToSend);
        console.log('등록 성공:', response);
        setMessage({ type: 'success', text: '직원이 등록되었습니다.' });
        closeModal();
        loadEmployees();
      }
    } catch (error) {
      console.error('직원 등록/수정 오류:', error);
      console.error('에러 상세:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || '오류가 발생했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    }

    setLoading(false);
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    try {
      await employeeAPI.delete(id);
      setMessage({ type: 'success', text: '직원이 삭제되었습니다.' });
      loadEmployees();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || '오류가 발생했습니다.' });
    }
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await attendanceAPI.update(formData.id, {
        check_in_time: formData.check_in_time,
        check_out_time: formData.check_out_time || null
      });
      setMessage({ type: 'success', text: '근무시간이 수정되었습니다.' });
      closeModal();
      loadAttendance();
    } catch (error) {
      console.error('근무시간 수정 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '오류가 발생했습니다.' });
    }

    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSalaryTypeName = (type) => {
    switch (type) {
      case 'hourly': return '시급';
      case 'monthly': return '월급';
      case 'annual': return '연봉';
      default: return type;
    }
  };

  return (
    <div>
      <Header />
      <div className="container">
        <h2 style={{ marginBottom: '24px', color: '#374151' }}>사업주 대시보드</h2>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {/* 사업장 선택 */}
        {workplaces.length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <label className="form-label">사업장 선택</label>
            <select
              className="form-select"
              value={selectedWorkplace || ''}
              onChange={(e) => setSelectedWorkplace(parseInt(e.target.value))}
            >
              {workplaces.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name} - {wp.address}
                </option>
              ))}
            </select>
          </div>
        )}

        {!selectedWorkplace ? (
          <div className="card">
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
              등록된 사업장이 없습니다. 관리자에게 문의하세요.
            </p>
          </div>
        ) : (
          <>
            {/* 탭 메뉴 */}
            <div className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                📊 당월 출근현황
              </button>
              <button
                className={`nav-tab ${activeTab === 'employees' ? 'active' : ''}`}
                onClick={() => setActiveTab('employees')}
              >
                👥 직원 관리
              </button>
              <button
                className={`nav-tab ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => setActiveTab('roster')}
              >
                📋 근로자 명부
              </button>
              <button
                className={`nav-tab ${activeTab === 'salary' ? 'active' : ''}`}
                onClick={() => setActiveTab('salary')}
              >
                💰 급여 계산
              </button>
            </div>

            {/* 근로자 명부 */}
            {activeTab === 'roster' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151' }}>📋 근로자 명부</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => openModal('employee')}
                  >
                    + 직원 등록
                  </button>
                </div>
                
                <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
                  📌 등록된 모든 직원의 상세 정보를 한눈에 확인할 수 있습니다.
                </p>

                {employees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    등록된 직원이 없습니다.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>주민번호</th>
                          <th>전화번호</th>
                          <th>주소</th>
                          <th>직책</th>
                          <th>입사일</th>
                          <th>급여유형</th>
                          <th>비상연락망</th>
                          <th>상세</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: '600' }}>{emp.name}</td>
                            <td>{emp.ssn || '-'}</td>
                            <td>{emp.phone || '-'}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {emp.address || '-'}
                            </td>
                            <td>{emp.position || '-'}</td>
                            <td>{formatDate(emp.hire_date)}</td>
                            <td>{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</td>
                            <td>
                              {emp.emergency_contact ? (
                                <div style={{ fontSize: '12px' }}>
                                  <div>{emp.emergency_contact}</div>
                                  <div style={{ color: '#6b7280' }}>{emp.emergency_phone || '-'}</div>
                                </div>
                              ) : '-'}
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => openModal('employee', emp)}
                              >
                                상세보기
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

            {/* 직원 관리 */}
            {activeTab === 'employees' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151' }}>직원 목록</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => openModal('employee')}
                  >
                    + 직원 등록
                  </button>
                </div>

                {employees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    등록된 직원이 없습니다.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>사용자명</th>
                          <th>직책</th>
                          <th>급여유형</th>
                          <th>급여</th>
                          <th>전화번호</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: '600' }}>{emp.name}</td>
                            <td>{emp.username}</td>
                            <td>{emp.position || '-'}</td>
                            <td>{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</td>
                            <td>{emp.amount ? `${emp.amount.toLocaleString()}원` : '-'}</td>
                            <td>{emp.phone || '-'}</td>
                            <td>
                              <button
                                className="btn btn-secondary"
                                style={{ marginRight: '8px', padding: '6px 12px' }}
                                onClick={() => openModal('employee', emp)}
                              >
                                수정
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '6px 12px' }}
                                onClick={() => handleDeleteEmployee(emp.id)}
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

            {/* 당월 출근현황 */}
            {activeTab === 'attendance' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151', margin: 0 }}>📊 당월 출근현황</h3>
                  <input
                    type="month"
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>

                {/* 통계 카드 */}
                {attendanceStats && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>총 출근 기록</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{attendanceStats.totalRecords}건</div>
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>정상 출퇴근</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{attendanceStats.completedRecords}건</div>
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>미완료</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{attendanceStats.incompleteRecords}건</div>
                    </div>

                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>총 근무시간</div>
                      <div style={{ fontSize: '32px', fontWeight: '700' }}>{(Number(attendanceStats.totalWorkHours) || 0).toFixed(1)}h</div>
                    </div>
                  </div>
                )}

                {/* 직원별 통계 */}
                {attendanceStats && attendanceStats.employeeStats.length > 0 && (
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '16px', color: '#374151' }}>직원별 출근 통계</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>직원명</th>
                            <th>총 출근일</th>
                            <th>정상 출퇴근</th>
                            <th>미완료</th>
                            <th>총 근무시간</th>
                            <th>평균 근무시간</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceStats.employeeStats.map((stat, index) => (
                            <tr key={index}>
                              <td style={{ fontWeight: '600' }}>{stat.employeeName}</td>
                              <td>{stat.totalDays}일</td>
                              <td>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  fontWeight: '600',
                                  fontSize: '12px'
                                }}>
                                  {stat.completedDays}일
                                </span>
                              </td>
                              <td>
                                {stat.incompleteDays > 0 ? (
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    fontWeight: '600',
                                    fontSize: '12px'
                                  }}>
                                    {stat.incompleteDays}일
                                  </span>
                                ) : (
                                  <span style={{ color: '#6b7280' }}>-</span>
                                )}
                              </td>
                              <td style={{ fontWeight: '600' }}>{(Number(stat.totalHours) || 0).toFixed(1)}h</td>
                              <td>{stat.completedDays > 0 ? (Number(stat.totalHours) / stat.completedDays).toFixed(1) : '0'}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 상세 출퇴근 기록 */}
                <div className="card">
                  <h4 style={{ marginBottom: '16px', color: '#374151' }}>상세 출퇴근 기록</h4>
                  
                  {attendance.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px' }}>
                      <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
                      <p style={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
                        출퇴근 기록이 없습니다
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        직원들이 출퇴근을 기록하면 여기에 표시됩니다
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>직원명</th>
                            <th>날짜</th>
                            <th>출근</th>
                            <th>퇴근</th>
                            <th>근무시간</th>
                            <th>상태</th>
                            <th>관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((record) => (
                            <tr key={record.id}>
                              <td style={{ fontWeight: '600' }}>{record.employee_name}</td>
                              <td>{formatDate(record.date)}</td>
                              <td>{formatTime(record.check_in_time)}</td>
                              <td>{formatTime(record.check_out_time)}</td>
                              <td style={{ fontWeight: '600' }}>{record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}</td>
                              <td>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: record.status === 'completed' ? '#d1fae5' : '#fee2e2',
                                  color: record.status === 'completed' ? '#065f46' : '#991b1b'
                                }}>
                                  {record.status === 'completed' ? '✓ 완료' : '⏱ 미완료'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '12px', padding: '6px 12px' }}
                                  onClick={() => openModal('editAttendance', record)}
                                >
                                  ✏️ 수정
                                </button>
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

            {/* 급여 계산 */}
            {activeTab === 'salary' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151' }}>급여 계산</h3>
                  <input
                    type="month"
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>

                {salaryData && (
                  <>
                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '8px',
                      color: 'white',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '14px', marginBottom: '8px', opacity: '0.9' }}>
                        총 지급 급여 (세전)
                      </div>
                      <div style={{ fontSize: '36px', fontWeight: '700' }}>
                        {salaryData.totalSalary.toLocaleString()}원
                      </div>
                    </div>

                    {salaryData.employees.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                        급여 데이터가 없습니다.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>직원명</th>
                              <th>급여유형</th>
                              <th>기본급</th>
                              <th>근무일수</th>
                              <th>근무시간</th>
                              <th>기본 급여</th>
                              <th>주휴수당</th>
                              <th>총 지급액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salaryData.employees.map((emp) => (
                              <tr key={emp.employeeId}>
                                <td style={{ fontWeight: '600' }}>{emp.employeeName}</td>
                                <td>{getSalaryTypeName(emp.salaryType)}</td>
                                <td>{emp.baseAmount.toLocaleString()}원</td>
                                <td>{emp.totalWorkDays}일</td>
                                <td>{emp.totalWorkHours}h</td>
                                <td>{emp.baseSalaryAmount ? emp.baseSalaryAmount.toLocaleString() : emp.calculatedSalary.toLocaleString()}원</td>
                                <td style={{ color: emp.weeklyHolidayPayAmount > 0 ? '#10b981' : '#9ca3af' }}>
                                  {emp.weeklyHolidayPayAmount > 0 ? `+${emp.weeklyHolidayPayAmount.toLocaleString()}원` : '-'}
                                </td>
                                <td style={{ fontWeight: '700', color: '#667eea' }}>
                                  {emp.calculatedSalary.toLocaleString()}원
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 직원 등록/수정 모달 */}
      {showModal && modalType === 'employee' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              {formData.id ? '직원 정보 수정' : '직원 등록'}
            </div>

            {message.text && (
              <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmitEmployee}>
              <h4 style={{ marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                기본 정보
              </h4>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">사용자명 (로그인 ID) *</label>
                  <input
                    type="text"
                    name="username"
                    className="form-input"
                    value={formData.username || ''}
                    onChange={handleInputChange}
                    required
                    disabled={formData.id}
                    placeholder="로그인할 때 사용할 아이디를 입력하세요"
                  />
                </div>
                {!formData.id && (
                  <div className="form-group">
                    <label className="form-label">비밀번호 *</label>
                    <input
                      type="password"
                      name="password"
                      className="form-input"
                      value={formData.password || ''}
                      onChange={handleInputChange}
                      required
                      placeholder="초기 비밀번호를 입력하세요"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">이름 *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="직원의 실명을 입력하세요"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">주민등록번호</label>
                  <input
                    type="text"
                    name="ssn"
                    className="form-input"
                    value={formData.ssn || ''}
                    onChange={handleInputChange}
                    placeholder="주민등록번호를 입력하세요 (예: 901010-1234567)"
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
                    placeholder="전화번호를 입력하세요 (예: 010-1234-5678)"
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
                    placeholder="이메일 주소를 입력하세요 (예: hong@example.com)"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">주소</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  placeholder="전체 주소를 입력하세요 (예: 서울시 강남구 테헤란로 123)"
                />
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                비상 연락망
              </h4>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">비상연락처 (이름)</label>
                  <input
                    type="text"
                    name="emergency_contact"
                    className="form-input"
                    value={formData.emergency_contact || ''}
                    onChange={handleInputChange}
                    placeholder="비상연락처 이름과 관계를 입력하세요 (예: 홍길동 (부))"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">비상연락처 (전화번호)</label>
                  <input
                    type="tel"
                    name="emergency_phone"
                    className="form-input"
                    value={formData.emergency_phone || ''}
                    onChange={handleInputChange}
                    placeholder="비상연락처 전화번호를 입력하세요 (예: 010-1234-5678)"
                  />
                </div>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                근무 정보
              </h4>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">입사일</label>
                  <input
                    type="date"
                    name="hire_date"
                    className="form-input"
                    value={formData.hire_date || ''}
                    onChange={handleInputChange}
                    placeholder="입사일을 선택하세요"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">직책</label>
                  <input
                    type="text"
                    name="position"
                    className="form-input"
                    value={formData.position || ''}
                    onChange={handleInputChange}
                    placeholder="직책을 입력하세요 (예: 매니저, 사원)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">부서</label>
                  <input
                    type="text"
                    name="department"
                    className="form-input"
                    value={formData.department || ''}
                    onChange={handleInputChange}
                    placeholder="부서를 입력하세요 (예: 영업부, 관리부)"
                  />
                </div>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                근무 시간
              </h4>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">근무 시작 시간</label>
                  <input
                    type="time"
                    name="work_start_time"
                    className="form-input"
                    value={formData.work_start_time || ''}
                    onChange={handleInputChange}
                    placeholder="09:00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">근무 종료 시간</label>
                  <input
                    type="time"
                    name="work_end_time"
                    className="form-input"
                    value={formData.work_end_time || ''}
                    onChange={handleInputChange}
                    placeholder="18:00"
                  />
                </div>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                첨부 서류
              </h4>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">근로계약서</label>
                  <input
                    type="file"
                    name="contract_file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {formData.contract_file && typeof formData.contract_file === 'string' && (
                    <small style={{ color: '#6b7280' }}>현재 파일: {formData.contract_file}</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">이력서</label>
                  <input
                    type="file"
                    name="resume_file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {formData.resume_file && typeof formData.resume_file === 'string' && (
                    <small style={{ color: '#6b7280' }}>현재 파일: {formData.resume_file}</small>
                  )}
                </div>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151' }}>급여 정보</h4>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">급여 유형</label>
                  <select
                    name="salary_type"
                    className="form-select"
                    value={formData.salary_type || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">선택하세요</option>
                    <option value="hourly">시급</option>
                    <option value="monthly">월급</option>
                    <option value="annual">연봉</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">금액</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-input"
                    value={formData.amount || ''}
                    onChange={handleInputChange}
                    placeholder="원"
                  />
                </div>
              </div>

              {formData.salary_type === 'hourly' && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="weekly_holiday_pay"
                      checked={formData.weekly_holiday_pay === 1 || formData.weekly_holiday_pay === '1'}
                      onChange={(e) => setFormData({ ...formData, weekly_holiday_pay: e.target.checked ? 1 : 0 })}
                      style={{ marginRight: '8px' }}
                    />
                    <span>주휴수당 적용</span>
                  </label>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '처리 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 근무시간 수정 모달 */}
      {showModal && modalType === 'editAttendance' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              근무시간 수정
            </div>

            <form onSubmit={handleSubmitAttendance}>
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
                  직원: {formData.employee_name}
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  날짜: {formatDate(formData.date)}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">출근 시간 *</label>
                <input
                  type="datetime-local"
                  name="check_in_time"
                  className="form-input"
                  value={formData.check_in_time ? formData.check_in_time.slice(0, 16) : ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">퇴근 시간</label>
                <input
                  type="datetime-local"
                  name="check_out_time"
                  className="form-input"
                  value={formData.check_out_time ? formData.check_out_time.slice(0, 16) : ''}
                  onChange={handleInputChange}
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  퇴근 시간을 비워두면 미완료 상태로 저장됩니다.
                </small>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '수정 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
