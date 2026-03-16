import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 알림 목록 조회 (본인)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const unreadCount = await get(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = ?`,
      [userId, false]
    );

    res.json({
      success: true,
      notifications,
      unreadCount: unreadCount?.count || 0
    });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 읽지 않은 알림 수 조회
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = await get(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = ?`,
      [req.user.id, false]
    );
    res.json({ success: true, count: result?.count || 0 });
  } catch (error) {
    console.error('알림 수 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 알림 읽음 처리 (단건)
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await run(
      `UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?`,
      [true, req.params.id, req.user.id]
    );
    res.json({ success: true, message: '읽음 처리되었습니다.' });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 전체 읽음 처리
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await run(
      `UPDATE notifications SET is_read = ? WHERE user_id = ? AND is_read = ?`,
      [true, req.user.id, false]
    );
    res.json({ success: true, message: '모든 알림을 읽음 처리했습니다.' });
  } catch (error) {
    console.error('전체 읽음 처리 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 알림 삭제
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await run(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: '알림이 삭제되었습니다.' });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;

// 유틸리티: 알림 생성 함수 (다른 서비스에서 사용)
export const createNotification = async (userId, { type, title, message, actionUrl = null, urgent = false }) => {
  try {
    await run(
      `INSERT INTO notifications (user_id, type, title, message, action_url, urgent, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, type, title, message, actionUrl, urgent, false]
    );
  } catch (error) {
    console.error('알림 생성 오류:', error);
  }
};
