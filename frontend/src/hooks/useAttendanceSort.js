import { useMemo } from 'react';
import { getAttendanceStatus } from '../utils/attendanceStatus';

/**
 * 출근 기록 정렬 Hook
 * 
 * @param {Array} attendanceRecords - 출근 기록 목록
 * @param {Array} employees - 직원 목록 (지각 판단용, optional)
 * @param {boolean} prioritizeProblems - 문제 상황 우선 정렬 여부 (default: true)
 * @returns {Array} 정렬된 출근 기록 목록
 */
export const useAttendanceSort = (attendanceRecords, employees = [], prioritizeProblems = true) => {
  return useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [];
    }

    // 문제 우선 정렬이 비활성화되면 최신순만 정렬
    if (!prioritizeProblems) {
      return [...attendanceRecords].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA; // 최신순
      });
    }

    // 문제 우선 정렬
    return [...attendanceRecords].sort((a, b) => {
      const aStatus = getAttendanceStatus(a, employees);
      const bStatus = getAttendanceStatus(b, employees);

      // 1순위: 상태 우선순위 (priority 낮을수록 우선)
      // incomplete/not_checked_out(1) > late(2) > completed(3) > leave(4)
      if (aStatus.priority !== bStatus.priority) {
        return aStatus.priority - bStatus.priority;
      }

      // 2순위: 같은 우선순위는 최신순
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });
  }, [attendanceRecords, employees, prioritizeProblems]);
};

export default useAttendanceSort;
