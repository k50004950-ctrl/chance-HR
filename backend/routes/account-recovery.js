import express from 'express';
import bcrypt from 'bcryptjs';
import { query, run } from '../config/database.js';

const router = express.Router();

// 아이디 찾기 (이름 + 이메일)
router.post('/find-username', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: '이름과 이메일을 입력해주세요.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 사용자 조회
    const users = await query(
      'SELECT username, created_at, role FROM users WHERE name = ? AND email = ?',
      [name, lowerEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '일치하는 계정을 찾을 수 없습니다.' });
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
        fullUsername: username, // 전체 아이디 (실제로는 인증 후에만 제공)
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
    res.status(500).json({ error: '아이디 찾기에 실패했습니다.' });
  }
});

// 비밀번호 재설정 - 이름 + 주민등록번호 뒤 7자리 인증 (이메일 없는 경우 대안)
router.post('/verify-reset-by-name', async (req, res) => {
  try {
    const { username, name, ssnLast7 } = req.body;

    if (!username || !name || !ssnLast7) {
      return res.status(400).json({ error: '아이디, 이름, 주민등록번호 뒤 7자리를 모두 입력해주세요.' });
    }

    // 주민등록번호 뒤 7자리 형식 검증
    if (!/^\d{7}$/.test(ssnLast7.replace(/-/g, ''))) {
      return res.status(400).json({ error: '주민등록번호 뒤 7자리를 정확히 입력해주세요.' });
    }

    // 아이디 + 이름으로 계정 조회
    const users = await query(
      'SELECT id, username, name, ssn FROM users WHERE username = ? AND name = ?',
      [username.trim(), name.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '아이디와 이름이 일치하는 계정을 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 주민등록번호 확인
    if (!user.ssn) {
      return res.status(400).json({ error: '주민등록번호가 등록되지 않은 계정입니다. 관리자에게 문의해주세요.' });
    }

    const storedSsnClean = user.ssn.replace(/-/g, '');
    const inputSsnClean = ssnLast7.replace(/-/g, '');
    const storedLast7 = storedSsnClean.slice(-7);

    if (storedLast7 !== inputSsnClean) {
      return res.status(400).json({ error: '주민등록번호 뒤 7자리가 일치하지 않습니다.' });
    }

    const resetToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      resetToken,
      userId: user.id,
      username: user.username,
      name: user.name
    });
  } catch (error) {
    console.error('이름+주민번호 인증 오류:', error);
    res.status(500).json({ error: '인증에 실패했습니다.' });
  }
});

// 비밀번호 재설정 - 인증 확인
router.post('/verify-reset-password', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: '아이디와 이메일을 입력해주세요.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    // 사용자 확인
    const users = await query(
      'SELECT id, username, name FROM users WHERE username = ? AND email = ?',
      [username, lowerEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '일치하는 계정을 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 임시 토큰 생성 (실제로는 JWT 사용 권장)
    const resetToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.json({ 
      success: true,
      resetToken,
      userId: user.id,
      username: user.username,
      name: user.name
    });

  } catch (error) {
    console.error('비밀번호 재설정 인증 오류:', error);
    res.status(500).json({ error: '인증에 실패했습니다.' });
  }
});

// 비밀번호 재설정 실행
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, newPassword, resetToken } = req.body;

    if (!userId || !newPassword || !resetToken) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
    }

    // 토큰 검증 (간단한 타임스탬프 체크)
    try {
      const decoded = Buffer.from(resetToken, 'base64').toString('utf-8');
      const [tokenUserId, timestamp] = decoded.split(':');
      
      if (parseInt(tokenUserId) !== parseInt(userId)) {
        return res.status(400).json({ error: '유효하지 않은 토큰입니다.' });
      }

      // 토큰 유효시간 체크 (10분)
      if (Date.now() - parseInt(timestamp) > 10 * 60 * 1000) {
        return res.status(400).json({ error: '토큰이 만료되었습니다. 다시 시도해주세요.' });
      }
    } catch (e) {
      return res.status(400).json({ error: '유효하지 않은 토큰입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    console.log(`✅ 비밀번호 재설정 완료: User ID ${userId}`);

    res.json({ 
      success: true, 
      message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' 
    });

  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ error: '비밀번호 재설정에 실패했습니다.' });
  }
});

export default router;
