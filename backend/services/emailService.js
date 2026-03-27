import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Gmail 주소
    pass: process.env.EMAIL_PASS  // Gmail 앱 비밀번호
  }
});

// 이메일 전송 함수
export async function sendVerificationEmail(email, code, purpose) {
  const purposeText = {
    'signup': '회원가입',
    'find-id': '아이디 찾기',
    'reset-password': '비밀번호 재설정'
  };

  const mailOptions = {
    from: `"찬스HR" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[찬스HR] ${purposeText[purpose]} 인증번호`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            color: white;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .code-box {
            background: white;
            color: #667eea;
            font-size: 36px;
            font-weight: bold;
            padding: 20px;
            border-radius: 10px;
            letter-spacing: 8px;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .info {
            font-size: 14px;
            margin-top: 20px;
            opacity: 0.9;
          }
          .warning {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🎯 찬스HR</div>
          <h2>${purposeText[purpose]} 인증번호</h2>
          <p>아래 인증번호를 입력해주세요.</p>
          
          <div class="code-box">${code}</div>
          
          <div class="info">
            <p>✓ 이 인증번호는 5분간 유효합니다.</p>
            <p>✓ 본인이 요청하지 않았다면 무시해주세요.</p>
          </div>
          
          <div class="warning">
            ⚠️ 이 인증번호를 타인에게 절대 알려주지 마세요.
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const [eid, edom] = email.split('@');
    console.log(`✅ 이메일 전송 성공: ${eid.slice(0, 2)}***@${edom}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ 이메일 전송 실패:', error);
    throw error;
  }
}

// 이메일 전송 테스트 함수
export async function testEmailConnection() {
  try {
    await transporter.verify();
    console.log('✅ 이메일 서버 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 이메일 서버 연결 실패:', error);
    return false;
  }
}
