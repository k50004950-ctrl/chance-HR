import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find a Korean-capable font path.
 * Priority: bundled NanumGothic > macOS system fonts > fallback to Helvetica
 */
function getKoreanFontPath() {
  const candidates = [
    path.join(__dirname, '..', 'fonts', 'NanumGothic.ttf'),
    path.join(__dirname, '..', 'fonts', 'NanumGothic-Regular.ttf'),
    '/System/Library/Fonts/AppleSDGothicNeo.ttc',
    '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
    '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Generate a labor contract PDF
 * @param {Object} contract - Contract data from DB
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateContractPDF = (contract) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const fontPath = getKoreanFontPath();
    if (fontPath) {
      doc.registerFont('Korean', fontPath);
      doc.font('Korean');
    }

    const socialInsuranceText = contract.social_insurance ? '적용' : '미적용';
    const contractEndText = contract.contract_end_date || '무기한 (기간의 정함이 없음)';
    const employerSignedText = contract.employer_signed
      ? `서명 완료 (${new Date(contract.employer_signed_at).toLocaleString('ko-KR')})`
      : '미서명';
    const employeeSignedText = contract.employee_signed
      ? `서명 완료 (${new Date(contract.employee_signed_at).toLocaleString('ko-KR')})`
      : '미서명';

    // ===== Title =====
    doc.fontSize(22).text('근로계약서', { align: 'center' });
    doc.fontSize(11).text('(표준근로계약서)', { align: 'center' });
    doc.moveDown(1.5);

    // Separator line
    drawLine(doc);
    doc.moveDown(0.8);

    // ===== 1. 사업장 정보 =====
    sectionTitle(doc, '1. 사업장 정보');
    labelValue(doc, '사업장명', contract.workplace_name || contract.work_location || '-');
    labelValue(doc, '대표자명', contract.employer_name || '-');
    doc.moveDown(0.6);

    // ===== 2. 근로자 정보 =====
    sectionTitle(doc, '2. 근로자 정보');
    labelValue(doc, '근로자명', contract.employee_name || contract.employee_display_name || '-');
    doc.moveDown(0.6);

    // ===== 3. 계약 기간 =====
    sectionTitle(doc, '3. 계약 기간');
    labelValue(doc, '계약 시작일', contract.contract_start_date || '-');
    labelValue(doc, '계약 종료일', contractEndText);
    doc.moveDown(0.6);

    // ===== 4. 근무 장소 및 직무 =====
    sectionTitle(doc, '4. 근무 장소 및 직무');
    labelValue(doc, '근무 장소', contract.work_location || '-');
    labelValue(doc, '직무 내용', contract.job_description || '-');
    doc.moveDown(0.6);

    // ===== 5. 근무 시간 =====
    sectionTitle(doc, '5. 근무 시간');
    labelValue(doc, '근무 요일', contract.work_days || '-');
    const workTime = (contract.work_start_time && contract.work_end_time)
      ? `${contract.work_start_time} ~ ${contract.work_end_time}`
      : '-';
    labelValue(doc, '근무 시간', workTime);
    doc.moveDown(0.6);

    // ===== 6. 급여 =====
    sectionTitle(doc, '6. 급여');
    labelValue(doc, '급여 유형', formatSalaryType(contract.salary_type));
    labelValue(doc, '급여 금액', contract.salary_amount
      ? Number(contract.salary_amount).toLocaleString('ko-KR') + '원'
      : '-');
    labelValue(doc, '급여 지급일', contract.payment_date || '-');
    doc.moveDown(0.6);

    // ===== 7. 4대보험 =====
    sectionTitle(doc, '7. 4대보험');
    labelValue(doc, '적용 여부', socialInsuranceText);
    doc.moveDown(0.6);

    // ===== 8. 특약사항 =====
    sectionTitle(doc, '8. 특약사항');
    doc.fontSize(11).text(contract.special_terms || '없음', { indent: 20 });
    doc.moveDown(1);

    // Separator line
    drawLine(doc);
    doc.moveDown(1);

    // ===== 서명란 =====
    doc.fontSize(14).text('서 명 란', { align: 'center' });
    doc.moveDown(0.8);

    // Employer signature
    doc.fontSize(11);
    doc.text(`사업주 (갑):  ${contract.employer_name || '________________'}`, 70);
    doc.moveDown(0.3);
    doc.fontSize(10).text(`  서명: ${employerSignedText}`, 70);
    doc.moveDown(0.8);

    // Employee signature
    doc.fontSize(11);
    doc.text(`근로자 (을):  ${contract.employee_name || contract.employee_display_name || '________________'}`, 70);
    doc.moveDown(0.3);
    doc.fontSize(10).text(`  서명: ${employeeSignedText}`, 70);
    doc.moveDown(1.5);

    // Separator line
    drawLine(doc);
    doc.moveDown(0.5);

    // Footer
    doc.fontSize(9).text(
      '본 계약서는 근로기준법 제17조에 따라 작성되었습니다.',
      { align: 'center' }
    );
    doc.moveDown(0.3);
    doc.fontSize(8).text(
      `생성일: ${new Date().toLocaleDateString('ko-KR')} | ChanceHR`,
      { align: 'center' }
    );

    doc.end();
  });
};

function sectionTitle(doc, title) {
  doc.fontSize(13).text(title);
  doc.moveDown(0.3);
}

function labelValue(doc, label, value) {
  const y = doc.y;
  doc.fontSize(11).text(`${label}:`, 70, y, { continued: false, width: 140 });
  doc.fontSize(11).text(String(value), 210, y, { width: 300 });
  doc.moveDown(0.3);
}

function drawLine(doc) {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke();
}

function formatSalaryType(type) {
  const map = {
    'monthly': '월급',
    'hourly': '시급',
    'daily': '일급',
    'weekly': '주급',
    'yearly': '연봉',
  };
  return map[type] || type || '-';
}
