import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      console.warn('⚠️ 이메일 설정 없음 (EMAIL_USER, EMAIL_PASS)');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return transporter;
};

export const sendPayslipEmail = async ({ to, employeeName, month, pdfBuffer, companyName }) => {
  const t = getTransporter();
  if (!t) throw new Error('이메일 설정이 되지 않았습니다.');

  await t.sendMail({
    from: `"${companyName || '찬스HR'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `[${companyName || '찬스HR'}] ${month} 급여명세서`,
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">급여명세서 안내</h2>
        <p>${employeeName}님, 안녕하세요.</p>
        <p><strong>${month}</strong> 급여명세서를 첨부드립니다.</p>
        <p>자세한 내용은 첨부된 PDF 파일을 확인해주세요.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">
          본 메일은 ${companyName || '찬스HR'}에서 근로기준법 제48조에 따라 자동 발송된 급여명세서입니다.<br/>
          급여명세서 수신과 관련한 문의는 소속 사업장에 문의해주세요.<br/>
          찬스컴퍼니 | K50004950@gmail.com
        </p>
      </div>
    `,
    attachments: pdfBuffer ? [{
      filename: `payslip_${month}_${employeeName}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

export const sendBulkPayslipEmails = async ({ slips, month, companyName, generatePdf }) => {
  const results = { sent: 0, failed: 0, errors: [] };

  for (const slip of slips) {
    if (!slip.email) {
      results.failed++;
      results.errors.push(`${slip.name}: 이메일 없음`);
      continue;
    }

    try {
      let pdfBuffer = null;
      if (generatePdf) {
        pdfBuffer = await generatePdf(slip);
      }

      await sendPayslipEmail({
        to: slip.email,
        employeeName: slip.name,
        month,
        pdfBuffer,
        companyName
      });
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${slip.name}: ${err.message}`);
    }
  }

  return results;
};
