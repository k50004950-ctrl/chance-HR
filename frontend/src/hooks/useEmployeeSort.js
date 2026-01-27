import { useMemo } from 'react';

/**
 * 직원 목록 정렬 Hook
 * 
 * @param {Array} employees - 직원 목록
 * @param {Map} riskMap - 직원 ID를 키로 하는 리스크 정보 맵 (optional)
 * @param {boolean} prioritizeRisks - 리스크 우선 정렬 여부 (default: true)
 * @returns {Array} 정렬된 직원 목록
 */
export const useEmployeeSort = (employees, riskMap = null, prioritizeRisks = true) => {
  return useMemo(() => {
    if (!employees || employees.length === 0) {
      return [];
    }

    // 리스크 우선 정렬이 비활성화되거나 riskMap이 없으면 이름순만 정렬
    if (!prioritizeRisks || !riskMap) {
      return [...employees].sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    // 리스크 우선 정렬
    return [...employees].sort((a, b) => {
      const aRisks = riskMap.get(a.id)?.length || 0;
      const bRisks = riskMap.get(b.id)?.length || 0;

      // 1순위: 리스크 개수 (많은 순)
      if (aRisks !== bRisks) {
        return bRisks - aRisks;
      }

      // 2순위: 이름 (가나다순)
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [employees, riskMap, prioritizeRisks]);
};

export default useEmployeeSort;
