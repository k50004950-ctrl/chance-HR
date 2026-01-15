import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run, query } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-2026';

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '사용자명과 비밀번호를 입력해주세요.' });
    }

    const user = await get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 승인 상태 확인 (관리자는 제외)
    if (user.role !== 'admin' && user.approval_status === 'pending') {
      return res.status(403).json({ message: '관리자 승인 대기 중입니다. 승인 후 로그인하실 수 있습니다.' });
    }

    if (user.role !== 'admin' && user.approval_status === 'rejected') {
      return res.status(403).json({ message: '가입이 거부되었습니다. 관리자에게 문의하세요.' });
    }

    if (user.role !== 'admin' && user.approval_status === 'suspended') {
      return res.status(403).json({ message: '계정이 일시 중지되었습니다. 관리자에게 문의하세요.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        workplace_id: user.workplace_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        workplace_id: user.workplace_id
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 대표자 회원가입 (누구나 접근 가능)
router.post('/signup', async (req, res) => {
  try {
    const { 
      username, password, name, phone, email, address,
      business_name, business_number, additional_info,
      latitude, longitude, radius
    } = req.body;

    if (!username || !password || !name || !business_name || !business_number || !phone) {
      return res.status(400).json({ message: '필수 정보를 모두 입력해주세요.' });
    }
    if (!address || !latitude || !longitude) {
      return res.status(400).json({ message: '사업장 주소와 좌표를 입력해주세요.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      `INSERT INTO users (
        username, password, name, role, phone, email, address,
        business_name, business_number, additional_info, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, name, 'owner', phone, email, address, 
       business_name, business_number, additional_info, 'approved']
    );

    try {
      await run(
        'INSERT INTO workplaces (name, address, latitude, longitude, radius, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
        [business_name, address, latitude, longitude, radius || 100, result.id]
      );
    } catch (workplaceError) {
      await run('DELETE FROM users WHERE id = ?', [result.id]);
      throw workplaceError;
    }

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      userId: result.id
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
    }
    console.error('회원가입 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 등록 (관리자/사업주만 가능)
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, phone, email, workplace_id } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      'INSERT INTO users (username, password, name, role, phone, email, workplace_id, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, phone, email, workplace_id, 'approved']
    );

    res.status(201).json({
      message: '사용자가 등록되었습니다.',
      userId: result.id
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
    }
    console.error('사용자 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주 목록 조회 (관리자만)
router.get('/owners', authenticate, authorizeRole('admin'), async (req, res) => {
  try {
    const owners = await query(`
      SELECT 
        u.id, u.username, u.name, u.phone, u.email, u.address,
        u.business_name, u.business_number, u.additional_info,
        u.approval_status, u.created_at,
        COUNT(DISTINCT w.id) as workplace_count
      FROM users u
      LEFT JOIN workplaces w ON u.id = w.owner_id
      WHERE u.role = 'owner'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(owners);
  } catch (error) {
    console.error('사업주 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 승인 대기 중인 대표자 목록 조회 (관리자만)
router.get('/pending-owners', authenticate, authorizeRole('admin'), async (req, res) => {
  try {
    const pendingOwners = await query(`
      SELECT 
        id, username, name, phone, email, address,
        business_name, business_number, additional_info, created_at
      FROM users
      WHERE role = 'owner' AND approval_status = 'pending'
      ORDER BY created_at DESC
    `);
    res.json(pendingOwners);
  } catch (error) {
    console.error('승인 대기 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 대표자 승인/거부 (관리자만)
router.post('/approve-owner/:id', authenticate, authorizeRole('admin'), async (req, res) => {
  try {
    const ownerId = req.params.id;
    const { action } = req.body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '유효하지 않은 액션입니다.' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    await run(
      'UPDATE users SET approval_status = ? WHERE id = ? AND role = ?',
      [status, ownerId, 'owner']
    );

    res.json({ 
      message: action === 'approve' ? '승인되었습니다.' : '거부되었습니다.' 
    });
  } catch (error) {
    console.error('승인/거부 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업주 계정 활성화/비활성화 (관리자만)
router.put('/owners/:id/toggle-status', authenticate, authorizeRole('admin'), async (req, res) => {
  try {
    const ownerId = req.params.id;

    // 현재 상태 조회
    const owner = await get('SELECT approval_status FROM users WHERE id = ? AND role = ?', [ownerId, 'owner']);

    if (!owner) {
      return res.status(404).json({ message: '사업주를 찾을 수 없습니다.' });
    }

    // 상태 토글
    const newStatus = owner.approval_status === 'approved' ? 'suspended' : 'approved';

    await run(
      'UPDATE users SET approval_status = ? WHERE id = ? AND role = ?',
      [newStatus, ownerId, 'owner']
    );

    const message = newStatus === 'suspended' 
      ? '사업주 계정이 일시 중지되었습니다.' 
      : '사업주 계정이 활성화되었습니다.';

    res.json({ message, newStatus });
  } catch (error) {
    console.error('계정 상태 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 비밀번호 변경
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // 현재 사용자 정보 조회
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
