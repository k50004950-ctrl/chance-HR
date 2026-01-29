import { useState, useCallback } from 'react';
import { salaryAPI } from '../services/api';

/**
 * 급여 계산 공용 Hook
 * - 4대보험 계산
 * - 3.3% 원천징수 계산
 * - 실수령액 계산
 */
export const useSalaryCalculation = () => {
  const [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState(null);

  /**
   * 4대보험 계산
   */
  const calculateInsurance = useCallback(async (params) => {
    try {
      setCalculating(true);
      setCalculationError(null);

      const response = await salaryAPI.calculateInsurance({
        basePay: params.basePay,
        month: params.month,
        dependentsCount: params.dependentsCount || 1
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('4대보험 계산 오류:', error);
      setCalculationError(error.response?.data?.message || '계산 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setCalculating(false);
    }
  }, []);

  /**
   * 3.3% 원천징수 계산
   */
  const calculateFreelancer = useCallback((basePay) => {
    const baseSalary = parseFloat(basePay) || 0;
    const withholdingRate = 0.033; // 3.3%
    
    const incomeTax = Math.floor(baseSalary * 0.03);
    const localTax = Math.floor(incomeTax * 0.1);
    const totalWithholding = incomeTax + localTax;
    const netPay = baseSalary - totalWithholding;

    return {
      basePay: baseSalary,
      incomeTax,
      localTax,
      totalDeductions: totalWithholding,
      netPay,
      taxType: '3.3%'
    };
  }, []);

  /**
   * 실수령액 계산 (공제 항목 기반)
   */
  const calculateNetPay = useCallback((basePay, deductions) => {
    const base = parseFloat(basePay) || 0;
    const totalDeductions = Object.values(deductions || {})
      .reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    
    return base - totalDeductions;
  }, []);

  /**
   * 사업주 부담금 계산
   */
  const calculateEmployerBurden = useCallback((employeeDeductions) => {
    // 사업주는 근로자와 동일한 금액 부담 (국민연금, 건강보험, 고용보험, 장기요양)
    return {
      nationalPension: parseFloat(employeeDeductions.nps) || 0,
      healthInsurance: parseFloat(employeeDeductions.nhis) || 0,
      employmentInsurance: parseFloat(employeeDeductions.ei) || 0,
      longTermCare: parseFloat(employeeDeductions.ltci) || 0,
      get total() {
        return this.nationalPension + this.healthInsurance + 
               this.employmentInsurance + this.longTermCare;
      }
    };
  }, []);

  /**
   * 월별 총 인건비 계산
   */
  const calculateTotalLabor = useCallback((employees) => {
    return employees.reduce((total, emp) => {
      const basePay = parseFloat(emp.basePay) || 0;
      const employerBurden = parseFloat(emp.totalEmployerBurden) || 0;
      return total + basePay + employerBurden;
    }, 0);
  }, []);

  return {
    // State
    calculating,
    calculationError,

    // Methods
    calculateInsurance,
    calculateFreelancer,
    calculateNetPay,
    calculateEmployerBurden,
    calculateTotalLabor
  };
};

export default useSalaryCalculation;
