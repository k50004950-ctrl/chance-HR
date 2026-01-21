import express from 'express';
import { query, run } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// 공지사항 생성 (총관리자 전용)
router.post('/', authenticate, authorizeRole(['super_admin']), async (req, res) => {
  try {
    const { title, content } = req.body;
    const createdBy = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    const result = await run(
      'INSERT INTO announcements (title, content, created_by, is_active) VALUES (?, ?, ?, ?)',
      [title, content, createdBy, true]
    );

    res.status(201).json({
      message: '공지사항이 생성되었습니다.',
      announcementId: result.id
    });
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    res.status(500).json({ message: '공지사항 생성에 실패했습니다.' });
  }
});

// 모든 공지사항 조회 (총관리자용 - 관리 목적)
router.get('/all', authenticate, authorizeRole(['super_admin']), async (req, res) => {
  try {
    const announcements = await query(
      `SELECT a.*, u.name as creator_name 
       FROM announcements a 
       JOIN users u ON a.created_by = u.id 
       ORDER BY a.created_at DESC`
    );

    res.json(announcements);
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({ message: '공지사항 조회에 실패했습니다.' });
  }
});

// 활성 공지사항 조회 (읽지 않은 것만)
router.get('/active', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // 활성화된 공지 중 사용자가 읽지 않은 것만 조회
    const announcements = await query(
      `SELECT a.* FROM announcements a
       WHERE a.is_active = ? 
       AND NOT EXISTS (
         SELECT 1 FROM user_announcements ua 
         WHERE ua.user_id = ? 
         AND ua.announcement_id = a.id 
         AND ua.is_read = ?
       )
       ORDER BY a.created_at DESC`,
      [true, userId, true]
    );

    res.json(announcements);
  } catch (error) {
    console.error('활성 공지사항 조회 오류:', error);
    res.status(500).json({ message: '공지사항 조회에 실패했습니다.' });
  }
});

// 공지사항 읽음 처리
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const announcementId = req.params.id;

    // 이미 읽음 처리된 경우 업데이트, 아니면 새로 생성
    const existing = await query(
      'SELECT * FROM user_announcements WHERE user_id = ? AND announcement_id = ?',
      [userId, announcementId]
    );

    if (existing.length > 0) {
      await run(
        'UPDATE user_announcements SET is_read = ?, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND announcement_id = ?',
        [true, userId, announcementId]
      );
    } else {
      await run(
        'INSERT INTO user_announcements (user_id, announcement_id, is_read, read_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, announcementId, true]
      );
    }

    res.json({ message: '공지사항을 읽음 처리했습니다.' });
  } catch (error) {
    console.error('공지사항 읽음 처리 오류:', error);
    res.status(500).json({ message: '읽음 처리에 실패했습니다.' });
  }
});

// 공지사항 비활성화 (총관리자 전용)
router.put('/:id/deactivate', authenticate, authorizeRole(['super_admin']), async (req, res) => {
  try {
    const announcementId = req.params.id;

    await run(
      'UPDATE announcements SET is_active = ? WHERE id = ?',
      [false, announcementId]
    );

    res.json({ message: '공지사항이 비활성화되었습니다.' });
  } catch (error) {
    console.error('공지사항 비활성화 오류:', error);
    res.status(500).json({ message: '비활성화에 실패했습니다.' });
  }
});

// 공지사항 삭제 (총관리자 전용)
router.delete('/:id', authenticate, authorizeRole(['super_admin']), async (req, res) => {
  try {
    const announcementId = req.params.id;

    await run('DELETE FROM announcements WHERE id = ?', [announcementId]);

    res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

export default router;
