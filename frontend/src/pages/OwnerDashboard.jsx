import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import ChangePassword from '../components/ChangePassword';
import { useTranslation } from 'react-i18next';
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
import SalaryTab from '../components/owner/SalaryTab';
import AttendanceTab from '../components/owner/AttendanceTab';
import RosterTab from '../components/owner/RosterTab';
import SalarySlipsTab from '../components/owner/SalarySlipsTab';
import SettingsTab from '../components/owner/SettingsTab';
import CommunityTab from '../components/owner/CommunityTab';
import DashboardCharts from '../components/owner/DashboardCharts';
import DashboardTab from '../components/owner/DashboardTab';
import ManualCalcTab from '../components/owner/ManualCalcTab';
import ContractTab from '../components/owner/ContractTab';
import CalendarTab from '../components/owner/CalendarTab';
import SeveranceTab from '../components/owner/SeveranceTab';
import PastEmployeesTab from '../components/owner/PastEmployeesTab';
import ExcelImportModal from '../components/owner/ExcelImportModal';
import EmployeeFormModal from '../components/owner/EmployeeFormModal';
import AttendanceEditModal from '../components/owner/AttendanceEditModal';
import SalarySlipModal from '../components/owner/SalarySlipModal';

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
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
  const [showExcelImport, setShowExcelImport] = useState(false); // 엑셀 일괄 등록 모달
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // 모바일 사이드바
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(null); // 홈 출근 상세 (출근/지각/미출근/미퇴근)
  
  const uploadBaseUrl =
    import.meta.env.VITE_API_URL?.replace('/api', '') ||
    (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
  const getFileUrl = (filename) => {
    const token = localStorage.getItem('token');
    return `${uploadBaseUrl}/uploads/${filename}?token=${token}`;
  };

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
      
      const employeesData = employeesRes.data.data || employeesRes.data;
      const attendanceData = attendanceRes.data.data || attendanceRes.data;
      setEmployees(employeesData);
      setAttendance(attendanceData);

      console.log(`✅ 대시보드 데이터 로드 완료: 직원 ${employeesData.length}명, 출근기록 ${attendanceData.length}건`);
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
      const announcementsData = response.data.data || response.data;
      if (announcementsData?.length > 0) {
        setCurrentAnnouncement(announcementsData[0]); // 첫 번째 공지만 표시
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
        // 월 변경 시 급여 단계/캐시 초기화
        setSalaryFlowStep(1);
        setSalaryDeductions({});
        setSalaryConfirmed(false);
        loadSalary();
        // 급여 탭에서 사업장의 모든 급여명세서 로드
        salaryAPI.getWorkplaceSlips(selectedWorkplace, { month: selectedMonth })
          .then(response => {
            if (response && response.data) {
              setEmployeeSlips(response.data.data || response.data);
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
      const workplacesData = response.data.data || response.data;
      setWorkplaces(workplacesData);
      if (workplacesData.length > 0) {
        setSelectedWorkplace(workplacesData[0].id);
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
      const employeesData = response.data.data || response.data;
      setEmployees(employeesData);

      // 근로계약서 미제출 직원 확인
      const withoutContract = employeesData.filter(emp => !emp.contract_file);
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
      const attendanceData = response.data.data || response.data;
      setAttendance(attendanceData);
      calculateAttendanceStats(attendanceData);
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

    const formatDateKey = (d) => {
      if (!d) return '';
      if (typeof d === 'string') return d.slice(0, 10);
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    };

    const attendanceByKey = new Map();
    attendance.forEach((record) => {
      if (!record.user_id || !record.date) return;
      attendanceByKey.set(`${record.user_id}-${formatDateKey(record.date)}`, record);
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

  const loadEmployeeSlips = async () => {
    if (!selectedSlipEmployee) return;
    try {
      const response = await salaryAPI.getEmployeeSlips(selectedSlipEmployee);
      setEmployeeSlips(response.data.data || response.data || []);
    } catch (error) {
      console.error('급여명세서 조회 오류:', error);
    }
  };

  const loadSalary = async () => {
    if (!selectedWorkplace || !employees || employees.length === 0) return;
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
      const data = response.data;
      if (data && data.employees) {
        setSalaryData(data);
      } else {
        setSalaryData({ employees: [], totalSalary: 0 });
      }
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
      setPastEmployees(response.data.data || response.data);
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
      setPastPayrollRecords(response.data.data || response.data);
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
    setMessage({ type: '', text: '' });
    setFormErrors({});

    try {
      // 수기 등록 모드
      if (formData.is_manual && !formData.id) {
        const form = e.target;
        const name = form.querySelector('[name="name"]')?.value;
        if (!name || !name.trim()) {
          setToast({ message: '이름은 필수 항목입니다.', type: 'error' });
          setLoading(false);
          return;
        }
        const manualData = {
          name: name.trim(),
          phone: form.querySelector('[name="phone"]')?.value || null,
          workplace_id: selectedWorkplace,
          hire_date: form.querySelector('[name="hire_date"]')?.value || null,
          position: form.querySelector('[name="position"]')?.value || null,
          department: form.querySelector('[name="department"]')?.value || null,
          job_type: form.querySelector('[name="job_type"]')?.value || null,
          work_start_time: form.querySelector('[name="work_start_time"]')?.value || null,
          work_end_time: form.querySelector('[name="work_end_time"]')?.value || null,
          salary_type: form.querySelector('[name="salary_type"]')?.value || null,
          amount: form.querySelector('[name="amount"]')?.value || null,
          overtime_pay: form.querySelector('[name="overtime_pay"]')?.value || null,
          tax_type: form.querySelector('[name="tax_type"]')?.value || '4대보험',
          weekly_holiday_type: form.querySelector('input[name="weekly_holiday_type"]:checked')?.value || 'included',
          deduct_absence: form.querySelector('[name="deduct_absence"]')?.checked || false,
          flexible_hours: form.querySelector('[name="flexible_hours"]')?.checked || false,
          pay_schedule_type: form.querySelector('[name="pay_schedule_type"]')?.value || null,
          pay_day: form.querySelector('[name="pay_day"]')?.value || null,
          payroll_period_start_day: form.querySelector('[name="payroll_period_start_day"]')?.value || null,
          payroll_period_end_day: form.querySelector('[name="payroll_period_end_day"]')?.value || null,
        };
        const workDaysCheckboxes = form.querySelectorAll('input[name="work_days"]:checked');
        manualData.work_days = JSON.stringify(Array.from(workDaysCheckboxes).map(cb => cb.value));

        const response = await employeeAPI.createManual(manualData);
        setToast({ message: '직원이 수기 등록되었습니다.', type: 'success' });
        closeModal();
        loadEmployees();
        setLoading(false);
        return;
      }

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
      setCommunityPosts(response.data.data || response.data);
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
      setSelectedPost(postResponse.data.data || postResponse.data);

      // 댓글 목록 가져오기
      const commentsResponse = await communityAPI.getComments(postId);
      setPostComments(commentsResponse.data.data || commentsResponse.data);

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
      setPostComments(commentsResponse.data.data || commentsResponse.data);
      // 게시글 정보도 새로고침 (댓글 수 업데이트)
      const postResponse = await communityAPI.getPost(selectedPost.id);
      setSelectedPost(postResponse.data.data || postResponse.data);
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
      setPostComments(commentsResponse.data.data || commentsResponse.data);
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
      setPostComments(commentsResponse.data.data || commentsResponse.data);
      // 게시글 정보도 새로고침 (댓글 수 업데이트)
      const postResponse = await communityAPI.getPost(selectedPost.id);
      setSelectedPost(postResponse.data.data || postResponse.data);
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
                <div className="erp-sidebar-section-label">{t('owner.sectionMain')}</div>
                <button className={`erp-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  <span className="erp-nav-icon">🏠</span> {t('owner.tabHome')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                  <span className="erp-nav-icon">📊</span> {t('owner.tabAttendance')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                  <span className="erp-nav-icon">📅</span> {t('owner.tabCalendar')}
                </button>
              </div>
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">{t('owner.sectionSalary')}</div>
                <button className={`erp-nav-item ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>
                  <span className="erp-nav-icon">📋</span> {t('owner.tabSalary')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'salary-slips' ? 'active' : ''}`} onClick={() => setActiveTab('salary-slips')}>
                  <span className="erp-nav-icon">📄</span> {t('owner.tabSalarySlips')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'severance' ? 'active' : ''}`} onClick={() => setActiveTab('severance')}>
                  <span className="erp-nav-icon">🧮</span> {t('owner.tabSeverance')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'manual-calc' ? 'active' : ''}`} onClick={() => setActiveTab('manual-calc')}>
                  <span className="erp-nav-icon">✏️</span> {t('owner.tabManualCalc')}
                </button>
              </div>
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">{t('owner.sectionHR')}</div>
                <button className={`erp-nav-item ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
                  <span className="erp-nav-icon">👥</span> {t('owner.tabRoster')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'past-employees' ? 'active' : ''}`} onClick={() => setActiveTab('past-employees')}>
                  <span className="erp-nav-icon">📁</span> {t('owner.tabPastEmployees')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}>
                  <span className="erp-nav-icon">📝</span> {t('owner.tabContracts')}
                </button>
              </div>
              <div className="erp-sidebar-section">
                <div className="erp-sidebar-section-label">{t('owner.sectionEtc')}</div>
                <button className={`erp-nav-item ${activeTab === 'matching' ? 'active' : ''}`} onClick={() => setActiveTab('matching')}>
                  <span className="erp-nav-icon">🔔</span> {t('owner.tabMatching')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
                  <span className="erp-nav-icon">💬</span> {t('owner.tabCommunity')}
                </button>
                <button className={`erp-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                  <span className="erp-nav-icon">⚙️</span> {t('owner.tabSettings')}
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
          paddingBottom: '20px'
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
            zIndex: 200,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              minHeight: '48px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '22px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    flexShrink: 0
                  }}
                >
                  ☰
                </button>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '700',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {activeTab === 'dashboard' ? t('owner.tabHome') :
                   activeTab === 'attendance' ? t('owner.titleAttendance') :
                   activeTab === 'salary' ? t('owner.tabSalary') :
                   activeTab === 'roster' ? t('owner.tabRoster') :
                   activeTab === 'salary-slips' ? t('owner.tabSalarySlips') :
                   activeTab === 'calendar' ? t('owner.tabCalendar') :
                   activeTab === 'severance' ? t('owner.tabSeverance') :
                   activeTab === 'manual-calc' ? t('owner.tabManualCalc') :
                   activeTab === 'past-employees' ? t('owner.tabPastEmployees') :
                   activeTab === 'matching' ? t('owner.titleMatchingRequest') :
                   activeTab === 'community' ? t('owner.tabCommunity') :
                   activeTab === 'contracts' ? t('owner.tabContracts') :
                   activeTab === 'settings' ? t('owner.tabSettings') : t('owner.titleMore')}
                </h2>
              </div>
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
                <h3 style={{ color: '#374151', marginBottom: '8px' }}>{t('owner.noWorkplace')}</h3>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  {t('owner.noWorkplaceDesc')}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowWorkplaceForm(true)}
                  style={{ padding: '12px 24px', fontSize: '16px' }}
                >
                  🏢 {t('owner.registerWorkplace')}
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '20px', color: '#374151' }}>🏢 {t('owner.newWorkplace')}</h3>
                <form onSubmit={handleCreateWorkplace}>
                  <div className="form-group">
                    <label className="form-label">{t('owner.workplaceName')} <span style={{ color: 'red' }}>*</span></label>
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
              <CalendarTab
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                buildOwnerCalendarDays={buildOwnerCalendarDays}
                formatNameList={formatNameList}
              />
            )}

            {/* 근로자 명부 (직원 관리 통합) */}
            {activeTab === 'roster' && (
              <RosterTab
                employees={employees}
                isMobile={isMobile}
                employmentStatusFilter={employmentStatusFilter}
                rosterViewMode={rosterViewMode}
                setEmploymentStatusFilter={setEmploymentStatusFilter}
                setRosterViewMode={setRosterViewMode}
                setActiveTab={setActiveTab}
                openModal={openModal}
                openResignationModal={openResignationModal}
                handleViewSalaryHistory={handleViewSalaryHistory}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                getSalaryTypeName={getSalaryTypeName}
                onExcelImport={() => setShowExcelImport(true)}
              />
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
              <DashboardTab
                isMobile={isMobile}
                user={user}
                employees={employees}
                attendance={attendance}
                notifications={notifications}
                salaryData={salaryData}
                selectedMonth={selectedMonth}
                employeeSlips={employeeSlips}
                showAttendanceDetail={showAttendanceDetail}
                setShowAttendanceDetail={setShowAttendanceDetail}
                handleTabChange={handleTabChange}
                handleNotificationAction={handleNotificationAction}
              />
            )}

            {/* 당월 출근현황 */}
            {activeTab === 'attendance' && (
              <AttendanceTab
                attendance={attendance}
                employees={employees}
                isMobile={isMobile}
                selectedMonth={selectedMonth}
                qrCollapsed={qrCollapsed}
                qrLoading={qrLoading}
                qrData={qrData}
                qrPrintMessage={qrPrintMessage}
                qrPrintSaving={qrPrintSaving}
                attendanceStats={attendanceStats}
                highlightedRecordId={highlightedRecordId}
                setActiveTab={setActiveTab}
                setSelectedMonth={setSelectedMonth}
                setQrCollapsed={setQrCollapsed}
                setQrPrintMessage={setQrPrintMessage}
                handleGenerateQr={handleGenerateQr}
                handlePrintQr={handlePrintQr}
                handleSaveQrPrintMessage={handleSaveQrPrintMessage}
                openModal={openModal}
                getAttendanceStatus={getAttendanceStatus}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            )}

            {/* 급여 계산 */}
            {activeTab === 'salary' && (
              <SalaryTab
                salaryData={salaryData}
                salaryFlowStep={salaryFlowStep}
                setSalaryFlowStep={setSalaryFlowStep}
                salaryConfirmed={salaryConfirmed}
                setSalaryConfirmed={setSalaryConfirmed}
                salaryDeductions={salaryDeductions}
                setSalaryDeductions={setSalaryDeductions}
                editedSalaries={editedSalaries}
                setEditedSalaries={setEditedSalaries}
                calculatingEmployeeId={calculatingEmployeeId}
                calculateDeductions={calculateDeductions}
                salaryViewMode={salaryViewMode}
                setSalaryViewMode={setSalaryViewMode}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedWorkplace={selectedWorkplace}
                employeeSlips={employeeSlips}
                isMobile={isMobile}
                showConfirmWarning={showConfirmWarning}
                setShowConfirmWarning={setShowConfirmWarning}
                loading={loading}
                setLoading={setLoading}
                setMessage={setMessage}
                setToast={setToast}
                formatCurrency={formatCurrency}
                getSalaryTypeName={getSalaryTypeName}
                downloadExcel={downloadExcel}
                loadEmployeeSlips={loadEmployeeSlips}
                loadSalary={loadSalary}
                salaryAPI={salaryAPI}
                salaryPeriodRange={salaryPeriodRange}
                setEmployeeSlips={setEmployeeSlips}
                payrollLedgerMonth={payrollLedgerMonth}
                payrollLedgerData={payrollLedgerData}
                setPayrollLedgerData={setPayrollLedgerData}
              />
            )}

            {/* 급여명세서 */}
            {activeTab === 'salary-slips' && (
              <SalarySlipsTab
                payrollLedgerCollapsed={payrollLedgerCollapsed}
                payrollLedgerMonth={payrollLedgerMonth}
                payrollLedgerData={payrollLedgerData}
                selectedWorkplace={selectedWorkplace}
                selectedSlipEmployee={selectedSlipEmployee}
                employeeSlips={employeeSlips}
                employees={employees}
                loading={loading}
                setPayrollLedgerCollapsed={setPayrollLedgerCollapsed}
                setPayrollLedgerMonth={setPayrollLedgerMonth}
                setPayrollLedgerData={setPayrollLedgerData}
                setLoading={setLoading}
                setMessage={setMessage}
                setSelectedSlipEmployee={setSelectedSlipEmployee}
                setEmployeeSlips={setEmployeeSlips}
                setEditingSlipId={setEditingSlipId}
                setSlipFormData={setSlipFormData}
                setShowSlipModal={setShowSlipModal}
                setSlipToPublish={setSlipToPublish}
                setShowPublishWarning={setShowPublishWarning}
                salaryAPI={salaryAPI}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            )}

            {/* 퇴직금 계산 */}
            {activeTab === 'manual-calc' && (
              <ManualCalcTab formatCurrency={formatCurrency} isMobile={isMobile} selectedWorkplace={selectedWorkplace} onEmployeeSaved={() => loadEmployees()} />
            )}

            {activeTab === 'severance' && (
              <SeveranceTab
                employees={employees}
                getSeverancePayById={getSeverancePayById}
                getYearsOfService={getYearsOfService}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                pastPayrollEmployeeId={pastPayrollEmployeeId}
                setPastPayrollEmployeeId={setPastPayrollEmployeeId}
                pastPayrollYear={pastPayrollYear}
                setPastPayrollYear={setPastPayrollYear}
                pastPayrollMonth={pastPayrollMonth}
                setPastPayrollMonth={setPastPayrollMonth}
                pastPayrollForm={pastPayrollForm}
                setPastPayrollForm={setPastPayrollForm}
                handleAddPastPayroll={handleAddPastPayroll}
                handleDeletePastPayroll={handleDeletePastPayroll}
                pastPayrollRecords={pastPayrollRecords}
                getMonthRange={getMonthRange}
                getSalaryTypeName={getSalaryTypeName}
                selectedWorkplace={selectedWorkplace}
                salaryAPI={salaryAPI}
                setMessage={setMessage}
              />
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
              <PastEmployeesTab
                pastEmployees={pastEmployees}
                formatDate={formatDate}
                handleDeletePastEmployee={handleDeletePastEmployee}
                openModal={openModal}
              />
            )}

            {activeTab === 'community' && (
              <CommunityTab
                communityLoading={communityLoading}
                communityPosts={communityPosts}
                openCommunityModal={openCommunityModal}
                user={user}
                handleDeleteCommunityPost={handleDeleteCommunityPost}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                workplaceLocationForm={workplaceLocationForm}
                handleWorkplaceFormChange={handleWorkplaceFormChange}
                handleSearchWorkplaceAddress={handleSearchWorkplaceAddress}
                workplaceSearchLoading={workplaceSearchLoading}
                handleSetWorkplaceLocation={handleSetWorkplaceLocation}
                workplaceLocationLoading={workplaceLocationLoading}
                handleSaveWorkplace={handleSaveWorkplace}
                workplaceSaving={workplaceSaving}
                setWorkplaceLocationForm={setWorkplaceLocationForm}
                pushSupported={pushSupported}
                pushPublicKeyReady={pushPublicKeyReady}
                pushEnabled={pushEnabled}
                pushLoading={pushLoading}
                handleDisablePush={handleDisablePush}
                handleSendPushTest={handleSendPushTest}
                handleEnablePush={handleEnablePush}
                workplaceId={selectedWorkplace}
              />
            )}

            {activeTab === 'contracts' && (
              <ContractTab
                selectedWorkplace={selectedWorkplace}
                employees={employees}
              />
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
      <EmployeeFormModal
        showModal={showModal}
        modalType={modalType}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        message={message}
        loading={loading}
        closeModal={closeModal}
        handleSubmitEmployee={handleSubmitEmployee}
        handleInputChange={handleInputChange}
        handleFileChange={handleFileChange}
        handleCheckUsername={handleCheckUsername}
        usernameCheckStatus={usernameCheckStatus}
        usernameCheckLoading={usernameCheckLoading}
        getFileUrl={getFileUrl}
        formatDate={formatDate}
        getSalaryTypeName={getSalaryTypeName}
        pastPayrollEnabled={pastPayrollEnabled}
        setPastPayrollEnabled={setPastPayrollEnabled}
        pastPayrollForm={pastPayrollForm}
        setPastPayrollForm={setPastPayrollForm}
        pastPayrollRecords={pastPayrollRecords}
        pendingPastPayroll={pendingPastPayroll}
        setPendingPastPayroll={setPendingPastPayroll}
        handleAddPastPayroll={handleAddPastPayroll}
        handleDeletePastPayroll={handleDeletePastPayroll}
        setMessage={setMessage}
        apiClient={apiClient}
      />

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
      <AttendanceEditModal
        showModal={showModal}
        modalType={modalType}
        formData={formData}
        loading={loading}
        closeModal={closeModal}
        handleSubmitAttendance={handleSubmitAttendance}
        handleInputChange={handleInputChange}
        formatDate={formatDate}
      />

      {/* 급여명세서 작성/수정 모달 */}
      <SalarySlipModal
        showSlipModal={showSlipModal}
        editingSlipId={editingSlipId}
        setShowSlipModal={setShowSlipModal}
        setEditingSlipId={setEditingSlipId}
        slipFormData={slipFormData}
        setSlipFormData={setSlipFormData}
        employees={employees}
        selectedWorkplace={selectedWorkplace}
        selectedSlipEmployee={selectedSlipEmployee}
        setEmployeeSlips={setEmployeeSlips}
        payrollLedgerMonth={payrollLedgerMonth}
        setPayrollLedgerData={setPayrollLedgerData}
        message={message}
        setMessage={setMessage}
        formatCurrency={formatCurrency}
      />

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
                      setEmployeeSlips(response.data.data || response.data || []);
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

      {/* 모바일 사이드바 메뉴 */}
      {isMobile && (
        <>
          <div
            className={`mobile-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
          <nav className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="mobile-sidebar-header">
              <h3>찬스HR</h3>
              <p>{user?.name} ({user?.role === 'owner' ? '사업주' : ''})</p>
            </div>
            <div className="mobile-sidebar-menu">
              {[
                { tab: 'dashboard', icon: '🏠', label: '홈' },
                { tab: 'attendance', icon: '📊', label: '출근 현황' },
                { tab: 'salary', icon: '💸', label: '급여 관리' },
                { tab: 'roster', icon: '👥', label: '직원 관리' },
                { tab: 'community', icon: '💬', label: '소통방' },
              ].map(({ tab, icon, label }) => (
                <button
                  key={tab}
                  className={`mobile-sidebar-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => { handleTabChange(tab); setSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">{icon}</span>
                  {label}
                </button>
              ))}
              <div className="mobile-sidebar-divider" />
              {[
                { tab: 'calendar', icon: '📅', label: '출근 달력' },
                { tab: 'salary-slips', icon: '📄', label: '급여명세서' },
                { tab: 'severance', icon: '🧮', label: '퇴직금 계산' },
                { tab: 'manual-calc', icon: '✏️', label: '수기 급여계산' },
                { tab: 'past-employees', icon: '📁', label: '서류 보관함' },
                ...(ownerCompanyId ? [{ tab: 'matching', icon: '🔔', label: '매칭 승인' }] : []),
                { tab: 'settings', icon: '⚙️', label: '설정' },
              ].map(({ tab, icon, label }) => (
                <button
                  key={tab}
                  className={`mobile-sidebar-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => { handleTabChange(tab); setSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="mobile-sidebar-footer">
              <button
                className="mobile-sidebar-item"
                onClick={() => { setSidebarOpen(false); navigate('/guide'); }}
              >
                <span className="sidebar-icon">📘</span>
                사용방법
              </button>
              <button
                className="mobile-sidebar-item"
                onClick={() => { setSidebarOpen(false); setShowERPChangePassword(true); }}
              >
                <span className="sidebar-icon">🔐</span>
                비밀번호 변경
              </button>
              <button
                className="mobile-sidebar-item"
                onClick={() => { setSidebarOpen(false); logout(); }}
                style={{ color: '#dc2626' }}
              >
                <span className="sidebar-icon">🚪</span>
                로그아웃
              </button>
            </div>
          </nav>
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

      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        workplaceId={selectedWorkplace}
        onImportComplete={() => { loadEmployees(); setShowExcelImport(false); }}
        formatCurrency={formatCurrency}
      />

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
