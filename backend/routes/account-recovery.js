import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, run } from '../config/database.js';
import { decryptSSN } from '../utils/crypto.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';
import { getRedis } from '../config/redis.js';

const router = express.Router();

const EMAIL_VERIFY_KEY_PREFIX = 'verify:email:';

// 보안 토큰 생성 유틸리티
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// 아이디 찾기 (이름 + 이메일)
router.post('/find-username', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: '이름과 이메일을 입력해주세요.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 사용자 조회
    const users = await query(
      'SELECT username, created_at, role FROM users WHERE name = ? AND email = ?',
      [name, lowerEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '일치하는 계정을 찾을 수 없습니다.' });
    }

    // 아이디 일부 마스킹 (보안)
    const maskedUsers = users.map(user => {
      const username = user.username;
      let masked;
      if (username.length <= 3) {
        masked = username[0] + '*'.repeat(username.length - 1);
      } else {
        masked = username.substring(0, 2) + '*'.repeat(username.length - 3) + username[username.length - 1];
      }
      
      return {
        username: masked,
        role: user.role === 'owner' ? '사업주' : '근로자',
        createdAt: user.created_at
      };
    });

    res.json({ 
      success: true, 
      users: maskedUsers 
    });

  } catch (error) {
    console.error('아이디 찾기 오류:', error);
    res.status(500).json({ success: false, message: '아이디 찾기에 실패했습니다.' });
  }
});

// 비밀번호 재설정 - 이름 + 주민등록번호 뒤 7자리 인증 (이메일 없는 경우 대안)
router.post('/verify-reset-by-name', async (req, res) => {
  try {
    const { username, name, ssnLast7 } = req.body;

    if (!username || !name || !ssnLast7) {
      return res.status(400).json({ success: false, message: '아이디, 이름, 주민등록번호 뒤 7자리를 모두 입력해주세요.' });
    }

    // 주민등록번호 뒤 7자리 형식 검증
    if (!/^\d{7}$/.test(ssnLast7.replace(/-/g, ''))) {
      return res.status(400).json({ success: false, message: '주민등록번호 뒤 7자리를 정확히 입력해주세요.' });
    }

    // 아이디 + 이름으로 계정 조회
    const users = await query(
      'SELECT id, username, name, ssn FROM users WHERE username = ? AND name = ?',
      [username.trim(), name.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '아이디와 이름이 일치하는 계정을 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 주민등록번호 확인 (복호화 후 비교)
    const decryptedSSN = decryptSSN(user.ssn);
    if (!decryptedSSN) {
      return res.status(400).json({ success: false, message: '주민등록번호가 등록되지 않은 계정입니다. 관리자에게 문의해주세요.' });
    }

    const storedSsnClean = decryptedSSN.replace(/-/g, '');
    const inputSsnClean = ssnLast7.replace(/-/g, '');
    const storedLast7 = storedSsnClean.slice(-7);

    if (storedLast7 !== inputSsnClean) {
      return res.status(400).json({ success: false, message: '주민등록번호 뒤 7자리가 일치하지 않습니다.' });
    }

    // 보안 토큰 생성 및 DB 저장
    const resetToken = generateResetToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30분

    await run(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [tokenHash, expiresAt, user.id]
    );

    res.json({
      success: true,
      resetToken,
      userId: user.id,
      username: user.username,
      name: user.name
    });
  } catch (error) {
    console.error('이름+주민번호 인증 오류:', error);
    res.status(500).json({ success: false, message: '인증에 실패했습니다.' });
  }
});

// 비밀번호 재설정 - 인증 확인 (이메일 OTP 선행 필요)
router.post('/verify-reset-password', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ success: false, message: '아이디와 이메일을 입력해주세요.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 이메일 OTP 선행 인증 검증 (email-verification.js에서 'reset-password' purpose로 verified=true가 되어 있어야 함)
    try {
      const redis = getRedis();
      const raw = await redis.get(`${EMAIL_VERIFY_KEY_PREFIX}${lowerEmail}`);
      const otp = raw ? JSON.parse(raw) : null;
      const isValid = otp
        && otp.verified === true
        && otp.purpose === 'reset-password'
        && (!otp.expiresAt || Date.now() <= otp.expiresAt);
      if (!isValid) {
        return res.status(400).json({ success: false, message: '이메일 인증을 먼저 완료해주세요.' });
      }
    } catch (e) {
      console.error('이메일 인증 상태 확인 오류:', e);
      return res.status(500).json({ success: false, message: '인증 확인에 실패했습니다.' });
    }

    // 사용자 확인
    const users = await query(
      'SELECT id, username, name FROM users WHERE username = ? AND email = ?',
      [username, lowerEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '일치하는 계정을 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 보안 토큰 생성 및 DB 저장
    const resetToken = generateResetToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30분

    await run(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [tokenHash, expiresAt, user.id]
    );

    // OTP 소비 (재사용 방지)
    try {
      await getRedis().del(`${EMAIL_VERIFY_KEY_PREFIX}${lowerEmail}`);
    } catch (e) { /* 무시 */ }

    res.json({
      success: true,
      resetToken,
      userId: user.id,
      username: user.username,
      name: user.name
    });

  } catch (error) {
    console.error('비밀번호 재설정 인증 오류:', error);
    res.status(500).json({ success: false, message: '인증에 실패했습니다.' });
  }
});

// 비밀번호 재설정 실행
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { userId, newPassword, resetToken } = req.body;

    if (!userId || !newPassword || !resetToken) {
      return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: '비밀번호는 4자 이상이어야 합니다.' });
    }

    // DB에서 사용자의 저장된 토큰 해시 및 만료시간 조회
    const users = await query(
      'SELECT id, reset_token_hash, reset_token_expires FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 토큰이 발급되었는지 확인
    if (!user.reset_token_hash || !user.reset_token_expires) {
      return res.status(400).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    // 만료시간 확인 (30분)
    if (new Date() > new Date(user.reset_token_expires)) {
      // 만료된 토큰 삭제
      await run(
        'UPDATE users SET reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
        [userId]
      );
      return res.status(400).json({ success: false, message: '토큰이 만료되었습니다. 다시 시도해주세요.' });
    }

    // 토큰 해시 비교 (timing-safe)
    const providedHash = hashToken(resetToken);
    const storedHash = user.reset_token_hash;
    if (!crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash))) {
      return res.status(400).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트 + 토큰 즉시 삭제 (일회용)
    await run(
      'UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, userId]
    );

    console.log(`비밀번호 재설정 완료: User ID ${userId}`);

    res.json({
      success: true,
      message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.'
    });

  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ success: false, message: '비밀번호 재설정에 실패했습니다.' });
  }
});

export default router;
