import { useState, useCallback, useEffect } from 'react';
import { insuranceAPI } from '../services/api';

/**
 * 요율 관리 공용 Hook
 * - 4대보험 요율 조회
 * - 요율 적용
 * - 요율 변경 이력 관리
 */
export const useRatesManager = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentRates, setCurrentRates] = useState(null);
  const [ratesHistory, setRatesHistory] = useState([]);

  /**
   * 현재 적용 중인 요율 조회
   */
  const fetchCurrentRates = useCallback(async (month) => {
    try {
      setLoading(true);
      setError(null);

      const response = await insuranceAPI.getRates(month || 
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      );

      setCurrentRates(response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('요율 조회 오류:', err);
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
   * 요율 변경 이력 조회
   */
  const fetchRatesHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await insuranceAPI.getRatesHistory();
      setRatesHistory(response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('요율 이력 조회 오류:', err);
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
   * 특정 월에 적용할 요율 찾기
   */
  const getApplicableRates = useCallback((targetMonth) => {
    if (!targetMonth) {
      return currentRates;
    }

    // targetMonth: "2026-01" 형식
    // 해당 월 이전의 가장 최근 요율을 찾음
    const applicableRate = ratesHistory
      .filter(rate => rate.effective_yyyymm <= targetMonth)
      .sort((a, b) => b.effective_yyyymm.localeCompare(a.effective_yyyymm))[0];

    return applicableRate || currentRates;
  }, [currentRates, ratesHistory]);

  /**
   * 요율 정보를 읽기 쉬운 형식으로 변환
   */
  const formatRates = useCallback((rates) => {
    if (!rates) return null;

    return {
      effectiveMonth: rates.effective_yyyymm,
      nationalPension: {
        employee: parseFloat(rates.nps_employee_rate_percent),
        employer: parseFloat(rates.nps_employer_rate_percent || rates.nps_employee_rate_percent),
        display: `${rates.nps_employee_rate_percent}%`
      },
      healthInsurance: {
        employee: parseFloat(rates.nhis_employee_rate_percent),
        employer: parseFloat(rates.nhis_employer_rate_percent || rates.nhis_employee_rate_percent),
        display: `${rates.nhis_employee_rate_percent}%`
      },
      employmentInsurance: {
        employee: parseFloat(rates.ei_employee_rate_percent),
        employer: parseFloat(rates.ei_employer_rate_percent || rates.ei_employee_rate_percent),
        display: `${rates.ei_employee_rate_percent}%`
      },
      longTermCare: {
        rate: parseFloat(rates.ltci_rate_of_nhis_percent),
        display: `건강보험의 ${rates.ltci_rate_of_nhis_percent}%`
      },
      freelancer: {
        rate: parseFloat(rates.freelancer_withholding_rate_percent),
        display: `${rates.freelancer_withholding_rate_percent}%`
      }
    };
  }, []);

  /**
   * 요율 적용 여부 확인
   */
  const validateRates = useCallback((rates) => {
    if (!rates) {
      return {
        valid: false,
        message: '요율 정보가 없습니다.'
      };
    }

    const requiredFields = [
      'nps_employee_rate_percent',
      'nhis_employee_rate_percent',
      'ei_employee_rate_percent',
      'ltci_rate_of_nhis_percent'
    ];

    const missingFields = requiredFields.filter(field => !rates[field]);

    if (missingFields.length > 0) {
      return {
        valid: false,
        message: `필수 요율 정보가 없습니다: ${missingFields.join(', ')}`
      };
    }

    return {
      valid: true,
      message: '요율 정보가 유효합니다.'
    };
  }, []);

  /**
   * 컴포넌트 마운트 시 현재 요율 자동 로드
   */
  useEffect(() => {
    fetchCurrentRates();
  }, [fetchCurrentRates]);

  return {
    // State
    loading,
    error,
    currentRates,
    ratesHistory,

    // Methods
    fetchCurrentRates,
    fetchRatesHistory,
    getApplicableRates,
    formatRates,
    validateRates
  };
};

export default useRatesManager;
