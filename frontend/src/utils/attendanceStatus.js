/**
 * 출근 상태 판별 유틸리티
 * 
 * 출근 기록의 상태를 판별하고 표시 정보를 반환합니다.
 */

/**
 * 출근 상태를 판별
 * 
 * @param {Object} record - 출근 기록
 * @param {Array} employees - 직원 목록 (지각 판단용, optional)
 * @returns {Object} { type, label, color, bgColor, priority }
 */
export const getAttendanceStatus = (record, employees = []) => {
  if (!record) {
    return { 
      type: 'unknown', 
      label: '알 수 없음', 
      color: '#6b7280', 
      bgColor: '#f3f4f6',
      priority: 99 
    };
  }

  // 1. 휴가인 경우
  if (record.leave_type) {
    let leaveLabel = '휴가';
    if (record.leave_type === 'annual') leaveLabel = '연차';
    else if (record.leave_type === 'paid') leaveLabel = '유급휴가';
    else if (record.leave_type === 'unpaid') leaveLabel = '무급휴가';

    return { 
      type: 'leave', 
      label: leaveLabel, 
      color: '#3b82f6', 
      bgColor: '#dbeafe',
      priority: 4 
    };
  }

  // 2. 미퇴근 (출근은 했는데 퇴근 안 함)
  if (record.check_in_time && !record.check_out_time) {
    return { 
      type: 'not_checked_out', 
      label: '⚠️ 미퇴근', 
      color: '#dc2626', 
      bgColor: '#fee2e2',
      priority: 1 // 최우선
    };
  }

  // 3. 미완료 (출근도 안 했거나 퇴근도 안 함)
  if (!record.check_in_time || !record.check_out_time) {
    return { 
      type: 'incomplete', 
      label: '⏱ 미완료', 
      color: '#ef4444', 
      bgColor: '#fee2e2',
      priority: 1 // 최우선
    };
  }

  // 4. 지각 판단 (직원 정보가 있을 경우)
  if (employees && employees.length > 0 && record.check_in_time) {
    const employee = employees.find(emp => emp.name === record.employee_name);
    
    if (employee && employee.work_start_time) {
      try {
        const checkInTime = new Date(record.check_in_time);
        const [startHour, startMinute] = employee.work_start_time.split(':').map(Number);
        const workStartTime = new Date(checkInTime);
        workStartTime.setHours(startHour, startMinute, 0, 0);

        // 10분 이상 늦었으면 지각
        const lateMins = (checkInTime - workStartTime) / 1000 / 60;
        if (lateMins > 10) {
          return { 
            type: 'late', 
            label: '🕐 지각', 
            color: '#f59e0b', 
            bgColor: '#fef3c7',
            priority: 2 
          };
        }
      } catch (error) {
        console.error('지각 판단 오류:', error);
      }
    }
  }

  // 5. 정상
  return { 
    type: 'completed', 
    label: '✓ 정상', 
    color: '#059669', 
    bgColor: '#d1fae5',
    priority: 3 
  };
};

/**
 * 오늘 날짜의 출근 기록만 필터링
 * 
 * @param {Array} attendanceRecords - 출근 기록 목록
 * @param {Date} today - 기준 날짜 (optional, 기본값: 오늘)
 * @returns {Array} 오늘 날짜의 출근 기록
 */
export const filterTodayAttendance = (attendanceRecords, today = new Date()) => {
  if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
    return [];
  }

  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  return attendanceRecords.filter(record => {
    if (!record.date) return false;
    const recordDateStr = new Date(record.date).toISOString().split('T')[0];
    return recordDateStr === todayStr;
  });
};

/**
 * 상태별 출근 기록 분류
 * 
 * @param {Array} attendanceRecords - 출근 기록 목록
 * @param {Array} employees - 직원 목록
 * @returns {Object} { completed, late, incomplete, notCheckedOut, leave }
 */
export const categorizeAttendanceByStatus = (attendanceRecords, employees = []) => {
  const categories = {
    completed: [],
    late: [],
    incomplete: [],
    notCheckedOut: [],
    leave: []
  };

  if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
    return categories;
  }

  attendanceRecords.forEach(record => {
    const status = getAttendanceStatus(record, employees);
    
    if (status.type === 'completed') {
      categories.completed.push(record);
    } else if (status.type === 'late') {
      categories.late.push(record);
    } else if (status.type === 'incomplete') {
      categories.incomplete.push(record);
    } else if (status.type === 'not_checked_out') {
      categories.notCheckedOut.push(record);
    } else if (status.type === 'leave') {
      categories.leave.push(record);
    }
  });

  return categories;
};

export default {
  getAttendanceStatus,
  filterTodayAttendance,
  categorizeAttendanceByStatus
};
