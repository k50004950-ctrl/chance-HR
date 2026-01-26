import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { attendanceAPI, salaryAPI, employeeAPI, announcementsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AnnouncementModal from '../components/AnnouncementModal';
import { Html5Qrcode } from 'html5-qrcode';
import html2canvas from 'html2canvas';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [salarySlips, setSalarySlips] = useState([]);
  const [salarySlipsLoading, setSalarySlipsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastLocationCheckAt, setLastLocationCheckAt] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);
  const qrScannerRef = useRef(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState({ privacy_consent: false, location_consent: false });
  const [employeeWorkDays, setEmployeeWorkDays] = useState([]);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  useEffect(() => {
    checkConsent();
    loadTodayStatus();
    loadAttendanceRecords();
    checkAnnouncements();
  }, []);

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

  const checkConsent = async () => {
    try {
      const response = await employeeAPI.getById(user.id);
      const employee = response.data;
      setEmployeeProfile(employee);
      const workDays = employee.work_days
        ? employee.work_days.split(',').map((day) => day.trim()).filter(Boolean)
        : [];
      setEmployeeWorkDays(workDays);
      
      // 동의하지 않은 경우 모달 표시
      if (!employee.privacy_consent || !employee.location_consent) {
        setShowConsentModal(true);
      }
    } catch (error) {
      console.error('동의 여부 확인 오류:', error);
    }
  };

  const handleConsent = async () => {
    if (!consentData.privacy_consent || !consentData.location_consent) {
      setMessage({ type: 'error', text: '모든 동의 항목에 체크해주세요.' });
      return;
    }

    try {
      setLoading(true);
      await employeeAPI.updateConsent(user.id, {
        privacy_consent: true,
        privacy_consent_date: new Date().toISOString(),
        location_consent: true,
        location_consent_date: new Date().toISOString()
      });
      setShowConsentModal(false);
      setMessage({ type: 'success', text: '동의가 완료되었습니다.' });
    } catch (error) {
      console.error('동의 처리 오류:', error);
      setMessage({ type: 'error', text: '동의 처리에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceRecords();
    loadSalaryInfo();
    loadSalarySlips();
  }, [selectedMonth]);

  const loadTodayStatus = async () => {
    try {
      const response = await attendanceAPI.getToday();
      setTodayStatus(response.data);
    } catch (error) {
      console.error('상태 조회 오류:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const response = await attendanceAPI.getMy({ startDate, endDate });
      setAttendanceRecords(response.data);
    } catch (error) {
      console.error('출퇴근 기록 조회 오류:', error);
    }
  };

  const loadSalaryInfo = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const response = await salaryAPI.calculate(user.id, { startDate, endDate });
      setSalaryInfo(response.data);
    } catch (error) {
      console.error('급여 정보 조회 오류:', error);
      setSalaryInfo(null);
    }
  };

  const loadSalarySlips = async () => {
    try {
      setSalarySlipsLoading(true);
      const response = await salaryAPI.getMySlips({ month: selectedMonth });
      setSalarySlips(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('급여명세서 조회 오류:', error);
      setSalarySlips([]);
    } finally {
      setSalarySlipsLoading(false);
    }
  };

  // 급여명세서 다운로드 기능
  const downloadPayslip = async (slipId, payrollMonth) => {
    try {
      setMessage({ type: 'info', text: '급여명세서를 생성하는 중...' });
      
      const element = document.getElementById(`payslip-${slipId}`);
      if (!element) {
        throw new Error('급여명세서를 찾을 수 없습니다.');
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      const link = document.createElement('a');
      link.download = `급여명세서_${user.name || user.username}_${payrollMonth}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setMessage({ type: 'success', text: '급여명세서가 다운로드되었습니다.' });
    } catch (error) {
      console.error('다운로드 오류:', error);
      setMessage({ type: 'error', text: '다운로드에 실패했습니다.' });
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('위치 서비스를 지원하지 않는 브라우저입니다.'));
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  const parseQrToken = (payload) => {
    if (!payload) return '';
    if (payload.includes('|')) {
      const parts = payload.split('|');
      if (parts.length >= 3 && parts[0] === 'CHANCEHR') {
        return parts[2];
      }
    }
    try {
      const url = new URL(payload);
      const tokenParam = url.searchParams.get('token');
      if (tokenParam) return tokenParam;
      if (url.hash) {
        const hashQueryIndex = url.hash.indexOf('?');
        if (hashQueryIndex !== -1) {
          const hashParams = new URLSearchParams(url.hash.slice(hashQueryIndex + 1));
          const hashToken = hashParams.get('token');
          if (hashToken) return hashToken;
        }
      }
    } catch (e) {
      // ignore URL parse error
    }
    return payload.trim();
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
      } catch (error) {
        // ignore stop errors
      }
      try {
        qrScannerRef.current.clear();
      } catch (error) {
        // ignore clear errors
      }
      qrScannerRef.current = null;
    }
  };

  useEffect(() => {
    if (!qrScannerOpen) {
      stopQrScanner();
      setQrProcessing(false);
      return;
    }

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        qrScannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (qrProcessing) return;
            setQrProcessing(true);
            await stopQrScanner();
            setQrScannerOpen(false);

            const token = parseQrToken(decodedText);
            if (!token) {
              setMessage({ type: 'error', text: 'QR 코드 내용을 확인할 수 없습니다.' });
              setQrProcessing(false);
              return;
            }

            try {
              const response = await attendanceAPI.checkQr({ token });
              setMessage({ type: 'success', text: response.data.message });
              loadTodayStatus();
              loadAttendanceRecords();
            } catch (error) {
              setMessage({
                type: 'error',
                text: error.response?.data?.message || 'QR 출퇴근에 실패했습니다.'
              });
            } finally {
              setQrProcessing(false);
            }
          }
        );
      } catch (error) {
        setMessage({ type: 'error', text: 'QR 스캔을 시작할 수 없습니다. 카메라 권한을 확인해주세요.' });
        setQrScannerOpen(false);
        setQrProcessing(false);
      }
    };

    startScanner();

    return () => {
      stopQrScanner();
    };
  }, [qrScannerOpen, qrProcessing]);

  const checkCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setLastLocationCheckAt(Date.now());
      setMessage({ 
        type: 'info', 
        text: `현재 위치를 확인했습니다. (정확도: ${Math.round(location.accuracy)}m)` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    setLocationLoading(false);
  };

  const isLocationFresh = () => {
    if (!currentLocation || !lastLocationCheckAt) return false;
    return Date.now() - lastLocationCheckAt <= 2 * 60 * 1000;
  };

  const ensureLocationChecked = () => {
    if (!isLocationFresh()) {
      setMessage({
        type: 'error',
        text: '출퇴근 체크 전에 "📍 위치 확인"을 먼저 해주세요.'
      });
      return false;
    }
    return true;
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!ensureLocationChecked()) {
        setLoading(false);
        return;
      }
      const response = await attendanceAPI.checkIn(currentLocation);
      
      setMessage({ type: 'success', text: response.data.message });
      setCurrentLocation(null);
      setLastLocationCheckAt(null);
      loadTodayStatus();
      loadAttendanceRecords();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || '출근 체크에 실패했습니다.'
      });
    }
    
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!ensureLocationChecked()) {
        setLoading(false);
        return;
      }
      const response = await attendanceAPI.checkOut(currentLocation);
      
      setMessage({ type: 'success', text: response.data.message });
      setCurrentLocation(null);
      setLastLocationCheckAt(null);
      loadTodayStatus();
      loadAttendanceRecords();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || '퇴근 체크에 실패했습니다.'
      });
    }
    
    setLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return '-';
    return `${num.toLocaleString()}원`;
  };

  const getNextPayDate = (profile) => {
    if (!profile) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const type = profile.pay_schedule_type;

    if (type === 'hire_date_based') {
      const hireDate = profile.hire_date ? new Date(profile.hire_date) : null;
      if (!hireDate || Number.isNaN(hireDate.getTime())) return null;
      const payDay = hireDate.getDate();
      const year = today.getFullYear();
      const month = today.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(payDay, lastDay);
      const candidate = new Date(year, month, day);
      candidate.setHours(0, 0, 0, 0);
      if (today <= candidate) return candidate;
      const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
      const nextDay = Math.min(payDay, nextMonthLastDay);
      const next = new Date(year, month + 1, nextDay);
      next.setHours(0, 0, 0, 0);
      return next;
    }

    if (type === 'after_hire_days') {
      const hireDate = profile.hire_date ? new Date(profile.hire_date) : null;
      const afterDays = Number(profile.pay_after_days || 0);
      if (!hireDate || Number.isNaN(hireDate.getTime()) || afterDays <= 0) return null;
      const firstPayDate = new Date(hireDate.getTime() + afterDays * 24 * 60 * 60 * 1000);
      firstPayDate.setHours(0, 0, 0, 0);
      if (today <= firstPayDate) return firstPayDate;
      const diffDays = Math.floor((today - firstPayDate) / (24 * 60 * 60 * 1000));
      const cycles = Math.floor(diffDays / afterDays) + 1;
      const next = new Date(firstPayDate.getTime() + cycles * afterDays * 24 * 60 * 60 * 1000);
      next.setHours(0, 0, 0, 0);
      return next;
    }

    if (type === 'monthly_fixed') {
      const payDay = Number(profile.pay_day || 0);
      const year = today.getFullYear();
      const month = today.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = !payDay || payDay <= 0 ? lastDay : Math.min(payDay, lastDay);
      const candidate = new Date(year, month, day);
      candidate.setHours(0, 0, 0, 0);
      if (today <= candidate) return candidate;
      const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
      const nextDay = !payDay || payDay <= 0 ? nextMonthLastDay : Math.min(payDay, nextMonthLastDay);
      const next = new Date(year, month + 1, nextDay);
      next.setHours(0, 0, 0, 0);
      return next;
    }

    return null;
  };

  const getPaydayLabel = () => {
    const nextPayDate = getNextPayDate(employeeProfile);
    if (!nextPayDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextPayDate - today) / (24 * 60 * 60 * 1000));
    return {
      date: nextPayDate,
      diffDays
    };
  };

  const getSalaryTypeName = (type) => {
    switch (type) {
      case 'hourly': return '시급';
      case 'monthly': return '월급';
      case 'annual': return '연봉';
      default: return type;
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

  const buildCalendarDays = () => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekday = firstDay.getDay();
    const lastDay = new Date(year, month, 0).getDate();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const attendanceByDate = new Map();
    attendanceRecords.forEach((record) => {
      if (record.date) {
        attendanceByDate.set(record.date, record);
      }
    });

    const days = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    for (let day = 1; day <= lastDay; day += 1) {
      const dayString = String(day).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayString}`;
      const weekdayKey = dayKeys[new Date(year, month - 1, day).getDay()];
      const isScheduled = employeeWorkDays.length === 0 || employeeWorkDays.includes(weekdayKey);
      days.push({
        key: dateKey,
        dateKey,
        day,
        holiday: getHolidayName(dateKey),
        record: attendanceByDate.get(dateKey) || null,
        isScheduled
      });
    }
    return days;
  };

  const handleGetCertificate = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getEmploymentCertificate(user.id);
      setCertificateData(response.data);
      setShowCertificateModal(true);
    } catch (error) {
      console.error('재직증명서 조회 오류:', error);
      setMessage({ type: 'error', text: '재직증명서 발급에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const paydayInfo = getPaydayLabel();

  return (
    <div>
      <Header />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#374151' }}>직원 대시보드</h2>
          <button
            className="btn btn-primary"
            onClick={handleGetCertificate}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📄 재직증명서 발급
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 출퇴근 체크 카드 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, color: '#374151' }}>📍 오늘의 출퇴근</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={checkCurrentLocation}
                disabled={locationLoading}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                {locationLoading ? '확인 중...' : '📍 위치 확인'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setQrScannerOpen(true)}
                disabled={qrProcessing || loading}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                📷 QR 스캔
              </button>
            </div>
          </div>

          {/* 현재 위치 정보 */}
          {currentLocation && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe'
            }}>
              <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '4px', fontWeight: '600' }}>
                📡 현재 위치 확인됨
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                위도: {Number(currentLocation.latitude).toFixed(6)} / 경도: {Number(currentLocation.longitude).toFixed(6)}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                정확도: 약 {Math.round(currentLocation.accuracy)}m
              </div>
            </div>
          )}
          
          {(() => {
            const hasCheckInLocation = todayStatus?.record?.check_in_lat !== null
              && todayStatus?.record?.check_in_lat !== undefined
              || todayStatus?.record?.check_in_latitude !== null
              && todayStatus?.record?.check_in_latitude !== undefined;
            const hasCheckOutLocation = todayStatus?.record?.check_out_lat !== null
              && todayStatus?.record?.check_out_lat !== undefined
              || todayStatus?.record?.check_out_latitude !== null
              && todayStatus?.record?.check_out_latitude !== undefined;

            return (
              <div className="grid grid-2" style={{ marginBottom: '20px' }}>
            <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '2px solid #d1fae5' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>🏢 출근 시간</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                {todayStatus?.record?.check_in_time ? formatTime(todayStatus.record.check_in_time) : '미체크'}
              </div>
              {hasCheckInLocation && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  위치 기록됨 ✓
                </div>
              )}
            </div>
            <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '12px', border: '2px solid #fde68a' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>🏠 퇴근 시간</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                {todayStatus?.record?.check_out_time ? formatTime(todayStatus.record.check_out_time) : '미체크'}
              </div>
              {hasCheckOutLocation && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  위치 기록됨 ✓
                </div>
              )}
            </div>
              </div>
            );
          })()}

          <div style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px dashed #d1d5db'
          }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              💡 출퇴근 체크 안내
            </div>
            <ul style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: 0, 
              paddingLeft: '20px',
              lineHeight: '1.6'
            }}>
              <li>출퇴근 전에 반드시 "📍 위치 확인"을 먼저 해주세요</li>
              <li>위치 인식이 어려울 경우 "📷 QR 스캔"으로 출퇴근할 수 있습니다</li>
              <li>위치 권한을 허용해주세요</li>
              <li>정확한 위치 확인을 위해 GPS를 켜주세요</li>
            </ul>
          </div>

          <div className="grid grid-2" style={{ gap: '12px' }}>
            <button
              className="btn btn-success"
              onClick={handleCheckIn}
              disabled={loading || todayStatus?.hasCheckedIn || !isLocationFresh()}
              style={{ 
                width: '100%', 
                padding: '18px', 
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: todayStatus?.hasCheckedIn ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              {loading ? '처리 중...' : (todayStatus?.hasCheckedIn ? '✓ 출근 완료' : '🏢 출근 체크')}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleCheckOut}
              disabled={loading || !todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut || !isLocationFresh()}
              style={{ 
                width: '100%', 
                padding: '18px', 
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: (!todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut) ? 'none' : '0 4px 6px rgba(239, 68, 68, 0.3)'
              }}
            >
              {loading ? '처리 중...' : (todayStatus?.hasCheckedOut ? '✓ 퇴근 완료' : '🏠 퇴근 체크')}
            </button>
          </div>

          {todayStatus?.record?.work_hours && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>오늘 근무시간</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {(Number(todayStatus.record.work_hours) || 0).toFixed(1)}시간
              </div>
            </div>
          )}
        </div>

        {/* QR 스캐너 모달 */}
        {qrScannerOpen && (
          <div className="modal-overlay" onClick={() => setQrScannerOpen(false)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '420px' }}
            >
              <div className="modal-header" style={{ background: '#2563eb', color: 'white' }}>
                📷 QR 출퇴근 스캔
              </div>
              <div style={{ padding: '20px' }}>
                <div id="qr-reader" style={{ width: '100%' }} />
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                  카메라를 QR 코드에 맞추면 자동으로 출퇴근이 기록됩니다.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setQrScannerOpen(false)}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이번 달 급여 정보 */}
        {salaryInfo && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#374151' }}>💰 이번 달 급여</h3>
            <div className="grid grid-3">
              <div className="stat-card">
                <div className="stat-label">급여 유형</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {getSalaryTypeName(salaryInfo.salaryInfo.type)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">근무일수</div>
                <div className="stat-value">{salaryInfo.workData.totalWorkDays}일</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">총 근무시간</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {salaryInfo.workData.totalWorkHours}h
                </div>
              </div>
            </div>
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', opacity: '0.9' }}>예상 급여 (세전)</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {salaryInfo.calculatedSalary.toLocaleString()}원
              </div>
            </div>
            {paydayInfo && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  다음 급여일: {formatDate(paydayInfo.date)}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#2563eb' }}>
                  D-{Math.max(paydayInfo.diffDays, 0)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 급여명세서 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#374151', margin: 0 }}>📄 급여명세서</h3>
            <input
              type="month"
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          {salarySlipsLoading ? (
            <p style={{ color: '#6b7280' }}>불러오는 중...</p>
          ) : salarySlips.length === 0 ? (
            <p style={{ color: '#6b7280' }}>선택한 월의 급여명세서가 없습니다.</p>
          ) : (
            <>
              {salarySlips.map((slip) => (
                <div key={slip.id}>
                  <div id={`payslip-${slip.id}`} style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>귀속월</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>{slip.payroll_month || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>지급일</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>{formatDate(slip.pay_date)}</span>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#374151' }}>인건비 구분</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1' }}>{slip.tax_type || '4대보험'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#374151' }}>기본급 (세전)</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{formatCurrency(slip.base_pay)}</span>
                    </div>

                    {slip.tax_type === '3.3%' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#ef4444' }}>원천징수 (3.3%)</span>
                        <span style={{ fontSize: '14px', color: '#ef4444' }}>-{formatCurrency(slip.total_deductions)}</span>
                      </div>
                    ) : (
                      <>
                        {slip.national_pension > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>- 국민연금</span>
                            <span style={{ color: '#6b7280' }}>{formatCurrency(slip.national_pension)}</span>
                          </div>
                        )}
                        {slip.health_insurance > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>- 건강보험</span>
                            <span style={{ color: '#6b7280' }}>{formatCurrency(slip.health_insurance)}</span>
                          </div>
                        )}
                        {slip.long_term_care > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>- 장기요양보험</span>
                            <span style={{ color: '#6b7280' }}>{formatCurrency(slip.long_term_care)}</span>
                          </div>
                        )}
                        {slip.employment_insurance > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>- 고용보험</span>
                            <span style={{ color: '#6b7280' }}>{formatCurrency(slip.employment_insurance)}</span>
                          </div>
                        )}
                        {slip.income_tax > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>- 소득세</span>
                            <span style={{ color: '#6b7280' }}>{formatCurrency(slip.income_tax)}</span>
                          </div>
                        )}
                        {slip.local_income_tax > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>- 지방소득세</span>
                            <span style={{ color: '#6b7280' }}>{formatCurrency(slip.local_income_tax)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                          <span style={{ fontSize: '14px', color: '#ef4444' }}>총 공제액</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>-{formatCurrency(slip.total_deductions)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: '#667eea',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>실수령액</span>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{formatCurrency(slip.net_pay)}</span>
                  </div>
                  </div>
                  <button
                    className="btn"
                    style={{ 
                      width: '100%', 
                      marginTop: '12px',
                      background: '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => downloadPayslip(slip.id, slip.payroll_month)}
                  >
                    <span>💾</span>
                    <span>급여명세서 다운로드</span>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* 출퇴근 기록 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#374151', margin: 0 }}>📅 출퇴근 기록</h3>
            <input
              type="month"
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#6b7280' }}>
              <span>✅ 완료</span>
              <span>⏱ 미완료</span>
              <span style={{ color: '#2563eb' }}>연차</span>
              <span style={{ color: '#0ea5e9' }}>유급휴가</span>
              <span style={{ color: '#8b5cf6' }}>무급휴가</span>
              <span style={{ color: '#dc2626' }}>공휴일</span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '8px',
            marginBottom: '24px'
          }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
              <div
                key={label}
                style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}
              >
                {label}
              </div>
            ))}
            {buildCalendarDays().map((day) => {
              if (day.empty) {
                return <div key={day.key} style={{ height: '84px' }} />;
              }
              const record = day.record;
              const holiday = day.holiday;
              const leaveType = record?.leave_type || '';
              const isCompleted = record?.status === 'completed';
              const statusLabel = leaveType
                ? (leaveType === 'annual' ? '연차' : leaveType === 'paid' ? '유급휴가' : '무급휴가')
                : (record ? (isCompleted ? '완료' : '미완료') : (day.isScheduled ? '' : '휴무'));

              const statusColor = leaveType === 'annual'
                ? '#2563eb'
                : leaveType === 'paid'
                  ? '#0ea5e9'
                  : leaveType === 'unpaid'
                    ? '#8b5cf6'
                    : isCompleted
                      ? '#16a34a'
                      : record
                        ? '#f97316'
                        : '#6b7280';

              return (
                <div
                  key={day.key}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    minHeight: '84px',
                    background: holiday ? '#fef2f2' : 'white'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '600', color: holiday ? '#dc2626' : '#374151' }}>
                    {day.day}
                  </div>
                  {holiday && (
                    <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                      {holiday}
                    </div>
                  )}
                  {statusLabel && (
                    <div style={{ fontSize: '11px', color: statusColor, marginTop: '6px', fontWeight: '600' }}>
                      {statusLabel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {attendanceRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
              <p style={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
                출퇴근 기록이 없습니다
              </p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                출퇴근 체크를 하면 여기에 기록이 남습니다
              </p>
            </div>
          ) : (
            <>
              {/* 월간 통계 */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>출근일수</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                    {attendanceRecords.length}일
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>완료</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                    {attendanceRecords.filter(r => r.status === 'completed').length}일
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>총 근무시간</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                    {Number(attendanceRecords.reduce((sum, r) => sum + (Number(r.work_hours) || 0), 0)).toFixed(1)}h
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>공휴일</th>
                      <th>출근</th>
                      <th>퇴근</th>
                      <th>근무시간</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record) => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: '600' }}>{formatDate(record.date)}</td>
                        <td style={{ color: getHolidayName(record.date) ? '#dc2626' : '#6b7280' }}>
                          {getHolidayName(record.date) || '-'}
                        </td>
                        <td>{formatTime(record.check_in_time)}</td>
                        <td>{formatTime(record.check_out_time)}</td>
                        <td style={{ fontWeight: '600', color: '#667eea' }}>
                          {record.work_hours ? `${Number(record.work_hours).toFixed(1)}h` : '-'}
                        </td>
                        <td>
                          {record.leave_type ? (
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: record.leave_type === 'annual'
                                ? '#dbeafe'
                                : record.leave_type === 'paid'
                                  ? '#e0f2fe'
                                  : '#ede9fe',
                              color: record.leave_type === 'annual'
                                ? '#1d4ed8'
                                : record.leave_type === 'paid'
                                  ? '#0284c7'
                                  : '#6d28d9'
                            }}>
                              {record.leave_type === 'annual' && '연차'}
                              {record.leave_type === 'paid' && '유급휴가'}
                              {record.leave_type === 'unpaid' && '무급휴가'}
                            </span>
                          ) : (
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: record.status === 'completed' ? '#d1fae5' : '#fee2e2',
                              color: record.status === 'completed' ? '#065f46' : '#991b1b'
                            }}>
                              {record.status === 'completed' ? '✓ 완료' : '⏱ 미완료'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* 재직증명서 모달 */}
        {showCertificateModal && certificateData && (
          <div className="modal-overlay" onClick={() => setShowCertificateModal(false)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '800px',
                padding: '40px',
                backgroundColor: 'white'
              }}
              id="certificate-content"
            >
              {/* 인쇄 시 숨길 버튼 */}
              <div style={{ marginBottom: '30px', textAlign: 'right' }} className="no-print">
                <button
                  className="btn btn-primary"
                  onClick={handlePrintCertificate}
                  style={{ marginRight: '10px' }}
                >
                  🖨️ 인쇄
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCertificateModal(false)}
                >
                  닫기
                </button>
              </div>

              {/* 재직증명서 내용 */}
              <div style={{
                border: '3px double #333',
                padding: '50px',
                fontFamily: '"Noto Sans KR", sans-serif'
              }}>
                <h1 style={{
                  textAlign: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                  marginBottom: '50px',
                  color: '#000'
                }}>
                  재 직 증 명 서
                </h1>

                <div style={{ lineHeight: '2.5', fontSize: '16px', color: '#000' }}>
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>성명</div>
                      <div style={{ flex: 1 }}>{certificateData.employeeName}</div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>주민등록번호</div>
                      <div style={{ flex: 1 }}>{certificateData.ssn || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>주소</div>
                      <div style={{ flex: 1 }}>{certificateData.address || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>입사일</div>
                      <div style={{ flex: 1 }}>{certificateData.hireDate}</div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>부서</div>
                      <div style={{ flex: 1 }}>{certificateData.department}</div>
                    </div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '12px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>직책</div>
                      <div style={{ flex: 1 }}>{certificateData.position}</div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '40px',
                    marginBottom: '40px',
                    textAlign: 'center',
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    위 사람은 본 사업장에 현재 재직 중임을 증명합니다.
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '60px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
                      발급일자: {certificateData.issueDate}
                    </div>
                  </div>

                  <div style={{
                    marginTop: '50px',
                    paddingTop: '30px',
                    borderTop: '2px solid #333'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
                      사업장 정보
                    </div>
                    <div style={{ display: 'flex', padding: '8px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>사업장명</div>
                      <div style={{ flex: 1 }}>{certificateData.workplaceName}</div>
                    </div>
                    <div style={{ display: 'flex', padding: '8px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>사업장 주소</div>
                      <div style={{ flex: 1 }}>{certificateData.workplaceAddress}</div>
                    </div>
                    <div style={{ display: 'flex', padding: '8px 0' }}>
                      <div style={{ width: '150px', fontWeight: '600' }}>사업자등록번호</div>
                      <div style={{ flex: 1 }}>{certificateData.businessNumber || '-'}</div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '60px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {certificateData.workplaceName}
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        border: '3px solid #b91c1c',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#b91c1c',
                        fontWeight: '700',
                        lineHeight: '1.2'
                      }}>
                        <div style={{ fontSize: '12px', letterSpacing: '1px' }}>대표자</div>
                        <div style={{ fontSize: '18px', margin: '6px 0' }}>
                          {certificateData.ownerName || '대표자명'}
                        </div>
                        <div style={{ fontSize: '14px' }}>(인)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 개인정보 동의 모달 */}
        {showConsentModal && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header" style={{ background: '#667eea', color: 'white' }}>
                🔒 개인정보 수집·이용 동의 (필수)
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '24px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '2px solid #fbbf24' }}>
                  <p style={{ fontSize: '14px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
                    <strong>⚠️ 안내</strong><br/>
                    서비스를 이용하시려면 아래 개인정보 및 위치정보 수집·이용에 대한 동의가 필요합니다.<br/>
                    동의하지 않으시면 시스템을 이용하실 수 없습니다.
                  </p>
                </div>

                {/* 개인정보 동의서 */}
                <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.8', border: '2px solid #e5e7eb' }}>
                  <h5 style={{ color: '#374151', marginBottom: '16px', fontSize: '16px', fontWeight: '700', borderBottom: '2px solid #d1d5db', paddingBottom: '8px' }}>
                    📋 개인정보 수집·이용 동의서
                  </h5>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 수집하는 개인정보 항목</strong><br/>
                    이름, 주민등록번호, 연락처(전화번호), 이메일, 주소, 비상연락처
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 수집·이용 목적</strong><br/>
                    • 인사관리 및 근로계약 관리<br/>
                    • 급여계산 및 4대보험 가입·관리<br/>
                    • 근태관리 및 출퇴근 기록 관리<br/>
                    • 긴급 상황 시 연락
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 보유 및 이용 기간</strong><br/>
                    근로관계 종료 후 5년 (근로기준법 제42조)
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 동의를 거부할 권리 및 불이익</strong><br/>
                    귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.<br/>
                    다만, 동의를 거부하실 경우 근로계약 체결 및 시스템 이용이 불가능합니다.
                  </div>
                </div>

                {/* 위치정보 동의서 */}
                <div style={{ padding: '20px', background: '#eff6ff', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.8', border: '3px solid #3b82f6' }}>
                  <h5 style={{ color: '#1e40af', marginBottom: '16px', fontSize: '16px', fontWeight: '700', borderBottom: '2px solid #93c5fd', paddingBottom: '8px' }}>
                    📍 위치정보 수집·이용 동의서
                  </h5>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 수집하는 위치정보</strong><br/>
                    GPS 좌표 (위도, 경도)
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 수집·이용 목적</strong><br/>
                    <span style={{ color: '#dc2626', fontWeight: '600' }}>출퇴근 체크 시 근무지 확인 용도 전용</span>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>■ 보유 및 이용 기간</strong><br/>
                    출퇴근 기록과 함께 5년
                  </div>
                  <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '6px', marginTop: '16px', border: '2px solid #fbbf24' }}>
                    <strong style={{ color: '#92400e', fontSize: '14px' }}>⚠️ 중요 안내사항</strong>
                    <div style={{ color: '#78350f', marginTop: '12px', lineHeight: '1.8' }}>
                      1. 위치정보는 <strong style={{ background: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>출퇴근 확인 목적으로만</strong> 사용됩니다.<br/>
                      2. 근무 시간 외 위치 추적은 <strong style={{ background: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>절대 하지 않습니다</strong>.<br/>
                      3. 수집된 위치정보는 <strong style={{ background: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>목적 외 사용이 엄격히 금지</strong>됩니다.<br/>
                      4. 본인의 동의 없이 제3자에게 제공되지 않습니다.
                    </div>
                  </div>
                </div>

                {/* 동의 체크박스 */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '2px solid #86efac' }}>
                    <input
                      type="checkbox"
                      checked={consentData.privacy_consent}
                      onChange={(e) => setConsentData({ ...consentData, privacy_consent: e.target.checked })}
                      style={{ marginTop: '4px', marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', lineHeight: '1.6', color: '#065f46' }}>
                      <strong>[필수]</strong> 위 개인정보 수집·이용에 대한 내용을 충분히 읽었으며, 이에 동의합니다.
                    </span>
                  </label>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '2px solid #93c5fd' }}>
                    <input
                      type="checkbox"
                      checked={consentData.location_consent}
                      onChange={(e) => setConsentData({ ...consentData, location_consent: e.target.checked })}
                      style={{ marginTop: '4px', marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', lineHeight: '1.6', color: '#1e40af' }}>
                      <strong>[필수]</strong> 위 위치정보 수집·이용에 대한 내용을 충분히 읽었으며, 출퇴근 확인 목적에 한하여 위치정보 수집·이용에 동의합니다.
                    </span>
                  </label>
                </div>

                {message.text && (
                  <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
                    {message.text}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConsent}
                    disabled={loading || !consentData.privacy_consent || !consentData.location_consent}
                    style={{
                      padding: '14px 40px',
                      fontSize: '16px',
                      fontWeight: '600',
                      opacity: (!consentData.privacy_consent || !consentData.location_consent) ? 0.5 : 1
                    }}
                  >
                    {loading ? '처리 중...' : '동의하고 시작하기'}
                  </button>
                </div>

                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
                  * 동의일: {new Date().toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 공지사항 모달 */}
      {showAnnouncementModal && currentAnnouncement && (
        <AnnouncementModal
          announcement={currentAnnouncement}
          onClose={handleCloseAnnouncement}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
