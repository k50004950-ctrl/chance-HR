import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import ChangePassword from '../components/ChangePassword';
import '../styles/owner-erp.css';
import { workplaceAPI, employeeAPI, attendanceAPI, salaryAPI, pastEmployeeAPI, salaryHistoryAPI, pastPayrollAPI, authAPI, pushAPI, announcementsAPI, communityAPI, apiClient } from '../services/api';
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
import OwnerMatchingApproval from '../components/OwnerMatchingApproval';
import EmployeeInviteManager from '../components/EmployeeInviteManager';
import MapPicker from '../components/MapPicker';
import MobileLayout from '../components/MobileLayout';
import MobileDashboard from '../components/MobileDashboard';
import Footer from '../components/Footer';
import MobileActionCard from '../components/MobileActionCard';
import useIsMobile from '../hooks/useIsMobile';
import { useEmployeeSort } from '../hooks/useEmployeeSort';
import { useAttendanceSort } from '../hooks/useAttendanceSort';
import { useSalaryCalculation } from '../hooks/useSalaryCalculation';
import { useSalaryFinalize } from '../hooks/useSalaryFinalize';
import { useAttendance } from '../hooks/useAttendance';
import { useRatesManager } from '../hooks/useRatesManager';
import { createEmployeeRiskMap, countEmployeesWithRisks } from '../utils/employeeRiskCalculator';
import { getAttendanceStatus as getAttendanceStatusUtil } from '../utils/attendanceStatus';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showERPChangePassword, setShowERPChangePassword] = useState(false);
  
  // 공용 비즈니스 로직 Hooks
  const salaryCalc = useSalaryCalculation();
  const salaryFinalize = useSalaryFinalize();
  const attendanceManager = useAttendance();
  const ratesManager = useRatesManager();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabLoading, setTabLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [highlightedRecordId, setHighlightedRecordId] = useState(null);
  const [salaryFlowStep, setSalaryFlowStep] = useState(1); // 급여 계산 단계: 1=근무내역, 2=미리보기, 3=확정, 4=발송
  const [editedSalaries, setEditedSalaries] = useState({}); // 수정된 급여: { employeeId: amount }
  const [salaryDeductions, setSalaryDeductions] = useState({}); // 자동계산된 공제: { employeeId: { deductions, netPay, employerBurden } }
  const [calculatingEmployeeId, setCalculatingEmployeeId] = useState(null); // 자동계산 중인 직원 ID
  const [salaryConfirmed, setSalaryConfirmed] = useState(false); // 급여 확정 여부
  const [showConfirmWarning, setShowConfirmWarning] = useState(false); // 확정 경고 모달
  const [notifications, setNotifications] = useState([]); // 알림 목록
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState(null);
  const [workplacesLoading, setWorkplacesLoading] = useState(true);
  const [ownerCompanyId, setOwnerCompanyId] = useState(null); // V2: 사업주의 company_id
  const [showWorkplaceForm, setShowWorkplaceForm] = useState(false); // 사업장 등록 폼 표시 여부
  const [showInviteManager, setShowInviteManager] = useState(false); // 초대 링크 관리 모달 표시 여부
  const [workplaceForm, setWorkplaceForm] = useState({
    name: '',
    business_number: user?.business_number || '',
    address: '',
    phone: user?.phone || '',
    latitude: '',
    longitude: '',
    radius: 100
  });
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
  const [pendingPastPayroll, setPendingPastPayroll] = useState([]);
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
  const [payrollLedgerCollapsed, setPayrollLedgerCollapsed] = useState(false); // 급여대장은 초기에 펼쳐져 있음
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [workplaceLocationForm, setWorkplaceLocationForm] = useState({
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
  const [selectedPost, setSelectedPost] = useState(null); // 상세보기 선택된 게시글
  const [postComments, setPostComments] = useState([]); // 게시글 댓글 목록
  const [newComment, setNewComment] = useState(''); // 새 댓글 입력
  const [editingCommentId, setEditingCommentId] = useState(null); // 수정 중인 댓글 ID
  const [editingCommentContent, setEditingCommentContent] = useState(''); // 수정 중인 댓글 내용
  const [postLiked, setPostLiked] = useState(false); // 현재 게시글 추천 여부
  const [showMobileMore, setShowMobileMore] = useState(false); // 모바일 더보기 메뉴
  
  const uploadBaseUrl =
    import.meta.env.VITE_API_URL?.replace('/api', '') ||
    (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

  // ============================================
  // P0 리팩터링: 로직 분리 및 캐싱
  // ============================================
  
  // 직원 리스크 맵 생성 (employees가 변경될 때만 재계산)
  const employeeRiskMap = useMemo(() => {
    return createEmployeeRiskMap(employees);
  }, [employees]);

  // 직원 필터링 (고용 상태별)
  const filteredEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    
    if (employmentStatusFilter === 'all') return employees;
    
    return employees.filter(emp => {
      if (employmentStatusFilter === 'active') return emp.employment_status === 'active';
      if (employmentStatusFilter === 'on_leave') return emp.employment_status === 'on_leave';
      if (employmentStatusFilter === 'resigned') return emp.employment_status === 'resigned';
      return true;
    });
  }, [employees, employmentStatusFilter]);

  // 직원 정렬 (리스크 우선 → 이름순)
  const sortedEmployees = useEmployeeSort(filteredEmployees, employeeRiskMap, true);

  // 리스크가 있는 직원 수 계산
  const riskCount = useMemo(() => {
    return countEmployeesWithRisks(employeeRiskMap);
  }, [employeeRiskMap]);

  // 출근 기록 정렬 (문제 우선 → 최신순)
  const sortedAttendance = useAttendanceSort(attendance, employees, true);

  // location state에서 activeTab 설정 (NotificationsPage에서 탭 전환 시)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // state 소비 후 제거 (뒤로가기 시 중복 적용 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    loadWorkplaces();
    loadOwnerCompany(); // V2: 사업주 회사 로드
    checkAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityPosts();
    } else if (activeTab === 'dashboard' && selectedWorkplace) {
      loadDashboardData();
      
      // 대시보드 자동 새로고침 (30초마다)
      const refreshInterval = setInterval(() => {
        console.log('🔄 대시보드 데이터 자동 새로고침');
        loadDashboardData();
      }, 30000); // 30초
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [activeTab, selectedWorkplace]);

  // 알림 생성 (데이터 로드 후)
  useEffect(() => {
    if (employees.length > 0 && attendance.length > 0) {
      generateNotifications();
    }
  }, [employees, attendance, employeeSlips]);

  // Step2 진입 시 자동으로 4대보험 계산 (누락된 직원만)
  useEffect(() => {
    const autoCalculateDeductions = async () => {
      if (salaryFlowStep === 2 && salaryData && salaryData.employees && salaryData.employees.length > 0) {
        try {
          const newDeductions = { ...salaryDeductions };
          let calculatedCount = 0;
          
          for (const emp of salaryData.employees) {
            // 이미 계산된 직원은 스킵
            if (salaryDeductions[emp.employeeId] && Object.keys(salaryDeductions[emp.employeeId].deductions || {}).length > 0) {
              continue;
            }
            
            // 총 지급액 (세전) = 기본급여 + 주휴수당
            const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
            const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
            const calculatedTotalPay = baseSalary + weeklyHolidayPay;
            const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
            const taxType = emp.taxType || '4대보험';
            
            try {
              const response = await salaryAPI.calculateInsurance({
                basePay: totalPay,
                payrollMonth: selectedMonth,
                taxType: taxType
              });
              
              newDeductions[emp.employeeId] = {
                basePay: totalPay,
                taxType: taxType,
                deductions: response.data.deductions,
                totalDeductions: response.data.totalDeductions,
                netPay: response.data.netPay
              };
              calculatedCount++;
            } catch (error) {
              console.error(`${emp.employeeName} 자동계산 오류:`, error);
            }
          }
          
          if (calculatedCount > 0) {
            setSalaryDeductions(newDeductions);
            console.log(`✓ Step2 진입: ${calculatedCount}명의 공제액 자동계산 완료`);
          }
        } catch (error) {
          console.error('Step2 자동계산 오류:', error);
        }
      }
    };
    
    autoCalculateDeductions();
  }, [salaryFlowStep, salaryData, selectedMonth]);

  const loadDashboardData = async () => {
    if (!selectedWorkplace) return;
    
    try {
      // 오늘 날짜
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // 이번 달 (월 전체 데이터 로드)
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${year}-${month}`;
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${currentMonth}-01`;
      const endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
      
      // 병렬로 데이터 로드
      const [employeesRes, attendanceRes] = await Promise.all([
        employeeAPI.getByWorkplace(selectedWorkplace),
        attendanceAPI.getByWorkplace(selectedWorkplace, { startDate, endDate })
      ]);
      
      setEmployees(employeesRes.data);
      setAttendance(attendanceRes.data);
      
      console.log(`✅ 대시보드 데이터 로드 완료: 직원 ${employeesRes.data.length}명, 출근기록 ${attendanceRes.data.length}건`);
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    }
  };

  const getDashboardStats = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // 날짜 비교 함수 (date 필드가 다양한 형식일 수 있음)
    const isSameDate = (dateStr, targetDate) => {
      if (!dateStr) return false;
      const dateOnly = dateStr.split('T')[0];
      return dateOnly === targetDate;
    };
    
    const todayAttendance = attendance.filter(a => isSameDate(a.date, today));
    const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
    
    // 디버깅 로그
    console.log('📊 대시보드 통계 계산:');
    console.log('  - 오늘 날짜:', today);
    console.log('  - 전체 출근기록:', attendance.length, '건');
    console.log('  - 오늘 출근기록:', todayAttendance.length, '건');
    console.log('  - 활성 직원:', activeEmployees.length, '명');
    
    // 오늘 출근기록 상세 로그
    if (todayAttendance.length > 0) {
      console.log('  - 오늘 출근기록 상세:', todayAttendance.map(a => ({
        name: a.employee_name,
        date: a.date,
        checkIn: a.check_in_time,
        checkOut: a.check_out_time
      })));
    }
    
    // 오늘 출근한 인원
    const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
    
    // 미퇴근 인원 (출근했지만 퇴근 안 한 사람)
    const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
    
    console.log('  ✅ 출근:', checkedInToday, '명');
    console.log('  ⚠️ 미퇴근:', notCheckedOut, '명');
    
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
    
    // 날짜 비교 함수 (date 필드가 다양한 형식일 수 있음)
    const isSameDate = (dateStr, targetDate) => {
      if (!dateStr) return false;
      const dateOnly = dateStr.split('T')[0];
      return dateOnly === targetDate;
    };
    
    const todayAttendance = attendance.filter(a => isSameDate(a.date, today));
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

  // 출퇴근 상태 판단 함수 (리팩터링: 유틸로 분리됨)
  const getAttendanceStatus = (record) => {
    return getAttendanceStatusUtil(record, employees);
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
        
        // 출근 탭 자동 새로고침 (30초마다)
        const attendanceRefreshInterval = setInterval(() => {
          console.log('🔄 출근 데이터 자동 새로고침');
          loadAttendance();
        }, 30000); // 30초
        
        return () => {
          clearInterval(attendanceRefreshInterval);
        };
      }
      if (activeTab === 'salary' || activeTab === 'severance') {
        loadSalary();
        // 급여 탭에서 사업장의 모든 급여명세서 로드
        salaryAPI.getWorkplaceSlips(selectedWorkplace, { month: selectedMonth })
          .then(response => {
            if (response && response.data) {
              setEmployeeSlips(response.data);
            }
          })
          .catch(error => console.error('급여명세서 로드 오류:', error));
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
      setWorkplaceLocationForm({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radius: ''
      });
      return;
    }
    setWorkplaceLocationForm({
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
        console.log('급여대장 자동 로드:', { workplaceId: selectedWorkplace, payrollMonth: payrollLedgerMonth });
        setPayrollLedgerCollapsed(false); // 탭 진입 시 항상 펼치기
        
        // payrollMonth 형식 검증
        if (!/^\d{4}-\d{2}$/.test(payrollLedgerMonth)) {
          console.error('잘못된 급여월 형식:', payrollLedgerMonth);
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          setPayrollLedgerMonth(`${year}-${month}`);
          return;
        }
        
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
    setWorkplacesLoading(true);
    try {
      const response = await workplaceAPI.getMy();
      setWorkplaces(response.data);
      if (response.data.length > 0) {
        setSelectedWorkplace(response.data[0].id);
      }
    } catch (error) {
      console.error('사업장 조회 오류:', error);
    } finally {
      setWorkplacesLoading(false);
    }
  };

  // V2: 사업주의 회사 정보 로드
  const loadOwnerCompany = async () => {
    try {
      const response = await apiClient.get(`/v2/auth/owner/my-companies/${user.id}`);
      console.log('🔍 회사 조회 응답:', response.data);
      
      if (response.data.success && response.data.companies.length > 0) {
        setOwnerCompanyId(response.data.companies[0].id);
        console.log('✅ 사업주 회사 로드:', response.data.companies[0]);
      } else {
        console.warn('⚠️ 등록된 회사가 없습니다. V1 시스템 사용자일 수 있습니다.');
        // V1 시스템 사용자의 경우 ownerCompanyId가 없어도 기존 기능은 작동
      }
    } catch (error) {
      console.error('❌ 사업주 회사 조회 오류:', error);
      // V2 시스템이 아직 완전히 마이그레이션되지 않은 경우 무시
    }
  };

  // 사업장 수동 등록
  const handleCreateWorkplace = async (e) => {
    e.preventDefault();
    
    if (!workplaceForm.address) {
      setToast({ show: true, message: '주소를 입력해주세요.', type: 'error' });
      return;
    }
    if (!workplaceForm.latitude || !workplaceForm.longitude) {
      setToast({ show: true, message: '위도와 경도를 입력해주세요.', type: 'error' });
      return;
    }
    
    setLoading(true);

    try {
      const workplaceData = {
        companyId: ownerCompanyId, // V2 시스템용
        ownerId: user.id, // V2 시스템용
        name: workplaceForm.name,
        business_number: workplaceForm.business_number,
        address: workplaceForm.address,
        latitude: Number(workplaceForm.latitude),
        longitude: Number(workplaceForm.longitude),
        radius: Number(workplaceForm.radius) || 100,
        phone: workplaceForm.phone
      };

      // V2 시스템 API 호출 (초대 시스템 호환)
      const response = await apiClient.post('/v2/auth/owner/create-workplace', workplaceData);
      
      if (response.data.success) {
        setToast({ 
          show: true,
          message: '✅ 사업장이 등록되었습니다!', 
          type: 'success' 
        });
        setShowWorkplaceForm(false);
        setWorkplaceForm({
          name: '',
          business_number: user?.business_number || '',
          address: '',
          phone: user?.phone || '',
          latitude: '',
          longitude: '',
          radius: 100
        });
        // 사업장 목록 새로고침
        await loadWorkplaces();
      }
    } catch (error) {
      console.error('사업장 등록 오류:', error);
      setMessage({ 
        text: error.response?.data?.message || '사업장 등록 중 오류가 발생했습니다.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
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
    setWorkplaceLocationForm((prev) => ({
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
        setWorkplaceLocationForm((prev) => ({
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
      
      // 주소 검색에서 이미 좌표를 가져온 경우 사용
      if (result.latitude && result.longitude) {
        setWorkplaceLocationForm((prev) => ({
          ...prev,
          address,
          latitude: result.latitude.toFixed(6),
          longitude: result.longitude.toFixed(6)
        }));
      } else {
        // 좌표가 없는 경우에만 주소로 재검색
        setWorkplaceLocationForm((prev) => ({
          ...prev,
          address
        }));
        if (address) {
          try {
            const coords = await getCoordinatesFromAddress(address);
            setWorkplaceLocationForm((prev) => ({
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
    if (!workplaceLocationForm.address) return;
    if (workplaceGeocodeLoading) return;
    try {
      setWorkplaceGeocodeLoading(true);
      const coords = await getCoordinatesFromAddress(workplaceLocationForm.address);
      if (coords && coords.latitude && coords.longitude) {
        setWorkplaceLocationForm((prev) => ({
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
    if (!workplaceLocationForm.address) {
      setMessage({ type: 'error', text: '사업장 주소를 입력해주세요.' });
      return;
    }
    if (workplaceLocationForm.latitude === '' || workplaceLocationForm.longitude === '') {
      setMessage({ type: 'error', text: '사업장 위치(위도/경도)를 입력해주세요.' });
      return;
    }

    setWorkplaceSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        name: workplaceLocationForm.name || currentWorkplace.name,
        address: workplaceLocationForm.address,
        latitude: Number(workplaceLocationForm.latitude),
        longitude: Number(workplaceLocationForm.longitude),
        radius: workplaceLocationForm.radius !== '' ? Number(workplaceLocationForm.radius) : currentWorkplace.radius,
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
    setPendingPastPayroll([]);
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
        loadAttendance(); // 출퇴근 기록 다시 로드 (지각 판단 업데이트)
        setFormErrors({});
      } else {
        const response = await employeeAPI.create(formDataToSend);
        console.log('등록 성공:', response);
        const newEmployeeId = response.data.employeeId;
        // 과거 급여 기록 저장
        for (const record of pendingPastPayroll) {
          try {
            await pastPayrollAPI.create(newEmployeeId, record);
          } catch (e) {
            console.error('과거 급여 기록 저장 오류:', e);
          }
        }
        setToast({ message: '✓ 직원이 등록되었습니다.', type: 'success' });
        closeModal();
        loadEmployees();
        loadAttendance();
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
    if (type === 'create') {
      setCommunityFormData({ id: null, title: '', content: '' });
      setShowCommunityModal(true);
    } else if (type === 'edit' && post) {
      setCommunityFormData({ id: post.id, title: post.title, content: post.content });
      setShowCommunityModal(true);
    } else if (type === 'view' && post) {
      // 상세보기는 별도 함수로 처리
      openPostDetail(post.id);
    }
  };

  // 게시글 상세보기
  const openPostDetail = async (postId) => {
    try {
      setCommunityLoading(true);
      // 게시글 상세 정보 가져오기 (조회수 증가)
      const postResponse = await communityAPI.getPost(postId);
      setSelectedPost(postResponse.data);
      
      // 댓글 목록 가져오기
      const commentsResponse = await communityAPI.getComments(postId);
      setPostComments(commentsResponse.data);
      
      // 추천 상태 가져오기
      const likeResponse = await communityAPI.getLikeStatus(postId);
      setPostLiked(likeResponse.data.liked);
      
      setShowCommunityModal(true);
      setCommunityModalType('view');
    } catch (error) {
      console.error('게시글 상세 조회 오류:', error);
      setMessage({ type: 'error', text: '게시글을 불러오는데 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  // 게시글 추천 토글
  const handleToggleLike = async () => {
    if (!selectedPost) return;
    
    try {
      const response = await communityAPI.toggleLike(selectedPost.id);
      setPostLiked(response.data.liked);
      setSelectedPost({ ...selectedPost, like_count: response.data.like_count });
      // 목록도 업데이트
      setCommunityPosts(communityPosts.map(post => 
        post.id === selectedPost.id 
          ? { ...post, like_count: response.data.like_count }
          : post
      ));
    } catch (error) {
      console.error('추천 처리 오류:', error);
      setMessage({ type: 'error', text: '추천 처리에 실패했습니다.' });
    }
  };

  // 댓글 작성
  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return;
    
    try {
      setCommunityLoading(true);
      await communityAPI.createComment(selectedPost.id, { content: newComment });
      setNewComment('');
      // 댓글 목록 새로고침
      const commentsResponse = await communityAPI.getComments(selectedPost.id);
      setPostComments(commentsResponse.data);
      // 게시글 정보도 새로고침 (댓글 수 업데이트)
      const postResponse = await communityAPI.getPost(selectedPost.id);
      setSelectedPost(postResponse.data);
      // 목록도 업데이트
      loadCommunityPosts();
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      setMessage({ type: 'error', text: '댓글 작성에 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  // 댓글 수정
  const handleUpdateComment = async (commentId) => {
    if (!editingCommentContent.trim()) return;
    
    try {
      setCommunityLoading(true);
      await communityAPI.updateComment(commentId, { content: editingCommentContent });
      setEditingCommentId(null);
      setEditingCommentContent('');
      // 댓글 목록 새로고침
      const commentsResponse = await communityAPI.getComments(selectedPost.id);
      setPostComments(commentsResponse.data);
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      setMessage({ type: 'error', text: '댓글 수정에 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
    
    try {
      setCommunityLoading(true);
      await communityAPI.deleteComment(commentId);
      // 댓글 목록 새로고침
      const commentsResponse = await communityAPI.getComments(selectedPost.id);
      setPostComments(commentsResponse.data);
      // 게시글 정보도 새로고침 (댓글 수 업데이트)
      const postResponse = await communityAPI.getPost(selectedPost.id);
      setSelectedPost(postResponse.data);
      // 목록도 업데이트
      loadCommunityPosts();
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      setMessage({ type: 'error', text: '댓글 삭제에 실패했습니다.' });
    } finally {
      setCommunityLoading(false);
    }
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
      
      // 성공 피드백
      setToast({ message: '근무시간이 수정되었습니다.', type: 'success' });
      
      // 모달 닫고 데이터 갱신
      closeModal();
      await loadAttendance();
      
      // 저장된 카드 Highlight (1.5초 후 제거)
      setHighlightedRecordId(formData.id);
      setTimeout(() => setHighlightedRecordId(null), 1500);
      
    } catch (error) {
      console.error('근무시간 수정 오류:', error);
      setToast({ message: error.response?.data?.message || '저장에 실패했습니다.', type: 'error' });
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

  // 4대보험/세금 자동계산
  const calculateDeductions = async (employeeId, basePay, dependentsCount = 1, taxType = '4대보험') => {
    if (!basePay || basePay <= 0) {
      setToast({ type: 'error', message: '기본급을 먼저 입력해주세요.' });
      return;
    }

    try {
      setCalculatingEmployeeId(employeeId);
      setToast({ type: 'info', message: '자동 계산 중...' });
      
      // 귀속월 기준으로 보험료/세금 계산
      const insuranceResponse = await salaryAPI.calculateInsurance({
        basePay: parseFloat(basePay),
        payrollMonth: selectedMonth,
        taxType: taxType
      });
      
      const data = insuranceResponse.data;
      
      // 3.3% (프리랜서)
      if (taxType === '3.3%') {
        const deductions = {
          withholding: data.withholding || 0
        };
        const netPay = data.netPay || 0;
        const totalDeductions = data.withholding || 0;
        
        setSalaryDeductions(prev => ({
          ...prev,
          [employeeId]: {
            deductions,
            netPay,
            totalDeductions,
            appliedRateMonth: data.appliedRateMonth,
            taxType: '3.3%'
          }
        }));
        
        setToast({ 
          type: 'success', 
          message: `3.3% 원천징수액이 계산되었습니다! (${data.appliedRateMonth} 요율 적용)` 
        });
        return;
      }
      
      // 4대보험
      const insurance = data.insurance;
      const employerBurden = data.employerBurden;
      
      // 소득세 계산 (4대보험 공제 후 금액 기준)
      const afterInsurance = parseFloat(basePay) - insurance.total;
      const taxResponse = await salaryAPI.calculateTax(
        afterInsurance,
        parseInt(dependentsCount) || 1
      );
      
      const incomeTax = taxResponse.data.incomeTax || 0;
      const localIncomeTax = Math.floor(incomeTax * 0.1);
      
      // 공제 항목
      const deductions = {
        nationalPension: insurance.nationalPension || 0,
        healthInsurance: insurance.healthInsurance || 0,
        longTermCare: insurance.longTermCare || 0,
        employmentInsurance: insurance.employmentInsurance || 0,
        incomeTax: incomeTax,
        localIncomeTax: localIncomeTax
      };
      
      // 실수령액 계산
      const totalDeductions = 
        deductions.nationalPension +
        deductions.healthInsurance +
        deductions.longTermCare +
        deductions.employmentInsurance +
        deductions.incomeTax +
        deductions.localIncomeTax;
      
      const netPay = parseFloat(basePay) - totalDeductions;
      
      // 상태 저장
      setSalaryDeductions(prev => ({
        ...prev,
        [employeeId]: {
          deductions,
          netPay,
          totalDeductions,
          appliedRateMonth: data.appliedRateMonth,
          taxType: '4대보험',
          employerBurden: {
            nationalPension: employerBurden.nationalPension || 0,
            healthInsurance: employerBurden.healthInsurance || 0,
            longTermCare: employerBurden.longTermCare || 0,
            employmentInsurance: employerBurden.employmentInsurance || 0
          }
        }
      }));
      
      setToast({ 
        type: 'success', 
        message: `4대보험료 및 소득세가 자동 계산되었습니다! (${data.appliedRateMonth} 요율 적용)` 
      });
    } catch (error) {
      console.error('자동 계산 오류:', error);
      setToast({ 
        type: 'error', 
        message: error.response?.data?.message || '자동 계산에 실패했습니다.' 
      });
    } finally {
      setCalculatingEmployeeId(null);
    }
  };

  // 탭 전환 핸들러 (즉각 피드백 + 로딩 처리)
  const handleTabChange = async (newTab) => {
    // 1. 즉시 active 상태 변경
    setActiveTab(newTab);
    
    // 2. 데이터 로딩이 필요한 탭인 경우 로딩 표시
    const needsLoading = ['attendance', 'salary'].includes(newTab);
    if (needsLoading) {
      setTabLoading(true);
      
      // 최소 300ms 로딩 표시 (체감 피드백)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setTabLoading(false);
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
    <div className={!isMobile ? 'erp-root' : ''}>
      {/* PC: 새 ERP 헤더 + 사이드바 / 모바일: 기존 헤더 */}
      {!isMobile ? (
        <>
          <header className="erp-header">
            <div className="erp-header-logo">
              찬스<span style={{ color: '#111827' }}>HR</span>
            </div>
            <div className="erp-header-center">
              {workplaces.length > 0 && (
                <select
                  className="erp-workplace-select"
                  value={selectedWorkplace || ''}
                  onChange={(e) => setSelectedWorkplace(parseInt(e.target.value))}
                >
                  {workplaces.map((wp) => (
                    <option key={wp.id} value={wp.id}>{wp.name} — {wp.address}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="erp-header-right">
              <NotificationCenter notifications={notifications} onActionClick={handleNotificationAction} />
              <button className="erp-user-btn" onClick={() => setUserDropdownOpen(v => !v)}>
                <div className="avatar">{(user?.name || 'U')[0]}</div>
                {user?.name || '사용자'}
                <span style={{ fontSize: '11px', marginLeft: '2px' }}>▾</span>
              </button>
              {userDropdownOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setUserDropdownOpen(false)} />
                  <div className="erp-dropdown">
                    <button className="erp-dropdown-item" onClick={() => { setUserDropdownOpen(false); navigate('/guide'); }}>
                      📘 사용방법
                    </button>
                    <button className="erp-dropdown-item" onClick={() => { setUserDropdownOpen(false); setShowERPChangePassword(true); }}>
                      🔐 비밀번호 변경
                    </button>
                    <div className="erp-dropdown-divider" />
                    <button className="erp-dropdown-item danger" onClick={() => { setUserDropdownOpen(false); logout(); }}>
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>
          {/* 사이드바 — 사업장이 선택된 경우에만 표시 */}
          {selectedWorkplace && (
            <aside className="erp-sidebar">
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">메인</div>
                <button className={`erp-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  <span className="erp-nav-icon">🏠</span> 홈
                </button>
                <button className={`erp-nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                  <span className="erp-nav-icon">📊</span> 오늘 출근
                </button>
                <button className={`erp-nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                  <span className="erp-nav-icon">📅</span> 출근 달력
                </button>
              </div>
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">급여</div>
                <button className={`erp-nav-item ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>
                  <span className="erp-nav-icon">📋</span> 급여 관리
                </button>
                <button className={`erp-nav-item ${activeTab === 'salary-slips' ? 'active' : ''}`} onClick={() => setActiveTab('salary-slips')}>
                  <span className="erp-nav-icon">📄</span> 급여명세서
                </button>
                <button className={`erp-nav-item ${activeTab === 'severance' ? 'active' : ''}`} onClick={() => setActiveTab('severance')}>
                  <span className="erp-nav-icon">🧮</span> 퇴직금 계산
                </button>
              </div>
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">인사</div>
                <button className={`erp-nav-item ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
                  <span className="erp-nav-icon">👥</span> 직원 관리
                </button>
                <button className={`erp-nav-item ${activeTab === 'past-employees' ? 'active' : ''}`} onClick={() => setActiveTab('past-employees')}>
                  <span className="erp-nav-icon">📁</span> 서류 보관함
                </button>
              </div>
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">기타</div>
                <button className={`erp-nav-item ${activeTab === 'matching' ? 'active' : ''}`} onClick={() => setActiveTab('matching')}>
                  <span className="erp-nav-icon">🔔</span> 매칭 승인
                </button>
                <button className={`erp-nav-item ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
                  <span className="erp-nav-icon">💬</span> 소통방
                </button>
                <button className={`erp-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                  <span className="erp-nav-icon">⚙️</span> 설정
                </button>
              </div>
            </aside>
          )}
          {showERPChangePassword && (
            <ChangePassword
              onClose={() => setShowERPChangePassword(false)}
              onSuccess={() => { alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.'); logout(); }}
            />
          )}
        </>
      ) : (
        <Header />
      )}
      <div className={!isMobile ? 'erp-main' : 'container'} style={{
        ...(isMobile && {
          padding: '0',
          maxWidth: '100%',
          paddingBottom: 'calc(90px + var(--safe-bottom, 34px))'
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
                 activeTab === 'matching' ? '매칭 요청' :
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
        ) : null}

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {/* 사업장 주소/위치 수정은 설정 탭으로 이동 */}


        {!selectedWorkplace ? (
          <div className="card">
            {workplacesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <p>사업장 정보를 불러오는 중...</p>
              </div>
            ) : !showWorkplaceForm ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
                <h3 style={{ color: '#374151', marginBottom: '8px' }}>등록된 사업장이 없습니다</h3>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  새로운 사업장을 등록하여 시작하세요.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowWorkplaceForm(true)}
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                >
                  🏢 사업장 등록하기
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '20px', color: '#374151' }}>🏢 새 사업장 등록</h3>
                <form onSubmit={handleCreateWorkplace}>
                  <div className="form-group">
                    <label className="form-label">사업장 이름 <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={workplaceForm.name}
                      onChange={(e) => setWorkplaceForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="예: 본점, 강남점"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">사업자등록번호 <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={workplaceForm.business_number}
                      onChange={(e) => setWorkplaceForm(prev => ({ ...prev, business_number: e.target.value }))}
                      placeholder="123-45-67890"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">주소 <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={workplaceForm.address}
                        onClick={async () => {
                          try {
                            setWorkplaceSearchLoading(true);
                            console.log('🔍 주소 검색 시작... (input 클릭)');
                            
                            const result = await searchAddress();
                            console.log('✅ 주소 검색 결과:', result);
                            
                            const address = result.address || '';
                            
                            // 일단 주소는 무조건 입력
                            setWorkplaceForm(prev => ({ ...prev, address }));
                            
                            // 주소 검색에서 이미 좌표를 가져온 경우 사용
                            if (result.latitude && result.longitude) {
                              console.log('✅ 좌표 자동 입력:', result.latitude, result.longitude);
                              setWorkplaceForm(prev => ({
                                ...prev,
                                address,
                                latitude: result.latitude.toFixed(6),
                                longitude: result.longitude.toFixed(6)
                              }));
                              setToast({ show: true, message: '주소와 좌표가 자동으로 입력되었습니다.', type: 'success' });
                            } else {
                              // 좌표가 없는 경우에만 주소로 재검색
                              console.log('⚠️ 좌표 없음, 재검색 시작...');
                              if (address) {
                                try {
                                  const coords = await getCoordinatesFromAddress(address);
                                  console.log('✅ 좌표 재검색 성공:', coords);
                                  setWorkplaceForm(prev => ({
                                    ...prev,
                                    latitude: coords.latitude?.toFixed ? coords.latitude.toFixed(6) : coords.latitude,
                                    longitude: coords.longitude?.toFixed ? coords.longitude.toFixed(6) : coords.longitude
                                  }));
                                  setToast({ show: true, message: coords.message || '주소와 좌표가 입력되었습니다.', type: coords.success ? 'success' : 'warning' });
                                } catch (error) {
                                  console.error('❌ 좌표 변환 실패:', error);
                                  setToast({ show: true, message: '주소가 입력되었습니다. 위도/경도를 수동으로 입력하거나 "현재 위치" 버튼을 사용해주세요.', type: 'warning' });
                                }
                              }
                            }
                          } catch (error) {
                            console.error('❌ 주소 검색 오류:', error);
                            if (error?.message && !error.message.includes('취소')) {
                              setToast({ show: true, message: error.message, type: 'error' });
                            }
                          } finally {
                            setWorkplaceSearchLoading(false);
                          }
                        }}
                        placeholder="클릭하여 주소 검색"
                        readOnly
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={async () => {
                          try {
                            setWorkplaceSearchLoading(true);
                            console.log('🔍 주소 검색 시작...');
                            
                            const result = await searchAddress();
                            console.log('✅ 주소 검색 결과:', result);
                            
                            const address = result.address || '';
                            
                            // 일단 주소는 무조건 입력
                            setWorkplaceForm(prev => ({ ...prev, address }));
                            
                            // 주소 검색에서 이미 좌표를 가져온 경우 사용
                            if (result.latitude && result.longitude) {
                              console.log('✅ 좌표 자동 입력:', result.latitude, result.longitude);
                              setWorkplaceForm(prev => ({
                                ...prev,
                                address,
                                latitude: result.latitude.toFixed(6),
                                longitude: result.longitude.toFixed(6)
                              }));
                              setToast({ show: true, message: '주소와 좌표가 자동으로 입력되었습니다.', type: 'success' });
                            } else {
                              // 좌표가 없는 경우에만 주소로 재검색
                              console.log('⚠️ 좌표 없음, 재검색 시작...');
                              if (address) {
                                try {
                                  const coords = await getCoordinatesFromAddress(address);
                                  console.log('✅ 좌표 재검색 성공:', coords);
                                  setWorkplaceForm(prev => ({
                                    ...prev,
                                    latitude: coords.latitude?.toFixed ? coords.latitude.toFixed(6) : coords.latitude,
                                    longitude: coords.longitude?.toFixed ? coords.longitude.toFixed(6) : coords.longitude
                                  }));
                                  setToast({ show: true, message: coords.message || '주소와 좌표가 입력되었습니다.', type: coords.success ? 'success' : 'warning' });
                                } catch (error) {
                                  console.error('❌ 좌표 변환 실패:', error);
                                  setToast({ show: true, message: '주소가 입력되었습니다. 위도/경도를 수동으로 입력하거나 "현재 위치" 버튼을 사용해주세요.', type: 'warning' });
                                }
                              }
                            }
                          } catch (error) {
                            console.error('❌ 주소 검색 오류:', error);
                            if (error?.message && !error.message.includes('취소')) {
                              setToast({ show: true, message: error.message, type: 'error' });
                            }
                          } finally {
                            setWorkplaceSearchLoading(false);
                          }
                        }}
                        disabled={workplaceSearchLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {workplaceSearchLoading ? '검색 중...' : '주소 검색'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">위도 <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="number"
                        step="0.000001"
                        className="form-input"
                        value={workplaceForm.latitude}
                        onChange={(e) => setWorkplaceForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="37.123456"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">경도 <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="number"
                        step="0.000001"
                        className="form-input"
                        value={workplaceForm.longitude}
                        onChange={(e) => setWorkplaceForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="127.123456"
                        required
                      />
                    </div>
                  </div>

                  {/* 중요 안내 */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '24px' }}>⚠️</span>
                      <strong style={{ fontSize: '18px', color: '#92400e' }}>
                        사업장 위치에서 등록하세요!
                      </strong>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      color: '#78350f', 
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      정확한 출퇴근 인증을 위해 <strong>실제 사업장이 있는 장소</strong>에서 "현재 위치로 설정" 버튼을 눌러주세요.
                    </p>
                  </div>

                  {/* 현재 위치로 설정 버튼 */}
                  <div className="form-group">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          setWorkplaceSearchLoading(true);
                          console.log('📍 현재 위치 가져오기 시작...');
                          
                          if (!navigator.geolocation) {
                            setToast({ show: true, message: '이 브라우저는 위치 서비스를 지원하지 않습니다.', type: 'error' });
                            return;
                          }

                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const lat = position.coords.latitude.toFixed(6);
                              const lng = position.coords.longitude.toFixed(6);
                              console.log('✅ 현재 위치:', lat, lng);
                              
                              setWorkplaceForm(prev => ({
                                ...prev,
                                latitude: lat,
                                longitude: lng
                              }));
                              
                              setToast({ 
                                show: true, 
                                message: `현재 위치로 설정되었습니다. (위도: ${lat}, 경도: ${lng})`, 
                                type: 'success' 
                              });
                              setWorkplaceSearchLoading(false);
                            },
                            (error) => {
                              console.error('❌ 위치 가져오기 실패:', error);
                              let errorMsg = '위치를 가져올 수 없습니다.';
                              
                              switch (error.code) {
                                case error.PERMISSION_DENIED:
                                  errorMsg = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                                  break;
                                case error.POSITION_UNAVAILABLE:
                                  errorMsg = '위치 정보를 사용할 수 없습니다.';
                                  break;
                                case error.TIMEOUT:
                                  errorMsg = '위치 요청 시간이 초과되었습니다.';
                                  break;
                              }
                              
                              setToast({ show: true, message: errorMsg, type: 'error' });
                              setWorkplaceSearchLoading(false);
                            },
                            {
                              enableHighAccuracy: true,
                              timeout: 10000,
                              maximumAge: 0
                            }
                          );
                        } catch (error) {
                          console.error('❌ 현재 위치 오류:', error);
                          setToast({ show: true, message: '현재 위치를 가져오는 중 오류가 발생했습니다.', type: 'error' });
                          setWorkplaceSearchLoading(false);
                        }
                      }}
                      disabled={workplaceSearchLoading}
                      style={{ 
                        width: '100%',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        padding: '14px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      📍 {workplaceSearchLoading ? '위치 가져오는 중...' : '현재 위치로 설정'}
                    </button>
                    <small style={{ color: '#6b7280', marginTop: '8px', display: 'block', textAlign: 'center' }}>
                      주소 검색 후 좌표가 자동 입력되지 않으면 이 버튼을 클릭하세요
                    </small>
                  </div>

                  {/* 지도에서 위치 선택 */}
                  {workplaceForm.address && workplaceForm.latitude && workplaceForm.longitude && (
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: '12px', display: 'block', fontSize: '16px', fontWeight: 'bold' }}>
                        🗺️ 지도에서 정확한 위치 설정
                      </label>
                      <MapPicker
                        latitude={workplaceForm.latitude}
                        longitude={workplaceForm.longitude}
                        address={workplaceForm.address}
                        onLocationChange={(coords) => {
                          setWorkplaceForm(prev => ({
                            ...prev,
                            latitude: coords.latitude.toFixed(6),
                            longitude: coords.longitude.toFixed(6)
                          }));
                        }}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">출퇴근 인정 반경 (미터) <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      value={workplaceForm.radius}
                      onChange={(e) => setWorkplaceForm(prev => ({ ...prev, radius: e.target.value }))}
                      placeholder="100"
                      min="10"
                      required
                    />
                    <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                      이 거리 안에서 출퇴근 체크가 가능합니다
                    </small>
                  </div>

                  <div className="form-group">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        if (!navigator.geolocation) {
                          setToast({ show: true, message: '현재 브라우저는 위치 정보를 지원하지 않습니다.', type: 'error' });
                          return;
                        }
                        setWorkplaceLocationLoading(true);
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setWorkplaceForm(prev => ({
                              ...prev,
                              latitude: position.coords.latitude.toFixed(6),
                              longitude: position.coords.longitude.toFixed(6)
                            }));
                            setWorkplaceLocationLoading(false);
                            setToast({ show: true, message: '현재 위치가 설정되었습니다.', type: 'success' });
                          },
                          () => {
                            setToast({ show: true, message: '위치 정보를 가져오지 못했습니다. 위치 권한을 확인해주세요.', type: 'error' });
                            setWorkplaceLocationLoading(false);
                          },
                          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                        );
                      }}
                      disabled={workplaceLocationLoading}
                      style={{ width: '100%' }}
                    >
                      {workplaceLocationLoading ? '위치 확인 중...' : '📍 현재 위치로 설정'}
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">전화번호</label>
                    <input
                      type="text"
                      className="form-input"
                      value={workplaceForm.phone}
                      onChange={(e) => setWorkplaceForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="010-1234-5678"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      {loading ? '등록 중...' : '✅ 등록하기'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowWorkplaceForm(false)}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            )}
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

            {/* PC 사이드바 네비게이션으로 대체됨 */}

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
                {/* 직원현황 요약 바 */}
                {(() => {
                  const totalEmployees = employees.length;
                  const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
                  const onLeaveEmployees = employees.filter(emp => emp.employment_status === 'on_leave');
                  const resignedEmployees = employees.filter(emp => emp.employment_status === 'resigned');

                  // 리스크 판단 로직
                  const getEmployeeRisks = (emp) => {
                    const risks = [];
                    // 서류 필요
                    if (!emp.contract_file_url) {
                      risks.push({ type: 'contract', label: '서류 필요', color: '#f59e0b' });
                    }
                    // 급여 미설정
                    if (!emp.salary_type || !emp.amount || emp.amount === 0 || emp.amount === '0' || emp.amount === '0.00') {
                      risks.push({ type: 'salary', label: '급여 미설정', color: '#ef4444' });
                    }
                    // 퇴사 처리 필요 (퇴사 상태인데 퇴사일 없음)
                    if (emp.employment_status === 'resigned' && !emp.resignation_date) {
                      risks.push({ type: 'resignation', label: '퇴사 처리 필요', color: '#ef4444' });
                    }
                    return risks;
                  };

                  const employeesWithRisks = employees.filter(emp => getEmployeeRisks(emp).length > 0);
                  const riskCount = employeesWithRisks.length;

                  return !isMobile ? (
                    <div className="erp-roster-summary">
                      <div className="erp-roster-summary-title">👥 직원 현황</div>
                      <div className="erp-roster-stats">
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">전체</div>
                          <div className="erp-roster-stat-value" style={{ color: '#2563EB' }}>{totalEmployees}</div>
                        </div>
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">재직</div>
                          <div className="erp-roster-stat-value" style={{ color: '#10B981' }}>{activeEmployees.length}</div>
                        </div>
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">휴직</div>
                          <div className="erp-roster-stat-value">{onLeaveEmployees.length}</div>
                        </div>
                        <div className="erp-roster-stat">
                          <div className="erp-roster-stat-label">퇴사</div>
                          <div className="erp-roster-stat-value" style={{ color: '#9CA3AF' }}>{resignedEmployees.length}</div>
                        </div>
                        <div className={`erp-roster-stat ${riskCount > 0 ? 'risk' : ''}`}>
                          <div className="erp-roster-stat-label">⚠️ 주의 필요</div>
                          <div className="erp-roster-stat-value">{riskCount}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '16px',
                      padding: '20px 16px',
                      marginBottom: '24px',
                      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>👥 직원현황</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>👤 전체</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea' }}>{totalEmployees}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>✓ 재직</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>{activeEmployees.length}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>🔵 휴직</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{onLeaveEmployees.length}</div>
                        </div>
                        <div style={{ background: riskCount > 0 ? 'rgba(245,158,11,0.95)' : 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px', textAlign: 'center', gridColumn: 'span 2' }}>
                          <div style={{ fontSize: '12px', color: riskCount > 0 ? '#fff' : '#6b7280', marginBottom: '8px' }}>⚠️ 주의 필요</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: riskCount > 0 ? '#fff' : '#6b7280' }}>{riskCount}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 모바일 전용 헤더 */}
                {isMobile ? (
                  <div className="mobile-employee-header">
                    <div className="mobile-tabs">
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('all')}
                      >
                        전체
                      </button>
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('active')}
                      >
                        재직
                      </button>
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'on_leave' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('on_leave')}
                      >
                        휴직
                      </button>
                      <button
                        className={`mobile-tab ${employmentStatusFilter === 'resigned' ? 'active' : ''}`}
                        onClick={() => setEmploymentStatusFilter('resigned')}
                      >
                        퇴사
                      </button>
                    </div>
                    <button
                      className="mobile-add-btn"
                      onClick={() => openModal('employee')}
                    >
                      <span>+</span>
                    </button>
                  </div>
                ) : (
                  /* 데스크톱 헤더 */
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>
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
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('resigned')}
                          style={{ fontSize: '14px', padding: '8px 16px' }}
                        >
                          🧾 퇴사 처리
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setActiveTab('past-employees')}
                          style={{ fontSize: '14px', padding: '8px 16px' }}
                        >
                          📁 서류 보관함
                        </button>
                        {/* V2: 초대 링크 대신 매칭 승인 사용 */}
                      </div>
                    </div>
                    
                    <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
                      📌 등록된 모든 직원의 상세 정보를 한눈에 확인할 수 있습니다.
                    </p>
                  </>
                )}

                {employees.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    등록된 직원이 없습니다.
                  </p>
                ) : (
                  <>
                    {!isMobile && rosterViewMode === 'table' ? (
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
                            {(() => {
                              // 리스크 판단 로직
                              const getEmployeeRisks = (emp) => {
                                const risks = [];
                                if (!emp.contract_file_url) {
                                  risks.push({ type: 'contract', label: '서류 필요', color: '#f59e0b' });
                                }
                                if (!emp.salary_type || !emp.amount || emp.amount === 0 || emp.amount === '0' || emp.amount === '0.00') {
                                  risks.push({ type: 'salary', label: '급여 미설정', color: '#ef4444' });
                                }
                                if (emp.employment_status === 'resigned' && !emp.resignation_date) {
                                  risks.push({ type: 'resignation', label: '퇴사 처리 필요', color: '#ef4444' });
                                }
                                return risks;
                              };

                              // 정렬: 리스크 있음 > 정상
                              const sortedEmployees = [...employees]
                                .filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter)
                                .sort((a, b) => {
                                  const aRisks = getEmployeeRisks(a).length;
                                  const bRisks = getEmployeeRisks(b).length;
                                  
                                  // 리스크가 있는 직원 우선
                                  if (aRisks > 0 && bRisks === 0) return -1;
                                  if (aRisks === 0 && bRisks > 0) return 1;
                                  
                                  // 같은 경우 이름순
                                  return a.name.localeCompare(b.name);
                                });

                              return sortedEmployees.map((emp) => (
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
                            ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="employee-card-grid">
                        {(() => {
                          // 리스크 판단 로직
                          const getEmployeeRisks = (emp) => {
                            const risks = [];
                            if (!emp.contract_file_url) {
                              risks.push({ type: 'contract', label: '서류 필요', color: '#f59e0b' });
                            }
                            if (!emp.salary_type || !emp.amount || emp.amount === 0 || emp.amount === '0' || emp.amount === '0.00') {
                              risks.push({ type: 'salary', label: '급여 미설정', color: '#ef4444' });
                            }
                            if (emp.employment_status === 'resigned' && !emp.resignation_date) {
                              risks.push({ type: 'resignation', label: '퇴사 처리 필요', color: '#ef4444' });
                            }
                            return risks;
                          };

                          // 정렬: 리스크 있음 > 정상
                          const sortedEmployees = [...employees]
                            .filter(emp => employmentStatusFilter === 'all' || emp.employment_status === employmentStatusFilter)
                            .sort((a, b) => {
                              const aRisks = getEmployeeRisks(a).length;
                              const bRisks = getEmployeeRisks(b).length;
                              
                              // 리스크가 있는 직원 우선
                              if (aRisks > 0 && bRisks === 0) return -1;
                              if (aRisks === 0 && bRisks > 0) return 1;
                              
                              // 같은 경우 이름순
                              return a.name.localeCompare(b.name);
                            });

                          return sortedEmployees.map((emp) => {
                            const risks = getEmployeeRisks(emp);
                            const hasRisk = risks.length > 0;
                            
                            return (
                          <div key={emp.id} className="employee-card" style={{
                            ...(hasRisk && {
                              border: '2px solid #f59e0b',
                              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                            })
                          }}>
                            <div className="employee-card-header">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div style={{ fontWeight: '700', fontSize: '16px' }}>{emp.name}</div>
                                {/* 리스크 배지 */}
                                {risks.length > 0 && (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {risks.map((risk, idx) => (
                                      <span key={idx} style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        background: risk.color === '#f59e0b' ? '#fef3c7' : '#fee2e2',
                                        color: risk.color === '#f59e0b' ? '#92400e' : '#991b1b',
                                        border: `1px solid ${risk.color}`
                                      }}>
                                        {risk.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
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
                          );
                        });
                        })()}
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
                      안녕하세요, {user?.name || '사장님'} 대표님! 👋
                    </h2>
                    <p style={{ marginBottom: '32px', color: '#6b7280', fontSize: '16px' }}>
                      오늘도 수고하셨습니다. 확인이 필요한 사항을 정리했습니다.
                    </p>
                  </>
                )}
                
                {/* 모바일 홈 화면 "정보 우선순위" 재배치 */}
                {isMobile && (
                  <div>
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      
                      // 날짜 비교 함수 (date 필드가 다양한 형식일 수 있음)
                      const isSameDate = (dateStr, targetDate) => {
                        if (!dateStr) return false;
                        // date 필드에서 날짜 부분만 추출 (YYYY-MM-DD)
                        const dateOnly = dateStr.split('T')[0];
                        return dateOnly === targetDate;
                      };
                      
                      const todayAttendance = attendance.filter(a => isSameDate(a.date, today));
                      const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
                      
                      // 모바일 대시보드 디버깅
                      console.log('📱 [모바일 대시보드] 출근 통계:');
                      console.log('  - 오늘:', today);
                      console.log('  - 전체 출근기록:', attendance.length, '건');
                      console.log('  - 오늘 출근기록:', todayAttendance.length, '건');
                      console.log('  - 활성 직원:', activeEmployees.length, '명');
                      if (attendance.length > 0) {
                        console.log('  - 첫 번째 출근기록 샘플:', attendance[0]);
                      }
                      if (todayAttendance.length > 0) {
                        console.log('  - 오늘 출근기록 상세:', todayAttendance.map(a => ({
                          name: a.employee_name,
                          date: a.date,
                          checkIn: a.check_in_time
                        })));
                      }
                      
                      const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
                      const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
                      
                      console.log('  ✅ 출근:', checkedInToday, '명');
                      console.log('  ⚠️ 미퇴근:', notCheckedOut, '명');
                      const lateToday = todayAttendance.filter(a => {
                        if (!a.check_in_time || !a.employee_work_start_time) return false;
                        const checkIn = new Date(a.check_in_time);
                        const [hours, minutes] = a.employee_work_start_time.split(':');
                        const workStart = new Date(checkIn);
                        workStart.setHours(parseInt(hours), parseInt(minutes), 0);
                        return checkIn > workStart;
                      }).length;
                      const notCheckedIn = activeEmployees.length - checkedInToday;
                      
                      // 이번 달 급여 현황 데이터
                      const currentMonth = new Date().toISOString().slice(0, 7);
                      const currentMonthSalaryData = salaryData && salaryData.month === currentMonth ? salaryData : null;
                      
                      // 급여 계산 (amount 필드 사용, 문자열 -> 숫자 변환)
                      const totalMonthlyCost = currentMonthSalaryData 
                        ? currentMonthSalaryData.employees.reduce((sum, emp) => sum + (emp.totalPay || emp.calculatedSalary || 0), 0)
                        : activeEmployees.reduce((sum, emp) => sum + (parseFloat(emp.amount) || 0), 0);
                      const unconfirmedEmployees = currentMonthSalaryData 
                        ? currentMonthSalaryData.employees.filter(emp => !emp.confirmed).length
                        : activeEmployees.length;
                      
                      // 급여 현황 디버깅
                      console.log('💰 [모바일] 급여 현황:');
                      console.log('  - salaryData:', salaryData ? '있음' : '없음');
                      console.log('  - 활성 직원:', activeEmployees.length, '명');
                      if (activeEmployees.length > 0) {
                        console.log('  - 첫 번째 직원 급여 샘플:', {
                          name: activeEmployees[0].name,
                          amount: activeEmployees[0].amount,
                          salary_type: activeEmployees[0].salary_type
                        });
                      }
                      console.log('  - 예상 총 인건비:', totalMonthlyCost.toLocaleString(), '원');
                      
                      // 리스크 카운트 (generateNotifications 결과 재사용)
                      const riskCount = notifications.length;
                      const urgentRiskCount = notifications.filter(n => n.urgent).length;
                      
                      return (
                        <>
                          {/* 1. 오늘 출근 상황 카드 */}
                          <div className="mobile-home-summary" onClick={() => handleTabChange('attendance')} style={{ cursor: 'pointer' }}>
                            <div className="mobile-home-summary-title">
                              📊 오늘 출근 상황
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                              <div className="mobile-summary-stat">
                                <div className="mobile-summary-stat-label">출근</div>
                                <div className="mobile-summary-stat-value success">{checkedInToday}명</div>
                              </div>
                              <div className="mobile-summary-stat">
                                <div className="mobile-summary-stat-label">지각</div>
                                <div className="mobile-summary-stat-value warning">{lateToday}명</div>
                              </div>
                              <div className="mobile-summary-stat">
                                <div className="mobile-summary-stat-label">미출근</div>
                                <div className={`mobile-summary-stat-value ${notCheckedIn > 0 ? 'urgent' : ''}`}>
                                  {notCheckedIn}명 {notCheckedIn > 0 && '⚠️'}
                                </div>
                              </div>
                              <div className="mobile-summary-stat">
                                <div className="mobile-summary-stat-label">미퇴근</div>
                                <div className={`mobile-summary-stat-value ${notCheckedOut > 0 ? 'urgent' : ''}`}>
                                  {notCheckedOut}명 {notCheckedOut > 0 && '⚠️'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 2. 이번 달 급여 현황 카드 */}
                          <div className="mobile-home-summary">
                            <div className="mobile-home-summary-title">
                              💰 이번 달 급여 현황
                            </div>
                            <div style={{ marginTop: '12px' }}>
                              <div className="mobile-summary-row">
                                <div className="mobile-summary-label">예상 총 인건비</div>
                                <div className="mobile-summary-value" style={{ fontSize: '18px', fontWeight: '700' }}>
                                  {totalMonthlyCost.toLocaleString()}원
                                </div>
                              </div>
                              <div className="mobile-summary-row">
                                <div className="mobile-summary-label">미확정 직원</div>
                                <div className="mobile-summary-value">{unconfirmedEmployees}명</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleTabChange('salary')}
                              style={{
                                width: '100%',
                                marginTop: '12px',
                                padding: '12px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              급여 관리로 이동 →
                            </button>
                          </div>
                          
                          {/* 3. 리스크 센터 카드 */}
                          {riskCount > 0 && (
                            <div className="mobile-home-summary" style={{ 
                              background: urgentRiskCount > 0 ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : '#f9fafb',
                              border: urgentRiskCount > 0 ? '2px solid #fca5a5' : '1px solid #e5e7eb'
                            }}>
                              <div className="mobile-home-summary-title" style={{ color: urgentRiskCount > 0 ? '#dc2626' : '#374151' }}>
                                {urgentRiskCount > 0 ? '🚨' : '📋'} 리스크 센터
                              </div>
                              <div style={{ marginTop: '12px' }}>
                                <div className="mobile-summary-row">
                                  <div className="mobile-summary-label">총 알림</div>
                                  <div className="mobile-summary-value">{riskCount}건</div>
                                </div>
                                {urgentRiskCount > 0 && (
                                  <div className="mobile-summary-row">
                                    <div className="mobile-summary-label">긴급 알림</div>
                                    <div className="mobile-summary-value urgent">{urgentRiskCount}건 ⚠️</div>
                                  </div>
                                )}
                                {notifications.slice(0, 3).map((notif, idx) => (
                                  <div key={idx} className="mobile-summary-row" style={{ fontSize: '13px', color: '#6b7280' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{notif.icon}</span>
                                      <span>{notif.title}</span>
                                    </div>
                                    <span style={{ fontSize: '12px' }}>{notif.message}</span>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => navigate('/notifications')}
                                style={{
                                  width: '100%',
                                  marginTop: '12px',
                                  padding: '12px',
                                  background: urgentRiskCount > 0 ? '#dc2626' : '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                알림 센터로 이동 →
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 데스크톱 홈 화면: ERP KPI + 요약 카드 */}
                {!isMobile && (
                  <div>
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const isSameDate = (dateStr, targetDate) => {
                        if (!dateStr) return false;
                        return dateStr.split('T')[0] === targetDate;
                      };
                      const todayAttendance = attendance.filter(a => isSameDate(a.date, today));
                      const activeEmployees = employees.filter(emp => emp.employment_status === 'active');
                      const notCheckedOut = todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length;
                      const checkedInToday = todayAttendance.filter(a => a.check_in_time).length;
                      const lateToday = todayAttendance.filter(a => {
                        if (!a.check_in_time || !a.employee_work_start_time) return false;
                        const checkIn = new Date(a.check_in_time);
                        const [hours, minutes] = a.employee_work_start_time.split(':');
                        const workStart = new Date(checkIn);
                        workStart.setHours(parseInt(hours), parseInt(minutes), 0);
                        return checkIn > workStart;
                      }).length;
                      const notCheckedIn = activeEmployees.length - checkedInToday;
                      const currentMonth = new Date().toISOString().slice(0, 7);
                      const currentMonthSalaryData = salaryData && salaryData.month === currentMonth ? salaryData : null;
                      const totalMonthlyCost = currentMonthSalaryData
                        ? currentMonthSalaryData.employees.reduce((sum, emp) => sum + (emp.totalPay || emp.calculatedSalary || 0), 0)
                        : activeEmployees.reduce((sum, emp) => sum + (parseFloat(emp.amount) || 0), 0);
                      const unconfirmedEmployees = currentMonthSalaryData
                        ? currentMonthSalaryData.employees.filter(emp => !emp.confirmed).length
                        : activeEmployees.length;
                      const riskCount = notifications.length;
                      const urgentRiskCount = notifications.filter(n => n.urgent).length;

                      return (
                        <>
                          {/* 페이지 타이틀 */}
                          <div style={{ marginBottom: '24px' }}>
                            <h2 className="erp-page-title">안녕하세요, {user?.name || '사장님'} 대표님</h2>
                            <p className="erp-page-subtitle">오늘의 출근 현황과 주요 현황을 확인하세요.</p>
                          </div>

                          {/* KPI 카드 4개 */}
                          <div className="erp-kpi-grid" onClick={() => handleTabChange('attendance')} style={{ cursor: 'pointer' }}>
                            <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                              <div className="erp-kpi-label">정상 출근</div>
                              <div className={`erp-kpi-value ${checkedInToday > 0 ? 'blue' : ''}`}>{checkedInToday}명</div>
                              <div className="erp-kpi-footer">오늘 기준</div>
                            </div>
                            <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                              <div className="erp-kpi-label">지각</div>
                              <div className={`erp-kpi-value ${lateToday > 0 ? 'orange' : ''}`}>{lateToday}명</div>
                              <div className="erp-kpi-footer">오늘 기준</div>
                            </div>
                            <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                              <div className="erp-kpi-label">미출근</div>
                              <div className={`erp-kpi-value ${notCheckedIn > 0 ? 'red' : ''}`}>{notCheckedIn}명</div>
                              <div className="erp-kpi-footer">재직 {activeEmployees.length}명 중</div>
                            </div>
                            <div className="erp-kpi-card" onClick={(e) => { e.stopPropagation(); handleTabChange('attendance'); }}>
                              <div className="erp-kpi-label">미퇴근</div>
                              <div className={`erp-kpi-value ${notCheckedOut > 0 ? 'orange' : ''}`}>{notCheckedOut}명</div>
                              <div className="erp-kpi-footer">퇴근 미처리</div>
                            </div>
                          </div>

                          {/* 요약 카드 3개 */}
                          <div className="erp-summary-grid">
                            {/* 급여 현황 */}
                            <div className="erp-summary-card" onClick={() => handleTabChange('salary')}>
                              <div className="erp-summary-card-title">💰 이번 달 급여 현황</div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">예상 총 인건비</span>
                                <span className="erp-summary-row-value blue">{totalMonthlyCost.toLocaleString()}원</span>
                              </div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">재직 직원</span>
                                <span className="erp-summary-row-value">{activeEmployees.length}명</span>
                              </div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">미확정</span>
                                <span className={`erp-summary-row-value ${unconfirmedEmployees > 0 ? 'orange' : ''}`}>{unconfirmedEmployees}명</span>
                              </div>
                            </div>
                          
                            {/* 리스크 센터 카드 */}
                            <div className="erp-summary-card" onClick={() => navigate('/notifications')}
                              style={{ borderLeft: urgentRiskCount > 0 ? '3px solid #EF4444' : undefined }}>
                              <div className="erp-summary-card-title">
                                {urgentRiskCount > 0 ? '🚨' : '📋'} 리스크 센터
                              </div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">총 알림</span>
                                <span className={`erp-summary-row-value ${riskCount > 0 ? 'orange' : ''}`}>{riskCount}건</span>
                              </div>
                              {urgentRiskCount > 0 && (
                                <div className="erp-summary-row">
                                  <span className="erp-summary-row-label">긴급 알림</span>
                                  <span className="erp-summary-row-value red">{urgentRiskCount}건</span>
                                </div>
                              )}
                              {notifications.slice(0, 2).map((notif, idx) => (
                                <div key={idx} className="erp-summary-row">
                                  <span className="erp-summary-row-label">{notif.icon} {notif.title}</span>
                                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{notif.message}</span>
                                </div>
                              ))}
                            </div>
                            {/* 이번 달 진행 카드 */}
                            <div className="erp-summary-card">
                              <div className="erp-summary-card-title">📈 이번 달 진행 현황</div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">급여명세서 발송</span>
                                <span className="erp-summary-row-value blue">
                                  {employeeSlips.filter(s => s.published).length} / {employees.filter(e => e.employment_status === 'active').length}명
                                </span>
                              </div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">이번 달 출근율</span>
                                <span className="erp-summary-row-value green">
                                  {(() => {
                                    const thisMonth = new Date().toISOString().slice(0, 7);
                                    const monthAtt = attendance.filter(a => a.date.startsWith(thisMonth));
                                    const done = monthAtt.filter(a => a.check_in_time && a.check_out_time).length;
                                    return monthAtt.length > 0 ? `${Math.round(done / monthAtt.length * 100)}%` : '0%';
                                  })()}
                                </span>
                              </div>
                              <div className="erp-summary-row">
                                <span className="erp-summary-row-label">재직 직원</span>
                                <span className="erp-summary-row-value">{activeEmployees.length}명</span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 확인 필요 알림 목록 (데스크톱 전용) */}
                {!isMobile && notifications.filter(n => !n.urgent).length > 0 && (
                  <div className="erp-card">
                    <div className="erp-card-header">
                      <h3 className="erp-card-title">📌 확인해주세요</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {notifications.filter(n => !n.urgent).map((notif, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleNotificationAction(notif.action)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'var(--bg-page)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            border: '1px solid var(--border)',
                            transition: 'background 0.15s',
                            gap: '16px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '20px' }}>{notif.icon}</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{notif.title}</span>
                            <span style={{ fontSize: '14px', color: '#2563EB', fontWeight: '600' }}>{notif.message}</span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#6B7280', flexShrink: 0 }}>자세히 보기 ›</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 당월 출근현황 */}
            {activeTab === 'attendance' && (
              <div>
                {/* 오늘 출근 상황 요약 바 */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRecords = attendance.filter(a => a.date === today);
                  const completedToday = todayRecords.filter(a => {
                    const status = getAttendanceStatus(a);
                    return status.type === 'completed';
                  });
                  const lateToday = todayRecords.filter(a => {
                    const status = getAttendanceStatus(a);
                    return status.type === 'late';
                  });
                  const notCheckedIn = employees.filter(emp => 
                    emp.employment_status === 'active' && 
                    !todayRecords.some(r => r.employee_name === emp.name)
                  );
                  const notCheckedOut = todayRecords.filter(a => a.check_in_time && !a.check_out_time && !a.leave_type);

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '16px',
                      padding: isMobile ? '20px 16px' : '24px 28px',
                      marginBottom: '24px',
                      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{
                        color: 'white',
                        fontSize: isMobile ? '18px' : '20px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>📊</span>
                        <span>오늘 출근 상황</span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: isMobile ? '12px' : '16px'
                      }}>
                        {/* 정상 */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>✓ 정상</div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#059669' }}>
                            {completedToday.length}
                          </div>
                        </div>
                        
                        {/* 지각 */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>🕐 지각</div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#f59e0b' }}>
                            {lateToday.length}
                          </div>
                        </div>

                        {/* 미출근 - 강조 */}
                        <div style={{
                          background: notCheckedIn.length > 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: notCheckedIn.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: notCheckedIn.length > 0 ? '2px solid #dc2626' : 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: notCheckedIn.length > 0 ? '#fff' : '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            ❌ 미출근
                          </div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: notCheckedIn.length > 0 ? '#fff' : '#6b7280' }}>
                            {notCheckedIn.length}
                          </div>
                        </div>

                        {/* 미퇴근 - 강조 */}
                        <div style={{
                          background: notCheckedOut.length > 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: notCheckedOut.length > 0 ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: notCheckedOut.length > 0 ? '2px solid #dc2626' : 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: notCheckedOut.length > 0 ? '#fff' : '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            ⚠️ 미퇴근
                          </div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: notCheckedOut.length > 0 ? '#fff' : '#6b7280' }}>
                            {notCheckedOut.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: '#374151', margin: 0 }}>📊 당월 출근현황</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('calendar')}
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      📅 출근 달력
                    </button>
                    <input
                      type="month"
                      className="form-input"
                      style={{ width: 'auto' }}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
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
                            {(() => {
                              // 정렬 우선순위: 미출근/미퇴근 > 지각 > 정상
                              const sortedAttendance = [...attendance].sort((a, b) => {
                                const statusA = getAttendanceStatus(a);
                                const statusB = getAttendanceStatus(b);
                                
                                const priorityMap = {
                                  'notCheckedOut': 1,
                                  'incomplete': 1,
                                  'late': 2,
                                  'completed': 3
                                };
                                
                                const priorityA = priorityMap[statusA.type] || 4;
                                const priorityB = priorityMap[statusB.type] || 4;
                                
                                // 우선순위가 같으면 날짜 최신순
                                if (priorityA === priorityB) {
                                  return new Date(b.date) - new Date(a.date);
                                }
                                
                                return priorityA - priorityB;
                              });
                              
                              return sortedAttendance.map((record) => {
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
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '';
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
                            });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* 모바일 카드 뷰 */}
                      <div className="attendance-card-view">
                        {(() => {
                          // 정렬 우선순위: 미출근/미퇴근 > 지각 > 정상
                          const sortedAttendance = [...attendance].sort((a, b) => {
                            const statusA = getAttendanceStatus(a);
                            const statusB = getAttendanceStatus(b);
                            
                            const priorityMap = {
                              'notCheckedOut': 1,
                              'incomplete': 1,
                              'late': 2,
                              'completed': 3
                            };
                            
                            const priorityA = priorityMap[statusA.type] || 4;
                            const priorityB = priorityMap[statusB.type] || 4;
                            
                            // 우선순위가 같으면 날짜 최신순
                            if (priorityA === priorityB) {
                              return new Date(b.date) - new Date(a.date);
                            }
                            
                            return priorityA - priorityB;
                          });
                          
                          return sortedAttendance.map((record) => {
                          const status = getAttendanceStatus(record);
                          const isProblem = status.type === 'incomplete' || status.type === 'notCheckedOut';
                          return (
                            <div
                              key={record.id}
                              className={`attendance-card ${highlightedRecordId === record.id ? 'card-highlight' : ''}`}
                              style={{
                                ...(isProblem && {
                                  border: '2px solid #ef4444',
                                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                })
                              }}
                            >
                              {/* 상단: 직원명 + 상태배지 */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '16px',
                                minHeight: '32px'
                              }}>
                                <div style={{ 
                                  fontSize: '17px', 
                                  fontWeight: '700', 
                                  color: '#111827',
                                  flex: 1,
                                  minWidth: 0,
                                  paddingRight: '12px'
                                }}>
                                  {record.employee_name}
                                </div>
                                <span style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  background: status.bgColor || '#f3f4f6',
                                  color: status.color,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {status.label}
                                </span>
                              </div>
                              
                              {/* 본문: 2열 그리드 */}
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '16px 12px', 
                                marginBottom: '16px',
                                padding: '12px',
                                background: '#f9fafb',
                                borderRadius: '8px'
                              }}>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>📅 날짜</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#374151' }}>{formatDate(record.date)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>⏱️ 근무시간</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#374151' }}>
                                    {record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>🟢 출근</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#059669' }}>{formatTime(record.check_in_time)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>🔴 퇴근</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>{formatTime(record.check_out_time)}</div>
                                </div>
                              </div>

                              {/* 하단: 수정 버튼 full-width */}
                              <button
                                className="btn"
                                style={{ 
                                  width: '100%', 
                                  fontSize: '14px', 
                                  fontWeight: '700',
                                  padding: '14px 16px',
                                  minHeight: '48px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  ...(isProblem && {
                                    background: '#dc2626',
                                    color: 'white',
                                    boxShadow: '0 4px 8px rgba(220, 38, 38, 0.3)',
                                    border: 'none'
                                  })
                                }}
                                onClick={() => openModal('editAttendance', record)}
                              >
                                <span style={{ fontSize: '16px' }}>✏️</span>
                                <span>{isProblem ? '즉시 수정 필요' : '출근기록 수정'}</span>
                              </button>
                            </div>
                          );
                        });
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 급여 계산 */}
            {activeTab === 'salary' && (
              <div className="card">
                {/* 이번 달 급여 현황 요약 바 */}
                {salaryData && (() => {
                  const totalSalary = salaryData.totalSalary || 0;
                  const employees = salaryData.employees || [];
                  
                  // 미확정 직원: salary_slips에 데이터가 없는 직원
                  const notConfirmed = employees.filter(emp => {
                    // salary_slips에 해당 월 급여명세서가 있는지 확인
                    const hasSlip = employeeSlips.some(slip => 
                      slip.user_id === emp.employeeId && 
                      slip.payroll_month === selectedMonth
                    );
                    
                    // 급여명세서가 없으면 미확정
                    return !hasSlip;
                  });
                  // 실제 DB에 급여명세서가 발송된 직원 수 (employeeSlips 사용)
                  const published = employeeSlips.filter(slip => 
                    slip.published && 
                    slip.period === selectedMonth &&
                    employees.some(emp => emp.employeeId === slip.employee_id)
                  );
                  const notPublished = employees.filter(emp => {
                    const hasPublished = employeeSlips.some(slip => 
                      slip.published && 
                      slip.period === selectedMonth && 
                      slip.employee_id === emp.employeeId
                    );
                    return !hasPublished;
                  });

                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '16px',
                      padding: isMobile ? '20px 16px' : '24px 28px',
                      marginBottom: '24px',
                      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{
                        color: 'white',
                        fontSize: isMobile ? '18px' : '20px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>💰</span>
                        <span>이번 달 급여 현황</span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                        gap: isMobile ? '12px' : '16px'
                      }}>
                        {/* 총 인건비 */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>💸 총 인건비</div>
                          <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '700', color: '#667eea' }}>
                            {formatCurrency(totalSalary)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {employees.length}명
                          </div>
                        </div>

                        {/* 미확정 - 강조 */}
                        <div style={{
                          background: notConfirmed.length > 0 ? 'rgba(245, 158, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          padding: isMobile ? '16px' : '20px',
                          textAlign: 'center',
                          boxShadow: notConfirmed.length > 0 ? '0 4px 12px rgba(245, 158, 11, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: notConfirmed.length > 0 ? '2px solid #d97706' : 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: notConfirmed.length > 0 ? '#fff' : '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            ⚠️ 미확정
                          </div>
                          <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: notConfirmed.length > 0 ? '#fff' : '#6b7280' }}>
                            {notConfirmed.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 모바일 Wizard UI */}
                {isMobile ? (
                  <div className="mobile-salary-wizard">
                    {/* 상단: 진행 단계 */}
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px 12px 0 0',
                      color: 'white',
                      textAlign: 'center',
                      marginBottom: '20px'
                    }}>
                      <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>
                        급여 처리
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700' }}>
                        {salaryFlowStep}/4 단계
                      </div>
                    </div>

                    {/* 확정 상태 배지 (모바일) */}
                    {salaryConfirmed && (
                      <div style={{
                        padding: '12px',
                        background: '#10b981',
                        borderRadius: '8px',
                        color: 'white',
                        marginBottom: '16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        ✓ 급여 확정됨
                      </div>
                    )}

                    {/* 현재 단계 제목 */}
                    <h3 style={{ 
                      color: '#374151', 
                      fontSize: '18px', 
                      fontWeight: '700',
                      marginBottom: '16px' 
                    }}>
                      {salaryFlowStep === 1 && '📋 근무 내역 확인'}
                      {salaryFlowStep === 2 && '💰 급여 미리보기'}
                      {salaryFlowStep === 3 && '✅ 급여 확정 및 배포'}
                    </h3>

                    {/* Step별 컨텐츠 */}
                    {salaryData ? (
                      <>
                        {/* 총 지급액 요약 */}
                        <div style={{
                          padding: '16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '12px',
                          color: 'white',
                          marginBottom: '20px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '12px', opacity: '0.9', marginBottom: '4px' }}>
                            총 지급 급여 (세전)
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: '700' }}>
                            {formatCurrency(salaryData.totalSalary)}
                          </div>
                          <div style={{ fontSize: '12px', opacity: '0.8', marginTop: '4px' }}>
                            {salaryData.employees?.length || 0}명
                          </div>
                        </div>

                        {/* 직원별 급여 카드 리스트 */}
                        {salaryData.employees && salaryData.employees.length > 0 ? (
                          <div style={{ marginBottom: '80px' }}>
                            {(() => {
                              // 정렬 우선순위: 미확정/미지급 > 계산 완료 대기 > 지급 완료
                              const sortedEmployees = [...salaryData.employees].sort((a, b) => {
                                const aConfirmed = !!(salaryDeductions[a.employeeId] || editedSalaries[a.employeeId]);
                                const bConfirmed = !!(salaryDeductions[b.employeeId] || editedSalaries[b.employeeId]);
                                const aPublished = employeeSlips.some(slip => 
                                  slip.published && 
                                  slip.period === selectedMonth && 
                                  slip.employee_id === a.employeeId
                                );
                                const bPublished = employeeSlips.some(slip => 
                                  slip.published && 
                                  slip.period === selectedMonth && 
                                  slip.employee_id === b.employeeId
                                );

                                // 우선순위 계산
                                const getPriority = (confirmed, published) => {
                                  if (!confirmed) return 1; // 미확정
                                  if (confirmed && !published) return 2; // 확정됐지만 미지급
                                  return 3; // 지급 완료
                                };

                                const aPriority = getPriority(aConfirmed, aPublished);
                                const bPriority = getPriority(bConfirmed, bPublished);

                                return aPriority - bPriority;
                              });

                              return sortedEmployees.map((emp) => {
                              // 총 지급액 (세전) = 기본급여 + 주휴수당
                              const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                              const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                              const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                              const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                              const isConfirmed = !!(salaryDeductions[emp.employeeId] || editedSalaries[emp.employeeId]);
                              const isPublished = employeeSlips.some(slip => 
                                slip.published && 
                                slip.period === selectedMonth && 
                                slip.employee_id === emp.employeeId
                              );
                              const isProblem = !isConfirmed || (isConfirmed && !isPublished);
                              
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
                                <div 
                                  key={emp.employeeId}
                                  style={{
                                    padding: '16px',
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    marginBottom: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    ...(isProblem && {
                                      border: !isConfirmed ? '2px solid #f59e0b' : '2px solid #ef4444',
                                      background: !isConfirmed ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                      boxShadow: !isConfirmed ? '0 4px 12px rgba(245, 158, 11, 0.3)' : '0 4px 12px rgba(239, 68, 68, 0.3)'
                                    })
                                  }}
                                >
                                  {/* 카드 헤더: 직원명 + 급여유형 */}
                                  <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    paddingBottom: '12px',
                                    borderBottom: '1px solid #f3f4f6'
                                  }}>
                                    <div>
                                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                                        {emp.employeeName}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        {getSalaryTypeName(emp.salaryType)} · {emp.taxType || '4대보험'}
                                      </div>
                                    </div>
                                    <div style={{
                                      padding: '4px 12px',
                                      background: '#eff6ff',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#2563eb'
                                    }}>
                                      {getPayDayText()}
                                    </div>
                                  </div>

                                  {/* 카드 본문: 급여 정보 */}
                                  <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '8px',
                                    marginBottom: '12px'
                                  }}>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>기본급</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {formatCurrency(emp.baseAmount)}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>근무일수</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {emp.totalWorkDays}일
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>근무시간</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                        {emp.totalWorkHours}h
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>주휴수당</div>
                                      <div style={{ fontSize: '14px', fontWeight: '600', color: emp.weeklyHolidayPayAmount > 0 ? '#10b981' : '#9ca3af' }}>
                                        {emp.weeklyHolidayPayAmount > 0 ? `+${Number(emp.weeklyHolidayPayAmount).toLocaleString()}원` : '-'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 총 지급액 (Step2에서는 수정 가능) */}
                                  <div style={{
                                    padding: '12px',
                                    background: '#f9fafb',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                      총 지급액
                                    </span>
                                    {salaryFlowStep === 2 ? (
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
                                          fontWeight: '700',
                                          textAlign: 'right'
                                        }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#667eea' }}>
                                        {formatCurrency(totalPay)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Step2: 자동계산 버튼 */}
                                  {salaryFlowStep === 2 && (
                                    <div style={{ marginTop: '12px' }}>
                                      <button
                                        className="btn"
                                        onClick={() => calculateDeductions(
                                          emp.employeeId,
                                          editedSalaries[emp.employeeId] ?? totalPay,
                                          1 // dependentsCount, 나중에 직원 정보에서 가져올 수 있음
                                        )}
                                        disabled={calculatingEmployeeId === emp.employeeId}
                                        style={{
                                          width: '100%',
                                          fontSize: '14px',
                                          fontWeight: '700',
                                          padding: '10px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          ...(isProblem && {
                                            background: !isConfirmed ? '#f59e0b' : '#667eea',
                                            color: 'white',
                                            boxShadow: !isConfirmed ? '0 4px 8px rgba(245, 158, 11, 0.3)' : '0 4px 8px rgba(102, 126, 234, 0.3)',
                                            border: 'none'
                                          })
                                        }}
                                      >
                                        {calculatingEmployeeId === emp.employeeId ? (
                                          <>
                                            <span className="btn-loading-spinner"></span>
                                            계산 중...
                                          </>
                                        ) : (
                                          <>{isProblem && !isConfirmed ? '⚠️ 즉시 계산 필요' : '🧮 4대보험/세금 자동계산'}</>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {/* 자동계산 결과 표시 */}
                                  {salaryDeductions[emp.employeeId] && (
                                    <div style={{
                                      marginTop: '12px',
                                      padding: '12px',
                                      background: '#f0fdf4',
                                      border: '1px solid #86efac',
                                      borderRadius: '8px'
                                    }}>
                                      <div style={{ 
                                        fontSize: '12px', 
                                        fontWeight: '600', 
                                        color: '#166534',
                                        marginBottom: '8px'
                                      }}>
                                        💰 공제 항목 ({selectedMonth} 기준)
                                      </div>
                                      <div style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>국민연금</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.nationalPension.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>건강보험</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.healthInsurance.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>장기요양</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.longTermCare.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>고용보험</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.employmentInsurance.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>소득세</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.incomeTax.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#6b7280' }}>지방소득세</span>
                                          <span style={{ fontWeight: '600', color: '#374151' }}>
                                            {salaryDeductions[emp.employeeId].deductions.localIncomeTax.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between',
                                          paddingTop: '8px',
                                          marginTop: '8px',
                                          borderTop: '1px solid #86efac'
                                        }}>
                                          <span style={{ fontWeight: '600', color: '#166534' }}>공제 합계</span>
                                          <span style={{ fontWeight: '700', color: '#ef4444' }}>
                                            -{salaryDeductions[emp.employeeId].totalDeductions.toLocaleString()}원
                                          </span>
                                        </div>
                                        <div style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between',
                                          paddingTop: '8px',
                                          marginTop: '4px',
                                          borderTop: '1px solid #86efac'
                                        }}>
                                          <span style={{ fontWeight: '700', fontSize: '14px', color: '#166534' }}>실수령액</span>
                                          <span style={{ fontWeight: '700', fontSize: '16px', color: '#10b981' }}>
                                            {salaryDeductions[emp.employeeId].netPay.toLocaleString()}원
                                          </span>
                                        </div>
                                      </div>

                                      {/* Step3: 배포 버튼 */}
                                      {salaryFlowStep === 3 && salaryDeductions[emp.employeeId] && !isPublished && (
                                        <div style={{ marginTop: '12px' }}>
                                          <button
                                            className="btn btn-success"
                                            onClick={async () => {
                                              try {
                                                // 1. 급여명세서 생성 (이미 있다면 건너뜀)
                                                const existingSlip = employeeSlips.find(slip => 
                                                  slip.user_id === emp.employeeId && 
                                                  slip.payroll_month === selectedMonth
                                                );
                                                
                                                let slipId = existingSlip?.id;

                                                if (!existingSlip) {
                                                  const createResponse = await salaryAPI.createSlip({
                                                    workplaceId: selectedWorkplace,
                                                    userId: emp.employeeId,
                                                    payrollMonth: selectedMonth,
                                                    taxType: emp.taxType || '4대보험',
                                                    basePay: totalPay,
                                                    dependentsCount: 1,
                                                    nationalPension: salaryDeductions[emp.employeeId].deductions.nationalPension,
                                                    healthInsurance: salaryDeductions[emp.employeeId].deductions.healthInsurance,
                                                    employmentInsurance: salaryDeductions[emp.employeeId].deductions.employmentInsurance,
                                                    longTermCare: salaryDeductions[emp.employeeId].deductions.longTermCare,
                                                    incomeTax: salaryDeductions[emp.employeeId].deductions.incomeTax,
                                                    localIncomeTax: salaryDeductions[emp.employeeId].deductions.localIncomeTax,
                                                    totalDeductions: salaryDeductions[emp.employeeId].totalDeductions,
                                                    netPay: salaryDeductions[emp.employeeId].netPay,
                                                    employerNationalPension: salaryDeductions[emp.employeeId].employerBurden?.nationalPension || 0,
                                                    employerHealthInsurance: salaryDeductions[emp.employeeId].employerBurden?.healthInsurance || 0,
                                                    employerEmploymentInsurance: salaryDeductions[emp.employeeId].employerBurden?.employmentInsurance || 0,
                                                    employerLongTermCare: salaryDeductions[emp.employeeId].employerBurden?.longTermCare || 0,
                                                    totalEmployerBurden: (salaryDeductions[emp.employeeId].employerBurden?.nationalPension || 0) + 
                                                      (salaryDeductions[emp.employeeId].employerBurden?.healthInsurance || 0) + 
                                                      (salaryDeductions[emp.employeeId].employerBurden?.employmentInsurance || 0) + 
                                                      (salaryDeductions[emp.employeeId].employerBurden?.longTermCare || 0)
                                                  });
                                                  slipId = createResponse.data.slipId;
                                                }

                                                // 2. 배포
                                                await salaryAPI.publishSlip(slipId);
                                                setMessage({ type: 'success', text: `${emp.employeeName}님의 급여명세서가 배포되었습니다.` });
                                                
                                                // 3. 목록 새로고침
                                                await loadEmployeeSlips();
                                              } catch (error) {
                                                console.error('배포 오류:', error);
                                                setMessage({ type: 'error', text: '배포에 실패했습니다.' });
                                              }
                                            }}
                                            style={{
                                              width: '100%',
                                              fontSize: '14px',
                                              fontWeight: '700',
                                              padding: '10px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '6px'
                                            }}
                                          >
                                            📤 급여명세서 배포
                                          </button>
                                        </div>
                                      )}

                                      {/* 배포 완료 상태 */}
                                      {salaryFlowStep === 3 && isPublished && (
                                        <div style={{
                                          marginTop: '12px',
                                          padding: '10px',
                                          background: '#10b981',
                                          color: 'white',
                                          borderRadius: '8px',
                                          textAlign: 'center',
                                          fontSize: '14px',
                                          fontWeight: '600'
                                        }}>
                                          ✅ 배포 완료
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                            })()}
                          </div>
                        ) : (
                          <div style={{ 
                            padding: '40px 20px', 
                            textAlign: 'center', 
                            color: '#9ca3af' 
                          }}>
                            급여 데이터가 없습니다.
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ 
                        padding: '40px 20px', 
                        textAlign: 'center', 
                        color: '#9ca3af' 
                      }}>
                        월을 선택하면 급여 데이터가 표시됩니다.
                      </div>
                    )}

                    {/* 하단 고정 버튼 (모바일) */}
                    {salaryData && salaryData.employees && salaryData.employees.length > 0 && (
                      <div style={{
                        position: 'fixed',
                        bottom: 'calc(70px + env(safe-area-inset-bottom))',
                        left: '0',
                        right: '0',
                        padding: '16px',
                        background: 'white',
                        borderTop: '1px solid #e5e7eb',
                        boxShadow: '0 -4px 6px rgba(0,0,0,0.05)',
                        zIndex: 100
                      }}>
                        <div style={{ display: 'flex', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
                          {salaryFlowStep === 1 && (
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, fontSize: '16px', fontWeight: '700', minHeight: '48px' }}
                              onClick={() => setSalaryFlowStep(2)}
                            >
                              다음: 급여 미리보기 →
                            </button>
                          )}
                          
                          {salaryFlowStep === 2 && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ flex: 1, fontSize: '16px', minHeight: '48px' }}
                                onClick={() => setSalaryFlowStep(1)}
                              >
                                ← 이전
                              </button>
                              <button
                                className="btn"
                                style={{
                                  flex: 1,
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  minHeight: '48px',
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  border: 'none'
                                }}
                                onClick={() => setShowConfirmWarning(true)}
                              >
                                급여 확정
                              </button>
                            </>
                          )}
                          
                          {salaryFlowStep === 3 && (
                            <button
                              className="btn btn-secondary"
                              style={{ flex: 1, fontSize: '16px', minHeight: '48px' }}
                              onClick={() => {
                                setSalaryFlowStep(2);
                                setSalaryConfirmed(false);
                              }}
                            >
                              ← 이전 단계
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 데스크탑: 기존 UI 유지 */}
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
                  </>
                )}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    {[
                      { num: 1, label: '근무 내역 확인' },
                      { num: 2, label: '급여 미리보기' },
                      { num: 3, label: '급여 확정 및 배포' }
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
                        {idx < 2 && (
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ color: '#374151', margin: 0 }}>
                    {salaryFlowStep === 1 && 'Step 1. 이번 달 근무 내역 확인'}
                    {salaryFlowStep === 2 && 'Step 2. 급여 미리보기'}
                    {salaryFlowStep === 3 && 'Step 3. 급여 확정 및 배포'}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                            color: '#166534',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <div>
                              💡 <strong>급여 수정:</strong> 각 직원의 "수정" 버튼을 눌러 4대보험/공제액을 계산하거나, 전체 자동계산 버튼을 사용하세요.
                            </div>
                            <button
                              className="btn"
                              style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontWeight: '600'
                              }}
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  const newDeductions = {};
                                  
          for (const emp of salaryData.employees) {
            // 총 지급액 (세전) = 기본급여 + 주휴수당
            const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
            const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
            const calculatedTotalPay = baseSalary + weeklyHolidayPay;
            const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
            const taxType = emp.taxType || '4대보험';
            
            console.log(`🔍 Step2 자동계산: ${emp.employeeName}`, {
              totalPay,
              taxType,
              hasValue: !!totalPay && totalPay > 0
            });
            
            // 급여액이 없으면 스킵
            if (!totalPay || totalPay <= 0) {
              console.warn(`⚠️ ${emp.employeeName}: 급여액 없음, 자동계산 스킵`);
              continue;
            }
            
            try {
              const response = await salaryAPI.calculateInsurance({
                basePay: totalPay,
                payrollMonth: selectedMonth,
                taxType: taxType
              });
                                      
                                      newDeductions[emp.employeeId] = {
                                        basePay: totalPay,
                                        taxType: taxType,
                                        deductions: response.data.deductions,
                                        totalDeductions: response.data.totalDeductions,
                                        netPay: response.data.netPay
                                      };
                                    } catch (error) {
                                      console.error(`${emp.employeeName} 계산 오류:`, error);
                                    }
                                  }
                                  
                                  setSalaryDeductions(newDeductions);
                                  setToast({ 
                                    message: `✓ 전체 ${Object.keys(newDeductions).length}명의 공제액이 계산되었습니다.`, 
                                    type: 'success' 
                                  });
                                } catch (error) {
                                  console.error('전체 계산 오류:', error);
                                  setToast({ 
                                    message: '전체 계산에 실패했습니다.', 
                                    type: 'error' 
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                            >
                              {loading ? '계산 중...' : '🔄 전체 자동계산'}
                            </button>
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
                                <th>총 지급액 (세전)</th>
                                {(salaryFlowStep === 2 || salaryFlowStep === 4) && (
                                  <>
                                    <th>공제 합계</th>
                                    <th>실수령액 (세후)</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {salaryData.employees.map((emp) => {
                                // 총 지급액 (세전) = 기본급여 + 주휴수당
                                const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                                const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                                const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                                const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
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
                                            value={editedSalaries[emp.employeeId] ?? totalPay}
                                            onChange={(e) => {
                                              const value = parseInt(e.target.value) || 0;
                                              setEditedSalaries(prev => ({ ...prev, [emp.employeeId]: value }));
                                            }}
                                            style={{
                                              width: '120px',
                                              padding: '4px 8px',
                                              fontSize: '13px',
                                              fontWeight: '700',
                                              border: '1px solid #d1d5db',
                                              borderRadius: '4px',
                                              color: '#667eea',
                                              textAlign: 'right'
                                            }}
                                          />
                                          <button
                                            className="btn btn-sm"
                                            style={{
                                              padding: '4px 12px',
                                              fontSize: '12px',
                                              background: '#667eea',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              whiteSpace: 'nowrap'
                                            }}
                                            onClick={async () => {
                                              try {
                                                const taxType = emp.taxType || '4대보험';
                                                const currentPay = editedSalaries[emp.employeeId] ?? totalPay;
                                                const response = await salaryAPI.calculateInsurance({
                                                  basePay: currentPay,
                                                  payrollMonth: selectedMonth,
                                                  taxType: taxType
                                                });
                                                
                                                setSalaryDeductions(prev => ({
                                                  ...prev,
                                                  [emp.employeeId]: {
                                                    basePay: currentPay,
                                                    taxType: taxType,
                                                    deductions: response.data.deductions,
                                                    totalDeductions: response.data.totalDeductions,
                                                    netPay: response.data.netPay
                                                  }
                                                }));
                                                
                                                setToast({ 
                                                  message: `✓ ${emp.employeeName} 공제액이 계산되었습니다.`, 
                                                  type: 'success' 
                                                });
                                              } catch (error) {
                                                console.error('공제액 계산 오류:', error);
                                                setToast({ 
                                                  message: '공제액 계산에 실패했습니다.', 
                                                  type: 'error' 
                                                });
                                              }
                                            }}
                                          >
                                            수정
                                          </button>
                                        </div>
                                      ) : (
                                        formatCurrency(totalPay)
                                      )}
                                    </td>
                                    {(salaryFlowStep === 2 || salaryFlowStep === 4) && (
                                      <>
                                        <td style={{ fontWeight: '600', color: '#ef4444' }}>
                                          {salaryDeductions[emp.employeeId] ? 
                                            formatCurrency(salaryDeductions[emp.employeeId].totalDeductions) : 
                                            '-'
                                          }
                                        </td>
                                        <td style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>
                                          {salaryDeductions[emp.employeeId] ? 
                                            formatCurrency(salaryDeductions[emp.employeeId].netPay) : 
                                            formatCurrency(totalPay)
                                          }
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* 단계별 액션 버튼 (데스크톱 전용) */}
                        {!isMobile && (
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
                              <button
                                className="btn btn-secondary"
                                style={{ fontSize: '16px', padding: '16px 32px' }}
                                onClick={() => {
                                  setSalaryFlowStep(2);
                                  setSalaryConfirmed(false);
                                }}
                              >
                                ← 이전 단계
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                  </>
                )}

                {/* 급여 확정 경고 모달 - Portal 사용 */}
                {showConfirmWarning && ReactDOM.createPortal(
                  <div 
                    style={{ 
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 999999
                    }}
                    onClick={() => setShowConfirmWarning(false)}
                  >
                    <div 
                      style={{ 
                        maxWidth: '500px',
                        width: '90%',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ background: '#fef3c7', color: '#92400e', padding: '16px', fontWeight: '600' }}>
                        ⚠️ 급여 확정 확인
                      </div>
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                          ⚠️
                        </div>
                        <p style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
                          확정 후에는 수정이 어렵습니다.
                        </p>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                          급여 내역을 최종 확인하셨습니까?<br />
                          확정 후 수정이 필요한 경우, 개별적으로 급여명세서를 수정해야 합니다.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              padding: '10px 20px',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                            onClick={() => setShowConfirmWarning(false)}
                            disabled={loading}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              padding: '10px 20px',
                              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontWeight: '700',
                              opacity: loading ? 0.6 : 1
                            }}
                            onClick={async () => {
                              if (!loading) {
                                setLoading(true);
                                try {
                                  // 누락된 직원의 공제액 즉시 계산
                                  const updatedDeductions = { ...salaryDeductions };
                                  
                                  for (const emp of salaryData.employees) {
                                    if (!updatedDeductions[emp.employeeId] || !updatedDeductions[emp.employeeId].deductions || Object.keys(updatedDeductions[emp.employeeId].deductions).length === 0) {
                                      // 총 지급액 (세전) = 기본급여 + 주휴수당
                                      const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                                      const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                                      const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                                      const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                                      const taxType = emp.taxType || '4대보험';
                                      
                                      console.log(`🔍 ${emp.employeeName} 계산 시작:`, {
                                        employeeId: emp.employeeId,
                                        id: emp.id,
                                        totalPay,
                                        taxType,
                                        selectedMonth
                                      });
                                      
                                      // 데이터 검증
                                      if (!totalPay || totalPay <= 0) {
                                        console.error(`❌ ${emp.employeeName}: totalPay가 유효하지 않음 (${totalPay})`);
                                        setToast({ 
                                          message: `${emp.employeeName}의 급여액이 설정되지 않았습니다. 금액을 입력해주세요.`, 
                                          type: 'error' 
                                        });
                                        setLoading(false);
                                        return;
                                      }
                                      
                                      try {
                                        const response = await salaryAPI.calculateInsurance({
                                          basePay: totalPay,
                                          payrollMonth: selectedMonth,
                                          taxType: taxType
                                        });
                                        
                                        updatedDeductions[emp.employeeId] = {
                                          basePay: totalPay,
                                          taxType: taxType,
                                          deductions: response.data.deductions,
                                          totalDeductions: response.data.totalDeductions,
                                          netPay: response.data.netPay
                                        };
                                        console.log(`✓ ${emp.employeeName} 공제액 자동계산 완료`);
                                      } catch (calcError) {
                                        console.error(`${emp.employeeName} 계산 오류:`, calcError);
                                        setToast({ 
                                          message: `${emp.employeeName}의 공제액 계산에 실패했습니다. 수정 버튼을 눌러주세요.`, 
                                          type: 'error' 
                                        });
                                        setLoading(false);
                                        return;
                                      }
                                    }
                                  }
                                  
                                  // 모든 직원 데이터 준비 (급여액이 있고 공제액이 계산된 직원만)
                                  const employees = salaryData.employees
                                    .filter(emp => {
                                      // 급여액이 있는 직원
                                      // 총 지급액 (세전) = 기본급여 + 주휴수당
                                      const baseSalary = emp.baseSalaryAmount || emp.baseSalary || emp.calculatedSalary || 0;
                                      const weeklyHolidayPay = emp.weeklyHolidayPayAmount || 0;
                                      const calculatedTotalPay = baseSalary + weeklyHolidayPay;
                                      const totalPay = editedSalaries[emp.employeeId] ?? calculatedTotalPay;
                                      if (!totalPay || totalPay <= 0) {
                                        console.warn(`⚠️ ${emp.employeeName}: 급여액 없음 (${totalPay}), 확정에서 제외`);
                                        return false;
                                      }
                                      
                                      // 공제액이 계산된 직원
                                      const empDeductions = updatedDeductions[emp.employeeId];
                                      if (!empDeductions || !empDeductions.deductions || Object.keys(empDeductions.deductions).length === 0) {
                                        console.error(`❌ ${emp.employeeName}: 공제액 데이터 누락`);
                                        return false;
                                      }

                                      return true;
                                    })
                                    .map(emp => {
                                      const empDeductions = updatedDeductions[emp.employeeId];
                                      
                                      console.log(`✅ ${emp.employeeName} 확정 데이터:`, {
                                        employeeId: emp.employeeId,
                                        id: emp.id,
                                        basePay: empDeductions.basePay
                                      });
                                      
                                      return {
                                        employeeId: emp.employeeId,
                                        basePay: empDeductions.basePay,
                                        deductions: empDeductions.deductions,
                                        totalPay: empDeductions.basePay,
                                        totalDeductions: empDeductions.totalDeductions,
                                        netPay: empDeductions.netPay,
                                        taxType: empDeductions.taxType
                                      };
                                    });
                                  
                                  // 확정할 직원이 없으면 경고
                                  if (employees.length === 0) {
                                    setToast({ 
                                      message: '확정할 급여 데이터가 없습니다. 급여액을 입력하고 수정 버튼을 눌러주세요.', 
                                      type: 'error' 
                                    });
                                    setLoading(false);
                                    return;
                                  }
                                  
                                  console.log(`✅ ${employees.length}명의 급여 확정 준비 완료`);
                                  
                                  console.log('📤 급여 확정 요청:', {
                                    workplaceId: selectedWorkplace,
                                    payrollMonth: selectedMonth,
                                    employeesCount: employees.length
                                  });
                                  
                                  const response = await salaryAPI.finalize({
                                    workplaceId: selectedWorkplace,
                                    payrollMonth: selectedMonth,
                                    employees: employees,
                                    appliedEffectiveYyyymm: selectedMonth?.replace('-', ''),
                                    appliedRatesJson: JSON.stringify({ rates_applied: true, month: selectedMonth })
                                  });
                                  
                                  setSalaryDeductions(updatedDeductions);
                                  setSalaryConfirmed(true);
                                  setSalaryFlowStep(3);
                                  setShowConfirmWarning(false);
                                  setToast({ 
                                    message: `✓ 급여가 확정되었습니다. 이제 각 직원별로 배포해주세요. (${employees.length}명)`, 
                                    type: 'success' 
                                  });
                                  
                                  // 급여 데이터 리로드
                                  await loadSalary();
                                  
                                  // 사업장의 모든 급여명세서 리로드 (미확정 숫자 업데이트용)
                                  try {
                                    const slipsResponse = await salaryAPI.getWorkplaceSlips(selectedWorkplace, { month: selectedMonth });
                                    if (slipsResponse && slipsResponse.data) {
                                      setEmployeeSlips(slipsResponse.data);
                                      console.log(`✅ 급여명세서 ${slipsResponse.data.length}개 로드됨`);
                                    }
                                  } catch (slipError) {
                                    console.error('급여명세서 리로드 오류:', slipError);
                                  }
                                  
                                  // 급여대장도 리로드
                                  if (payrollLedgerMonth === selectedMonth) {
                                    try {
                                      const ledgerResponse = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                                      setPayrollLedgerData(ledgerResponse.data);
                                    } catch (ledgerError) {
                                      console.error('급여대장 리로드 오류:', ledgerError);
                                    }
                                  }
                                } catch (error) {
                                  console.error('급여 확정 오류:', error);
                                  setToast({ 
                                    message: error.response?.data?.message || error.message || '급여 확정에 실패했습니다.', 
                                    type: 'error' 
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            disabled={loading}
                          >
                            {loading ? '처리 중...' : '확정하기'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
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
                        setPayrollLedgerCollapsed(!payrollLedgerCollapsed);
                      }}
                    >
                      {payrollLedgerCollapsed ? '▼ 펼치기' : '▲ 접기'}
                    </button>
                  </div>

                  {!payrollLedgerCollapsed && (
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
                              console.log('🔍 급여대장 조회 시작:', { workplaceId: selectedWorkplace, month: payrollLedgerMonth });
                              const response = await salaryAPI.getPayrollLedger(selectedWorkplace, payrollLedgerMonth);
                              console.log('✅ 급여대장 응답:', response.data);
                              console.log('   - slips 개수:', response.data?.slips?.length || 0);
                              console.log('   - totals:', response.data?.totals);
                              setPayrollLedgerData(response.data);
                              setMessage({ type: 'success', text: `${payrollLedgerMonth} 급여대장을 조회했습니다. (${response.data?.slips?.length || 0}개)` });
                            } catch (error) {
                              console.error('❌ 급여대장 조회 오류:', error);
                              console.error('   - 상태 코드:', error.response?.status);
                              console.error('   - 에러 메시지:', error.response?.data?.message);
                              setMessage({ type: 'error', text: error.response?.data?.message || '조회에 실패했습니다.' });
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          조회
                        </button>
                        {payrollLedgerData && payrollLedgerData.slips && payrollLedgerData.slips.length > 0 && (
                          <button
                            className="btn btn-success"
                            style={{ background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => {
                              try {
                                // CSV 데이터 생성
                                const headers = [
                                  '직원명', '구분', '기본급',
                                  '국민연금(근로자)', '건강보험(근로자)', '고용보험(근로자)', '장기요양(근로자)',
                                  '소득세', '지방세', '공제합계', '실수령액',
                                  '국민연금(사업주)', '건강보험(사업주)', '고용보험(사업주)', '장기요양(사업주)', '사업주부담합계'
                                ];
                                
                                const rows = payrollLedgerData.slips.map(slip => [
                                  slip.employee_name,
                                  slip.tax_type,
                                  Number(slip.base_pay || 0),
                                  Number(slip.national_pension || 0),
                                  Number(slip.health_insurance || 0),
                                  Number(slip.employment_insurance || 0),
                                  Number(slip.long_term_care || 0),
                                  Number(slip.income_tax || 0),
                                  Number(slip.local_income_tax || 0),
                                  Number(slip.total_deductions || 0),
                                  Number(slip.net_pay || 0),
                                  Number(slip.employer_national_pension || 0),
                                  Number(slip.employer_health_insurance || 0),
                                  Number(slip.employer_employment_insurance || 0),
                                  Number(slip.employer_long_term_care || 0),
                                  Number(slip.total_employer_burden || 0)
                                ]);
                                
                                // 합계 행 추가
                                const totals = payrollLedgerData.totals;
                                rows.push([
                                  '합계', '',
                                  Number(totals.total_base_pay || 0),
                                  Number(totals.total_national_pension || 0),
                                  Number(totals.total_health_insurance || 0),
                                  Number(totals.total_employment_insurance || 0),
                                  Number(totals.total_long_term_care || 0),
                                  Number(totals.total_income_tax || 0),
                                  Number(totals.total_local_income_tax || 0),
                                  Number(totals.total_deductions || 0),
                                  Number(totals.total_net_pay || 0),
                                  Number(totals.total_employer_national_pension || 0),
                                  Number(totals.total_employer_health_insurance || 0),
                                  Number(totals.total_employer_employment_insurance || 0),
                                  Number(totals.total_employer_long_term_care || 0),
                                  Number(totals.total_employer_burden || 0)
                                ]);
                                
                                // CSV 문자열 생성 (UTF-8 BOM 추가)
                                const csvContent = '\uFEFF' + [
                                  headers.join(','),
                                  ...rows.map(row => row.join(','))
                                ].join('\n');
                                
                                // 다운로드
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', `급여대장_${payrollLedgerMonth}.csv`);
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                setMessage({ type: 'success', text: '급여대장을 다운로드했습니다.' });
                              } catch (error) {
                                console.error('다운로드 오류:', error);
                                setMessage({ type: 'error', text: '다운로드에 실패했습니다.' });
                              }
                            }}
                          >
                            📥 엑셀 다운로드
                          </button>
                        )}
                      </div>

                      {payrollLedgerData && payrollLedgerData.slips && payrollLedgerData.slips.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ background: '#f3f4f6' }}>
                                  <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>직원명</th>
                                  <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>구분</th>
                                  <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>기본급</th>
                                  <th colSpan={4} style={{ borderRight: '2px solid #d1d5db' }}>근로자 공제</th>
                                  <th colSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>세금</th>
                                  <th rowSpan={2} style={{ borderRight: '2px solid #d1d5db' }}>공제 합계</th>
                                  <th rowSpan={2} style={{ borderRight: '3px solid #059669', background: '#d1fae5' }}>실수령액</th>
                                  <th colSpan={4} style={{ background: '#fef3c7', borderRight: '2px solid #f59e0b' }}>🏢 사업주 부담</th>
                                  <th rowSpan={2} style={{ background: '#fef3c7', fontWeight: 'bold' }}>사업주 합계</th>
                                </tr>
                                <tr style={{ background: '#f3f4f6' }}>
                                  <th>국민연금</th>
                                  <th>건강보험</th>
                                  <th>고용보험</th>
                                  <th style={{ borderRight: '2px solid #d1d5db' }}>장기요양</th>
                                  <th>소득세</th>
                                  <th style={{ borderRight: '2px solid #d1d5db' }}>지방세</th>
                                  <th style={{ background: '#fef3c7' }}>국민연금</th>
                                  <th style={{ background: '#fef3c7' }}>건강보험</th>
                                  <th style={{ background: '#fef3c7' }}>고용보험</th>
                                  <th style={{ background: '#fef3c7', borderRight: '2px solid #f59e0b' }}>장기요양</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payrollLedgerData.slips.map((slip, idx) => (
                                  <tr key={idx}>
                                    <td>{slip.employee_name}</td>
                                    <td>{slip.tax_type}</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.base_pay || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.national_pension || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.health_insurance || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.employment_insurance || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.long_term_care || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.income_tax || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.local_income_tax || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right' }}>{Number(slip.total_deductions || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{Number(slip.net_pay || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_national_pension || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_health_insurance || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_employment_insurance || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(slip.employer_long_term_care || 0).toLocaleString()}원</td>
                                    <td style={{ textAlign: 'right', background: '#fef3c7', fontWeight: 'bold' }}>{Number(slip.total_employer_burden || 0).toLocaleString()}원</td>
                                  </tr>
                                ))}
                                <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                                  <td colSpan={2}>합계</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_base_pay || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_national_pension || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_health_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_employment_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_long_term_care || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_income_tax || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_local_income_tax || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right' }}>{Number(payrollLedgerData.totals.total_deductions || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', color: '#059669' }}>{Number(payrollLedgerData.totals.total_net_pay || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_national_pension || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_health_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_employment_insurance || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_long_term_care || 0).toLocaleString()}원</td>
                                  <td style={{ textAlign: 'right', background: '#fef3c7' }}>{Number(payrollLedgerData.totals.total_employer_burden || 0).toLocaleString()}원</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                      ) : (
                        <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                          {!payrollLedgerData ? '월을 선택하고 조회 버튼을 클릭하세요.' : '해당 월에 배포된 급여명세서가 없습니다.'}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* 급여명세서 배포 */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ color: '#374151', margin: 0 }}>📝 급여명세서 배포</h3>
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

            {/* V2: 매칭 요청 승인 */}
            {activeTab === 'matching' && ownerCompanyId && (
              <div className="card">
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
                    🔔 매칭 요청 관리
                  </h2>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    근로자가 보낸 매칭 요청을 승인하거나 거부할 수 있습니다.
                  </p>
                </div>
                <OwnerMatchingApproval companyId={ownerCompanyId} />
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
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>번호</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', width: '50%' }}>제목</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>작성자</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>조회수</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>댓글</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>추천</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>작성일</th>
                          {user && <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>관리</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {communityPosts.map((post, index) => (
                          <tr 
                            key={post.id} 
                            style={{ 
                              borderBottom: '1px solid #e5e7eb',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => openCommunityModal('view', post)}
                          >
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                              {communityPosts.length - index}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                              <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>
                                {post.title}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                              {post.author_name}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                              👁️ {post.view_count || 0}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                              💬 {post.comment_count || 0}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                              👍 {post.like_count || 0}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                              {new Date(post.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                            </td>
                            {user && (
                              <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                {post.user_id === user.id && (
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 8px', fontSize: '12px' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openCommunityModal('edit', post);
                                      }}
                                    >
                                      수정
                                    </button>
                                    <button
                                      className="btn"
                                      style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: 'white' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCommunityPost(post.id);
                                      }}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                      value={workplaceLocationForm.name}
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
                        value={workplaceLocationForm.address}
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
                      value={workplaceLocationForm.latitude}
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
                      value={workplaceLocationForm.longitude}
                      onChange={handleWorkplaceFormChange}
                    />
                  </div>

                  {/* 지도에서 위치 선택 */}
                  {workplaceLocationForm.address && workplaceLocationForm.latitude && workplaceLocationForm.longitude && (
                    <div className="form-group">
                      <label className="form-label" style={{ marginBottom: '12px', display: 'block', fontSize: '16px', fontWeight: 'bold' }}>
                        🗺️ 지도에서 정확한 위치 설정
                      </label>
                      <MapPicker
                        latitude={workplaceLocationForm.latitude}
                        longitude={workplaceLocationForm.longitude}
                        address={workplaceLocationForm.address}
                        onLocationChange={(coords) => {
                          setWorkplaceLocationForm(prev => ({
                            ...prev,
                            latitude: coords.latitude.toFixed(6),
                            longitude: coords.longitude.toFixed(6)
                          }));
                        }}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">반경 (미터)</label>
                    <input
                      type="number"
                      name="radius"
                      className="form-input"
                      value={workplaceLocationForm.radius}
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

            {communityModalType === 'view' && selectedPost ? (
              <div>
                {/* 게시글 헤더 */}
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
                  <h3 style={{ marginBottom: '12px', color: '#111827', fontSize: '20px', fontWeight: '700' }}>
                    {selectedPost.title}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b7280' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span>작성자: {selectedPost.author_name}</span>
                      <span>조회수: {selectedPost.view_count || 0}</span>
                    </div>
                    <span>{new Date(selectedPost.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                </div>

                {/* 게시글 내용 */}
                <div style={{ 
                  fontSize: '15px', 
                  color: '#374151', 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.8', 
                  marginBottom: '24px',
                  padding: '20px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  minHeight: '150px'
                }}>
                  {selectedPost.content}
                </div>

                {/* 추천 버튼 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginBottom: '32px',
                  paddingBottom: '24px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={handleToggleLike}
                    disabled={communityLoading}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: postLiked ? '#667eea' : '#fff',
                      color: postLiked ? '#fff' : '#667eea',
                      border: '2px solid #667eea',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: communityLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>👍</span>
                    <span>추천 {selectedPost.like_count || 0}</span>
                  </button>
                </div>

                {/* 댓글 섹션 */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    color: '#374151', 
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>💬</span>
                    <span>댓글 {postComments.length}개</span>
                  </h4>

                  {/* 댓글 목록 */}
                  <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                    {postComments.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px', 
                        color: '#9ca3af',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        첫 댓글을 작성해보세요!
                      </div>
                    ) : (
                      postComments.map((comment) => (
                        <div 
                          key={comment.id} 
                          style={{
                            padding: '16px',
                            marginBottom: '12px',
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                              {comment.author_name}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                {new Date(comment.created_at).toLocaleString('ko-KR', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {comment.user_id === user.id && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {editingCommentId === comment.id ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateComment(comment.id)}
                                        disabled={communityLoading}
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '11px',
                                          backgroundColor: '#667eea',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        저장
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentContent('');
                                        }}
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '11px',
                                          backgroundColor: '#6b7280',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        취소
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingCommentContent(comment.content);
                                        }}
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '11px',
                                          backgroundColor: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        수정
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        disabled={communityLoading}
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '11px',
                                          backgroundColor: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        삭제
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {editingCommentId === comment.id ? (
                            <textarea
                              value={editingCommentContent}
                              onChange={(e) => setEditingCommentContent(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px',
                                resize: 'vertical',
                                minHeight: '60px'
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                              {comment.content}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* 댓글 작성 */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical',
                        minHeight: '80px',
                        marginBottom: '12px'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleAddComment}
                        disabled={communityLoading || !newComment.trim()}
                        style={{
                          padding: '8px 20px',
                          backgroundColor: newComment.trim() ? '#667eea' : '#d1d5db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: newComment.trim() && !communityLoading ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {communityLoading ? '작성 중...' : '댓글 작성'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 닫기 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCommunityModal(false);
                      setSelectedPost(null);
                      setPostComments([]);
                      setNewComment('');
                      setEditingCommentId(null);
                      setEditingCommentContent('');
                    }}
                    style={{ minWidth: '120px' }}
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
                {formData.id ? (
                  <div className="form-group">
                    <label className="form-label">비밀번호 초기화</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="password"
                        className="form-input"
                        value={formData._newPassword || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, _newPassword: e.target.value }))}
                        placeholder="새 비밀번호 입력 (선택)"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }}
                        onClick={async () => {
                          if (!formData._newPassword || formData._newPassword.length < 4) {
                            alert('새 비밀번호를 4자 이상 입력해주세요.');
                            return;
                          }
                          if (!window.confirm(`${formData.username} 직원의 비밀번호를 초기화하시겠습니까?`)) return;
                          try {
                            const res = await apiClient.put('/auth/owner/reset-employee-password', {
                              username: formData.username,
                              newPassword: formData._newPassword
                            });
                            alert(res.data.message || '비밀번호가 초기화되었습니다.');
                            setFormData(prev => ({ ...prev, _newPassword: '' }));
                          } catch (err) {
                            alert(err.response?.data?.message || '비밀번호 초기화에 실패했습니다.');
                          }
                        }}
                      >
                        초기화
                      </button>
                    </div>
                    <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      비워두면 비밀번호가 변경되지 않습니다.
                    </small>
                  </div>
                ) : (
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

              <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                    🧾 시스템 도입 전 과거 급여 기록
                  </h4>
                  <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                    이 직원이 시스템 도입 전부터 근무했다면 과거 급여 이력을 입력해주세요. 퇴직금 계산에 활용됩니다.
                  </p>

                  <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px', background: '#f9fafb' }}>
                    <p style={{ fontSize: '13px', margin: 0, color: '#374151' }}>
                      과거 급여 이력을 입력하시겠습니까?
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
                        <label className="form-label">비고 <span style={{ fontWeight: 400, color: '#9ca3af' }}>(급여 변경 이력 등)</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="예: 2024년 이전 급여, 2025.03 급여 인상 등"
                          value={pastPayrollForm.notes}
                          onChange={(e) => setPastPayrollForm({ ...pastPayrollForm, notes: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginBottom: '16px' }}
                        onClick={() => {
                          if (!pastPayrollForm.start_date || !pastPayrollForm.end_date || !pastPayrollForm.amount) {
                            setMessage({ type: 'error', text: '기간과 금액을 입력해주세요.' });
                            return;
                          }
                          if (formData.id) {
                            handleAddPastPayroll(formData.id);
                          } else {
                            const newRecord = {
                              ...pastPayrollForm,
                              amount: Number(pastPayrollForm.amount),
                              _tempId: Date.now()
                            };
                            setPendingPastPayroll(prev => [...prev, newRecord]);
                            setPastPayrollForm({ start_date: '', end_date: '', salary_type: 'monthly', amount: '', notes: '' });
                            setMessage({ type: 'success', text: '추가됐습니다. 직원 저장 시 함께 등록됩니다.' });
                          }
                        }}
                      >
                        + 과거 급여 기록 추가
                      </button>

                      {(() => {
                        const records = formData.id ? pastPayrollRecords : pendingPastPayroll;
                        return records.length > 0 ? (
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
                                {records.map((record) => (
                                  <tr key={record.id || record._tempId}>
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
                                        onClick={() => {
                                          if (formData.id) {
                                            handleDeletePastPayroll(formData.id, record.id);
                                          } else {
                                            setPendingPastPayroll(prev => prev.filter(r => r._tempId !== record._tempId));
                                          }
                                        }}
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
                        );
                      })()}
                    </>
                  )}
                </div>

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
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={loading}>
                  취소
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                  style={{ position: 'relative' }}
                >
                  <span style={{ visibility: loading ? 'hidden' : 'visible' }}>저장</span>
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
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={loading}>
                  취소
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                  style={{ position: 'relative' }}
                >
                  <span style={{ visibility: loading ? 'hidden' : 'visible' }}>저장하기</span>
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
                          const insuranceResponse = await salaryAPI.calculateInsurance({
                            basePay: parseFloat(slipFormData.basePay),
                            payrollMonth: slipFormData.payrollMonth,
                            taxType: '4대보험'
                          });
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
        <>
          <nav className="mobile-bottom-nav">
            <button
              className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              <div className="mobile-nav-icon">🏠</div>
              <div className="mobile-nav-label">홈</div>
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => handleTabChange('attendance')}
            >
              <div className="mobile-nav-icon">📊</div>
              <div className="mobile-nav-label">출근</div>
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'salary' ? 'active' : ''}`}
              onClick={() => handleTabChange('salary')}
            >
              <div className="mobile-nav-icon">💸</div>
              <div className="mobile-nav-label">급여</div>
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => handleTabChange('roster')}
            >
              <div className="mobile-nav-icon">👥</div>
              <div className="mobile-nav-label">직원</div>
            </button>

            <button
              className={`mobile-nav-item ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => handleTabChange('community')}
            >
              <div className="mobile-nav-icon">💬</div>
              <div className="mobile-nav-label">소통방</div>
            </button>

            <button
              className={`mobile-nav-item ${showMobileMore ? 'active' : ''}`}
              onClick={() => setShowMobileMore(v => !v)}
            >
              <div className="mobile-nav-icon">⋯</div>
              <div className="mobile-nav-label">더보기</div>
            </button>
          </nav>

          {/* 더보기 메뉴 */}
          {showMobileMore && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.4)' }}
                onClick={() => setShowMobileMore(false)}
              />
              <div style={{
                position: 'fixed', bottom: 'calc(65px + env(safe-area-inset-bottom))', left: 0, right: 0,
                background: 'white', borderRadius: '20px 20px 0 0', zIndex: 1000,
                padding: '20px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { tab: 'calendar', icon: '📅', label: '출근달력' },
                    { tab: 'salary-slips', icon: '📄', label: '급여명세서' },
                    { tab: 'severance', icon: '🧮', label: '퇴직금' },
                    { tab: 'past-employees', icon: '📁', label: '서류보관함' },
                    ...(ownerCompanyId ? [{ tab: 'matching', icon: '🔔', label: '매칭승인' }] : []),
                    { tab: 'settings', icon: '⚙️', label: '설정' },
                  ].map(({ tab, icon, label }) => (
                    <button
                      key={tab}
                      onClick={() => { handleTabChange(tab); setShowMobileMore(false); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        padding: '12px 8px', border: 'none', borderRadius: '12px',
                        background: activeTab === tab ? '#ede9fe' : '#f9fafb',
                        color: activeTab === tab ? '#667eea' : '#374151',
                        cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Toast 알림 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 직원 초대 링크 관리 모달 */}
      {showInviteManager && selectedWorkplace && (
        <EmployeeInviteManager
          workplaceId={selectedWorkplace}
          companyId={ownerCompanyId}
          ownerId={user.id}
          onClose={() => setShowInviteManager(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
