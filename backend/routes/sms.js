import express from 'express';
import { query, run } from '../config/database.js';
import { getRedis } from '../config/redis.js';

const router = express.Router();

const VERIFY_TTL = 300; // 5분 (초)
const KEY_PREFIX = 'verify:phone:';

// Redis/메모리에 인증 데이터 저장
async function setVerification(phone, data) {
  const redis = getRedis();
  await redis.set(`${KEY_PREFIX}${phone}`, JSON.stringify(data), 'EX', VERIFY_TTL);
}

// Redis/메모리에서 인증 데이터 조회
async function getVerification(phone) {
  const redis = getRedis();
  const raw = await redis.get(`${KEY_PREFIX}${phone}`);
  if (!raw) return null;
  const data = JSON.parse(raw);
  // 인메모리 폴백은 TTL로 자동 삭제되지만, 안전을 위해 만료 체크
  if (data.expiresAt && Date.now() > data.expiresAt) {
    await redis.del(`${KEY_PREFIX}${phone}`);
    return null;
  }
  return data;
}

// Redis/메모리에서 인증 데이터 삭제
async function delVerification(phone) {
  const redis = getRedis();
  await redis.del(`${KEY_PREFIX}${phone}`);
}

// 인증번호 생성 함수
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 인증번호 전송 (개발용 - 실제 SMS 미전송, 콘솔에만 출력)
router.post('/send-code', async (req, res) => {
  try {
    const { phone, purpose } = req.body; // purpose: 'signup', 'find-id', 'reset-password'

    if (!phone) {
      return res.status(400).json({ error: '전화번호를 입력해주세요.' });
    }

    // 전화번호 형식 검증 (하이픈 제거)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: '올바른 전화번호 형식이 아닙니다.' });
    }

    // 회원가입용일 경우 중복 체크
    if (purpose === 'signup') {
      const existingUser = await query(
        'SELECT id FROM users WHERE phone = ?',
        [cleanPhone]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ error: '이미 가입된 전화번호입니다.' });
      }
    }

    // 아이디/비밀번호 찾기용일 경우 계정 존재 확인
    if (purpose === 'find-id' || purpose === 'reset-password') {
      const existingUser = await query(
        'SELECT id FROM users WHERE phone = ?',
        [cleanPhone]
      );
      if (existingUser.length === 0) {
        return res.status(404).json({ error: '가입되지 않은 전화번호입니다.' });
      }
    }

    // 인증번호 생성
    const code = generateVerificationCode();

    // Redis에 인증번호 저장 (5분 유효)
    await setVerification(cleanPhone, {
      code,
      expiresAt: Date.now() + VERIFY_TTL * 1000,
      purpose,
      verified: false
    });

    // 실제 운영환경에서는 여기서 SMS API 호출
    // await sendSMS(cleanPhone, `[찬스 출퇴근] 인증번호: ${code}`);

    // 개발용: 콘솔에 출력 (개인정보 마스킹)
    const maskedPhone = cleanPhone.slice(0, 3) + '****' + cleanPhone.slice(-4);
    console.log(`📱 SMS 인증번호 발송: ${maskedPhone} (${purpose}, 5분 만료)`);

    res.json({
      success: true,
      message: '인증번호가 전송되었습니다.',
      // 개발용: 인증번호 노출 (실제 운영시 제거)
      devCode: process.env.NODE_ENV === 'production' ? undefined : code
    });

  } catch (error) {
    console.error('인증번호 전송 오류:', error);
    res.status(500).json({ error: '인증번호 전송에 실패했습니다.' });
  }
});

// 인증번호 확인
router.post('/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: '전화번호와 인증번호를 입력해주세요.' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const stored = await getVerification(cleanPhone);

    if (!stored) {
      return res.status(400).json({ error: '인증번호를 먼저 요청해주세요.' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: '인증번호가 일치하지 않습니다.' });
    }

    // 인증 성공 - verified 상태로 업데이트
    stored.verified = true;
    await setVerification(cleanPhone, stored);

    console.log(`✅ 전화번호 인증 성공: ${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-4)}`);

    res.json({
      success: true,
      message: '인증이 완료되었습니다.',
      phone: cleanPhone
    });

  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    res.status(500).json({ error: '인증 확인에 실패했습니다.' });
  }
});

// 인증 상태 확인
router.post('/check-verification', async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const stored = await getVerification(cleanPhone);

    if (!stored || !stored.verified) {
      return res.json({ verified: false });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    res.status(500).json({ error: '인증 상태 확인에 실패했습니다.' });
  }
});

// 인증 완료 후 삭제
router.post('/clear-verification', async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    await delVerification(cleanPhone);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '처리 실패' });
  }
});

export default router;
