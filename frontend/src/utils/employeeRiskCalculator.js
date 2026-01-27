/**
 * 직원 리스크 계산 유틸리티
 * 
 * 직원의 리스크 요소를 판별하여 배열로 반환합니다.
 * - 서류 미제출: 근로계약서 파일이 없음
 * - 급여 미설정: 기본급이 0원이거나 없음
 * - 퇴사 처리 필요: 퇴사 상태인데 퇴사일이 없음
 */

/**
 * 직원의 리스크 정보를 계산
 * 
 * @param {Object} employee - 직원 객체
 * @param {string|null} employee.contract_file_url - 근로계약서 파일 URL
 * @param {number} employee.base_pay - 기본급
 * @param {string} employee.employment_status - 고용 상태 ('active', 'on_leave', 'resigned')
 * @param {string|null} employee.resignation_date - 퇴사일
 * @returns {Array} 리스크 정보 배열 [{ type, label, color, priority }]
 */
export const getEmployeeRisks = (employee) => {
  if (!employee) return [];

  const risks = [];

  // 1. 서류 필요 (근로계약서 미제출)
  if (!employee.contract_file_url) {
    risks.push({
      type: 'no_contract',
      label: '서류 필요',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      priority: 2
    });
  }

  // 2. 급여 미설정 (기본급 0원 또는 없음)
  if (!employee.base_pay || employee.base_pay === 0) {
    risks.push({
      type: 'no_salary',
      label: '급여 미설정',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 1 // 가장 높은 우선순위
    });
  }

  // 3. 퇴사 처리 필요 (퇴사 상태인데 퇴사일 없음)
  if (employee.employment_status === 'resigned' && !employee.resignation_date) {
    risks.push({
      type: 'resignation_pending',
      label: '퇴사 처리 필요',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 1
    });
  }

  // 우선순위 순으로 정렬 (priority 낮은 값이 높은 우선순위)
  risks.sort((a, b) => a.priority - b.priority);

  return risks;
};

/**
 * 직원 목록에 대한 리스크 맵 생성
 * 
 * @param {Array} employees - 직원 목록
 * @returns {Map} key: employeeId, value: risks[]
 */
export const createEmployeeRiskMap = (employees) => {
  const riskMap = new Map();

  if (!employees || !Array.isArray(employees)) {
    return riskMap;
  }

  employees.forEach(employee => {
    if (employee && employee.id) {
      const risks = getEmployeeRisks(employee);
      riskMap.set(employee.id, risks);
    }
  });

  return riskMap;
};

/**
 * 리스크가 있는 직원 수 계산
 * 
 * @param {Map} riskMap - 리스크 맵
 * @returns {number} 리스크가 있는 직원 수
 */
export const countEmployeesWithRisks = (riskMap) => {
  if (!riskMap || !(riskMap instanceof Map)) {
    return 0;
  }

  let count = 0;
  riskMap.forEach((risks) => {
    if (risks && risks.length > 0) {
      count++;
    }
  });

  return count;
};

export default {
  getEmployeeRisks,
  createEmployeeRiskMap,
  countEmployeesWithRisks
};
