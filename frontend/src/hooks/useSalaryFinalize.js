import { useState, useCallback } from 'react';
import { salaryAPI } from '../services/api';

/**
 * 급여 확정 공용 Hook
 * - 급여 확정 처리
 * - 급여명세서 생성
 * - 급여 배포
 */
export const useSalaryFinalize = () => {
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);

  /**
   * 급여 확정
   */
  const finalizeSalary = useCallback(async (workplaceId, payrollMonth, employees) => {
    try {
      setFinalizing(true);
      setFinalizeError(null);

      const response = await salaryAPI.finalize({
        workplaceId,
        payrollMonth,
        employees: employees.map(emp => ({
          employeeId: emp.id || emp.employeeId,
          basePay: emp.basePay,
          totalDeductions: emp.totalDeductions,
          deductions: emp.deductions,
          taxType: emp.taxType
        }))
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('급여 확정 오류:', error);
      setFinalizeError(error.response?.data?.message || '확정 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setFinalizing(false);
    }
  }, []);

  /**
   * 급여명세서 생성 (단일)
   */
  const createPayslip = useCallback(async (workplaceId, slipData) => {
    try {
      setFinalizing(true);
      setFinalizeError(null);

      const response = await salaryAPI.createSlip(workplaceId, slipData);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('급여명세서 생성 오류:', error);
      setFinalizeError(error.response?.data?.message || '생성 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setFinalizing(false);
    }
  }, []);

  /**
   * 월별 자동 생성 (전체 직원)
   */
  const createMonthlySlips = useCallback(async (workplaceId, month, selectedEmployeeIds) => {
    try {
      setFinalizing(true);
      setFinalizeError(null);

      const response = await salaryAPI.createMonthlySlips({
        workplaceId,
        month,
        employeeIds: selectedEmployeeIds
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('월별 자동 생성 오류:', error);
      setFinalizeError(error.response?.data?.message || '생성 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setFinalizing(false);
    }
  }, []);

  /**
   * 급여명세서 배포
   */
  const publishPayslip = useCallback(async (slipId) => {
    try {
      setFinalizing(true);
      setFinalizeError(null);

      const response = await salaryAPI.publishSlip(slipId);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('급여명세서 배포 오류:', error);
      setFinalizeError(error.response?.data?.message || '배포 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setFinalizing(false);
    }
  }, []);

  /**
   * 급여명세서 수정
   */
  const updatePayslip = useCallback(async (slipId, updates) => {
    try {
      setFinalizing(true);
      setFinalizeError(null);

      const response = await salaryAPI.updateSlip(slipId, updates);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('급여명세서 수정 오류:', error);
      setFinalizeError(error.response?.data?.message || '수정 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setFinalizing(false);
    }
  }, []);

  /**
   * 급여명세서 삭제
   */
  const deletePayslip = useCallback(async (slipId) => {
    try {
      setFinalizing(true);
      setFinalizeError(null);

      const response = await salaryAPI.deleteSlip(slipId);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('급여명세서 삭제 오류:', error);
      setFinalizeError(error.response?.data?.message || '삭제 중 오류가 발생했습니다.');
      return {
        success: false,
        error: error.response?.data?.message
      };
    } finally {
      setFinalizing(false);
    }
  }, []);

  return {
    // State
    finalizing,
    finalizeError,

    // Methods
    finalizeSalary,
    createPayslip,
    createMonthlySlips,
    publishPayslip,
    updatePayslip,
    deletePayslip
  };
};

export default useSalaryFinalize;
