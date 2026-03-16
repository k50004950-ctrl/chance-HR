import PDFDocument from 'pdfkit';

/**
 * Generate a salary slip PDF
 * @param {Object} data - Slip data
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generatePayslipPDF = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Use built-in Helvetica font (Korean characters will use Unicode)
    // Note: pdfkit's built-in fonts don't support Korean.
    // We'll use a simple layout with ASCII labels + Korean data encoded as-is

    const { slip, employee, workplace, owner } = data;

    // Title
    doc.fontSize(18).text('급여명세서', { align: 'center' });
    doc.fontSize(10).text(`Pay Slip - ${slip.payroll_month}`, { align: 'center' });
    doc.moveDown(1.5);

    // Company info
    doc.fontSize(11);
    drawRow(doc, 'Company / 회사명', workplace.name || '-');
    drawRow(doc, 'Owner / 대표자', owner.name || '-');
    drawRow(doc, 'Business No. / 사업자번호', owner.business_number || '-');
    doc.moveDown(0.5);

    // Employee info
    drawRow(doc, 'Employee / 성명', employee.name || '-');
    drawRow(doc, 'Position / 직위', employee.position || '-');
    drawRow(doc, 'Department / 부서', employee.department || '-');
    drawRow(doc, 'Pay Period / 급여월', slip.payroll_month || '-');
    drawRow(doc, 'Pay Date / 지급일', slip.pay_date || '-');
    doc.moveDown(1);

    // Salary details - table style
    doc.fontSize(13).text('[ Payment / 지급내역 ]');
    doc.moveDown(0.3);
    doc.fontSize(11);
    drawRow(doc, 'Base Pay / 기본급', formatWon(slip.base_pay));
    if (slip.overtime_pay) drawRow(doc, 'Overtime / 연장수당', formatWon(slip.overtime_pay));
    if (slip.weekly_holiday_pay) drawRow(doc, 'Weekly Holiday / 주휴수당', formatWon(slip.weekly_holiday_pay));
    doc.moveDown(0.5);

    // Line separator
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Deductions
    doc.fontSize(13).text('[ Deductions / 공제내역 ]');
    doc.moveDown(0.3);
    doc.fontSize(11);
    if (slip.national_pension) drawRow(doc, 'National Pension / 국민연금', formatWon(slip.national_pension));
    if (slip.health_insurance) drawRow(doc, 'Health Insurance / 건강보험', formatWon(slip.health_insurance));
    if (slip.long_term_care) drawRow(doc, 'Long-term Care / 장기요양', formatWon(slip.long_term_care));
    if (slip.employment_insurance) drawRow(doc, 'Employment Ins. / 고용보험', formatWon(slip.employment_insurance));
    if (slip.income_tax) drawRow(doc, 'Income Tax / 소득세', formatWon(slip.income_tax));
    if (slip.local_income_tax) drawRow(doc, 'Local Tax / 지방소득세', formatWon(slip.local_income_tax));
    doc.moveDown(0.3);
    drawRow(doc, 'Total Deductions / 공제합계', formatWon(slip.total_deductions));
    doc.moveDown(0.5);

    // Line separator
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Net pay (highlighted)
    doc.fontSize(14).text(`Net Pay / 실수령액: ${formatWon(slip.net_pay)}`, { align: 'center' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(9).text(
      `Generated on ${new Date().toISOString().split('T')[0]} | ChanceHR`,
      { align: 'center', color: '#999' }
    );

    doc.end();
  });
};

function drawRow(doc, label, value) {
  const y = doc.y;
  doc.text(label, 50, y, { width: 280 });
  doc.text(value, 340, y, { width: 200, align: 'right' });
  doc.moveDown(0.4);
}

function formatWon(amount) {
  if (!amount && amount !== 0) return '-';
  return Number(amount).toLocaleString('ko-KR') + ' won';
}
