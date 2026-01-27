/**
 * 실수령액(netPay) 계산
 * @param {number} grossPay - 총 지급액 (세전)
 * @param {object} deductions - 공제 항목
 * @param {number} deductions.nationalPension - 국민연금
 * @param {number} deductions.healthInsurance - 건강보험
 * @param {number} deductions.longTermCare - 장기요양
 * @param {number} deductions.employmentInsurance - 고용보험
 * @param {number} deductions.incomeTax - 소득세
 * @param {number} deductions.localIncomeTax - 지방소득세
 * @returns {number} 실수령액
 */
export const calcNetPay = (grossPay, deductions = {}) => {
  const totalDeductions = 
    (deductions.nationalPension || 0) +
    (deductions.healthInsurance || 0) +
    (deductions.longTermCare || 0) +
    (deductions.employmentInsurance || 0) +
    (deductions.incomeTax || 0) +
    (deductions.localIncomeTax || 0);
  
  return grossPay - totalDeductions;
};

/**
 * 공제 합계 계산
 * @param {object} deductions - 공제 항목
 * @returns {number} 공제 합계
 */
export const calcTotalDeductions = (deductions = {}) => {
  return (
    (deductions.nationalPension || 0) +
    (deductions.healthInsurance || 0) +
    (deductions.longTermCare || 0) +
    (deductions.employmentInsurance || 0) +
    (deductions.incomeTax || 0) +
    (deductions.localIncomeTax || 0)
  );
};
