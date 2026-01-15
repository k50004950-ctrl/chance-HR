import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { workplaceAPI, employeeAPI, attendanceAPI, salaryAPI, pastEmployeeAPI, salaryHistoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import ConsentInfo from '../components/ConsentInfo';

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
  const [employeesWithoutContract, setEmployeesWithoutContract] = useState([]);
  const [pastEmployees, setPastEmployees] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState(null);
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState('all');

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
      if (activeTab === 'past-employees') {
        loadPastEmployees();
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
      
      // 근로계약서 미제출 직원 확인
      const withoutContract = response.data.filter(emp => !emp.contract_file);
      setEmployeesWithoutContract(withoutContract);
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
        employeeStats[record.user_id].totalHours += Number(record.work_hours) || 0;
      } else {
        employeeStats[record.user_id].incompleteDays++;
      }
    });

    setAttendanceStats({
      totalRecords: attendanceData.length,
      completedRecords: attendanceData.filter(r => r.status === 'completed').length,
      incompleteRecords: attendanceData.filter(r => r.status !== 'completed').length,
      totalWorkHours: attendanceData.reduce((sum, r) => sum + (Number(r.work_hours) || 0), 0),
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

  const loadPastEmployees = async () => {
    try {
      const response = await pastEmployeeAPI.getAll();
      setPastEmployees(response.data);
    } catch (error) {
      console.error('과거 직원 조회 오류:', error);
    }
  };

  const handleSubmitPastEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await pastEmployeeAPI.create(formData);
      setMessage({ type: 'success', text: '과거 직원이 등록되었습니다.' });
      
      setTimeout(() => {
        closeModal();
        loadPastEmployees();
      }, 1500);
    } catch (error) {
      console.error('과거 직원 등록 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '과거 직원 등록에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePastEmployee = async (id) => {
    if (!window.confirm('이 과거 직원 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await pastEmployeeAPI.delete(id);
      setMessage({ type: 'success', text: '과거 직원 기록이 삭제되었습니다.' });
      loadPastEmployees();
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('과거 직원 삭제 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '삭제에 실패했습니다.' });
    }
  };

  const handleViewSalaryHistory = async (employeeId, employeeName) => {
    try {
      const response = await salaryHistoryAPI.getHistory(employeeId);
      setSalaryHistory({
        employeeName,
        ...response.data
      });
      openModal('salaryHistory', {});
    } catch (error) {
      console.error('급여 이력 조회 오류:', error);
      setMessage({ type: 'error', text: '급여 이력 조회에 실패했습니다.' });
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    const newFormData = {
      ...data,
      workplace_id: selectedWorkplace
    };
    console.log('모달 열기 - formData:', newFormData);
    setFormData(newFormData);
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
      const form = e.target;
      const formDataToSend = new FormData();
      
      // ID가 있으면 추가 (수정 모드)
      if (formData.id) {
        formDataToSend.append('id', formData.id);
      }
      
      // workplace_id 추가 (필수)
      if (formData.workplace_id) {
        formDataToSend.append('workplace_id', formData.workplace_id);
      }
      
      // 모든 텍스트 필드를 DOM에서 직접 읽기
      const textFields = [
        'username', 'password', 'name', 'phone', 'email', 'ssn', 'address',
        'emergency_contact', 'emergency_phone', 'hire_date', 'position',
        'department', 'notes', 'work_start_time', 'work_end_time', 'employment_status', 'resignation_date'
      ];
      
      textFields.forEach(field => {
        const element = form.querySelector(`[name="${field}"]`);
        if (element && element.value) {
          formDataToSend.append(field, element.value);
        }
      });
      
      // 급여 정보를 DOM에서 직접 읽기
      const salaryTypeElement = form.querySelector('[name="salary_type"]');
      if (salaryTypeElement && salaryTypeElement.value) {
        formDataToSend.append('salary_type', salaryTypeElement.value);
        console.log('salary_type from DOM:', salaryTypeElement.value);
      }
      
      const amountElement = form.querySelector('[name="amount"]');
      if (amountElement && amountElement.value) {
        formDataToSend.append('amount', amountElement.value);
        console.log('amount from DOM:', amountElement.value);
      }
      
      const taxTypeElement = form.querySelector('[name="tax_type"]');
      if (taxTypeElement && taxTypeElement.value) {
        formDataToSend.append('tax_type', taxTypeElement.value);
        console.log('tax_type from DOM:', taxTypeElement.value);
      }
      
      const overtimePayElement = form.querySelector('[name="overtime_pay"]');
      if (overtimePayElement && overtimePayElement.value) {
        formDataToSend.append('overtime_pay', overtimePayElement.value);
        console.log('overtime_pay from DOM:', overtimePayElement.value);
      }
      
      const weeklyHolidayTypeElement = form.querySelector('input[name="weekly_holiday_type"]:checked');
      if (weeklyHolidayTypeElement && weeklyHolidayTypeElement.value) {
        formDataToSend.append('weekly_holiday_type', weeklyHolidayTypeElement.value);
        console.log('weekly_holiday_type from DOM:', weeklyHolidayTypeElement.value);
      }
      
      // work_days 처리 - 체크된 체크박스 값을 배열로 수집
      const workDaysCheckboxes = form.querySelectorAll('input[name="work_days"]:checked');
      const workDaysArray = Array.from(workDaysCheckboxes).map(cb => cb.value);
      formDataToSend.append('work_days', JSON.stringify(workDaysArray));
      console.log('work_days from DOM:', JSON.stringify(workDaysArray));
      
      // 파일 추가
      const fileFields = ['contract_file', 'resume_file', 'id_card_file', 'family_cert_file'];
      fileFields.forEach(field => {
        const fileInput = form.querySelector(`input[name="${field}"]`);
        if (fileInput && fileInput.files && fileInput.files[0]) {
          formDataToSend.append(field, fileInput.files[0]);
          console.log(`${field} from DOM:`, fileInput.files[0].name);
        }
      });

      // === 2026-01-14 최종 수정 ===
      console.log('🚀 [최종] 전송할 FormData:', Object.fromEntries(formDataToSend.entries()));
      console.log('🚀 FormData 전체 항목 수:', Array.from(formDataToSend.entries()).length);

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

  const downloadExcel = () => {
    if (!salaryData || !salaryData.employees || salaryData.employees.length === 0) {
      alert('다운로드할 급여 데이터가 없습니다.');
      return;
    }

    // 엑셀 데이터 준비
    const excelData = salaryData.employees.map(emp => ({
      '직원명': emp.employeeName,
      '사용자명': emp.username,
      '급여유형': getSalaryTypeName(emp.salaryType),
      '인건비신고': emp.taxType || '4대보험',
      '기본급': emp.baseAmount,
      '근무일수': emp.totalWorkDays,
      '근무시간': emp.totalWorkHours,
      '기본급여': emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary,
      '주휴수당': emp.weeklyHolidayPayAmount || 0,
      '월퇴직금적립': emp.monthlySeverance || 0,
      '총지급액': emp.calculatedSalary
    }));

    // 합계 행 추가
    const totalRow = {
      '직원명': '합계',
      '사용자명': '',
      '급여유형': '',
      '인건비신고': '',
      '기본급': '',
      '근무일수': '',
      '근무시간': '',
      '기본급여': '',
      '주휴수당': salaryData.employees.reduce((sum, emp) => sum + (emp.weeklyHolidayPayAmount || 0), 0),
      '월퇴직금적립': salaryData.employees.reduce((sum, emp) => sum + (emp.monthlySeverance || 0), 0),
      '총지급액': salaryData.totalSalary
    };
    excelData.push(totalRow);

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 10 }, // 직원명
      { wch: 12 }, // 사용자명
      { wch: 10 }, // 급여유형
      { wch: 12 }, // 인건비신고
      { wch: 12 }, // 기본급
      { wch: 10 }, // 근무일수
      { wch: 10 }, // 근무시간
      { wch: 12 }, // 기본급여
      { wch: 12 }, // 주휴수당
      { wch: 14 }, // 월퇴직금적립
      { wch: 14 }  // 총지급액
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '급여계산');

    // 파일명 생성 (YYYY년MM월_급여계산.xlsx)
    const [year, month] = selectedMonth.split('-');
    const filename = `${year}년${month}월_급여계산.xlsx`;

    // 파일 다운로드
    XLSX.writeFile(wb, filename);
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
            {/* 근로계약서 미제출 알람 */}
            {employeesWithoutContract.length > 0 && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                    근로계약서 미제출 직원이 있습니다!
                  </div>
                  <div style={{ fontSize: '14px', color: '#78350f' }}>
                    {employeesWithoutContract.map(emp => emp.name).join(', ')} 님의 근로계약서가 필요합니다.
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                    💡 직원 관리에서 근로계약서를 업로드해주세요.
                  </div>
                </div>
              </div>
            )}

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
              <button
                className={`nav-tab ${activeTab === 'past-employees' ? 'active' : ''}`}
                onClick={() => setActiveTab('past-employees')}
              >
                📂 과거 직원
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
                          <th>인건비 신고</th>
                          <th>개인정보동의</th>
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
                            <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.tax_type || '4대보험'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {emp.privacy_consent && emp.location_consent ? (
                                <div style={{ fontSize: '11px' }}>
                                  <span style={{ color: '#10b981', fontSize: '16px' }}>✅</span>
                                  <div style={{ color: '#6b7280', marginTop: '4px' }}>동의완료</div>
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px' }}>
                                  <span style={{ color: '#dc2626', fontSize: '16px' }}>❌</span>
                                  <div style={{ color: '#dc2626', marginTop: '4px' }}>미동의</div>
                                </div>
                              )}
                            </td>
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
                  <div>
                    <h3 style={{ color: '#374151', marginBottom: '12px' }}>직원 목록</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn ${employmentStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setEmploymentStatusFilter('all')}
                      >
                        전체
                      </button>
                      <button
                        className={`btn ${employmentStatusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setEmploymentStatusFilter('active')}
                      >
                        재직중
                      </button>
                      <button
                        className={`btn ${employmentStatusFilter === 'on_leave' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setEmploymentStatusFilter('on_leave')}
                      >
                        휴직
                      </button>
                      <button
                        className={`btn ${employmentStatusFilter === 'resigned' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setEmploymentStatusFilter('resigned')}
                      >
                        퇴사
                      </button>
                    </div>
                  </div>
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
                          <th>상태</th>
                          <th>개인정보동의</th>
                          <th>직책</th>
                          <th>급여유형</th>
                          <th>인건비 신고</th>
                          <th>급여</th>
                          <th>전화번호</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter).map((emp) => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: '600' }}>{emp.name}</td>
                            <td>{emp.username}</td>
                            <td>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                background: emp.employment_status === 'active' ? '#d1fae5' : emp.employment_status === 'on_leave' ? '#fef3c7' : '#fee2e2',
                                color: emp.employment_status === 'active' ? '#065f46' : emp.employment_status === 'on_leave' ? '#92400e' : '#991b1b'
                              }}>
                                {emp.employment_status === 'active' ? '재직중' : emp.employment_status === 'on_leave' ? '휴직' : '퇴사'}
                              </span>
                            </td>
                            <td>
                              {emp.privacy_consent && emp.location_consent ? (
                                <span style={{ color: '#10b981', fontSize: '16px' }} title="개인정보 및 위치정보 동의 완료">✅</span>
                              ) : (
                                <span style={{ color: '#dc2626', fontSize: '16px' }} title="동의 필요">❌</span>
                              )}
                            </td>
                            <td>{emp.position || '-'}</td>
                            <td>{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</td>
                            <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.tax_type || '4대보험'}</td>
                            <td>{emp.amount ? `${emp.amount.toLocaleString()}원` : '-'}</td>
                            <td>{emp.phone || '-'}</td>
                            <td>
                              <button
                                className="btn btn-secondary"
                                style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => openModal('employee', emp)}
                              >
                                수정
                              </button>
                              <button
                                className="btn"
                                style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px', background: '#f59e0b', color: 'white' }}
                                onClick={() => handleViewSalaryHistory(emp.id, emp.name)}
                              >
                                이력
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
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
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="month"
                      className="form-input"
                      style={{ width: 'auto' }}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    {salaryData && salaryData.employees && salaryData.employees.length > 0 && (
                      <button
                        className="btn btn-success"
                        onClick={downloadExcel}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        📥 엑셀 다운로드
                      </button>
                    )}
                  </div>
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
                              <th>인건비 신고</th>
                              <th>기본급</th>
                              <th>근무일수</th>
                              <th>근무시간</th>
                              <th>기본 급여</th>
                              <th>주휴수당</th>
                              <th>월 퇴직금 적립</th>
                              <th>총 지급액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salaryData.employees.map((emp) => (
                              <tr key={emp.employeeId}>
                                <td style={{ fontWeight: '600' }}>{emp.employeeName}</td>
                                <td>{getSalaryTypeName(emp.salaryType)}</td>
                                <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.taxType || '4대보험'}</td>
                                <td>{emp.baseAmount.toLocaleString()}원</td>
                                <td>{emp.totalWorkDays}일</td>
                                <td>{emp.totalWorkHours}h</td>
                                <td>{emp.baseSalaryAmount ? emp.baseSalaryAmount.toLocaleString() : (emp.baseSalary || emp.calculatedSalary).toLocaleString()}원</td>
                                <td style={{ color: emp.weeklyHolidayPayAmount > 0 ? '#10b981' : '#9ca3af' }}>
                                  {emp.weeklyHolidayPayAmount > 0 ? `+${emp.weeklyHolidayPayAmount.toLocaleString()}원` : '-'}
                                </td>
                                <td style={{ color: emp.monthlySeverance > 0 ? '#f59e0b' : '#9ca3af', fontWeight: emp.monthlySeverance > 0 ? '600' : '400' }}>
                                  {emp.monthlySeverance > 0 ? `+${emp.monthlySeverance.toLocaleString()}원` : '1년 미만'}
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

            {/* 과거 직원 관리 */}
            {activeTab === 'past-employees' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151' }}>📂 과거 직원 급여 기록</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => openModal('pastEmployee', {})}
                  >
                    + 과거 직원 등록
                  </button>
                </div>

                <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
                  퇴사한 직원의 급여 정보를 입력하고 퇴직금을 계산할 수 있습니다.
                </p>

                {pastEmployees && pastEmployees.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>입사일</th>
                          <th>퇴사일</th>
                          <th>근속기간</th>
                          <th>평균 월급여</th>
                          <th>퇴직금</th>
                          <th>비고</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastEmployees.map((emp) => {
                          const years = ((new Date(emp.resignation_date) - new Date(emp.hire_date)) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
                          return (
                            <tr key={emp.id}>
                              <td style={{ fontWeight: '600' }}>{emp.name}</td>
                              <td>{formatDate(emp.hire_date)}</td>
                              <td>{formatDate(emp.resignation_date)}</td>
                              <td>{years}년</td>
                              <td>{Number(emp.average_monthly_salary).toLocaleString()}원</td>
                              <td style={{ color: emp.severance_pay > 0 ? '#f59e0b' : '#9ca3af', fontWeight: '600' }}>
                                {emp.severance_pay > 0 ? `${Number(emp.severance_pay).toLocaleString()}원` : '1년 미만'}
                              </td>
                              <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.notes || '-'}</td>
                              <td>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  onClick={() => handleDeletePastEmployee(emp.id)}
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    등록된 과거 직원이 없습니다.
                  </p>
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
                  <label className="form-label">재직 상태</label>
                  <select
                    name="employment_status"
                    className="form-input"
                    value={formData.employment_status || 'active'}
                    onChange={handleInputChange}
                  >
                    <option value="active">재직중</option>
                    <option value="on_leave">휴직</option>
                    <option value="resigned">퇴사</option>
                  </select>
                </div>
                {formData.employment_status === 'resigned' && (
                  <div className="form-group">
                    <label className="form-label">퇴사일</label>
                    <input
                      type="date"
                      name="resignation_date"
                      className="form-input"
                      value={formData.resignation_date || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
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
                근무 요일
              </h4>

              <div className="form-group">
                <label className="form-label">근무 요일 선택</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => {
                    const dayValue = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][index];
                    const workDays = formData.work_days ? formData.work_days.split(',') : [];
                    const isChecked = workDays.includes(dayValue);
                    
                    return (
                      <label
                        key={dayValue}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          border: isChecked ? '2px solid #667eea' : '2px solid #e5e7eb',
                          background: isChecked ? '#f0f4ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontWeight: isChecked ? '600' : '400',
                          color: isChecked ? '#667eea' : '#6b7280'
                        }}
                      >
                        <input
                          type="checkbox"
                          name="work_days"
                          value={dayValue}
                          checked={isChecked}
                          onChange={(e) => {
                            let newWorkDays = [...workDays];
                            if (e.target.checked) {
                              if (!newWorkDays.includes(dayValue)) {
                                newWorkDays.push(dayValue);
                              }
                            } else {
                              newWorkDays = newWorkDays.filter(d => d !== dayValue);
                            }
                            setFormData({ ...formData, work_days: newWorkDays.join(',') });
                          }}
                          style={{ marginRight: '6px' }}
                        />
                        {day}
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                  💡 직원이 근무하는 요일을 선택하세요. 선택하지 않으면 전체 요일 근무로 간주됩니다.
                </small>
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
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <small style={{ color: '#6b7280' }}>현재 파일: {formData.contract_file}</small>
                      <button
                        type="button"
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.contract_file}`, '_blank')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        보기
                      </button>
                      <a
                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.contract_file}`}
                        download
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        다운로드
                      </a>
                    </div>
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
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <small style={{ color: '#6b7280' }}>현재 파일: {formData.resume_file}</small>
                      <button
                        type="button"
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.resume_file}`, '_blank')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        보기
                      </button>
                      <a
                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.resume_file}`}
                        download
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        다운로드
                      </a>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">신분증 사본</label>
                  <input
                    type="file"
                    name="id_card_file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {formData.id_card_file && typeof formData.id_card_file === 'string' && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <small style={{ color: '#6b7280' }}>현재 파일: {formData.id_card_file}</small>
                      <button
                        type="button"
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.id_card_file}`, '_blank')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        보기
                      </button>
                      <a
                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.id_card_file}`}
                        download
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        다운로드
                      </a>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">가족관계증명서/등본</label>
                  <input
                    type="file"
                    name="family_cert_file"
                    className="form-input"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {formData.family_cert_file && typeof formData.family_cert_file === 'string' && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <small style={{ color: '#6b7280' }}>현재 파일: {formData.family_cert_file}</small>
                      <button
                        type="button"
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.family_cert_file}`, '_blank')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        보기
                      </button>
                      <a
                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${formData.family_cert_file}`}
                        download
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        다운로드
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {formData.id && (
                <ConsentInfo 
                  privacyConsent={formData.privacy_consent}
                  locationConsent={formData.location_consent}
                  privacyConsentDate={formData.privacy_consent_date}
                  locationConsentDate={formData.location_consent_date}
                />
              )}

              {!formData.id && (
                <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fbbf24' }}>
                  <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                    💡 <strong>개인정보 수집 동의</strong>는 직원이 최초 로그인 시 직접 진행합니다.
                  </p>
                </div>
              )}

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
                  <label className="form-label">
                    {formData.salary_type === 'hourly' ? '시급' : 
                     formData.salary_type === 'monthly' ? '월급' : 
                     formData.salary_type === 'annual' ? '연봉' : '기본급'}
                  </label>
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

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">인건비 신고</label>
                  <select
                    name="tax_type"
                    className="form-select"
                    value={formData.tax_type || '4대보험'}
                    onChange={handleInputChange}
                  >
                    <option value="4대보험">4대보험</option>
                    <option value="3.3%">3.3% (프리랜서)</option>
                    <option value="일용직">일용직</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">초과근무수당 (시급)</label>
                  <input
                    type="number"
                    name="overtime_pay"
                    className="form-input"
                    value={formData.overtime_pay || ''}
                    onChange={handleInputChange}
                    placeholder="원 (1시간당)"
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    💡 기본 근무시간 초과 시 적용되는 시급을 입력하세요
                  </small>
                </div>
              </div>

              {formData.salary_type === 'hourly' && (
                <div className="form-group">
                  <label className="form-label">주휴수당 설정</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="weekly_holiday_type"
                        value="included"
                        checked={formData.weekly_holiday_type === 'included' || !formData.weekly_holiday_type}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          weekly_holiday_type: e.target.value,
                          weekly_holiday_pay: 1 
                        })}
                        style={{ marginRight: '6px' }}
                      />
                      주휴수당 포함
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="weekly_holiday_type"
                        value="separate"
                        checked={formData.weekly_holiday_type === 'separate'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          weekly_holiday_type: e.target.value,
                          weekly_holiday_pay: 1 
                        })}
                        style={{ marginRight: '6px' }}
                      />
                      주휴수당 별도
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="weekly_holiday_type"
                        value="none"
                        checked={formData.weekly_holiday_type === 'none'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          weekly_holiday_type: e.target.value,
                          weekly_holiday_pay: 0 
                        })}
                        style={{ marginRight: '6px' }}
                      />
                      미적용
                    </label>
                  </div>
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                    💡 포함: 시급에 주휴수당 포함 / 별도: 주휴수당 별도 계산 / 미적용: 주휴수당 없음
                  </small>
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

      {/* 과거 직원 등록 모달 */}
      {showModal && modalType === 'pastEmployee' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              과거 직원 등록
            </div>

            {message.text && (
              <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmitPastEmployee}>
              <div className="form-group">
                <label className="form-label">이름 *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="직원 이름"
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">입사일 *</label>
                  <input
                    type="date"
                    name="hire_date"
                    className="form-input"
                    value={formData.hire_date || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">퇴사일 *</label>
                  <input
                    type="date"
                    name="resignation_date"
                    className="form-input"
                    value={formData.resignation_date || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">평균 월급여 *</label>
                <input
                  type="number"
                  name="average_monthly_salary"
                  className="form-input"
                  value={formData.average_monthly_salary || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="예: 2500000"
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  💡 퇴직금 계산에 사용됩니다
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">비고</label>
                <textarea
                  name="notes"
                  className="form-input"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="추가 메모 (선택사항)"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 급여 변경 이력 모달 */}
      {showModal && modalType === 'salaryHistory' && salaryHistory && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              💰 {salaryHistory.employeeName} - 급여 변경 이력
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#374151', marginBottom: '12px' }}>현재 급여</h4>
              {salaryHistory.current ? (
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>급여 유형</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                        {getSalaryTypeName(salaryHistory.current.salary_type)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>금액</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                        {Number(salaryHistory.current.amount).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>급여 정보가 없습니다.</p>
              )}
            </div>

            <div>
              <h4 style={{ color: '#374151', marginBottom: '12px' }}>변경 이력</h4>
              {salaryHistory.history && salaryHistory.history.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>변경일</th>
                        <th>이전 유형</th>
                        <th>이전 금액</th>
                        <th>→</th>
                        <th>변경 유형</th>
                        <th>변경 금액</th>
                        <th>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryHistory.history.map((record) => (
                        <tr key={record.id}>
                          <td style={{ fontSize: '12px' }}>{formatDate(record.change_date)}</td>
                          <td style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {getSalaryTypeName(record.old_salary_type)}
                          </td>
                          <td style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {Number(record.old_amount).toLocaleString()}원
                          </td>
                          <td style={{ textAlign: 'center' }}>→</td>
                          <td style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                            {getSalaryTypeName(record.new_salary_type)}
                          </td>
                          <td style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                            {Number(record.new_amount).toLocaleString()}원
                          </td>
                          <td style={{ fontSize: '11px', color: '#6b7280' }}>
                            {record.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px 0' }}>
                  변경 이력이 없습니다.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                닫기
              </button>
            </div>
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
