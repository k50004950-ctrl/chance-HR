import { useState, useCallback } from 'react';
import { attendanceAPI } from '../services/api';
import { getAttendanceStatus } from '../utils/attendanceStatus';

/**
 * 출퇴근 관리 공용 Hook
 * - 출퇴근 기록 조회
 * - 출근/퇴근 처리
 * - 출퇴근 통계 계산
 */
export const useAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  /**
   * 출퇴근 기록 조회
   */
  const fetchAttendance = useCallback(async (workplaceId, params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.getByWorkplace(workplaceId, params);
      setAttendanceRecords(response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('출퇴근 기록 조회 오류:', err);
      setError(err.response?.data?.message || '조회 중 오류가 발생했습니다.');
      return {
        success: false,
        error: err.response?.data?.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 출근 처리
   */
  const checkIn = useCallback(async (employeeId, location) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.checkIn({
        employeeId,
        location
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('출근 처리 오류:', err);
      setError(err.response?.data?.message || '출근 처리 중 오류가 발생했습니다.');
      return {
        success: false,
        error: err.response?.data?.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 퇴근 처리
   */
  const checkOut = useCallback(async (employeeId, location) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.checkOut({
        employeeId,
        location
      });

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('퇴근 처리 오류:', err);
      setError(err.response?.data?.message || '퇴근 처리 중 오류가 발생했습니다.');
      return {
        success: false,
        error: err.response?.data?.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 수동 출퇴근 기록 생성
   */
  const createManualRecord = useCallback(async (recordData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.create(recordData);

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('출퇴근 기록 생성 오류:', err);
      setError(err.response?.data?.message || '생성 중 오류가 발생했습니다.');
      return {
        success: false,
        error: err.response?.data?.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 출퇴근 기록 수정
   */
  const updateRecord = useCallback(async (recordId, updates) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.update(recordId, updates);

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('출퇴근 기록 수정 오류:', err);
      setError(err.response?.data?.message || '수정 중 오류가 발생했습니다.');
      return {
        success: false,
        error: err.response?.data?.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 출퇴근 기록 삭제
   */
  const deleteRecord = useCallback(async (recordId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.delete(recordId);

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('출퇴근 기록 삭제 오류:', err);
      setError(err.response?.data?.message || '삭제 중 오류가 발생했습니다.');
      return {
        success: false,
        error: err.response?.data?.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 오늘 출퇴근 현황 계산
   */
  const calculateTodayStats = useCallback((records, employees) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => r.date === today);
    const activeEmployees = employees.filter(emp => emp.employment_status === 'active');

    const checkedIn = todayRecords.filter(r => r.check_in_time).length;
    const checkedOut = todayRecords.filter(r => r.check_out_time).length;
    const late = todayRecords.filter(r => {
      const status = getAttendanceStatus(r);
      return status.includes('지각');
    }).length;
    const absent = activeEmployees.length - checkedIn;

    return {
      total: activeEmployees.length,
      checkedIn,
      checkedOut,
      late,
      absent,
      notCheckedOut: checkedIn - checkedOut
    };
  }, []);

  /**
   * 월별 출퇴근 통계 계산
   */
  const calculateMonthlyStats = useCallback((records, employee) => {
    const employeeRecords = records.filter(r => r.user_id === employee.id);
    
    const totalDays = employeeRecords.length;
    const normalDays = employeeRecords.filter(r => {
      const status = getAttendanceStatus(r);
      return status === '정상';
    }).length;
    const lateDays = employeeRecords.filter(r => {
      const status = getAttendanceStatus(r);
      return status.includes('지각');
    }).length;
    const absentDays = employeeRecords.filter(r => !r.check_in_time).length;

    return {
      totalDays,
      normalDays,
      lateDays,
      absentDays,
      attendanceRate: totalDays > 0 ? (normalDays / totalDays * 100).toFixed(1) : 0
    };
  }, []);

  /**
   * 근무 시간 계산 (시간 단위)
   */
  const calculateWorkHours = useCallback((checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return 0;

    const checkIn = new Date(`1970-01-01T${checkInTime}`);
    const checkOut = new Date(`1970-01-01T${checkOutTime}`);
    
    const diffMs = checkOut - checkIn;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours);
  }, []);

  return {
    // State
    loading,
    error,
    attendanceRecords,

    // Methods
    fetchAttendance,
    checkIn,
    checkOut,
    createManualRecord,
    updateRecord,
    deleteRecord,
    calculateTodayStats,
    calculateMonthlyStats,
    calculateWorkHours
  };
};

export default useAttendance;
