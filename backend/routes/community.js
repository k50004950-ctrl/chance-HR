import express from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { query, get, run } from '../config/database.js';

const router = express.Router();

// 게시글 목록 조회
router.get('/posts', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    const userRole = req.user.role;

    // super_admin은 모든 게시글 조회 가능
    if (userRole === 'super_admin') {
      let posts;
      if (category) {
        posts = await query(
          `SELECT cp.*, u.name as author_name, u.role as author_role
           FROM community_posts cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.category = ?
           ORDER BY cp.created_at DESC`,
          [category]
        );
      } else {
        posts = await query(
          `SELECT cp.*, u.name as author_name, u.role as author_role
           FROM community_posts cp
           JOIN users u ON cp.user_id = u.id
           ORDER BY cp.created_at DESC`
        );
      }
      return res.json(posts);
    }

    // owner는 owner 게시판만, employee는 employee 게시판만 볼 수 있음
    const allowedCategory = userRole === 'owner' ? 'owner' : 'employee';
    const posts = await query(
      `SELECT cp.*, u.name as author_name, u.role as author_role
       FROM community_posts cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.category = ?
       ORDER BY cp.created_at DESC`,
      [allowedCategory]
    );
    
    res.json(posts);
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    res.status(500).json({ message: '게시글 목록 조회에 실패했습니다.' });
  }
});

// 게시글 상세 조회
router.get('/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    const post = await get(
      `SELECT cp.*, u.name as author_name, u.role as author_role
       FROM community_posts cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.id = ?`,
      [id]
    );

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // super_admin은 모든 게시글 조회 가능
    if (userRole === 'super_admin') {
      return res.json(post);
    }

    // 일반 사용자는 본인의 카테고리 게시글만 조회 가능
    const allowedCategory = userRole === 'owner' ? 'owner' : 'employee';
    if (post.category !== allowedCategory) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    res.json(post);
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ message: '게시글 조회에 실패했습니다.' });
  }
});

// 게시글 작성
router.post('/posts', authenticate, authorizeRole(['owner', 'employee']), async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });
    }

    // 카테고리는 사용자의 role에 따라 자동 설정
    const category = userRole === 'owner' ? 'owner' : 'employee';

    const result = await run(
      `INSERT INTO community_posts (user_id, category, title, content)
       VALUES (?, ?, ?, ?)`,
      [userId, category, title, content]
    );

    res.status(201).json({
      message: '게시글이 작성되었습니다.',
      postId: result.id
    });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ message: '게시글 작성에 실패했습니다.' });
  }
});

// 게시글 수정
router.put('/posts/:id', authenticate, authorizeRole(['owner', 'employee']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });
    }

    const post = await get('SELECT * FROM community_posts WHERE id = ?', [id]);

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 작성자만 수정 가능
    if (post.user_id !== userId) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await run(
      `UPDATE community_posts 
       SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, content, id]
    );

    res.json({ message: '게시글이 수정되었습니다.' });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ message: '게시글 수정에 실패했습니다.' });
  }
});

// 게시글 삭제
router.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const post = await get('SELECT * FROM community_posts WHERE id = ?', [id]);

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // super_admin 또는 작성자만 삭제 가능
    if (userRole !== 'super_admin' && post.user_id !== userId) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await run('DELETE FROM community_posts WHERE id = ?', [id]);

    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ message: '게시글 삭제에 실패했습니다.' });
  }
});

export default router;
