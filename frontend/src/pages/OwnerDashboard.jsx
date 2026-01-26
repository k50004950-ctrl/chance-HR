import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { workplaceAPI, employeeAPI, attendanceAPI, salaryAPI, pastEmployeeAPI, salaryHistoryAPI, pastPayrollAPI, authAPI, pushAPI, announcementsAPI, communityAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import ConsentInfo from '../components/ConsentInfo';
import QRCode from 'qrcode';
import { searchAddress, getCoordinatesFromAddress } from '../utils/addressSearch';
import AnnouncementModal from '../components/AnnouncementModal';
import DashboardSummaryCards from '../components/DashboardSummaryCards';
import MainActionButtons from '../components/MainActionButtons';
import Toast from '../components/Toast';
import NotificationCenter from '../components/NotificationCenter';
import MobileLayout from '../components/MobileLayout';
import MobileDashboard from '../components/MobileDashboard';
import MobileActionCard from '../components/MobileActionCard';
import useIsMobile from '../hooks/useIsMobile';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [salaryFlowStep, setSalaryFlowStep] = useState(1); // 급여 계산 단계: 1=근무내역, 2=미리보기, 3=확정, 4=발송
  const [editedSalaries, setEditedSalaries] = useState({}); // 수정된 급여: { employeeId: amount }
  const [salaryConfirmed, setSalaryConfirmed] = useState(false); // 급여 확정 여부
  const [showConfirmWarning, setShowConfirmWarning] = useState(false); // 확정 경고 모달
  const [notifications, setNotifications] = useState([]); // 알림 목록
  const [showMoreMenu, setShowMoreMenu] = useState(false); // 더보기 메뉴
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [employeesWithoutContract, setEmployeesWithoutContract] = useState([]);
  const [pastEmployees, setPastEmployees] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState(null);
  const [salaryViewMode, setSalaryViewMode] = useState('month');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [salaryPeriodRange, setSalaryPeriodRange] = useState(null);
  const [pastPayrollEmployeeId, setPastPayrollEmployeeId] = useState('');
  const [pastPayrollYear, setPastPayrollYear] = useState(() => new Date().getFullYear());
  const [pastPayrollMonth, setPastPayrollMonth] = useState('');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState('all');
  const [rosterViewMode, setRosterViewMode] = useState(
    () => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'cards' : 'table')
  );
  const [pastPayrollRecords, setPastPayrollRecords] = useState([]);
  const [usernameCheckStatus, setUsernameCheckStatus] = useState('unchecked');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPrintMessage, setQrPrintMessage] = useState('');
  const [qrPrintSaving, setQrPrintSaving] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipFormData, setSlipFormData] = useState({
    userId: '',
    payrollMonth: '',
    payDate: '',
    taxType: '4대보험',
    basePay: '',
    dependentsCount: 1,
    nationalPension: '',
    healthInsurance: '',
    employmentInsurance: '',
    longTermCare: '',
    incomeTax: '',
    localIncomeTax: '',
    employerNationalPension: '',
    employerHealthInsurance: '',
    employerEmploymentInsurance: '',
    employerLongTermCare: ''
  });
  const [editingSlipId, setEditingSlipId] = useState(null);
  const [selectedSlipEmployee, setSelectedSlipEmployee] = useState(null);
  const [employeeSlips, setEmployeeSlips] = useState([]);
  const [showPayrollLedger, setShowPayrollLedger] = useState(false);
  const [payrollLedgerData, setPayrollLedgerData] = useState(null);
  const [payrollLedgerMonth, setPayrollLedgerMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPublicKeyReady, setPushPublicKeyReady] = useState(true);
  const [qrCollapsed, setQrCollapsed] = useState(true);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [workplaceForm, setWorkplaceForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: ''
  });
  const [workplaceSaving, setWorkplaceSaving] = useState(false);
  const [workplaceLocationLoading, setWorkplaceLocationLoading] = useState(false);
  const [workplaceSearchLoading, setWorkplaceSearchLoading] = useState(false);
  const [workplaceGeocodeLoading, setWorkplaceGeocodeLoading] = useState(false);
  const [pastPayrollForm, setPastPayrollForm] = useState({
    start_date: '',
    end_date: '',
    salary_type: 'monthly',
    amount: '',
    notes: ''
  });
  const [pastPayrollEnabled, setPastPayrollEnabled] = useState(false);
  const [resignationForm, setResignationForm] = useState({
    id: null,
    name: '',
    resignation_date: '',
    separation_type: '',
    separation_reason: ''
  });
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [slipToPublish, setSlipToPublish] = useState(null);
  
  // 커뮤니티 관련 state
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [communityModalType, setCommunityModalType] = useState('create'); // create, edit, view
  const [communityFormData, setCommunityFormData] = useState({ id: null, title: '', content: '' });
  
  const uploadBaseUrl =
    import.meta.env.VITE_API_URL?.replace('/api', '') ||
    (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

  useEffect(() => {
    loadWorkplaces();
    checkAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityPosts();
    } else if (activeTab === 'dashboard' && selectedWorkplace) {
      loadDashboardData();
    }
  }, [activeTab, selectedWorkplace]);

  // 알림 생성 (데이터 로드 후)
  useEffect(() => {
    if (employees.length > 0 && attendance.length > 0) {
      generateNotifications();
    }
  }, [employees, attendance, employeeSlips]);

  const loadDashboardData = async () => {
    if (!selectedWorkplace) return;
    
    try {
      // 오늘 날짜
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // 이번 달
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${year}-${month}`;
      
      // 병렬로 데이터 로드
      await Promise.all([
        loadEmployees(),
        loadAttendance(todayStr)
      ]);
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    }
  };

  const getDashboardStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);
    const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
    
    // 오늘 출근한 인원
    const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
    
    // 미퇴근 인원 (출근했지만 퇴근 안 한 사람)
    const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
    
    // 이번 달 급여명세서 상태
    const totalSlips = employeeSlips.length;
    const publishedSlips = employeeSlips.filter(s => s.published).length;
    
    return {
      todayAttendance: checkedInToday,
      totalEmployees: activeEmployees.length,
      notCheckedOut,
      monthlyPayrollStatus: {
        total: activeEmployees.length,
        published: publishedSlips
      }
    };
  };

  // 알림 생성 함수
  const generateNotifications = () => {
    const newNotifications = [];
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);
    const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
    
    // 1. 미퇴근 직원 (긴급)
    const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time);
    if (notCheckedOut.length > 0) {
      newNotifications.push({
        icon: '⚠️',
        title: '미퇴근',
        message: `${notCheckedOut.length}명`,
        urgent: true,
        action: 'attendance',
        actionLabel: '확인'
      });
    }
    
    // 2. 급여일 임박 (D-3 이내)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const daysInMonth = new Date(currentDate.getFullYear(), currentMonth, 0).getDate();
    const currentDay = currentDate.getDate();
    
    // 말일 지급인 경우
    if (daysInMonth - currentDay <= 3 && daysInMonth - currentDay >= 0) {
      const unpublishedCount = employeeSlips.filter(s => !s.published).length;
      if (unpublishedCount > 0) {
        newNotifications.push({
          icon: '💸',
          title: '급여 미발송',
          message: `${unpublishedCount}명`,
          urgent: daysInMonth - currentDay <= 1,
          action: 'salary-slips',
          actionLabel: '확인'
        });
      }
    }
    
    // 3. 계약 만료 임박 (30일 이내)
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const expiringContracts = activeEmployees.filter(emp => {
      if (!emp.contract_end_date) return false;
      const endDate = new Date(emp.contract_end_date);
      return endDate <= thirtyDaysLater && endDate >= currentDate;
    });
    
    if (expiringContracts.length > 0) {
      newNotifications.push({
        icon: '📋',
        title: '계약 만료',
        message: `${expiringContracts.length}명`,
        urgent: false,
        action: 'roster',
        actionLabel: '확인'
      });
    }
    
    // 4. 오늘 결근한 직원 (출근일인데 출근 안 함)
    const absentToday = activeEmployees.filter(emp => {
      const workDays = Array.isArray(emp.work_days) 
        ? emp.work_days 
        : (emp.work_days ? emp.work_days.split(',') : []);
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayKey = dayKeys[currentDate.getDay()];
      const isScheduled = workDays.length === 0 || workDays.includes(todayKey);
      if (!isScheduled) return false;
      
      const hasRecord = todayAttendance.some(a => a.user_id === emp.id);
      return !hasRecord;
    });
    
    if (absentToday.length > 0) {
      newNotifications.push({
        icon: '❌',
        title: '미출근',
        message: `${absentToday.length}명`,
        urgent: false,
        action: 'attendance',
        actionLabel: '확인'
      });
    }
    
    setNotifications(newNotifications);
  };

  // 알림 액션 핸들러
  const handleNotificationAction = (action) => {
    setActiveTab(action);
  };

  // 출퇴근 상태 판단 함수
  const getAttendanceStatus = (record) => {
    // 휴가인 경우
    if (record.leave_type) {
      return { type: 'leave', label: record.leave_type === 'annual' ? '연차' : record.leave_type === 'paid' ? '유급휴가' : '무급휴가', color: '#3b82f6' };
    }

    // 미퇴근
    if (record.check_in_time && !record.check_out_time) {
      return { type: 'not_checked_out', label: '⚠️ 미퇴근', color: '#dc2626', bgColor: '#fee2e2' };
    }

    // 미완료
    if (!record.check_in_time || !record.check_out_time) {
      return { type: 'incomplete', label: '⏱ 미완료', color: '#ef4444', bgColor: '#fee2e2' };
    }

    // 정상 출퇴근 (시간 체크)
    const employee = employees.find(emp => emp.name === record.employee_name);
    if (employee && employee.work_start_time && record.check_in_time) {
      const checkInTime = new Date(record.check_in_time);
      const [startHour, startMinute] = employee.work_start_time.split(':').map(Number);
      const workStartTime = new Date(checkInTime);
      workStartTime.setHours(startHour, startMinute, 0, 0);

      // 10분 이상 늦었으면 지각
      const lateMins = (checkInTime - workStartTime) / 1000 / 60;
      if (lateMins > 10) {
        return { type: 'late', label: '🕐 지각', color: '#f59e0b', bgColor: '#fef3c7' };
      }
    }

    // 정상
    return { type: 'completed', label: '✓ 정상', color: '#059669', bgColor: '#d1fae5' };
  };

  const checkAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getActive();
      if (response.data && response.data.length > 0) {
        setCurrentAnnouncement(response.data[0]); // 첫 번째 공지만 표시
        setShowAnnouncementModal(true);
      }
    } catch (error) {
      console.error('공지사항 확인 오류:', error);
    }
  };

  const handleCloseAnnouncement = async () => {
    if (currentAnnouncement) {
      try {
        await announcementsAPI.markAsRead(currentAnnouncement.id);
      } catch (error) {
        console.error('공지사항 읽음 처리 오류:', error);
      }
    }
    setShowAnnouncementModal(false);
    setCurrentAnnouncement(null);
  };

  useEffect(() => {
    if (selectedWorkplace) {
      loadEmployees();
      if (activeTab === 'attendance' || activeTab === 'calendar') {
        loadAttendance();
      }
      if (activeTab === 'salary' || activeTab === 'severance') {
        loadSalary();
      }
      if (activeTab === 'past-employees') {
        loadPastEmployees();
      }
    }
  }, [selectedWorkplace, activeTab, selectedMonth, salaryViewMode, selectedYear]);

  useEffect(() => {
    if (selectedWorkplace && (activeTab === 'salary' || activeTab === 'severance')) {
      loadSalary();
    }
  }, [employees]);

  useEffect(() => {
    setQrData(null);
  }, [selectedWorkplace]);

  useEffect(() => {
    const currentWorkplace = workplaces.find((workplace) => workplace.id === selectedWorkplace);
    setQrPrintMessage(currentWorkplace?.qr_print_message || '');
  }, [workplaces, selectedWorkplace]);

  useEffect(() => {
    const currentWorkplace = workplaces.find((workplace) => workplace.id === selectedWorkplace);
    if (!currentWorkplace) {
      setWorkplaceForm({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radius: ''
      });
      return;
    }
    setWorkplaceForm({
      name: currentWorkplace.name || '',
      address: currentWorkplace.address || '',
      latitude: currentWorkplace.latitude ?? '',
      longitude: currentWorkplace.longitude ?? '',
      radius: currentWorkplace.radius ?? ''
    });
  }, [workplaces, selectedWorkplace]);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setPushSupported(supported);

    if (!supported) {
      setPushEnabled(false);
      return;
    }

    pushAPI.getPublicKey().then((response) => {
      setPushPublicKeyReady(!!response.data?.publicKey);
    }).catch(() => {
      setPushPublicKeyReady(false);
    });

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) {
        setPushEnabled(false);
        return;
      }
      registration.pushManager.getSubscription().then((subscription) => {
        setPushEnabled(!!subscription);
      });
    });
  }, []);

  useEffect(() => {
    if (pastPayrollEmployeeId) {
      loadPastPayroll(pastPayrollEmployeeId);
    } else {
      setPastPayrollRecords([]);
    }
  }, [pastPayrollEmployeeId]);

  useEffect(() => {
    if (showModal && modalType === 'employee') {
      if (formData.id) {
        loadPastPayroll(formData.id);
      } else {
        setPastPayrollRecords([]);
      }
    }
  }, [showModal, modalType, formData.id]);

  // 급여명세서 탭 전환 시 당월 급여대장 자동 로드 및 펼치기
  useEffect(() => {
    const loadCurrentMonthLedger = async () => {
      if (activeTab === 'salary-slips' && selectedWorkplace && payrollLedgerMonth) {
        setQrCollapsed(false); // 탭 진입 시 항상 펼치기
        try {
          setLoading(true);
          const response = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
          setPayrollLedgerData(response.data);
        } catch (error) {
          console.error('당월 급여대장 자동 로드 오류:', error);
          setPayrollLedgerData({ slips: [] }); // 빈 데이터로 초기화
        } finally {
          setLoading(false);
        }
      }
    };

    loadCurrentMonthLedger();
  }, [activeTab, selectedWorkplace, payrollLedgerMonth]);

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
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const response = await attendanceAPI.getByWorkplace(selectedWorkplace, { startDate, endDate });
      setAttendance(response.data);
      calculateAttendanceStats(response.data);
    } catch (error) {
      console.error('출퇴근 기록 조회 오류:', error);
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

  const lunarHolidayMap = {
    '2025-01-27': '설날 연휴',
    '2025-01-28': '설날 연휴',
    '2025-01-29': '설날',
    '2025-01-30': '설날 연휴',
    '2025-10-05': '추석 연휴',
    '2025-10-06': '추석',
    '2025-10-07': '추석 연휴',
    '2026-02-16': '설날 연휴',
    '2026-02-17': '설날',
    '2026-02-18': '설날 연휴',
    '2026-09-24': '추석 연휴',
    '2026-09-25': '추석',
    '2026-09-26': '추석 연휴'
  };

  const getHolidayName = (dateKey) => {
    if (!dateKey) return '';
    if (lunarHolidayMap[dateKey]) return lunarHolidayMap[dateKey];
    const monthDay = dateKey.slice(5, 10);
    return fixedHolidayMap[monthDay] || '';
  };

  const formatNameList = (names) => {
    if (!names || names.length === 0) return '';
    const display = names.slice(0, 3).join(', ');
    const extra = names.length > 3 ? ` 외 ${names.length - 3}명` : '';
    return `${display}${extra}`;
  };

  const buildOwnerCalendarDays = () => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekday = firstDay.getDay();
    const lastDay = new Date(year, month, 0).getDate();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const attendanceByKey = new Map();
    attendance.forEach((record) => {
      if (!record.user_id || !record.date) return;
      attendanceByKey.set(`${record.user_id}-${record.date}`, record);
    });

    const days = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    for (let day = 1; day <= lastDay; day += 1) {
      const dateKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const weekdayKey = dayKeys[new Date(year, month - 1, day).getDay()];
      const workingEmployees = employees.filter((emp) => emp.employment_status !== 'resigned');

      let completed = 0;
      let incomplete = 0;
      let absent = 0;
      let annual = 0;
      let paid = 0;
      let unpaid = 0;
      const completedNames = [];
      const incompleteNames = [];
      const absentNames = [];
      const leaveNames = [];

      workingEmployees.forEach((emp) => {
        const workDays = Array.isArray(emp.work_days) 
          ? emp.work_days 
          : (emp.work_days ? emp.work_days.split(',') : []);
        const isScheduled = workDays.length === 0 || workDays.includes(weekdayKey);
        if (!isScheduled) return;

        const record = attendanceByKey.get(`${emp.id}-${dateKey}`);
        if (record?.leave_type) {
          if (record.leave_type === 'annual') annual += 1;
          if (record.leave_type === 'paid') paid += 1;
          if (record.leave_type === 'unpaid') unpaid += 1;
          leaveNames.push(emp.name);
          return;
        }

        if (!record || !record.check_in_time) {
          absent += 1;
          absentNames.push(emp.name);
          return;
        }

        if (record.check_in_time && record.check_out_time) {
          completed += 1;
          completedNames.push(emp.name);
        } else {
          incomplete += 1;
          incompleteNames.push(emp.name);
        }
      });

      days.push({
        key: dateKey,
        dateKey,
        day,
        holiday: getHolidayName(dateKey),
        completed,
        incomplete,
        absent,
        annual,
        paid,
        unpaid,
        completedNames,
        incompleteNames,
        absentNames,
        leaveNames
      });
    }

    return days;
  };

  const getSeverancePayById = (employeeId) => {
    if (!salaryData || !salaryData.employees) return 0;
    const match = salaryData.employees.find((emp) => emp.employeeId === employeeId);
    return match?.severancePay || 0;
  };

  const getYearsOfService = (hireDate) => {
    if (!hireDate) return '-';
    const start = new Date(hireDate);
    if (Number.isNaN(start.getTime())) return '-';
    const today = new Date();
    const years = (today - start) / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
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

  const handleGenerateQr = async (forceRegenerate = false) => {
    if (!selectedWorkplace) {
      setMessage({ type: 'error', text: '사업장을 선택해주세요.' });
      return;
    }

    setQrLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await attendanceAPI.generateQr({
        workplaceId: selectedWorkplace,
        regenerate: forceRegenerate
      });

      const { checkInToken, checkOutToken } = response.data;
      const qrBaseUrl = `${window.location.origin}/#/qr`;
      const checkInPayload = `${qrBaseUrl}?token=${encodeURIComponent(checkInToken)}`;
      const checkOutPayload = `${qrBaseUrl}?token=${encodeURIComponent(checkOutToken)}`;

      const [checkInQr, checkOutQr] = await Promise.all([
        QRCode.toDataURL(checkInPayload, { width: 220, margin: 1 }),
        QRCode.toDataURL(checkOutPayload, { width: 220, margin: 1 })
      ]);

      setQrData({
        checkInQr,
        checkOutQr
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'QR 생성에 실패했습니다.'
      });
    } finally {
      setQrLoading(false);
    }
  };

  const escapePrintMessage = (value) => {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handlePrintQr = () => {
    if (!qrData) return;
    const messageHtml = escapePrintMessage(qrPrintMessage).replace(/\n/g, '<br/>');

    const printWindow = window.open('', '_blank', 'width=720,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>출퇴근 QR</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; }
            .title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
            img { width: 220px; height: 220px; }
            .hint { margin-top: 16px; font-size: 12px; color: #666; }
            .memo { margin-top: 24px; padding: 16px; border: 1px dashed #bbb; border-radius: 8px; min-height: 120px; white-space: pre-wrap; }
            .memo-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h2>출퇴근 QR</h2>
          <div class="grid">
            <div class="card">
              <div class="title">출근 QR</div>
              <img src="${qrData.checkInQr}" alt="출근 QR" />
            </div>
            <div class="card">
              <div class="title">퇴근 QR</div>
              <img src="${qrData.checkOutQr}" alt="퇴근 QR" />
            </div>
          </div>
          <div class="hint">직원이 QR을 스캔하면 로그인 후 자동으로 출/퇴근이 기록됩니다.</div>
          <div class="memo">
            <div class="memo-title">인쇄용 문구</div>
            ${messageHtml || ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSaveQrPrintMessage = async () => {
    const currentWorkplace = workplaces.find((workplace) => workplace.id === selectedWorkplace);
    if (!currentWorkplace) {
      setMessage({ type: 'error', text: '사업장을 선택해주세요.' });
      return;
    }

    setQrPrintSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await workplaceAPI.update(currentWorkplace.id, {
        name: currentWorkplace.name,
        address: currentWorkplace.address,
        latitude: currentWorkplace.latitude,
        longitude: currentWorkplace.longitude,
        radius: currentWorkplace.radius,
        default_off_days: currentWorkplace.default_off_days || '',
        qr_print_message: qrPrintMessage
      });

      setWorkplaces((prev) =>
        prev.map((workplace) =>
          workplace.id === currentWorkplace.id
            ? { ...workplace, qr_print_message: qrPrintMessage }
            : workplace
        )
      );
      setMessage({ type: 'success', text: '인쇄용 문구가 저장되었습니다.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || '인쇄용 문구 저장에 실패했습니다.'
      });
    } finally {
      setQrPrintSaving(false);
    }
  };

  const handleWorkplaceFormChange = (e) => {
    const { name, value } = e.target;
    setWorkplaceForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSetWorkplaceLocation = async () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: '현재 브라우저는 위치 정보를 지원하지 않습니다.' });
      return;
    }
    setWorkplaceLocationLoading(true);
    setMessage({ type: '', text: '' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWorkplaceForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setWorkplaceLocationLoading(false);
      },
      () => {
        setMessage({ type: 'error', text: '위치 정보를 가져오지 못했습니다. 위치 권한을 확인해주세요.' });
        setWorkplaceLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleSearchWorkplaceAddress = async () => {
    try {
      setWorkplaceSearchLoading(true);
      const result = await searchAddress();
      const address = result.address || '';
      setWorkplaceForm((prev) => ({
        ...prev,
        address
      }));
      if (address) {
        try {
          const coords = await getCoordinatesFromAddress(address);
          setWorkplaceForm((prev) => ({
            ...prev,
            latitude: coords.latitude?.toFixed ? coords.latitude.toFixed(6) : coords.latitude,
            longitude: coords.longitude?.toFixed ? coords.longitude.toFixed(6) : coords.longitude
          }));
          if (coords.success === false && coords.message) {
            setMessage({ type: 'error', text: coords.message });
          }
        } catch (error) {
          setMessage({ type: 'error', text: '주소 좌표 변환에 실패했습니다. 수동으로 입력해주세요.' });
        }
      }
    } catch (error) {
      if (error?.message) {
        setMessage({ type: 'error', text: error.message });
      }
    } finally {
      setWorkplaceSearchLoading(false);
    }
  };

  const handleWorkplaceAddressBlur = async () => {
    if (!workplaceForm.address) return;
    if (workplaceGeocodeLoading) return;
    try {
      setWorkplaceGeocodeLoading(true);
      const coords = await getCoordinatesFromAddress(workplaceForm.address);
      if (coords && coords.latitude && coords.longitude) {
        setWorkplaceForm((prev) => ({
          ...prev,
          latitude: coords.latitude?.toFixed ? coords.latitude.toFixed(6) : coords.latitude,
          longitude: coords.longitude?.toFixed ? coords.longitude.toFixed(6) : coords.longitude
        }));
        if (coords.success === false && coords.message) {
          setMessage({ type: 'error', text: coords.message });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '주소 좌표 변환에 실패했습니다. 주소 검색을 이용해주세요.' });
    } finally {
      setWorkplaceGeocodeLoading(false);
    }
  };

  const handleSaveWorkplace = async () => {
    const currentWorkplace = workplaces.find((workplace) => workplace.id === selectedWorkplace);
    if (!currentWorkplace) {
      setMessage({ type: 'error', text: '사업장을 선택해주세요.' });
      return;
    }
    if (!workplaceForm.address) {
      setMessage({ type: 'error', text: '사업장 주소를 입력해주세요.' });
      return;
    }
    if (workplaceForm.latitude === '' || workplaceForm.longitude === '') {
      setMessage({ type: 'error', text: '사업장 위치(위도/경도)를 입력해주세요.' });
      return;
    }

    setWorkplaceSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        name: workplaceForm.name || currentWorkplace.name,
        address: workplaceForm.address,
        latitude: Number(workplaceForm.latitude),
        longitude: Number(workplaceForm.longitude),
        radius: workplaceForm.radius !== '' ? Number(workplaceForm.radius) : currentWorkplace.radius,
        default_off_days: currentWorkplace.default_off_days || '',
        qr_print_message: currentWorkplace.qr_print_message || ''
      };
      await workplaceAPI.update(currentWorkplace.id, payload);
      setWorkplaces((prev) =>
        prev.map((workplace) =>
          workplace.id === currentWorkplace.id
            ? { ...workplace, ...payload }
            : workplace
        )
      );
      setMessage({ type: 'success', text: '사업장 정보가 수정되었습니다.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || '사업장 정보 수정에 실패했습니다.'
      });
    } finally {
      setWorkplaceSaving(false);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnablePush = async () => {
    if (!pushSupported) {
      setMessage({ type: 'error', text: '현재 브라우저는 웹 푸시를 지원하지 않습니다.' });
      return;
    }

    setPushLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage({ type: 'error', text: '알림 권한이 필요합니다.' });
        return;
      }

      const keyResponse = await pushAPI.getPublicKey();
      const publicKey = keyResponse.data.publicKey;
      if (!publicKey) {
        setMessage({ type: 'error', text: '웹 푸시 키가 설정되지 않았습니다.' });
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setPushEnabled(true);
        setMessage({ type: 'success', text: '이미 알림이 활성화되어 있습니다.' });
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await pushAPI.subscribe({
        subscription,
        userAgent: navigator.userAgent
      });

      setPushEnabled(true);
      setMessage({ type: 'success', text: '출퇴근 알림이 활성화되었습니다.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || '알림 설정에 실패했습니다.'
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    if (!pushSupported) {
      setPushEnabled(false);
      return;
    }

    setPushLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await pushAPI.unsubscribe({ endpoint: subscription.endpoint });
      }

      setPushEnabled(false);
      setMessage({ type: 'success', text: '출퇴근 알림이 해제되었습니다.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || '알림 해제에 실패했습니다.'
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendPushTest = async () => {
    if (!pushEnabled) {
      setMessage({ type: 'error', text: '알림을 먼저 켜주세요.' });
      return;
    }
    setPushLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await pushAPI.sendTest();
      setMessage({ type: 'success', text: '테스트 알림을 전송했습니다.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || '테스트 알림 전송에 실패했습니다.'
      });
    } finally {
      setPushLoading(false);
    }
  };

  const loadSalary = async () => {
    try {
      let startDate = '';
      let endDate = '';
      if (salaryViewMode === 'year') {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
        setSalaryPeriodRange(null);
      } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const activeEmployees = employees.filter((emp) => emp.employment_status !== 'resigned');
        const baseEmployee = activeEmployees.find((emp) =>
          emp.payroll_period_start_day !== null || emp.payroll_period_end_day !== null
        ) || activeEmployees[0];

        let startDay = baseEmployee?.payroll_period_start_day ?? 1;
        let endDay = baseEmployee?.payroll_period_end_day ?? 0;

        const hasCommonPeriod = baseEmployee
          ? activeEmployees.every((emp) => {
            const empStart = emp.payroll_period_start_day ?? 1;
            const empEnd = emp.payroll_period_end_day ?? 0;
            return empStart === startDay && empEnd === endDay;
          })
          : false;

        if (!hasCommonPeriod) {
          startDay = 1;
          endDay = 0;
        }

        const normalizedStart = Math.min(Math.max(Number(startDay) || 1, 1), lastDay);
        const normalizedEnd = endDay === 0
          ? lastDay
          : Math.min(Math.max(Number(endDay) || lastDay, 1), lastDay);

        startDate = `${selectedMonth}-${String(normalizedStart).padStart(2, '0')}`;
        endDate = `${selectedMonth}-${String(normalizedEnd).padStart(2, '0')}`;
        setSalaryPeriodRange({
          startDate,
          endDate,
          startDay: normalizedStart,
          endDay: normalizedEnd,
          hasCommonPeriod
        });
      }
      const response = await salaryAPI.calculateWorkplace(selectedWorkplace, { startDate, endDate });
      setSalaryData(response.data);
    } catch (error) {
      console.error('급여 계산 오류:', error);
    }
  };

  const getMonthRange = (year, month) => {
    if (!year || !month) return null;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
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

  const loadPastPayroll = async (employeeId) => {
    try {
      const response = await pastPayrollAPI.getByEmployee(employeeId);
      setPastPayrollRecords(response.data);
    } catch (error) {
      console.error('과거 급여 기록 조회 오류:', error);
      setPastPayrollRecords([]);
    }
  };

  const handleAddPastPayroll = async (employeeId) => {
    if (!pastPayrollForm.start_date || !pastPayrollForm.end_date || !pastPayrollForm.amount) {
      setMessage({ type: 'error', text: '기간과 금액을 입력해주세요.' });
      return;
    }

    try {
      await pastPayrollAPI.create(employeeId, {
        ...pastPayrollForm,
        amount: Number(pastPayrollForm.amount)
      });
      setMessage({ type: 'success', text: '과거 급여 기록이 등록되었습니다.' });
      setPastPayrollForm({
        start_date: '',
        end_date: '',
        salary_type: 'monthly',
        amount: '',
        notes: ''
      });
      loadPastPayroll(employeeId);
    } catch (error) {
      console.error('과거 급여 기록 등록 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '등록에 실패했습니다.' });
    }
  };

  const handleDeletePastPayroll = async (employeeId, recordId) => {
    if (!window.confirm('이 과거 급여 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await pastPayrollAPI.delete(employeeId, recordId);
      setMessage({ type: 'success', text: '과거 급여 기록이 삭제되었습니다.' });
      loadPastPayroll(employeeId);
    } catch (error) {
      console.error('과거 급여 기록 삭제 오류:', error);
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
    const normalizeDate = (value) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };
    const newFormData = {
      ...data,
      hire_date: normalizeDate(data.hire_date),
      birth_date: normalizeDate(data.birth_date),
      employment_renewal_date: normalizeDate(data.employment_renewal_date),
      contract_start_date: normalizeDate(data.contract_start_date),
      contract_end_date: normalizeDate(data.contract_end_date),
      resignation_date: normalizeDate(data.resignation_date),
      workplace_id: selectedWorkplace
    };
    console.log('모달 열기 - formData:', newFormData);
    setFormData(newFormData);
    if (type === 'employee') {
      setPastPayrollEnabled(false);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({});
    setPastPayrollEnabled(false);
    setPastPayrollRecords([]);
    setPastPayrollForm({
      start_date: '',
      end_date: '',
      salary_type: 'monthly',
      amount: '',
      notes: ''
    });
  };

  const handleInputChange = (e) => {
    if (e.target.name === 'username') {
      setUsernameCheckStatus('unchecked');
    }
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'ssn') {
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 7) {
          const yy = digits.slice(0, 2);
          const mm = digits.slice(2, 4);
          const dd = digits.slice(4, 6);
          const genderCode = digits.charAt(6);
          const isForeigner = ['5', '6', '7', '8'].includes(genderCode);
          if (isForeigner) {
            return next;
          }

          let century = '';
          if (['1', '2', '5', '6'].includes(genderCode)) century = '19';
          if (['3', '4', '7', '8'].includes(genderCode)) century = '20';
          if (['9', '0'].includes(genderCode)) century = '18';

          if (century) {
            const birthDate = `${century}${yy}-${mm}-${dd}`;
            const dateObj = new Date(birthDate);
            const isValidDate = !Number.isNaN(dateObj.getTime())
              && dateObj.getFullYear() === Number(`${century}${yy}`)
              && dateObj.getMonth() + 1 === Number(mm)
              && dateObj.getDate() === Number(dd);

            if (isValidDate) {
              const isMale = ['1', '3', '5', '7', '9'].includes(genderCode);
              const isFemale = ['2', '4', '6', '8', '0'].includes(genderCode);
              next.birth_date = birthDate;
              if (isMale) next.gender = 'male';
              if (isFemale) next.gender = 'female';
            }
          }
        }
      }

      return next;
    });
  };

  const handleCheckUsername = async () => {
    if (!formData.username) {
      setMessage({ type: 'error', text: '아이디를 입력해주세요.' });
      return;
    }

    try {
      setUsernameCheckLoading(true);
      const response = await authAPI.checkUsername(formData.username);
      if (response.data.available) {
        setUsernameCheckStatus('available');
        setMessage({ type: 'success', text: '사용 가능한 아이디입니다.' });
      } else {
        setUsernameCheckStatus('unavailable');
        setMessage({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      }
    } catch (error) {
      console.error('아이디 확인 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '아이디 확인에 실패했습니다.' });
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData({
      ...formData,
      [name]: files[0]
    });
  };

  const validateEmployeeForm = (form, formDataToSend) => {
    const errors = {};
    
    // 필수 항목 검증
    const requiredFields = {
      username: '아이디',
      password: '비밀번호',
      name: '이름',
      phone: '휴대폰',
      ssn: '주민등록번호',
      address: '주소',
      hire_date: '입사일',
      salary_type: '급여 형태',
      amount: '급여액',
      tax_type: '급여 신고'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      // 수정 모드일 때 password는 필수가 아님
      if (field === 'password' && formData.id) continue;
      
      const element = form.querySelector(`[name="${field}"]`);
      if (!element || !element.value || element.value.trim() === '') {
        errors[field] = `${label}을(를) 입력해주세요.`;
      }
    }

    // 주민등록번호 형식 검증
    const ssnElement = form.querySelector('[name="ssn"]');
    if (ssnElement && ssnElement.value) {
      const ssnPattern = /^\d{6}-?\d{7}$/;
      if (!ssnPattern.test(ssnElement.value)) {
        errors.ssn = '주민등록번호 형식이 올바르지 않습니다. (예: 000000-0000000)';
      }
    }

    // 휴대폰 형식 검증
    const phoneElement = form.querySelector('[name="phone"]');
    if (phoneElement && phoneElement.value) {
      const phonePattern = /^01[0-9]-?\d{3,4}-?\d{4}$/;
      if (!phonePattern.test(phoneElement.value)) {
        errors.phone = '휴대폰 번호 형식이 올바르지 않습니다. (예: 010-0000-0000)';
      }
    }

    return errors;
  };

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' }); // 이전 메시지 초기화
    setFormErrors({}); // 이전 에러 초기화

    try {
      if (!formData.id && usernameCheckStatus !== 'available') {
        setToast({ message: '아이디 중복확인을 먼저 해주세요.', type: 'error' });
        setLoading(false);
        return;
      }
      const form = e.target;
      const formDataToSend = new FormData();
      
      // 폼 유효성 검증
      const errors = validateEmployeeForm(form, formDataToSend);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setLoading(false);
        setToast({ message: '입력 항목을 확인해주세요.', type: 'error' });
        return;
      }
      
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
        'emergency_contact', 'emergency_phone', 'hire_date', 'gender', 'birth_date',
        'career', 'job_type', 'employment_renewal_date', 'contract_start_date', 'contract_end_date',
        'employment_notes', 'position', 'department', 'notes', 'work_start_time',
        'work_end_time', 'employment_status',
        'pay_schedule_type', 'pay_day', 'pay_after_days', 'payroll_period_start_day', 'payroll_period_end_day',
        'deduct_absence'
      ];
      
      const fieldValues = {};
      textFields.forEach(field => {
        const element = form.querySelector(`[name="${field}"]`);
        if (element && element.value !== '') {
          fieldValues[field] = element.value;
          formDataToSend.append(field, element.value);
        }
      });

      if (!fieldValues.contract_start_date && fieldValues.hire_date) {
        formDataToSend.append('contract_start_date', fieldValues.hire_date);
      }
      if (!fieldValues.employment_renewal_date && fieldValues.hire_date) {
        formDataToSend.append('employment_renewal_date', fieldValues.hire_date);
      }
      
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
        setToast({ message: '✓ 직원 정보가 수정되었습니다.', type: 'success' });
        closeModal();
        loadEmployees();
        setFormErrors({});
      } else {
        const response = await employeeAPI.create(formDataToSend);
        console.log('등록 성공:', response);
        setToast({ message: '✓ 직원이 등록되었습니다.', type: 'success' });
        closeModal();
        loadEmployees();
        setFormErrors({});
      }
    } catch (error) {
      console.error('직원 등록/수정 오류:', error);
      console.error('에러 상세:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || '오류가 발생했습니다.';
      setToast({ message: errorMessage, type: 'error' });
      
      // 서버에서 받은 필드별 에러 처리
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }

    setLoading(false);
  };

  const openResignationModal = (employee) => {
    setResignationForm({
      id: employee.id,
      name: employee.name,
      resignation_date: employee.resignation_date ? employee.resignation_date.split('T')[0] : '',
      separation_type: employee.separation_type || '',
      separation_reason: employee.separation_reason || ''
    });
    setModalType('resignation');
    setShowModal(true);
  };

  const handleSaveResignation = async (e) => {
    e.preventDefault();
    if (!resignationForm.id || !resignationForm.resignation_date) {
      setMessage({ type: 'error', text: '퇴사일을 입력해주세요.' });
      return;
    }

    try {
      const payload = {
        employment_status: 'resigned',
        resignation_date: resignationForm.resignation_date,
        contract_end_date: resignationForm.resignation_date,
        separation_type: resignationForm.separation_type,
        separation_reason: resignationForm.separation_reason
      };
      await employeeAPI.update(resignationForm.id, payload);
      setMessage({ type: 'success', text: '퇴사 정보가 저장되었습니다.' });
      loadEmployees();
      setShowModal(false);
    } catch (error) {
      console.error('퇴사 정보 저장 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '퇴사 정보 저장에 실패했습니다.' });
    }
  };

  // 퇴사 취소 처리
  const handleCancelResignation = async (employeeId, employeeName) => {
    if (!confirm(`${employeeName} 직원의 퇴사를 취소하시겠습니까?\n재직 상태로 복구됩니다.`)) {
      return;
    }

    try {
      const payload = {
        employment_status: 'active',
        resignation_date: null,
        separation_type: null,
        separation_reason: null
      };
      await employeeAPI.update(employeeId, payload);
      setMessage({ type: 'success', text: '퇴사가 취소되고 재직 상태로 복구되었습니다.' });
      loadEmployees();
    } catch (error) {
      console.error('퇴사 취소 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '퇴사 취소에 실패했습니다.' });
    }
  };

  // 커뮤니티 관련 함수
  const loadCommunityPosts = async () => {
    try {
      setCommunityLoading(true);
      const response = await communityAPI.getPosts('owner');
      setCommunityPosts(response.data);
    } catch (error) {
      console.error('커뮤니티 게시글 로드 오류:', error);
      setMessage({ type: 'error', text: '게시글을 불러오는데 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  const openCommunityModal = (type, post = null) => {
    setCommunityModalType(type);
    if (post) {
      setCommunityFormData({ id: post.id, title: post.title, content: post.content });
    } else {
      setCommunityFormData({ id: null, title: '', content: '' });
    }
    setShowCommunityModal(true);
  };

  const handleSaveCommunityPost = async (e) => {
    e.preventDefault();
    if (!communityFormData.title || !communityFormData.content) {
      setMessage({ type: 'error', text: '제목과 내용을 입력해주세요.' });
      return;
    }

    try {
      setCommunityLoading(true);
      if (communityModalType === 'create') {
        await communityAPI.createPost({
          title: communityFormData.title,
          content: communityFormData.content
        });
        setMessage({ type: 'success', text: '게시글이 작성되었습니다.' });
      } else {
        await communityAPI.updatePost(communityFormData.id, {
          title: communityFormData.title,
          content: communityFormData.content
        });
        setMessage({ type: 'success', text: '게시글이 수정되었습니다.' });
      }
      setShowCommunityModal(false);
      loadCommunityPosts();
    } catch (error) {
      console.error('게시글 저장 오류:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || '게시글 저장에 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  const handleDeleteCommunityPost = async (postId) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) {
      return;
    }

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

  // 직원 계정 삭제 기능 제거 - 퇴사한 직원도 과거 기록을 볼 수 있도록 유지
  // 퇴사 처리만 사용하여 직원을 비활성화합니다.

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await attendanceAPI.update(formData.id, {
        check_in_time: formData.check_in_time,
        check_out_time: formData.check_out_time || null,
        leave_type: formData.leave_type || null
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

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return '-';
    return `${num.toLocaleString()}원`;
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
      '총지급액': emp.totalPay ?? emp.calculatedSalary
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
      { wch: 14 }  // 총지급액
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '급여계산');

    // 파일명 생성 (YYYY년MM월_급여계산.xlsx)
    const filename = salaryViewMode === 'year'
      ? `${selectedYear}년_급여계산.xlsx`
      : (() => {
        const [year, month] = selectedMonth.split('-');
        return `${year}년${month}월_급여계산.xlsx`;
      })();

    // 파일 다운로드
    XLSX.writeFile(wb, filename);
  };

  return (
    <div>
      <Header />
      <div className="container" style={{
        ...(isMobile && {
          padding: '0',
          maxWidth: '100%'
          // paddingBottom은 CSS에서 처리 (safe-area 포함)
        })
      }}>
        {/* 모바일 헤더 */}
        {isMobile ? (
          <div style={{
            position: 'sticky',
            top: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 16px 16px',
            zIndex: 100,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '12px',
              minHeight: '48px'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: '700',
                flex: 1,
                minWidth: 0,
                paddingRight: '12px'
              }}>
                {activeTab === 'dashboard' ? '홈' : 
                 activeTab === 'attendance' ? '출근 현황' :
                 activeTab === 'salary' ? '급여 관리' :
                 activeTab === 'roster' ? '직원 관리' :
                 activeTab === 'salary-slips' ? '급여명세서' :
                 activeTab === 'calendar' ? '출근 달력' :
                 activeTab === 'severance' ? '퇴직금 계산' :
                 activeTab === 'past-employees' ? '서류 보관함' :
                 activeTab === 'community' ? '소통방' :
                 activeTab === 'settings' ? '설정' : '더보기'}
              </h2>
              <NotificationCenter 
                notifications={notifications}
                onActionClick={handleNotificationAction}
              />
            </div>
            
            {/* 사업장 선택 (모바일) */}
            {workplaces.length > 0 && (
              <select
                value={selectedWorkplace || ''}
                onChange={(e) => setSelectedWorkplace(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  minHeight: '48px',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  background: 'rgba(255,255,255,0.95)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23667eea\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 16px center'
                }}
              >
                {workplaces.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: '#374151' }}>사업주 대시보드</h2>
            <NotificationCenter 
              notifications={notifications}
              onActionClick={handleNotificationAction}
            />
          </div>
        )}

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {/* 사업장 선택 (PC만) */}
        {!isMobile && workplaces.length > 0 && (
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

        {/* 사업장 주소/위치 수정은 설정 탭으로 이동 */}


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

            {/* 탭 메뉴 - 단순화 (PC만) */}
            {!isMobile && <div className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
                style={{ fontSize: '16px', fontWeight: '700' }}
              >
                🏠 메인
              </button>
              <button
                className={`nav-tab ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
                style={{ fontSize: '16px', fontWeight: '700' }}
              >
                📊 오늘 출근
              </button>
              <button
                className={`nav-tab ${activeTab === 'salary' ? 'active' : ''}`}
                onClick={() => setActiveTab('salary')}
                style={{ fontSize: '16px', fontWeight: '700' }}
              >
                💸 급여 보내기
              </button>
              
              {/* 더보기 메뉴 */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  className={`nav-tab ${showMoreMenu ? 'active' : ''}`}
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ⋯ 더보기
                  <span style={{ fontSize: '12px' }}>{showMoreMenu ? '▲' : '▼'}</span>
                </button>
                
                {showMoreMenu && (
                  <>
                    <div
                      onClick={() => setShowMoreMenu(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      zIndex: 10000,
                      minWidth: '220px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden'
                    }}>
                      <button
                        onClick={() => { setActiveTab('calendar'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'calendar' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'calendar' ? '#f3f4f6' : 'white'}
                      >
                        📅 출근 달력
                      </button>
                      <button
                        onClick={() => { setActiveTab('roster'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'roster' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'roster' ? '#f3f4f6' : 'white'}
                      >
                        👥 직원 관리
                      </button>
                      <button
                        onClick={() => { setActiveTab('salary-slips'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'salary-slips' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'salary-slips' ? '#f3f4f6' : 'white'}
                      >
                        📝 급여명세서
                      </button>
                      <button
                        onClick={() => { setActiveTab('severance'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'severance' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'severance' ? '#f3f4f6' : 'white'}
                      >
                        🧮 퇴직금 계산
                      </button>
                      <button
                        onClick={() => { setActiveTab('resigned'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'resigned' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'resigned' ? '#f3f4f6' : 'white'}
                      >
                        🧾 퇴사 처리
                      </button>
                      <button
                        onClick={() => { setActiveTab('past-employees'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'past-employees' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'past-employees' ? '#f3f4f6' : 'white'}
                      >
                        📁 서류 보관함
                      </button>
                      <button
                        onClick={() => { setActiveTab('community'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'community' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'community' ? '#f3f4f6' : 'white'}
                      >
                        💬 소통방
                      </button>
                      <button
                        onClick={() => { setActiveTab('settings'); setShowMoreMenu(false); }}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: 'none',
                          background: activeTab === 'settings' ? '#f3f4f6' : 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'settings' ? '#f3f4f6' : 'white'}
                      >
                        ⚙️ 설정
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>}

            {activeTab === 'calendar' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151' }}>📅 캘린더</h3>
                  <input
                    type="month"
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#6b7280' }}>
                    <span style={{ color: '#16a34a' }}>완료</span>
                    <span style={{ color: '#f97316' }}>미완료</span>
                    <span style={{ color: '#dc2626' }}>결근</span>
                    <span style={{ color: '#2563eb' }}>연차</span>
                    <span style={{ color: '#0ea5e9' }}>유급휴가</span>
                    <span style={{ color: '#8b5cf6' }}>무급휴가</span>
                    <span style={{ color: '#dc2626' }}>공휴일</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
                    <div
                      key={label}
                      style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}
                    >
                      {label}
                    </div>
                  ))}
                  {buildOwnerCalendarDays().map((day) => {
                    if (day.empty) {
                      return <div key={day.key} style={{ height: '120px' }} />;
                    }
                    return (
                      <div
                        key={day.key}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          minHeight: '120px',
                          background: day.holiday ? '#fef2f2' : 'white'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: '600', color: day.holiday ? '#dc2626' : '#374151' }}>
                          {day.day}
                        </div>
                        {day.holiday && (
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                            {day.holiday}
                          </div>
                        )}
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                          완료 {day.completed} / 미완료 {day.incomplete}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          결근 {day.absent}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          휴가 {day.annual + day.paid + day.unpaid}
                        </div>
                        {day.completedNames.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#15803d', marginTop: '4px' }}>
                            완료: {formatNameList(day.completedNames)}
                          </div>
                        )}
                        {day.absentNames.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '4px' }}>
                            결근: {formatNameList(day.absentNames)}
                          </div>
                        )}
                        {day.incompleteNames.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#c2410c', marginTop: '4px' }}>
                            미완료: {formatNameList(day.incompleteNames)}
                          </div>
                        )}
                        {day.leaveNames.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#1d4ed8', marginTop: '4px' }}>
                            휴가: {formatNameList(day.leaveNames)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 근로자 명부 (직원 관리 통합) */}
            {activeTab === 'roster' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ color: '#374151', marginBottom: '12px' }}>📋 근로자 명부</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn ${rosterViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setRosterViewMode('table')}
                      >
                        표 보기
                      </button>
                      <button
                        className={`btn ${rosterViewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setRosterViewMode('cards')}
                      >
                        카드 보기
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
                
                <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
                  📌 등록된 모든 직원의 상세 정보를 한눈에 확인할 수 있습니다.
                </p>

                {employees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    등록된 직원이 없습니다.
                  </p>
                ) : (
                  <>
                    {rosterViewMode === 'table' ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table table-mobile-cards">
                          <thead>
                            <tr>
                              <th>이름</th>
                              <th>상태</th>
                              <th>주민번호</th>
                              <th>생일</th>
                              <th>전화번호</th>
                              <th>주소</th>
                              <th>직책</th>
                              <th>입사일</th>
                              <th>급여유형</th>
                              <th>급여</th>
                              <th>인건비 신고</th>
                              <th>개인정보동의</th>
                              <th>비상연락망</th>
                              <th>관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter).map((emp) => (
                              <tr key={emp.id}>
                                <td data-label="이름" style={{ fontWeight: '600' }}>{emp.name}</td>
                                <td data-label="상태">
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
                                <td data-label="주민번호">{emp.ssn || '-'}</td>
                                <td data-label="생일">{formatDate(emp.birth_date)}</td>
                                <td data-label="전화번호">{emp.phone || '-'}</td>
                                <td data-label="주소" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {emp.address || '-'}
                                </td>
                                <td data-label="직책">{emp.position || '-'}</td>
                                <td data-label="입사일">{formatDate(emp.hire_date)}</td>
                                <td data-label="급여유형">{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</td>
                                <td data-label="급여">{formatCurrency(emp.amount)}</td>
                                <td data-label="인건비 신고" style={{ fontSize: '12px', color: '#6b7280' }}>{emp.tax_type || '4대보험'}</td>
                                <td data-label="개인정보동의" style={{ textAlign: 'center' }}>
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
                                <td data-label="비상연락망">
                                  {emp.emergency_contact ? (
                                    <div style={{ fontSize: '12px' }}>
                                      <div>{emp.emergency_contact}</div>
                                      <div style={{ color: '#6b7280' }}>{emp.emergency_phone || '-'}</div>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td data-label="관리">
                                  <button
                                    className="btn btn-secondary"
                                    style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px' }}
                                    onClick={() => openModal('employee', emp)}
                                  >
                                    수정
                                  </button>
                                  {emp.employment_status !== 'resigned' && (
                                    <button
                                      className="btn"
                                      style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                                      onClick={() => openResignationModal(emp)}
                                    >
                                      퇴사 처리
                                    </button>
                                  )}
                                  <button
                                    className="btn"
                                    style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px', background: '#f59e0b', color: 'white' }}
                                    onClick={() => handleViewSalaryHistory(emp.id, emp.name)}
                                  >
                                    이력
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="employee-card-grid">
                        {employees.filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter).map((emp) => (
                          <div key={emp.id} className="employee-card">
                            <div className="employee-card-header">
                              <div style={{ fontWeight: '700', fontSize: '16px' }}>{emp.name}</div>
                              <span className={`employee-status ${emp.employment_status}`}>
                                {emp.employment_status === 'active' ? '재직중' : emp.employment_status === 'on_leave' ? '휴직' : '퇴사'}
                              </span>
                            </div>
                            <div className="employee-card-meta">
                              <div><span>직책</span>{emp.position || '-'}</div>
                              <div><span>입사일</span>{formatDate(emp.hire_date)}</div>
                              <div><span>연락처</span>{emp.phone || '-'}</div>
                              <div><span>급여</span>{formatCurrency(emp.amount)}</div>
                              <div><span>급여유형</span>{emp.salary_type ? getSalaryTypeName(emp.salary_type) : '-'}</div>
                              <div><span>동의</span>{emp.privacy_consent && emp.location_consent ? '완료' : '미동의'}</div>
                            </div>
                            <div className="employee-card-actions">
                              <button
                                className="btn btn-secondary"
                                onClick={() => openModal('employee', emp)}
                              >
                                수정
                              </button>
                              {emp.employment_status !== 'resigned' && (
                                <button
                                  className="btn"
                                  style={{ background: '#ef4444', color: 'white' }}
                                  onClick={() => openResignationModal(emp)}
                                >
                                  퇴사 처리
                                </button>
                              )}
                              <button
                                className="btn"
                                style={{ background: '#f59e0b', color: 'white' }}
                                onClick={() => handleViewSalaryHistory(emp.id, emp.name)}
                              >
                                이력
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'resigned' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151', marginBottom: '12px' }}>🧾 퇴사 직원</h3>
                </div>

                {employees.filter((emp) => emp.employment_status === 'resigned').length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    퇴사한 직원이 없습니다.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>입사일</th>
                          <th>퇴사일</th>
                          <th>구분</th>
                          <th>사유</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees
                          .filter((emp) => emp.employment_status === 'resigned')
                          .map((emp) => (
                            <tr key={emp.id}>
                              <td style={{ fontWeight: '600' }}>{emp.name}</td>
                              <td>{formatDate(emp.hire_date)}</td>
                              <td>{formatDate(emp.resignation_date)}</td>
                              <td>
                                {emp.separation_type === 'dismissal'
                                  ? '해고'
                                  : emp.separation_type === 'death'
                                  ? '사망'
                                  : emp.separation_type === 'resignation'
                                  ? '퇴직'
                                  : '-'}
                              </td>
                              <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {emp.separation_reason || '-'}
                              </td>
                              <td>
                                <button
                                  className="btn"
                                  style={{ marginRight: '6px', padding: '6px 12px', fontSize: '12px', background: '#10b981', color: 'white' }}
                                  onClick={() => handleCancelResignation(emp.id, emp.name)}
                                >
                                  퇴사 취소
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  onClick={() => openResignationModal(emp)}
                                >
                                  수정
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

            {/* 메인 대시보드 */}
            {activeTab === 'dashboard' && (
              <div style={{ ...(isMobile && { padding: '16px' }) }}>
                {!isMobile && (
                  <>
                    <h2 style={{ marginBottom: '8px', color: '#111827', fontSize: '28px', fontWeight: '700' }}>
                      안녕하세요, {user?.name || '사장님'}! 👋
                    </h2>
                    <p style={{ marginBottom: '32px', color: '#6b7280', fontSize: '16px' }}>
                      오늘도 수고하셨습니다. 확인이 필요한 사항을 정리했습니다.
                    </p>
                  </>
                )}
                
                {/* 모바일 "해야 할 일" 요약 카드 */}
                {isMobile && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
                      📋 오늘 해야 할 일
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const todayAttendance = attendance.filter(a => a.date === today);
                        const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
                        const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
                        const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
                        const notCheckedIn = activeEmployees.length - checkedInToday;
                        
                        return (
                          <>
                            {notCheckedOut > 0 && (
                              <MobileActionCard
                                icon="⚠️"
                                title="미퇴근"
                                count={`${notCheckedOut}명`}
                                color="#ef4444"
                                urgent={true}
                                onClick={() => setActiveTab('attendance')}
                              />
                            )}
                            {notCheckedIn > 0 && (
                              <MobileActionCard
                                icon="❌"
                                title="미출근"
                                count={`${notCheckedIn}명`}
                                color="#f59e0b"
                                urgent={false}
                                onClick={() => setActiveTab('attendance')}
                              />
                            )}
                            <MobileActionCard
                              icon="✓"
                              title="출근 완료"
                              count={`${checkedInToday}명`}
                              color="#10b981"
                              urgent={false}
                              onClick={() => setActiveTab('attendance')}
                            />
                            {employeeSlips.filter(s => !s.published).length > 0 && (
                              <MobileActionCard
                                icon="💸"
                                title="급여 미발송"
                                count={`${employeeSlips.filter(s => !s.published).length}명`}
                                color="#667eea"
                                urgent={true}
                                onClick={() => setActiveTab('salary')}
                              />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* 오늘 해야 할 일 */}
                {notifications.filter(n => n.urgent).length > 0 && (
                  <div className="card" style={{
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    border: '2px solid #ef4444'
                  }}>
                    <h3 style={{ marginBottom: '16px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🚨 긴급 확인 필요
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {notifications.filter(n => n.urgent).map((notif, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '16px',
                            background: 'white',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: '1px solid #fecaca'
                          }}
                          onClick={() => handleNotificationAction(notif.action)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '32px' }}>{notif.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                                {notif.title}
                              </div>
                              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                {notif.message}
                              </div>
                            </div>
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '14px', padding: '8px 20px', whiteSpace: 'nowrap' }}
                            >
                              {notif.actionLabel}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 요약 카드 */}
                <DashboardSummaryCards {...getDashboardStats()} />
                
                {/* 주요 액션 버튼 */}
                <MainActionButtons
                  onAddEmployee={() => {
                    setModalType('employee');
                    setFormData({
                      id: null,
                      username: '',
                      password: '',
                      name: '',
                      phone: '',
                      email: '',
                      ssn: '',
                      address: '',
                      emergency_contact: '',
                      emergency_phone: '',
                      hire_date: '',
                      gender: '',
                      birth_date: '',
                      career: '',
                      job_type: '',
                      employment_renewal_date: '',
                      contract_start_date: '',
                      contract_end_date: '',
                      employment_notes: '',
                      separation_type: '',
                      separation_reason: '',
                      position: '',
                      department: '',
                      notes: '',
                      work_start_time: '09:00',
                      work_end_time: '18:00',
                      work_days: ['월', '화', '수', '목', '금'],
                      pay_schedule_type: 'monthly_fixed',
                      pay_day: 0,
                      pay_after_days: 0,
                      payroll_period_start_day: 1,
                      payroll_period_end_day: 0,
                      deduct_absence: false,
                      salary_type: 'monthly',
                      amount: '',
                      weekly_holiday_pay: false,
                      weekly_holiday_type: 'none',
                      overtime_pay: false,
                      tax_type: '4대보험',
                      workplace_id: selectedWorkplace,
                      resignation_date: ''
                    });
                    setShowModal(true);
                  }}
                  onViewAttendance={() => setActiveTab('attendance')}
                  onCreatePayroll={() => setActiveTab('salary-slips')}
                />

                {/* 일반 알림 - 요약 카드 */}
                {notifications.filter(n => !n.urgent).length > 0 && (
                  <div className="card" style={{ marginTop: '32px' }}>
                    <h3 style={{ marginBottom: '16px', color: '#374151' }}>📌 확인해주세요</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {notifications.filter(n => !n.urgent).map((notif, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: '1px solid #e5e7eb',
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                          }}
                          onClick={() => handleNotificationAction(notif.action)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            {/* 요약 정보 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '28px', flexShrink: 0 }}>{notif.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: '#374151', 
                                  fontSize: '16px',
                                  wordBreak: 'keep-all',
                                  overflowWrap: 'break-word'
                                }}>
                                  {notif.title}
                                </span>
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: '#667eea', 
                                  fontSize: '20px',
                                  marginLeft: '8px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {notif.message}
                                </span>
                              </div>
                            </div>
                            {/* 자세히 보기 버튼 */}
                            <button
                              className="btn btn-secondary"
                              style={{ 
                                fontSize: '13px', 
                                padding: '8px 16px', 
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}
                            >
                              자세히 보기
                              <span style={{ fontSize: '16px' }}>›</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 이번 달 진행 상황 */}
                <div className="card" style={{ marginTop: '32px' }}>
                  <h3 style={{ marginBottom: '20px', color: '#374151' }}>📊 이번 달 진행 상황</h3>
                  
                  {/* 급여 진행률 */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>
                        💸 급여명세서 발송
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#667eea' }}>
                        {employeeSlips.filter(s => s.published).length} / {employees.filter(e => e.employment_status === 'active').length}명
                      </span>
                    </div>
                    <div style={{
                      height: '12px',
                      background: '#e5e7eb',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        width: `${employees.filter(e => e.employment_status === 'active').length > 0 
                          ? (employeeSlips.filter(s => s.published).length / employees.filter(e => e.employment_status === 'active').length * 100) 
                          : 0}%`,
                        transition: 'width 0.5s ease',
                        borderRadius: '999px'
                      }} />
                    </div>
                  </div>

                  {/* 출근율 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>
                        📊 이번 달 출근율
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                        {(() => {
                          const thisMonth = new Date().toISOString().slice(0, 7);
                          const monthAttendance = attendance.filter(a => a.date.startsWith(thisMonth));
                          const completedCount = monthAttendance.filter(a => a.check_in_time && a.check_out_time).length;
                          const totalCount = monthAttendance.length;
                          return totalCount > 0 ? `${Math.round(completedCount / totalCount * 100)}%` : '0%';
                        })()}
                      </span>
                    </div>
                    <div style={{
                      height: '12px',
                      background: '#e5e7eb',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        width: `${(() => {
                          const thisMonth = new Date().toISOString().slice(0, 7);
                          const monthAttendance = attendance.filter(a => a.date.startsWith(thisMonth));
                          const completedCount = monthAttendance.filter(a => a.check_in_time && a.check_out_time).length;
                          const totalCount = monthAttendance.length;
                          return totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
                        })()}%`,
                        transition: 'width 0.5s ease',
                        borderRadius: '999px'
                      }} />
                    </div>
                  </div>
                </div>

                {/* 빠른 링크 */}
                <div className="card" style={{ marginTop: '32px' }}>
                  <h3 style={{ marginBottom: '20px', color: '#374151' }}>⚡ 자주 찾는 메뉴</h3>
                  <div className="grid grid-4" style={{ gap: '16px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('roster')}
                      style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600' }}
                    >
                      <span style={{ fontSize: '32px' }}>👥</span>
                      <span>직원 관리</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('calendar')}
                      style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600' }}
                    >
                      <span style={{ fontSize: '32px' }}>📅</span>
                      <span>출근 달력</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('salary-slips')}
                      style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600' }}
                    >
                      <span style={{ fontSize: '32px' }}>📝</span>
                      <span>급여명세서</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('community')}
                      style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600' }}
                    >
                      <span style={{ fontSize: '32px' }}>💬</span>
                      <span>소통방</span>
                    </button>
                  </div>
                </div>
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

              {/* QR 출퇴근 */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: '#374151' }}>📷 QR 출퇴근</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setQrCollapsed(!qrCollapsed)}
                    >
                      {qrCollapsed ? '열기' : '접기'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleGenerateQr(false)}
                      disabled={qrLoading}
                    >
                      {qrLoading ? '생성 중...' : (qrData ? 'QR 새로고침' : 'QR 생성')}
                    </button>
                    {qrData && (
                      <button
                        className="btn btn-secondary"
                        onClick={handlePrintQr}
                      >
                        🖨️ 인쇄
                      </button>
                    )}
                  </div>
                </div>

                {!qrCollapsed && (
                  <>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                      위치 인식이 어려운 경우 직원이 QR을 스캔해서 출퇴근을 기록할 수 있습니다. QR은 사업장별로 고정됩니다.
                    </div>

                    {qrData ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#065f46' }}>출근 QR</div>
                          <img src={qrData.checkInQr} alt="출근 QR" style={{ width: '180px', height: '180px' }} />
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#92400e' }}>퇴근 QR</div>
                          <img src={qrData.checkOutQr} alt="퇴근 QR" style={{ width: '180px', height: '180px' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
                        QR을 생성하면 이곳에 출근/퇴근 QR이 표시됩니다.
                      </div>
                    )}

                    <div style={{ marginTop: '16px' }}>
                      <label className="form-label">인쇄용 문구 (선택)</label>
                      <textarea
                        className="form-input"
                        rows={5}
                        value={qrPrintMessage}
                        onChange={(e) => setQrPrintMessage(e.target.value)}
                        placeholder={`예시\n1. 퇴근 전 보일러 체크!\n2. 출근 후 청소상태 확인\n3.\n4.`}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={handleSaveQrPrintMessage}
                          disabled={qrPrintSaving}
                        >
                          {qrPrintSaving ? '저장 중...' : '문구 저장'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
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

                {/* 미퇴근 직원 Alert */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRecords = attendance.filter(a => a.date === today);
                  const notCheckedOut = todayRecords.filter(a => a.check_in_time && !a.check_out_time);
                  
                  if (notCheckedOut.length > 0) {
                    return (
                      <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        border: '2px solid #f87171',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 6px rgba(248, 113, 113, 0.2)'
                      }}>
                        <div style={{ fontSize: '32px' }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#991b1b', marginBottom: '4px' }}>
                            오늘 미퇴근 직원이 {notCheckedOut.length}명 있습니다
                          </div>
                          <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                            {notCheckedOut.map(r => r.employee_name).join(', ')}
                          </div>
                        </div>
                        <button
                          className="btn"
                          onClick={() => setActiveTab('attendance')}
                          style={{
                            background: '#dc2626',
                            color: 'white',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          확인하기
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

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
                    <>
                      {/* 데스크톱 테이블 뷰 */}
                      <div className="attendance-table-view" style={{ overflowX: 'auto' }}>
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
                            {attendance.map((record) => {
                              const status = getAttendanceStatus(record);
                              return (
                                <tr 
                                  key={record.id}
                                  className="attendance-row"
                                  style={{
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '';
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '';
                                  }}
                                >
                                  <td style={{ fontWeight: '600' }}>{record.employee_name}</td>
                                  <td>{formatDate(record.date)}</td>
                                  <td>{formatTime(record.check_in_time)}</td>
                                  <td>{formatTime(record.check_out_time)}</td>
                                  <td style={{ fontWeight: '600' }}>{record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}</td>
                                  <td>
                                    <span style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      background: status.bgColor || '#f3f4f6',
                                      color: status.color,
                                      display: 'inline-block'
                                    }}>
                                      {status.label}
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 모바일 카드 뷰 */}
                      <div className="attendance-card-view" style={{ display: 'none' }}>
                        {attendance.map((record) => {
                          const status = getAttendanceStatus(record);
                          return (
                            <div
                              key={record.id}
                              className="attendance-card"
                              style={{
                                padding: '16px',
                                marginBottom: '12px',
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                                  {record.employee_name}
                                </div>
                                <span style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: status.bgColor || '#f3f4f6',
                                  color: status.color
                                }}>
                                  {status.label}
                                </span>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>날짜</div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{formatDate(record.date)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>근무시간</div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                    {record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>출근</div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>{formatTime(record.check_in_time)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>퇴근</div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>{formatTime(record.check_out_time)}</div>
                                </div>
                              </div>

                              <button
                                className="btn btn-secondary"
                                style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                                onClick={() => openModal('editAttendance', record)}
                              >
                                ✏️ 수정
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 급여 계산 */}
            {activeTab === 'salary' && (
              <div className="card">
                {/* 확정 상태 배지 */}
                {salaryConfirmed && (
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    marginBottom: '24px',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}>
                    ✓ 이번 달 급여가 확정되었습니다
                  </div>
                )}

                {/* 단계 진행 표시 */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    {[
                      { num: 1, label: '근무 내역 확인' },
                      { num: 2, label: '급여 미리보기' },
                      { num: 3, label: '급여 확정' },
                      { num: 4, label: '급여명세서 발송' }
                    ].map((step, idx) => (
                      <div key={step.num} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: salaryFlowStep >= step.num 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                            : '#e5e7eb',
                          color: salaryFlowStep >= step.num ? 'white' : '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: '700',
                          margin: '0 auto 12px',
                          boxShadow: salaryFlowStep >= step.num ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
                          transition: 'all 0.3s'
                        }}>
                          {salaryFlowStep > step.num ? '✓' : step.num}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: salaryFlowStep === step.num ? '700' : '500',
                          color: salaryFlowStep >= step.num ? '#374151' : '#9ca3af'
                        }}>
                          {step.label}
                        </div>
                        {idx < 3 && (
                          <div style={{
                            position: 'absolute',
                            top: '24px',
                            left: 'calc(50% + 24px)',
                            right: 'calc(-50% + 24px)',
                            height: '3px',
                            background: salaryFlowStep > step.num 
                              ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' 
                              : '#e5e7eb',
                            zIndex: 0,
                            transition: 'all 0.3s'
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#374151' }}>
                    {salaryFlowStep === 1 && 'Step 1. 이번 달 근무 내역 확인'}
                    {salaryFlowStep === 2 && 'Step 2. 급여 미리보기'}
                    {salaryFlowStep === 3 && 'Step 3. 급여 확정'}
                    {salaryFlowStep === 4 && 'Step 4. 급여명세서 발송'}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className={`btn ${salaryViewMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                        type="button"
                        onClick={() => setSalaryViewMode('month')}
                      >
                        월별
                      </button>
                      <button
                        className={`btn ${salaryViewMode === 'year' ? 'btn-primary' : 'btn-secondary'}`}
                        type="button"
                        onClick={() => setSalaryViewMode('year')}
                      >
                        연별
                      </button>
                    </div>
                    {salaryViewMode === 'month' ? (
                      <input
                        type="month"
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      />
                    ) : (
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '100px' }}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        min="2000"
                        max="2100"
                      />
                    )}
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
                {salaryViewMode === 'month' && salaryPeriodRange && (
                  <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '12px' }}>
                    급여 기간: {salaryPeriodRange.startDate} ~ {salaryPeriodRange.endDate}
                    {!salaryPeriodRange.hasCommonPeriod && (
                      <span style={{ marginLeft: '6px', color: '#ef4444' }}>
                        (직원별 기준이 달라 기본 1~말일로 계산)
                      </span>
                    )}
                  </div>
                )}

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
                        {formatCurrency(salaryData.totalSalary)}
                      </div>
                    </div>

                    {salaryData.employees.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                        급여 데이터가 없습니다.
                      </p>
                    ) : (
                      <>
                        {salaryFlowStep === 2 && (
                          <div style={{
                            padding: '16px',
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            color: '#166534'
                          }}>
                            💡 <strong>급여 수정:</strong> 총 지급액을 수정할 수 있습니다. 수정 후 다음 단계로 진행하세요.
                          </div>
                        )}
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>직원명</th>
                                <th>급여유형</th>
                                <th>인건비 신고</th>
                                <th>급여일</th>
                                <th>기본급</th>
                                <th>근무일수</th>
                                <th>근무시간</th>
                                <th>기본 급여</th>
                              <th>주휴수당</th>
                                <th>총 지급액</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salaryData.employees.map((emp) => {
                                const totalPay = editedSalaries[emp.employeeId] ?? (emp.totalPay ?? emp.calculatedSalary);
                                // 급여일 계산
                                const getPayDayText = () => {
                                  if (emp.payScheduleType === 'monthly') {
                                    if (emp.payDay === 0) return '말일';
                                    return `매월 ${emp.payDay}일`;
                                  } else if (emp.payScheduleType === 'hire_date') {
                                    return `입사일 기준`;
                                  }
                                  return '-';
                                };
                                return (
                                  <tr key={emp.employeeId}>
                                    <td style={{ fontWeight: '600' }}>{emp.employeeName}</td>
                                    <td>{getSalaryTypeName(emp.salaryType)}</td>
                                    <td style={{ fontSize: '12px', color: '#6b7280' }}>{emp.taxType || '4대보험'}</td>
                                    <td style={{ fontSize: '12px', color: '#6366f1' }}>{getPayDayText()}</td>
                                <td>{formatCurrency(emp.baseAmount)}</td>
                                    <td>{emp.totalWorkDays}일</td>
                                    <td>{emp.totalWorkHours}h</td>
                                <td>{formatCurrency(emp.baseSalaryAmount ?? emp.baseSalary ?? emp.calculatedSalary)}</td>
                                <td style={{ color: emp.weeklyHolidayPayAmount > 0 ? '#10b981' : '#9ca3af' }}>
                                  {emp.weeklyHolidayPayAmount > 0 ? `+${Number(emp.weeklyHolidayPayAmount).toLocaleString()}원` : '-'}
                                </td>
                                    <td style={{ fontWeight: '700', color: '#667eea' }}>
                                      {salaryFlowStep === 2 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <input
                                            type="number"
                                            className="form-input"
                                            value={editedSalaries[emp.employeeId] ?? totalPay}
                                            onChange={(e) => {
                                              const value = parseInt(e.target.value) || 0;
                                              setEditedSalaries(prev => ({
                                                ...prev,
                                                [emp.employeeId]: value
                                              }));
                                            }}
                                            style={{ 
                                              width: '140px', 
                                              padding: '6px 8px', 
                                              fontSize: '14px',
                                              fontWeight: '700'
                                            }}
                                          />
                                          <span style={{ fontSize: '14px' }}>원</span>
                                        </div>
                                      ) : (
                                        formatCurrency(totalPay)
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* 단계별 액션 버튼 */}
                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                          {salaryFlowStep === 1 && (
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '16px', padding: '16px 48px', fontWeight: '700' }}
                              onClick={() => setSalaryFlowStep(2)}
                            >
                              다음: 급여 미리보기 →
                            </button>
                          )}
                          
                          {salaryFlowStep === 2 && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '16px', padding: '16px 32px' }}
                                onClick={() => setSalaryFlowStep(1)}
                              >
                                ← 이전
                              </button>
                              <button
                                className="btn"
                                style={{
                                  fontSize: '16px',
                                  padding: '16px 48px',
                                  fontWeight: '700',
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  border: 'none'
                                }}
                                onClick={() => setShowConfirmWarning(true)}
                              >
                                급여 확정하기
                              </button>
                            </>
                          )}
                          
                          {salaryFlowStep === 3 && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '16px', padding: '16px 32px' }}
                                onClick={() => {
                                  setSalaryFlowStep(2);
                                  setSalaryConfirmed(false);
                                }}
                              >
                                ← 이전
                              </button>
                              <button
                                className="btn btn-success"
                                style={{ fontSize: '16px', padding: '16px 48px', fontWeight: '700' }}
                                onClick={() => {
                                  setSalaryFlowStep(4);
                                  setActiveTab('salary-slips');
                                }}
                              >
                                급여명세서 발송 →
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}

                  </>
                )}

                {/* 급여 확정 경고 모달 */}
                {showConfirmWarning && (
                  <div className="modal-overlay" onClick={() => setShowConfirmWarning(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                      <div className="modal-header" style={{ background: '#fef3c7', color: '#92400e' }}>
                        ⚠️ 급여 확정 확인
                      </div>
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{
                          fontSize: '48px',
                          marginBottom: '16px'
                        }}>
                          ⚠️
                        </div>
                        <p style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '16px'
                        }}>
                          확정 후에는 수정이 어렵습니다.
                        </p>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                          급여 내역을 최종 확인하셨습니까?<br />
                          확정 후 수정이 필요한 경우, 개별적으로 급여명세서를 수정해야 합니다.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            onClick={() => setShowConfirmWarning(false)}
                          >
                            취소
                          </button>
                          <button
                            className="btn"
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              border: 'none',
                              fontWeight: '700'
                            }}
                            onClick={() => {
                              setSalaryConfirmed(true);
                              setSalaryFlowStep(3);
                              setShowConfirmWarning(false);
                              setToast({ message: '✓ 급여가 확정되었습니다.', type: 'success' });
                            }}
                          >
                            확정하기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 급여명세서 */}
            {activeTab === 'salary-slips' && (
              <>
                {/* 당월 급여대장 */}
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#374151', margin: 0 }}>📊 당월 급여대장</h3>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '14px', padding: '6px 16px' }}
                      onClick={() => {
                        const newCollapsed = !qrCollapsed;
                        setQrCollapsed(newCollapsed);
                        // qrCollapsed를 ledger collapsed 상태로 사용
                      }}
                    >
                      {qrCollapsed ? '▼ 펼치기' : '▲ 접기'}
                    </button>
                  </div>

                  {!qrCollapsed && (
                    <>
                      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="month"
                          className="form-input"
                          value={payrollLedgerMonth}
                          onChange={(e) => setPayrollLedgerMonth(e.target.value)}
                          style={{ flex: 1, maxWidth: '300px' }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const response = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                              setPayrollLedgerData(response.data);
                              setMessage({ type: 'success', text: `${payrollLedgerMonth} 급여대장을 조회했습니다.` });
                            } catch (error) {
                              console.error('급여대장 조회 오류:', error);
                              setMessage({ type: 'error', text: error.response?.data?.message || '조회에 실패했습니다.' });
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          조회
                        </button>
                      </div>

                      {payrollLedgerData && payrollLedgerData.slips && payrollLedgerData.slips.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table" style={{ fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th rowSpan="2">직원명</th>
                                <th rowSpan="2">인건비구분</th>
                                <th rowSpan="2">기본급</th>
                                <th colSpan="4">근로자 부담금</th>
                                <th colSpan="2">세금</th>
                                <th rowSpan="2">공제합계</th>
                                <th rowSpan="2">실수령액</th>
                                <th colSpan="4">사업주 부담금</th>
                                <th rowSpan="2">사업주 부담금 합계</th>
                                <th rowSpan="2">지급일</th>
                              </tr>
                              <tr>
                                <th>국민연금</th>
                                <th>건강보험</th>
                                <th>고용보험</th>
                                <th>장기요양</th>
                                <th>소득세</th>
                                <th>지방세</th>
                                <th>국민연금</th>
                                <th>건강보험</th>
                                <th>고용보험</th>
                                <th>장기요양</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payrollLedgerData.slips.map((slip) => (
                                <tr key={slip.id}>
                                  <td>{slip.employee_name}</td>
                                  <td>{slip.tax_type}</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.base_pay).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.national_pension || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.health_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.employment_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.long_term_care || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.income_tax || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.local_income_tax || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{parseInt(slip.total_deductions || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseInt(slip.net_pay || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_national_pension || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_health_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_employment_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_long_term_care || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7', fontWeight: 'bold' }}>{parseInt(slip.total_employer_burden || 0).toLocaleString()}원</td>
                                  <td>{slip.pay_date ? new Date(slip.pay_date).toLocaleDateString('ko-KR') : '-'}</td>
                                </tr>
                              ))}
                              <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                                <td colSpan="2">합계</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_base_pay).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_national_pension).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_health_insurance).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_employment_insurance).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_long_term_care).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_income_tax).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_local_income_tax).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_deductions).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.total_net_pay).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(payrollLedgerData.totals.total_employer_national_pension).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(payrollLedgerData.totals.total_employer_health_insurance).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(payrollLedgerData.totals.total_employer_employment_insurance).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(payrollLedgerData.totals.total_employer_long_term_care).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(payrollLedgerData.totals.total_employer_burden).toLocaleString()}원</td>
                                <td>-</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                          {payrollLedgerData ? '해당 월에 배포된 급여명세서가 없습니다.' : '월을 선택하고 조회 버튼을 클릭하세요.'}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 급여명세서 관리 */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ color: '#374151', margin: 0 }}>📝 급여명세서 관리</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-success"
                        onClick={async () => {
                          const payrollMonth = prompt('급여명세서를 생성할 귀속월을 입력하세요 (예: 2026-01)');
                          if (!payrollMonth) return;

                          const payDate = prompt('지급일을 입력하세요 (예: 2026-02-05, 선택사항)');

                          if (window.confirm(`${payrollMonth} 월 급여명세서를 자동 생성하시겠습니까?\n\n- 모든 직원의 출근 기록 기반으로 세전 급여 자동 계산\n- 공제 항목은 0원으로 생성되므로 나중에 수정 필요\n- 이미 생성된 직원은 건너뜁니다`)) {
                            try {
                              const response = await salaryAPI.generateMonthlySlips(selectedWorkplace, {
                                payrollMonth,
                                payDate: payDate || null
                              });
                              setMessage({ 
                                type: 'success', 
                                text: `${response.data.created}개 생성, ${response.data.skipped}개 건너뜀. 직원을 선택하여 공제 항목을 수정한 후 배포하세요.` 
                              });
                              // 선택된 직원 새로고침
                              if (selectedSlipEmployee) {
                                const slipsResponse = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                                setEmployeeSlips(slipsResponse.data || []);
                              }
                              // 당월 급여대장 자동 갱신
                              if (payrollMonth === payrollLedgerMonth) {
                                const ledgerResponse = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                                setPayrollLedgerData(ledgerResponse.data);
                              }
                            } catch (error) {
                              console.error('자동 생성 오류:', error);
                              setMessage({ type: 'error', text: error.response?.data?.message || '자동 생성에 실패했습니다.' });
                            }
                          }
                        }}
                      >
                        📅 월별 자동 생성
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setEditingSlipId(null);
                          setSlipFormData({
                            userId: '',
                            payrollMonth: (() => {
                              const now = new Date();
                              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            })(),
                            payDate: '',
                            taxType: '4대보험',
                            basePay: '',
                            dependentsCount: 1,
                            nationalPension: '',
                            healthInsurance: '',
                            employmentInsurance: '',
                            longTermCare: '',
                            incomeTax: '',
                            localIncomeTax: ''
                          });
                          setShowSlipModal(true);
                        }}
                      >
                        + 급여명세서 작성
                      </button>
                    </div>
                  </div>

                  <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                    💡 <strong>월별 자동 생성</strong>: 모든 직원의 출근 기록 기반으로 세전 급여가 자동 계산됩니다 (공제 항목 0원). 수정 후 배포하세요.<br/>
                    📝 프리랜서(3.3%)는 원천징수가 자동 계산되며, 4대보험은 공제 항목을 직접 입력하세요.
                  </p>

                {/* 직원 선택 */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">직원 선택</label>
                      <select
                        className="form-select"
                        value={selectedSlipEmployee || ''}
                        onChange={async (e) => {
                          const userId = e.target.value;
                          setSelectedSlipEmployee(userId ? parseInt(userId) : null);
                          if (userId) {
                            try {
                              const response = await salaryAPI.getEmployeeSlips(userId);
                              setEmployeeSlips(response.data || []);
                            } catch (error) {
                              console.error('급여명세서 조회 오류:', error);
                              setEmployeeSlips([]);
                            }
                          } else {
                            setEmployeeSlips([]);
                          }
                        }}
                      >
                        <option value="">전체 직원</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.username})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedSlipEmployee && (
                      <button
                        className="btn btn-success"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={async () => {
                          const selectedEmp = employees.find(e => e.id === selectedSlipEmployee);
                          if (!selectedEmp) return;

                          if (window.confirm(`${selectedEmp.name}님의 입사일(${formatDate(selectedEmp.hire_date)})부터 현재까지의 급여명세서를 일괄 생성하시겠습니까?\n\n- 출근 기록 기반으로 세전 급여 자동 계산\n- 공제 항목은 0원 (3.3%는 자동)\n- 이미 생성된 월은 건너뜁니다`)) {
                            try {
                              const response = await salaryAPI.generateEmployeeHistory(selectedSlipEmployee);
                              setMessage({ 
                                type: 'success', 
                                text: `${response.data.employee.name}님의 과거 급여명세서 ${response.data.created}개 생성, ${response.data.skipped}개 건너뜀. 공제 항목을 수정한 후 배포하세요.` 
                              });
                              // 급여명세서 목록 새로고침
                              const slipsResponse = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                              setEmployeeSlips(slipsResponse.data || []);
                            } catch (error) {
                              console.error('과거 급여 일괄 생성 오류:', error);
                              setMessage({ type: 'error', text: error.response?.data?.message || '일괄 생성에 실패했습니다.' });
                            }
                          }
                        }}
                      >
                        📋 입사일부터 일괄 생성
                      </button>
                    )}
                  </div>
                </div>

                {selectedSlipEmployee && (
                  <div style={{ overflowX: 'auto' }}>
                    {employeeSlips.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                        등록된 급여명세서가 없습니다.
                      </p>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>귀속월</th>
                            <th>지급일</th>
                            <th>인건비 구분</th>
                            <th>기본급</th>
                            <th>공제합계</th>
                            <th>실수령액</th>
                            <th>배포 상태</th>
                            <th>관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeSlips.map((slip) => (
                            <tr key={slip.id}>
                              <td style={{ fontWeight: '600' }}>{slip.payroll_month}</td>
                              <td>{formatDate(slip.pay_date)}</td>
                              <td style={{ fontSize: '12px', color: '#6366f1' }}>{slip.tax_type || '4대보험'}</td>
                              <td>{formatCurrency(slip.base_pay)}</td>
                              <td style={{ color: '#ef4444' }}>-{formatCurrency(slip.total_deductions)}</td>
                              <td style={{ fontWeight: '700', color: '#667eea' }}>{formatCurrency(slip.net_pay)}</td>
                              <td>
                                {slip.published || slip.published === 1 ? (
                                  <span style={{ 
                                    padding: '4px 12px', 
                                    backgroundColor: '#10b981', 
                                    color: 'white', 
                                    borderRadius: '12px', 
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}>
                                    배포됨
                                  </span>
                                ) : (
                                  <span style={{ 
                                    padding: '4px 12px', 
                                    backgroundColor: '#6b7280', 
                                    color: 'white', 
                                    borderRadius: '12px', 
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}>
                                    미배포
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {!(slip.published || slip.published === 1) && (
                                    <button
                                      className="btn btn-success"
                                      style={{ fontSize: '12px', padding: '4px 12px' }}
                                      onClick={() => {
                                        setSlipToPublish(slip);
                                        setShowPublishWarning(true);
                                      }}
                                    >
                                      배포
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '12px', padding: '4px 12px' }}
                                    onClick={() => {
                                      setEditingSlipId(slip.id);
                                      setSlipFormData({
                                        userId: slip.user_id,
                                        payrollMonth: slip.payroll_month,
                                        payDate: slip.pay_date,
                                        taxType: slip.tax_type || '4대보험',
                                        basePay: slip.base_pay,
                                        dependentsCount: slip.dependents_count || 1,
                                        nationalPension: slip.national_pension,
                                        healthInsurance: slip.health_insurance,
                                        employmentInsurance: slip.employment_insurance,
                                        longTermCare: slip.long_term_care,
                                        incomeTax: slip.income_tax,
                                        localIncomeTax: slip.local_income_tax
                                      });
                                      setShowSlipModal(true);
                                    }}
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ fontSize: '12px', padding: '4px 12px' }}
                                    onClick={async () => {
                                      if (window.confirm('급여명세서를 삭제하시겠습니까?')) {
                                        try {
                                          await salaryAPI.deleteSlip(slip.id);
                                          setMessage({ type: 'success', text: '급여명세서가 삭제되었습니다.' });
                                          const response = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                                          setEmployeeSlips(response.data || []);
                                        } catch (error) {
                                          console.error('삭제 오류:', error);
                                          setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
                                        }
                                      }
                                    }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                </div>
              </>
            )}

            {/* 퇴직금 계산 */}
            {activeTab === 'severance' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#374151' }}>🧮 퇴직금 계산</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                  퇴직금은 오늘 기준으로 계산됩니다. (1년 이상 근무자만 표시)
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
                          <th>직원명</th>
                          <th>입사일</th>
                          <th>근속기간(년)</th>
                          <th>퇴직금(당일퇴사)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees
                          .filter((emp) => emp.employment_status !== 'resigned')
                          .map((emp) => {
                            const severancePay = getSeverancePayById(emp.id);
                            return (
                              <tr key={emp.id}>
                                <td style={{ fontWeight: '600' }}>{emp.name}</td>
                                <td>{formatDate(emp.hire_date)}</td>
                                <td>{getYearsOfService(emp.hire_date)}</td>
                                <td style={{ color: severancePay > 0 ? '#f59e0b' : '#9ca3af', fontWeight: severancePay > 0 ? '600' : '400' }}>
                                  {severancePay > 0 ? formatCurrency(severancePay) : '1년 미만'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <h4 style={{ color: '#374151', marginBottom: '12px' }}>🧾 과거 급여 수기 입력/조회</h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <select
                      className="form-select"
                      value={pastPayrollEmployeeId || ''}
                      onChange={(e) => setPastPayrollEmployeeId(e.target.value)}
                    >
                      <option value="">직원 선택</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.username})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '110px' }}
                      value={pastPayrollYear}
                      onChange={(e) => setPastPayrollYear(Number(e.target.value))}
                      min="2000"
                      max="2100"
                    />
                    <select
                      className="form-select"
                      value={pastPayrollMonth}
                      onChange={(e) => setPastPayrollMonth(e.target.value)}
                    >
                      <option value="">전체 월</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {i + 1}월
                        </option>
                      ))}
                    </select>
                  </div>

                  {pastPayrollEmployeeId && (
                    <>
                      <div className="grid grid-2" style={{ marginBottom: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">시작일</label>
                          <input
                            type="date"
                            className="form-input"
                            value={pastPayrollForm.start_date}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, start_date: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">종료일</label>
                          <input
                            type="date"
                            className="form-input"
                            value={pastPayrollForm.end_date}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, end_date: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">급여 유형</label>
                          <select
                            className="form-input"
                            value={pastPayrollForm.salary_type}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, salary_type: e.target.value })}
                          >
                            <option value="hourly">시급</option>
                            <option value="monthly">월급</option>
                            <option value="annual">연봉</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">금액</label>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="예: 2500000"
                            value={pastPayrollForm.amount}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">비고</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="예: 2023년 5월 수기 입력"
                          value={pastPayrollForm.notes}
                          onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, notes: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginBottom: '16px' }}
                        onClick={() => handleAddPastPayroll(pastPayrollEmployeeId)}
                      >
                        + 과거 급여 기록 추가
                      </button>

                      {pastPayrollRecords.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>기간</th>
                                <th>급여유형</th>
                                <th>금액</th>
                                <th>비고</th>
                                <th>관리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pastPayrollRecords
                                .filter((record) => {
                                  if (!pastPayrollYear) return true;
                                  const range = pastPayrollMonth
                                    ? getMonthRange(pastPayrollYear, Number(pastPayrollMonth))
                                    : {
                                      start: new Date(pastPayrollYear, 0, 1),
                                      end: new Date(pastPayrollYear, 11, 31, 23, 59, 59, 999)
                                    };
                                  if (!range) return true;
                                  const start = new Date(record.start_date);
                                  const end = new Date(record.end_date);
                                  return start <= range.end && end >= range.start;
                                })
                                .map((record) => (
                                  <tr key={record.id}>
                                    <td style={{ fontSize: '12px' }}>
                                      {formatDate(record.start_date)} ~ {formatDate(record.end_date)}
                                    </td>
                                    <td>{getSalaryTypeName(record.salary_type)}</td>
                                    <td>{Number(record.amount).toLocaleString()}원</td>
                                    <td>{record.notes || '-'}</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          style={{ fontSize: '12px', padding: '4px 8px' }}
                                          onClick={async () => {
                                            if (window.confirm('이 과거 급여 기록을 급여명세서로 생성하시겠습니까?')) {
                                              try {
                                                // 귀속월 계산 (종료일 기준)
                                                const endDate = new Date(record.end_date);
                                                const payrollMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
                                                
                                                await salaryAPI.createSlip({
                                                  workplaceId: selectedWorkplace,
                                                  userId: pastPayrollEmployeeId,
                                                  payrollMonth: payrollMonth,
                                                  payDate: record.end_date,
                                                  taxType: '4대보험',
                                                  basePay: record.amount,
                                                  nationalPension: 0,
                                                  healthInsurance: 0,
                                                  employmentInsurance: 0,
                                                  longTermCare: 0,
                                                  incomeTax: 0,
                                                  localIncomeTax: 0
                                                });
                                                
                                                setMessage({ 
                                                  type: 'success', 
                                                  text: `급여명세서가 생성되었습니다 (귀속월: ${payrollMonth}). 급여명세서 탭에서 확인하고 공제 항목을 수정한 후 배포하세요.` 
                                                });
                                              } catch (error) {
                                                console.error('급여명세서 생성 오류:', error);
                                                setMessage({ type: 'error', text: error.response?.data?.message || '급여명세서 생성에 실패했습니다.' });
                                              }
                                            }
                                          }}
                                        >
                                          📝 명세서 생성
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-danger"
                                          style={{ fontSize: '12px', padding: '4px 8px' }}
                                          onClick={() => handleDeletePastPayroll(record.id)}
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
                      ) : (
                        <p style={{ color: '#9ca3af', fontSize: '12px' }}>등록된 과거 급여 기록이 없습니다.</p>
                      )}
                    </>
                  )}
                </div>
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

            {activeTab === 'community' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: '#374151' }}>💬 사업주 커뮤니티</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => openCommunityModal('create')}
                  >
                    ✏️ 글 작성
                  </button>
                </div>

                {communityLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                    로딩 중...
                  </div>
                ) : communityPosts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                    작성된 게시글이 없습니다.
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
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => openCommunityModal('view', post)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                            {post.title}
                          </h4>
                          {post.user_id === user.id && (
                            <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 12px', fontSize: '12px' }}
                                onClick={() => openCommunityModal('edit', post)}
                              >
                                수정
                              </button>
                              <button
                                className="btn"
                                style={{ padding: '4px 12px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                                onClick={() => handleDeleteCommunityPost(post.id)}
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {post.content.length > 200 ? `${post.content.substring(0, 200)}...` : post.content}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
                          <span>작성자: {post.author_name}</span>
                          <span>{new Date(post.created_at).toLocaleDateString('ko-KR')} {new Date(post.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <>
              <div className="card">
                <h3 style={{ marginTop: 0, color: '#374151' }}>🏢 사업장 주소/위치 수정</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                  주소 변경 시 위치(위도/경도)를 함께 저장해야 출퇴근 범위가 정확히 적용됩니다.
                </p>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">사업장명</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      value={workplaceForm.name}
                      onChange={handleWorkplaceFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">주소</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        name="address"
                        className="form-input"
                        value={workplaceForm.address}
                        onClick={handleSearchWorkplaceAddress}
                        readOnly
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSearchWorkplaceAddress}
                        disabled={workplaceSearchLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {workplaceSearchLoading ? '검색 중...' : '주소 검색'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">위도</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="latitude"
                      className="form-input"
                      value={workplaceForm.latitude}
                      onChange={handleWorkplaceFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">경도</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="longitude"
                      className="form-input"
                      value={workplaceForm.longitude}
                      onChange={handleWorkplaceFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">반경 (미터)</label>
                    <input
                      type="number"
                      name="radius"
                      className="form-input"
                      value={workplaceForm.radius}
                      onChange={handleWorkplaceFormChange}
                      placeholder="예: 100"
                      min="10"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSetWorkplaceLocation}
                    disabled={workplaceLocationLoading}
                  >
                    {workplaceLocationLoading ? '위치 불러오는 중...' : '현재 위치로 설정'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveWorkplace}
                    disabled={workplaceSaving}
                  >
                    {workplaceSaving ? '저장 중...' : '사업장 정보 저장'}
                  </button>
                </div>
              </div>

              {/* 출퇴근 알림 설정 */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#374151' }}>🔔 출퇴근 알림 설정</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                  직원이 출근/퇴근하면 브라우저로 무료 알림이 전송됩니다. 알림 허용이 필요합니다.
                </p>
                {!pushSupported && (
                  <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
                      ⚠️ 현재 브라우저에서는 웹 푸시를 지원하지 않습니다.
                    </p>
                  </div>
                )}
                {pushSupported && !pushPublicKeyReady && (
                  <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
                      ⚠️ 웹 푸시 키가 설정되지 않았습니다.
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {pushEnabled ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={handleDisablePush}
                        disabled={pushLoading}
                      >
                        {pushLoading ? '처리 중...' : '알림 끄기'}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleSendPushTest}
                        disabled={pushLoading}
                      >
                        테스트 알림 보내기
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={handleEnablePush}
                      disabled={pushLoading || !pushSupported || !pushPublicKeyReady}
                    >
                      {pushLoading ? '설정 중...' : '알림 켜기'}
                    </button>
                  )}
                </div>
              </div>

              </>
            )}

            {/* 더보기 메뉴 (모바일 전용) */}
            {activeTab === 'more' && isMobile && (
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#111827' }}>
                  ⋯ 더보기 메뉴
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontSize: '28px' }}>📅</div>
                    <div style={{ flex: 1 }}>
                      <div>출근 달력</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>
                        월별 출근 현황 확인
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#9ca3af' }}>›</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('salary-slips')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontSize: '28px' }}>📝</div>
                    <div style={{ flex: 1 }}>
                      <div>급여명세서</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>
                        급여명세서 작성 및 배포
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#9ca3af' }}>›</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('severance')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontSize: '28px' }}>🧮</div>
                    <div style={{ flex: 1 }}>
                      <div>퇴직금 계산</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>
                        퇴직금 자동 계산
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#9ca3af' }}>›</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('past-employees')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontSize: '28px' }}>📁</div>
                    <div style={{ flex: 1 }}>
                      <div>서류 보관함</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>
                        과거 직원 및 급여 기록
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#9ca3af' }}>›</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('community')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontSize: '28px' }}>💬</div>
                    <div style={{ flex: 1 }}>
                      <div>소통방</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>
                        사업주 커뮤니티
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#9ca3af' }}>›</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontSize: '28px' }}>⚙️</div>
                    <div style={{ flex: 1 }}>
                      <div>설정</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400', marginTop: '4px' }}>
                        사업장 설정 및 알림
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#9ca3af' }}>›</div>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && modalType === 'resignation' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">퇴사 처리</div>

            {message.text && (
              <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSaveResignation}>
              <div className="form-group">
                <label className="form-label">직원명</label>
                <div>{resignationForm.name || '-'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">퇴사일 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={resignationForm.resignation_date}
                  onChange={(e) => setResignationForm({ ...resignationForm, resignation_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">해고/퇴직/사망 구분</label>
                <select
                  className="form-input"
                  value={resignationForm.separation_type}
                  onChange={(e) => setResignationForm({ ...resignationForm, separation_type: e.target.value })}
                >
                  <option value="">선택</option>
                  <option value="dismissal">해고</option>
                  <option value="resignation">퇴직</option>
                  <option value="death">사망</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">해고/퇴직/사망 사유</label>
                <input
                  type="text"
                  className="form-input"
                  value={resignationForm.separation_reason}
                  onChange={(e) => setResignationForm({ ...resignationForm, separation_reason: e.target.value })}
                  placeholder="사유를 입력하세요"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 커뮤니티 모달 */}
      {showCommunityModal && (
        <div className="modal-overlay" onClick={() => setShowCommunityModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              {communityModalType === 'create' ? '글 작성' : communityModalType === 'edit' ? '글 수정' : '게시글'}
            </div>

            {message.text && (
              <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
                {message.text}
              </div>
            )}

            {communityModalType === 'view' ? (
              <div>
                <h3 style={{ marginBottom: '16px', color: '#111827' }}>{communityFormData.title}</h3>
                <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '20px' }}>
                  {communityFormData.content}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCommunityModal(false)}
                  >
                    닫기
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveCommunityPost}>
                <div className="form-group">
                  <label className="form-label">제목 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={communityFormData.title}
                    onChange={(e) => setCommunityFormData({ ...communityFormData, title: e.target.value })}
                    placeholder="제목을 입력하세요"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">내용 *</label>
                  <textarea
                    className="form-input"
                    value={communityFormData.content}
                    onChange={(e) => setCommunityFormData({ ...communityFormData, content: e.target.value })}
                    placeholder="내용을 입력하세요"
                    rows={10}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCommunityModal(false)}
                    style={{ flex: 1 }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={communityLoading}
                    style={{ flex: 1 }}
                  >
                    {communityLoading ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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

            <div style={{ 
              padding: '12px', 
              background: '#fef3c7', 
              border: '1px solid #fbbf24', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '14px',
              color: '#92400e'
            }}>
              <strong>*</strong> 표시는 필수 입력 항목입니다.
            </div>

            {Object.keys(formErrors).length > 0 && (
              <div style={{ 
                padding: '12px', 
                background: '#fee2e2', 
                border: '1px solid #ef4444', 
                borderRadius: '8px', 
                marginBottom: '20px',
                fontSize: '14px',
                color: '#991b1b'
              }}>
                <strong>입력 오류:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {Object.values(formErrors).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmitEmployee}>
              <h4 style={{ marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                기본 정보
              </h4>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">사용자명 (로그인 ID) *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      name="username"
                      className="form-input"
                      value={formData.username || ''}
                      onChange={handleInputChange}
                      required
                      disabled={formData.id}
                      placeholder="로그인할 때 사용할 아이디를 입력하세요"
                      style={formErrors.username ? { borderColor: '#ef4444' } : {}}
                    />
                    {!formData.id && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCheckUsername}
                        disabled={usernameCheckLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {usernameCheckLoading ? '확인 중...' : '중복 확인'}
                      </button>
                    )}
                  </div>
                  {formErrors.username && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                      {formErrors.username}
                    </small>
                  )}
                  {!formData.id && usernameCheckStatus === 'available' && (
                    <small style={{ color: '#16a34a', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                      사용 가능한 아이디입니다.
                    </small>
                  )}
                  {!formData.id && usernameCheckStatus === 'unavailable' && (
                    <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                      이미 사용 중인 아이디입니다.
                    </small>
                  )}
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
                      style={formErrors.password ? { borderColor: '#ef4444' } : {}}
                    />
                    {formErrors.password && (
                      <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        {formErrors.password}
                      </small>
                    )}
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
                    style={formErrors.name ? { borderColor: '#ef4444' } : {}}
                  />
                  {formErrors.name && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.name}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">입사일 *</label>
                  <input
                    type="date"
                    name="hire_date"
                    className="form-input"
                    value={formData.hire_date || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="입사일을 선택하세요"
                    style={formErrors.hire_date ? { borderColor: '#ef4444' } : {}}
                  />
                  {formErrors.hire_date && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.hire_date}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">주민등록번호 *</label>
                  <input
                    type="text"
                    name="ssn"
                    className="form-input"
                    value={formData.ssn || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="주민등록번호를 입력하세요 (예: 901010-1234567)"
                    style={formErrors.ssn ? { borderColor: '#ef4444' } : {}}
                  />
                  {formErrors.ssn && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.ssn}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">휴대폰 *</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="전화번호를 입력하세요 (예: 010-1234-5678)"
                    style={formErrors.phone ? { borderColor: '#ef4444' } : {}}
                  />
                  {formErrors.phone && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.phone}
                    </small>
                  )}
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
                <label className="form-label">주소 *</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="전체 주소를 입력하세요 (예: 서울시 강남구 테헤란로 123)"
                  style={formErrors.address ? { borderColor: '#ef4444' } : {}}
                />
                {formErrors.address && (
                  <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    {formErrors.address}
                  </small>
                )}
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                근로자 명부 필수사항
              </h4>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">성별</label>
                  <select
                    name="gender"
                    className="form-input"
                    value={formData.gender || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">선택</option>
                    <option value="male">남</option>
                    <option value="female">여</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">생년월일</label>
                  <input
                    type="date"
                    name="birth_date"
                    className="form-input"
                    value={formData.birth_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">이력</label>
                <textarea
                  name="career"
                  className="form-input"
                  value={formData.career || ''}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="주요 이력 사항을 입력하세요"
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">종사하는 업무의 종류</label>
                  <input
                    type="text"
                    name="job_type"
                    className="form-input"
                    value={formData.job_type || ''}
                    onChange={handleInputChange}
                    placeholder="예: 홀서빙, 바리스타"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">고용/고용갱신 연월일 (입사일과 동일)</label>
                  <input
                    type="date"
                    name="employment_renewal_date"
                    className="form-input"
                    value={formData.hire_date || formData.employment_renewal_date || ''}
                    readOnly
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    💡 고용/갱신일은 입사일과 동일하게 자동 입력됩니다.
                  </small>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">계약 시작일 (입사일과 동일)</label>
                  <input
                    type="date"
                    name="contract_start_date"
                    className="form-input"
                    value={formData.hire_date || formData.contract_start_date || ''}
                    readOnly
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    💡 계약 시작일은 입사일과 동일하게 자동 입력됩니다.
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">계약 종료일</label>
                  <input
                    type="date"
                    name="contract_end_date"
                    className="form-input"
                    value={formData.contract_end_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">그 밖의 고용에 관한 사항</label>
                <textarea
                  name="employment_notes"
                  className="form-input"
                  value={formData.employment_notes || ''}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="고용 관련 참고 사항을 입력하세요"
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
                  <label className="form-label">재직 상태</label>
                  <select
                    name="employment_status"
                    className="form-input"
                    value={formData.employment_status || 'active'}
                    onChange={handleInputChange}
                  >
                    <option value="active">재직중</option>
                    <option value="on_leave">휴직</option>
                  </select>
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
                근무 요일/시간
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
                    const workDays = Array.isArray(formData.work_days) 
                      ? formData.work_days 
                      : (formData.work_days ? formData.work_days.split(',') : []);
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
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <small style={{ color: '#6b7280' }}>현재 파일: {formData.contract_file}</small>
                      <button
                        type="button"
                        onClick={() => window.open(`${uploadBaseUrl}/uploads/${formData.contract_file}`, '_blank')}
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
                        href={`${uploadBaseUrl}/uploads/${formData.contract_file}`}
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
                        onClick={() => window.open(`${uploadBaseUrl}/uploads/${formData.resume_file}`, '_blank')}
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
                        href={`${uploadBaseUrl}/uploads/${formData.resume_file}`}
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
                        onClick={() => window.open(`${uploadBaseUrl}/uploads/${formData.id_card_file}`, '_blank')}
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
                        href={`${uploadBaseUrl}/uploads/${formData.id_card_file}`}
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
                        onClick={() => window.open(`${uploadBaseUrl}/uploads/${formData.family_cert_file}`, '_blank')}
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
                        href={`${uploadBaseUrl}/uploads/${formData.family_cert_file}`}
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

              {formData.id && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                    🧾 시스템 도입 전 과거 급여 기록
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                    시스템 도입 이전에 이미 근무 중인 직원의 급여 이력을 입력합니다.
                  </p>

                  <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px', background: '#f9fafb' }}>
                    <p style={{ fontSize: '13px', margin: 0, color: '#374151' }}>
                      원래 근무하던 직원이 있고 그 직원의 정보를 저장하시겠습니까?
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className={`btn ${pastPayrollEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPastPayrollEnabled(true)}
                      >
                        예
                      </button>
                      <button
                        type="button"
                        className={`btn ${!pastPayrollEnabled ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPastPayrollEnabled(false)}
                      >
                        아니오
                      </button>
                    </div>
                  </div>

                  {pastPayrollEnabled && (
                    <>
                      <div className="grid grid-2" style={{ marginBottom: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">시작일</label>
                          <input
                            type="date"
                            className="form-input"
                            value={pastPayrollForm.start_date}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, start_date: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">종료일</label>
                          <input
                            type="date"
                            className="form-input"
                            value={pastPayrollForm.end_date}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, end_date: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">급여 유형</label>
                          <select
                            className="form-input"
                            value={pastPayrollForm.salary_type}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, salary_type: e.target.value })}
                          >
                            <option value="hourly">시급</option>
                            <option value="monthly">월급</option>
                            <option value="annual">연봉</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">금액</label>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="예: 2500000"
                            value={pastPayrollForm.amount}
                            onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, amount: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">비고</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="예: 시스템 도입 전 급여"
                          value={pastPayrollForm.notes}
                          onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, notes: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginBottom: '16px' }}
                        onClick={() => handleAddPastPayroll(formData.id)}
                      >
                        + 과거 급여 기록 추가
                      </button>

                      {pastPayrollRecords.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>기간</th>
                                <th>급여유형</th>
                                <th>금액</th>
                                <th>비고</th>
                                <th>관리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pastPayrollRecords.map((record) => (
                                <tr key={record.id}>
                                  <td style={{ fontSize: '12px' }}>
                                    {formatDate(record.start_date)} ~ {formatDate(record.end_date)}
                                  </td>
                                  <td>{getSalaryTypeName(record.salary_type)}</td>
                                  <td>{Number(record.amount).toLocaleString()}원</td>
                                  <td style={{ fontSize: '12px', color: '#6b7280' }}>{record.notes || '-'}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      style={{ padding: '6px 10px', fontSize: '12px' }}
                                      onClick={() => handleDeletePastPayroll(formData.id, record.id)}
                                    >
                                      삭제
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: '#9ca3af', fontSize: '12px' }}>등록된 과거 급여 기록이 없습니다.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151' }}>급여 지급 기준</h4>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">지급 기준</label>
                  <select
                    name="pay_schedule_type"
                    className="form-select"
                    value={formData.pay_schedule_type || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">선택하세요</option>
                    <option value="monthly_fixed">매월 지급일</option>
                    <option value="hire_date_based">입사일 기준</option>
                  </select>
                </div>
                {formData.pay_schedule_type === 'monthly_fixed' && (
                  <div className="form-group">
                    <label className="form-label">급여 지급일</label>
                    <input
                      type="number"
                      name="pay_day"
                      className="form-input"
                      value={formData.pay_day || ''}
                      onChange={handleInputChange}
                      placeholder="말일=0"
                      min="0"
                      max="31"
                    />
                    <small style={{ color: '#6b7280', fontSize: '12px' }}>
                      💡 말일 지급은 0으로 입력하세요.
                    </small>
                  </div>
                )}
              </div>

              {formData.pay_schedule_type === 'monthly_fixed' && (
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">급여 기간 시작일</label>
                    <input
                      type="number"
                      name="payroll_period_start_day"
                      className="form-input"
                      value={formData.payroll_period_start_day || ''}
                      onChange={handleInputChange}
                      placeholder="예: 1"
                      min="1"
                      max="31"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">급여 기간 종료일</label>
                    <input
                      type="number"
                      name="payroll_period_end_day"
                      className="form-input"
                      value={formData.payroll_period_end_day || ''}
                      onChange={handleInputChange}
                      placeholder="말일=0"
                      min="0"
                      max="31"
                    />
                    <small style={{ color: '#6b7280', fontSize: '12px' }}>
                      💡 말일 종료는 0으로 입력하세요.
                    </small>
                  </div>
                </div>
              )}

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">무단결근 차감</label>
                  <select
                    name="deduct_absence"
                    className="form-select"
                    value={formData.deduct_absence ?? '0'}
                    onChange={handleInputChange}
                  >
                    <option value="0">N</option>
                    <option value="1">Y</option>
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    💡 무단결근 시 월급에서 일할 차감 여부
                  </small>
                </div>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>급여 정보</h4>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">급여 형태 *</label>
                  <select
                    name="salary_type"
                    className="form-select"
                    value={formData.salary_type || ''}
                    onChange={handleInputChange}
                    required
                    style={formErrors.salary_type ? { borderColor: '#ef4444' } : {}}
                  >
                    <option value="">선택하세요</option>
                    <option value="hourly">시급</option>
                    <option value="monthly">월급</option>
                    <option value="annual">연봉</option>
                  </select>
                  {formErrors.salary_type && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.salary_type}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {formData.salary_type === 'hourly' ? '시급' : 
                     formData.salary_type === 'monthly' ? '월급' : 
                     formData.salary_type === 'annual' ? '연봉' : '급여액'} *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    className="form-input"
                    value={formData.amount || ''}
                    onChange={handleInputChange}
                    placeholder="원"
                    required
                    style={formErrors.amount ? { borderColor: '#ef4444' } : {}}
                  />
                  {formErrors.amount && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.amount}
                    </small>
                  )}
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">급여 신고 *</label>
                  <select
                    name="tax_type"
                    className="form-select"
                    value={formData.tax_type || '4대보험'}
                    onChange={handleInputChange}
                    required
                    style={formErrors.tax_type ? { borderColor: '#ef4444' } : {}}
                  >
                    <option value="4대보험">4대보험</option>
                    <option value="3.3%">3.3% (프리랜서)</option>
                    <option value="일용직">일용직</option>
                  </select>
                  {formErrors.tax_type && (
                    <small style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {formErrors.tax_type}
                    </small>
                  )}
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
                <label className="form-label">휴가 유형</label>
                <select
                  className="form-select"
                  name="leave_type"
                  value={formData.leave_type || ''}
                  onChange={handleInputChange}
                >
                  <option value="">근무</option>
                  <option value="annual">연차</option>
                  <option value="paid">유급휴가</option>
                  <option value="unpaid">무급휴가</option>
                </select>
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  휴가를 선택하면 출퇴근 시간은 저장하지 않습니다.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">출근 시간 *</label>
                <input
                  type="datetime-local"
                  name="check_in_time"
                  className="form-input"
                  value={formData.check_in_time ? formData.check_in_time.slice(0, 16) : ''}
                  onChange={handleInputChange}
                  required={!formData.leave_type}
                  disabled={!!formData.leave_type}
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
                  disabled={!!formData.leave_type}
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

      {/* 급여명세서 작성/수정 모달 */}
      {showSlipModal && (
        <div className="modal-overlay" onClick={() => {
          setShowSlipModal(false);
          setEditingSlipId(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h3>{editingSlipId ? '급여명세서 수정' : '급여명세서 작성'}</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowSlipModal(false);
                    setEditingSlipId(null);
                  }}
                >
                  ×
                </button>
              </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">직원 선택 *</label>
                <select
                  className="form-select"
                  value={slipFormData.userId}
                  disabled={editingSlipId !== null}
                  onChange={(e) => {
                    const selectedUserId = e.target.value;
                    const selectedEmployee = employees.find(emp => emp.id === parseInt(selectedUserId));
                    
                    // 직원 선택 시 급여 지급일 자동 계산
                    let calculatedPayDate = '';
                    if (selectedEmployee && slipFormData.payrollMonth) {
                      const [year, month] = slipFormData.payrollMonth.split('-').map(Number);
                      
                      if (selectedEmployee.pay_schedule_type === '월말' && selectedEmployee.pay_day !== null && selectedEmployee.pay_day !== undefined) {
                        // 월말 지급: 귀속월 다음 달의 지정일
                        const nextMonth = month === 12 ? 1 : month + 1;
                        const nextYear = month === 12 ? year + 1 : year;
                        const payDay = selectedEmployee.pay_day === 0 ? new Date(nextYear, nextMonth, 0).getDate() : selectedEmployee.pay_day;
                        calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                      } else if (selectedEmployee.pay_schedule_type === '입사일 기준' && selectedEmployee.hire_date) {
                        // 입사일 기준: 입사일의 일자를 기준으로 귀속월 다음 달의 해당 일자
                        const hireDate = new Date(selectedEmployee.hire_date);
                        const hireDay = hireDate.getDate();
                        const nextMonth = month === 12 ? 1 : month + 1;
                        const nextYear = month === 12 ? year + 1 : year;
                        const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
                        const payDay = Math.min(hireDay, lastDayOfNextMonth); // 월말일보다 크면 월말로 조정
                        calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                      }
                    }
                    
                    setSlipFormData({ 
                      ...slipFormData, 
                      userId: selectedUserId,
                      payDate: calculatedPayDate || slipFormData.payDate
                    });
                  }}
                  required
                >
                  <option value="">선택하세요</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.username})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">귀속월 *</label>
                  <input
                    type="month"
                    className="form-input"
                    value={slipFormData.payrollMonth}
                    onChange={(e) => {
                      const newPayrollMonth = e.target.value;
                      const selectedEmployee = employees.find(emp => emp.id === parseInt(slipFormData.userId));
                      
                      // 귀속월 변경 시 급여 지급일 자동 재계산
                      let calculatedPayDate = '';
                      if (selectedEmployee && newPayrollMonth) {
                        const [year, month] = newPayrollMonth.split('-').map(Number);
                        
                        if (selectedEmployee.pay_schedule_type === '월말' && selectedEmployee.pay_day !== null && selectedEmployee.pay_day !== undefined) {
                          // 월말 지급: 귀속월 다음 달의 지정일
                          const nextMonth = month === 12 ? 1 : month + 1;
                          const nextYear = month === 12 ? year + 1 : year;
                          const payDay = selectedEmployee.pay_day === 0 ? new Date(nextYear, nextMonth, 0).getDate() : selectedEmployee.pay_day;
                          calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                        } else if (selectedEmployee.pay_schedule_type === '입사일 기준' && selectedEmployee.hire_date) {
                          // 입사일 기준: 입사일의 일자를 기준으로 귀속월 다음 달의 해당 일자
                          const hireDate = new Date(selectedEmployee.hire_date);
                          const hireDay = hireDate.getDate();
                          const nextMonth = month === 12 ? 1 : month + 1;
                          const nextYear = month === 12 ? year + 1 : year;
                          const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
                          const payDay = Math.min(hireDay, lastDayOfNextMonth); // 월말일보다 크면 월말로 조정
                          calculatedPayDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
                        }
                      }
                      
                      setSlipFormData({ 
                        ...slipFormData, 
                        payrollMonth: newPayrollMonth,
                        payDate: calculatedPayDate || slipFormData.payDate
                      });
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">지급일</label>
                  <input
                    type="date"
                    className="form-input"
                    value={slipFormData.payDate}
                    onChange={(e) => setSlipFormData({ ...slipFormData, payDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">인건비 신고 구분 *</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="taxType"
                      value="4대보험"
                      checked={slipFormData.taxType === '4대보험'}
                      onChange={(e) => setSlipFormData({ ...slipFormData, taxType: e.target.value })}
                      style={{ marginRight: '6px' }}
                    />
                    4대보험
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="taxType"
                      value="3.3%"
                      checked={slipFormData.taxType === '3.3%'}
                      onChange={(e) => setSlipFormData({ ...slipFormData, taxType: e.target.value })}
                      style={{ marginRight: '6px' }}
                    />
                    프리랜서 (3.3%)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">기본급 (세전) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={slipFormData.basePay}
                  onChange={(e) => setSlipFormData({ ...slipFormData, basePay: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              {slipFormData.taxType === '4대보험' && (
                <div className="form-group">
                  <label className="form-label">부양가족 수 (본인 포함)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={slipFormData.dependentsCount}
                    onChange={(e) => setSlipFormData({ ...slipFormData, dependentsCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    placeholder="1"
                    min="1"
                    style={{ maxWidth: '200px' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    💡 부양가족 수는 소득세 계산에 사용됩니다 (본인 포함)
                  </small>
                </div>
              )}

              {slipFormData.taxType === '3.3%' ? (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                    자동 계산 (프리랜서)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#374151' }}>원천징수 (3.3%)</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                      {formatCurrency(Math.round((parseFloat(slipFormData.basePay) || 0) * 0.033))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>실수령액</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#667eea' }}>
                      {formatCurrency((parseFloat(slipFormData.basePay) || 0) - Math.round((parseFloat(slipFormData.basePay) || 0) * 0.033))}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      공제 항목 (4대보험)
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        if (!slipFormData.basePay || parseFloat(slipFormData.basePay) <= 0) {
                          setMessage({ type: 'error', text: '기본급(세전)을 먼저 입력해주세요.' });
                          return;
                        }
                        try {
                          setMessage({ type: 'info', text: '4대보험료 및 소득세 자동 계산 중...' });
                          
                          // 귀속월 기준으로 4대보험료 계산
                          const insuranceResponse = await salaryAPI.calculateInsurance(
                            parseFloat(slipFormData.basePay),
                            slipFormData.payrollMonth
                          );
                          const insurance = insuranceResponse.data.insurance;
                          const employerBurden = insuranceResponse.data.employerBurden;
                          
                          // 소득세 계산 (4대보험 공제 후 금액 기준)
                          const afterInsurance = parseFloat(slipFormData.basePay) - insurance.total;
                          const taxResponse = await salaryAPI.calculateTax(
                            afterInsurance,
                            parseInt(slipFormData.dependentsCount) || 1
                          );
                          
                          const incomeTax = taxResponse.data.incomeTax || 0;
                          const localIncomeTax = Math.floor(incomeTax * 0.1); // 지방소득세는 소득세의 10%
                          
                          setSlipFormData({
                            ...slipFormData,
                            nationalPension: insurance.nationalPension,
                            healthInsurance: insurance.healthInsurance,
                            longTermCare: insurance.longTermCare,
                            employmentInsurance: insurance.employmentInsurance,
                            incomeTax: incomeTax,
                            localIncomeTax: localIncomeTax,
                            employerNationalPension: employerBurden.nationalPension,
                            employerHealthInsurance: employerBurden.healthInsurance,
                            employerLongTermCare: employerBurden.longTermCare,
                            employerEmploymentInsurance: employerBurden.employmentInsurance
                          });
                          setMessage({ type: 'success', text: `4대보험료 및 소득세가 자동 계산되었습니다! (${slipFormData.payrollMonth || '현재'} 기준 요율 적용)` });
                        } catch (error) {
                          console.error('자동 계산 오류:', error);
                          setMessage({ type: 'error', text: error.response?.data?.message || '자동 계산에 실패했습니다.' });
                        }
                      }}
                      style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    >
                      🔄 자동 계산
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">국민연금</label>
                      <input
                        type="number"
                        className="form-input"
                        value={slipFormData.nationalPension}
                        onChange={(e) => setSlipFormData({ ...slipFormData, nationalPension: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">건강보험</label>
                      <input
                        type="number"
                        className="form-input"
                        value={slipFormData.healthInsurance}
                        onChange={(e) => setSlipFormData({ ...slipFormData, healthInsurance: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">장기요양보험</label>
                      <input
                        type="number"
                        className="form-input"
                        value={slipFormData.longTermCare}
                        onChange={(e) => setSlipFormData({ ...slipFormData, longTermCare: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">고용보험</label>
                      <input
                        type="number"
                        className="form-input"
                        value={slipFormData.employmentInsurance}
                        onChange={(e) => setSlipFormData({ ...slipFormData, employmentInsurance: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">소득세</label>
                      <input
                        type="number"
                        className="form-input"
                        value={slipFormData.incomeTax}
                        onChange={(e) => setSlipFormData({ ...slipFormData, incomeTax: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">지방소득세</label>
                      <input
                        type="number"
                        className="form-input"
                        value={slipFormData.localIncomeTax}
                        onChange={(e) => setSlipFormData({ ...slipFormData, localIncomeTax: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* 사업주 부담금 (4대보험인 경우만 표시) */}
                  {slipFormData.taxType === '4대보험' && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '8px',
                      border: '1px solid #fbbf24',
                      marginTop: '16px'
                    }}>
                      <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', marginBottom: '12px' }}>
                        💼 사업주 부담금 (참고용)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#78350f' }}>국민연금:</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerNationalPension) || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#78350f' }}>건강보험:</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerHealthInsurance) || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#78350f' }}>고용보험:</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerEmploymentInsurance) || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#78350f' }}>장기요양:</span>
                          <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(slipFormData.employerLongTermCare) || 0)}</span>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '12px', 
                        paddingTop: '12px', 
                        borderTop: '2px solid #fbbf24' 
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>사업주 부담금 합계</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                          {formatCurrency(
                            (parseFloat(slipFormData.employerNationalPension) || 0) +
                            (parseFloat(slipFormData.employerHealthInsurance) || 0) +
                            (parseFloat(slipFormData.employerEmploymentInsurance) || 0) +
                            (parseFloat(slipFormData.employerLongTermCare) || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    marginTop: '16px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      계산 결과
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#374151' }}>총 공제액</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                        {formatCurrency(
                          (parseFloat(slipFormData.nationalPension) || 0) +
                          (parseFloat(slipFormData.healthInsurance) || 0) +
                          (parseFloat(slipFormData.employmentInsurance) || 0) +
                          (parseFloat(slipFormData.longTermCare) || 0) +
                          (parseFloat(slipFormData.incomeTax) || 0) +
                          (parseFloat(slipFormData.localIncomeTax) || 0)
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>실수령액</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#667eea' }}>
                        {formatCurrency(
                          (parseFloat(slipFormData.basePay) || 0) -
                          ((parseFloat(slipFormData.nationalPension) || 0) +
                          (parseFloat(slipFormData.healthInsurance) || 0) +
                          (parseFloat(slipFormData.employmentInsurance) || 0) +
                          (parseFloat(slipFormData.longTermCare) || 0) +
                          (parseFloat(slipFormData.incomeTax) || 0) +
                          (parseFloat(slipFormData.localIncomeTax) || 0))
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSlipModal(false);
                  setEditingSlipId(null);
                }}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!slipFormData.userId || !slipFormData.payrollMonth || !slipFormData.basePay) {
                    setMessage({ type: 'error', text: '필수 항목을 모두 입력해주세요.' });
                    return;
                  }

                  try {
                    if (editingSlipId) {
                      await salaryAPI.updateSlip(editingSlipId, slipFormData);
                      setMessage({ type: 'success', text: '급여명세서가 수정되었습니다.' });
                    } else {
                      await salaryAPI.createSlip({
                        ...slipFormData,
                        workplaceId: selectedWorkplace
                      });
                      setMessage({ type: 'success', text: '급여명세서가 작성되었습니다.' });
                    }

                    setShowSlipModal(false);
                    setEditingSlipId(null);

                    // 선택된 직원의 급여명세서 새로고침
                    if (selectedSlipEmployee) {
                      const response = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                      setEmployeeSlips(response.data || []);
                    }

                    // 월별 급여대장 자동 갱신 (귀속월이 payrollLedgerMonth와 일치하면)
                    if (slipFormData.payrollMonth === payrollLedgerMonth) {
                      try {
                        const ledgerResponse = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                        setPayrollLedgerData(ledgerResponse.data);
                      } catch (error) {
                        console.error('급여대장 자동 갱신 오류:', error);
                      }
                    }
                  } catch (error) {
                    console.error('급여명세서 저장 오류:', error);
                    setMessage({ type: 'error', text: '저장에 실패했습니다.' });
                  }
                }}
              >
                {editingSlipId ? '수정' : '저장'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* 월별 급여대장 모달 */}
      {showPayrollLedger && (
        <div className="modal-overlay" onClick={() => setShowPayrollLedger(false)}>
          <div className="modal" style={{ maxWidth: '95%', width: '1400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h3>📊 월별 급여대장 - {payrollLedgerMonth}</h3>
                <button onClick={() => setShowPayrollLedger(false)}>×</button>
              </div>

              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">조회 월 선택</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="month"
                      className="form-input"
                      value={payrollLedgerMonth}
                      onChange={(e) => setPayrollLedgerMonth(e.target.value)}
                      style={{ flex: 1, maxWidth: '300px' }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const response = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                          setPayrollLedgerData(response.data);
                          setMessage({ type: 'success', text: `${payrollLedgerMonth} 급여대장을 조회했습니다.` });
                        } catch (error) {
                          console.error('급여대장 조회 오류:', error);
                          setMessage({ type: 'error', text: error.response?.data?.message || '조회에 실패했습니다.' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      조회
                    </button>
                  </div>
                </div>

                {payrollLedgerData && (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th rowSpan="2">직원명</th>
                          <th rowSpan="2">인건비구분</th>
                          <th rowSpan="2">기본급</th>
                          <th colSpan="4">근로자 부담금</th>
                          <th colSpan="2">세금</th>
                          <th rowSpan="2">공제합계</th>
                          <th rowSpan="2">실수령액</th>
                          <th colSpan="4">사업주 부담금</th>
                          <th rowSpan="2">사업주 부담금 합계</th>
                          <th rowSpan="2">지급일</th>
                        </tr>
                        <tr>
                          <th>국민연금</th>
                          <th>건강보험</th>
                          <th>고용보험</th>
                          <th>장기요양</th>
                          <th>소득세</th>
                          <th>지방세</th>
                          <th>국민연금</th>
                          <th>건강보험</th>
                          <th>고용보험</th>
                          <th>장기요양</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollLedgerData.slips && payrollLedgerData.slips.length > 0 ? (
                          <>
                            {payrollLedgerData.slips.map((slip) => (
                              <tr key={slip.id}>
                                <td>{slip.employee_name}</td>
                                <td>{slip.tax_type}</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.base_pay).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.national_pension || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.health_insurance || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.employment_insurance || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.long_term_care || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.income_tax || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.local_income_tax || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right' }}>{parseInt(slip.total_deductions || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseInt(slip.net_pay || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_national_pension || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_health_insurance || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_employment_insurance || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', background: '#fef3c7' }}>{parseInt(slip.employer_long_term_care || 0).toLocaleString()}원</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', background: '#fef3c7' }}>{parseInt(slip.total_employer_burden || 0).toLocaleString()}원</td>
                                <td>{slip.pay_date || '-'}</td>
                              </tr>
                            ))}
                            <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                              <td colSpan="2">합계</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.basePay).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.nationalPension).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.healthInsurance).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.employmentInsurance).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.longTermCare).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.incomeTax).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.localIncomeTax).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.totalDeductions).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right' }}>{parseInt(payrollLedgerData.totals.netPay).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right', background: '#fbbf24' }}>{parseInt(payrollLedgerData.totals.employerNationalPension).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right', background: '#fbbf24' }}>{parseInt(payrollLedgerData.totals.employerHealthInsurance).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right', background: '#fbbf24' }}>{parseInt(payrollLedgerData.totals.employerEmploymentInsurance).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right', background: '#fbbf24' }}>{parseInt(payrollLedgerData.totals.employerLongTermCare).toLocaleString()}원</td>
                              <td style={{ textAlign: 'right', background: '#fbbf24' }}>{parseInt(payrollLedgerData.totals.totalEmployerBurden).toLocaleString()}원</td>
                              <td>-</td>
                            </tr>
                          </>
                        ) : (
                          <tr>
                            <td colSpan="16" style={{ textAlign: 'center', padding: '40px' }}>
                              해당 월의 급여명세서가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 공지사항 모달 */}
      {showAnnouncementModal && currentAnnouncement && (
        <AnnouncementModal
          announcement={currentAnnouncement}
          onClose={handleCloseAnnouncement}
        />
      )}

      {/* 급여명세서 배포 경고 모달 */}
      {showPublishWarning && slipToPublish && (
        <div className="modal-overlay" onClick={() => setShowPublishWarning(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3 style={{ color: '#ef4444' }}>⚠️ 급여명세서 배포 전 확인사항</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowPublishWarning(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div style={{
                  padding: '20px',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#991b1b', marginBottom: '12px' }}>
                      🔍 <strong>세무대리인 한번더 검토 必 요청</strong>
                    </p>
                    <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: '1.6' }}>
                      급여명세서의 공제 항목(4대보험료, 소득세 등)이 정확한지 세무대리인에게 확인 후 배포해주세요.
                    </p>
                  </div>
                  <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid #fca5a5'
                  }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#991b1b', marginBottom: '12px' }}>
                      📋 <strong>이 기능은 홈택스 신고 기능이 포함되어있지 않습니다</strong>
                    </p>
                    <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: '1.6' }}>
                      4대보험 신고는 별도로 하셔야합니다. 이 프로그램은 급여명세서 작성 및 배포만 지원합니다.
                    </p>
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '14px', color: '#166534', marginBottom: '8px' }}>
                    <strong>귀속월:</strong> {slipToPublish.payroll_month}
                  </p>
                  <p style={{ fontSize: '14px', color: '#166534', marginBottom: '8px' }}>
                    <strong>기본급:</strong> {formatCurrency(slipToPublish.base_pay)}원
                  </p>
                  <p style={{ fontSize: '14px', color: '#166534' }}>
                    <strong>실수령액:</strong> {formatCurrency(slipToPublish.net_pay)}원
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPublishWarning(false)}
                  style={{ flex: 1 }}
                >
                  취소
                </button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      await salaryAPI.publishSlip(slipToPublish.id);
                      setMessage({ type: 'success', text: '급여명세서가 배포되었습니다.' });
                      const response = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
                      setEmployeeSlips(response.data || []);
                      setShowPublishWarning(false);
                      setSlipToPublish(null);
                    } catch (error) {
                      console.error('배포 오류:', error);
                      setMessage({ type: 'error', text: '배포에 실패했습니다.' });
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#10b981' }}
                >
                  확인 후 배포
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 모바일 하단 네비게이션 */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <button
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="mobile-nav-icon">🏠</div>
            <div className="mobile-nav-label">Home</div>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <div className="mobile-nav-icon">📊</div>
            <div className="mobile-nav-label">출근</div>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <div className="mobile-nav-icon">💸</div>
            <div className="mobile-nav-label">급여</div>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <div className="mobile-nav-icon">👥</div>
            <div className="mobile-nav-label">직원</div>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'more' ? 'active' : ''}`}
            onClick={() => setActiveTab('more')}
          >
            <div className="mobile-nav-icon">⋯</div>
            <div className="mobile-nav-label">더보기</div>
          </button>
        </nav>
      )}

      {/* Toast 알림 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default OwnerDashboard;
