import express from 'express';
import { query, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 직원 급여 변경 이력 조회
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    // 권한 확인
    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (req.user.role === 'owner') {
      const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
      if (!employee) {
        return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
      }

      const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
      if (!workplace || workplace.id !== employee.workplace_id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 급여 변경 이력 조회
    const history = await query(
      `SELECT * FROM salary_history WHERE user_id = ? ORDER BY change_date DESC`,
      [employeeId]
    );

    // 현재 급여 정보 조회
    const currentSalary = await get('SELECT * FROM salary_info WHERE user_id = ?', [employeeId]);

    res.json({
      current: currentSalary,
      history: history
    });
  } catch (error) {
    console.error('급여 이력 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
