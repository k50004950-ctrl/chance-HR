import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// 저장
router.post('/', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { title, workers, results, total_gross, total_deductions, total_net, workplace_id } = req.body;

    const workersJson = typeof workers === 'string' ? workers : JSON.stringify(workers);
    const resultsJson = typeof results === 'string' ? results : JSON.stringify(results);

    const result = await run(
      `INSERT INTO manual_calculations (owner_id, workplace_id, title, workers, results, total_gross, total_deductions, total_net)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, workplace_id || null, title || `수기계산 ${new Date().toLocaleDateString('ko-KR')}`, workersJson, resultsJson, total_gross, total_deductions, total_net]
    );

    res.status(201).json({ success: true, message: '저장되었습니다.', id: result.lastID || result.id });
  } catch (error) {
    console.error('수기계산 저장 오류:', error);
    res.status(500).json({ success: false, message: '저장에 실패했습니다.' });
  }
});

// 목록 조회
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, title, total_gross, total_deductions, total_net, created_at
       FROM manual_calculations
       WHERE owner_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('수기계산 목록 오류:', error);
    res.status(500).json({ success: false, message: '조회에 실패했습니다.' });
  }
});

// 상세 조회
router.get('/:id', authenticate, async (req, res) => {
  try {
    const row = await get(
      `SELECT * FROM manual_calculations WHERE id = ? AND owner_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!row) return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });

    // Parse JSON fields
    if (typeof row.workers === 'string') row.workers = JSON.parse(row.workers);
    if (typeof row.results === 'string') row.results = JSON.parse(row.results);

    res.json({ success: true, data: row });
  } catch (error) {
    console.error('수기계산 상세 오류:', error);
    res.status(500).json({ success: false, message: '조회에 실패했습니다.' });
  }
});

// 삭제
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await run(
      `DELETE FROM manual_calculations WHERE id = ? AND owner_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (error) {
    console.error('수기계산 삭제 오류:', error);
    res.status(500).json({ success: false, message: '삭제에 실패했습니다.' });
  }
});

export default router;
