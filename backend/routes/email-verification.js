import express from 'express';
import { query } from '../config/database.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

// 인증번호 저장소 (실제 운영환경에서는 Redis 등 사용 권장)
const verificationCodes = new Map();

// 인증번호 생성 함수
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 형식 검증
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 인증번호 전송
router.post('/send-code', async (req, res) => {
  try {
    const { email, purpose } = req.body; // purpose: 'signup', 'find-id', 'reset-password'

    if (!email) {
      return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 형식이 아닙니다.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 회원가입용일 경우 중복 체크
    if (purpose === 'signup') {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ?',
        [lowerEmail]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ success: false, message: '이미 가입된 이메일입니다.' });
      }
    }

    // 아이디/비밀번호 찾기용일 경우 계정 존재 확인
    if (purpose === 'find-id' || purpose === 'reset-password') {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ?',
        [lowerEmail]
      );
      if (existingUser.length === 0) {
        return res.status(404).json({ success: false, message: '가입되지 않은 이메일입니다.' });
      }
    }

    // 인증번호 생성
    const code = generateVerificationCode();
    
    // 인증번호 저장 (5분 유효)
    verificationCodes.set(lowerEmail, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5분
      purpose,
      verified: false
    });

    // 이메일 전송
    try {
      await sendVerificationEmail(lowerEmail, code, purpose);
      
      // 개인정보 마스킹 로그
      const [emailId, emailDomain] = lowerEmail.split('@');
      const maskedEmail = emailId.slice(0, 2) + '***@' + emailDomain;
      console.log(`📧 이메일 인증번호 발송: ${maskedEmail} (${purpose}, 5분 만료)`);

      res.json({ 
        success: true, 
        message: '인증번호가 이메일로 전송되었습니다.',
        // 개발용: 인증번호 노출 (실제 운영시 제거)
        devCode: process.env.NODE_ENV === 'development' ? code : undefined
      });
    } catch (emailError) {
      // 이메일 전송 실패
      verificationCodes.delete(lowerEmail);
      console.error('이메일 전송 오류:', emailError);
      
      // 이메일 설정이 안 되어 있으면 개발 모드로 동작
      if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
        console.log('⚠️ 이메일 설정 없음. 개발 모드로 동작');
        verificationCodes.set(lowerEmail, {
          code,
          expiresAt: Date.now() + 5 * 60 * 1000,
          purpose,
          verified: false
        });
        return res.json({ 
          success: true, 
          message: '[개발 모드] 인증번호가 생성되었습니다.',
          devCode: code
        });
      }
      
      return res.status(500).json({ success: false, message: '이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }

  } catch (error) {
    console.error('인증번호 전송 오류:', error);
    res.status(500).json({ success: false, message: '인증번호 전송에 실패했습니다.' });
  }
});

// 인증번호 확인
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: '이메일과 인증번호를 입력해주세요.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const stored = verificationCodes.get(lowerEmail);

    if (!stored) {
      return res.status(400).json({ success: false, message: '인증번호를 먼저 요청해주세요.' });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(lowerEmail);
      return res.status(400).json({ success: false, message: '인증번호가 만료되었습니다. 다시 요청해주세요.' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
    }

    // 인증 성공
    stored.verified = true;
    
    console.log(`✅ 이메일 인증 성공: ${lowerEmail}`);

    res.json({ 
      success: true, 
      message: '인증이 완료되었습니다.',
      email: lowerEmail
    });

  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    res.status(500).json({ success: false, message: '인증 확인에 실패했습니다.' });
  }
});

// 인증 상태 확인
router.post('/check-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase().trim();
    const stored = verificationCodes.get(lowerEmail);

    if (!stored || !stored.verified || Date.now() > stored.expiresAt) {
      return res.json({ verified: false });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    res.status(500).json({ success: false, message: '인증 상태 확인에 실패했습니다.' });
  }
});

// 인증 완료 후 삭제
router.post('/clear-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase().trim();
    verificationCodes.delete(lowerEmail);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: '처리 실패' });
  }
});

export default router;
