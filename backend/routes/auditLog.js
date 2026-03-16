import express from 'express';
import { query, get } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// 감사 로그 조회 (관리자/총관리자 전용)
router.get('/', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      action,
      entity_type,
      user_id,
      from_date,
      to_date
    } = req.query;

    let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    let dataSql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    const countParams = [];

    if (action) {
      countSql += ` AND action = ?`;
      dataSql += ` AND action = ?`;
      params.push(action);
      countParams.push(action);
    }

    if (entity_type) {
      countSql += ` AND entity_type = ?`;
      dataSql += ` AND entity_type = ?`;
      params.push(entity_type);
      countParams.push(entity_type);
    }

    if (user_id) {
      countSql += ` AND user_id = ?`;
      dataSql += ` AND user_id = ?`;
      params.push(user_id);
      countParams.push(user_id);
    }

    if (from_date) {
      countSql += ` AND created_at >= ?`;
      dataSql += ` AND created_at >= ?`;
      params.push(from_date);
      countParams.push(from_date);
    }

    if (to_date) {
      countSql += ` AND created_at <= ?`;
      dataSql += ` AND created_at <= ?`;
      params.push(to_date + ' 23:59:59');
      countParams.push(to_date + ' 23:59:59');
    }

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const countResult = await get(countSql, countParams);
    const logs = await query(dataSql, params);

    res.json({
      success: true,
      data: logs,
      total: countResult?.total || 0
    });
  } catch (error) {
    console.error('감사 로그 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
