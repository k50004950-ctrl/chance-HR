import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// 모든 사업장 조회 (관리자만)
router.get('/', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const workplaces = await query(`
      SELECT 
        w.id,
        w.name,
        w.address,
        w.latitude,
        w.longitude,
        w.radius,
        w.default_off_days,
        w.owner_id,
        w.created_at,
        u.name as owner_name,
        u.phone as owner_phone,
        COUNT(DISTINCT e.id) as employee_count
      FROM workplaces w
      LEFT JOIN users u ON w.owner_id = u.id
      LEFT JOIN users e ON e.workplace_id = w.id AND e.role = 'employee'
      GROUP BY 
        w.id,
        w.name,
        w.address,
        w.latitude,
        w.longitude,
        w.radius,
        w.default_off_days,
        w.owner_id,
        w.created_at,
        u.name,
        u.phone
      ORDER BY w.created_at DESC
    `);
    res.json(workplaces);
  } catch (error) {
    console.error('사업장 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 사업장 조회 (사업주)
router.get('/my', authenticate, authorizeRole(['owner']), async (req, res) => {
  try {
    const workplaces = await query(
      'SELECT * FROM workplaces WHERE owner_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(workplaces);
  } catch (error) {
    console.error('사업장 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 사업장 조회
router.get('/:id', authenticate, async (req, res) => {
  try {
    const workplace = await get(
      'SELECT * FROM workplaces WHERE id = ?',
      [req.params.id]
    );

    if (!workplace) {
      return res.status(404).json({ message: '사업장을 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (req.user.role === 'owner' && workplace.owner_id !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    res.json(workplace);
  } catch (error) {
    console.error('사업장 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업장 등록
router.post('/', authenticate, authorizeRole(['admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { name, address, latitude, longitude, radius, owner_id, default_off_days } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    const finalOwnerId = req.user.role === 'admin' ? owner_id : req.user.id;

    const result = await run(
      'INSERT INTO workplaces (name, address, latitude, longitude, radius, default_off_days, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, address, latitude, longitude, radius || 100, default_off_days || '', finalOwnerId]
    );

    res.status(201).json({
      message: '사업장이 등록되었습니다.',
      workplaceId: result.id
    });
  } catch (error) {
    console.error('사업장 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업장 수정
router.put('/:id', authenticate, authorizeRole(['admin', 'super_admin', 'owner']), async (req, res) => {
  try {
    const { name, address, latitude, longitude, radius, default_off_days, qr_print_message } = req.body;
    const workplaceId = req.params.id;
    let existingWorkplace = null;

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
      existingWorkplace = workplace;
    }

    if (!existingWorkplace) {
      existingWorkplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
    }

    const nextQrMessage =
      qr_print_message !== undefined && qr_print_message !== null
        ? qr_print_message
        : (existingWorkplace?.qr_print_message || '');

    await run(
      'UPDATE workplaces SET name = ?, address = ?, latitude = ?, longitude = ?, radius = ?, default_off_days = ?, qr_print_message = ? WHERE id = ?',
      [name, address, latitude, longitude, radius, default_off_days || '', nextQrMessage, workplaceId]
    );

    res.json({ message: '사업장 정보가 수정되었습니다.' });
  } catch (error) {
    console.error('사업장 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업장 삭제
router.delete('/:id', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    await run('DELETE FROM workplaces WHERE id = ?', [req.params.id]);
    res.json({ message: '사업장이 삭제되었습니다.' });
  } catch (error) {
    console.error('사업장 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
