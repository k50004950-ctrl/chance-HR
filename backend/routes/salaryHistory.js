import express from 'express';
import { query, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

async function canAccessEmployee(user, employeeId) {
  if (['admin', 'super_admin'].includes(user.role)) return true;
  if (user.role === 'employee') return user.id === parseInt(employeeId, 10);
  if (user.role !== 'owner') return false;

  const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
  if (!employee) return false;

  const workplace = await get('SELECT id FROM workplaces WHERE id = ? AND owner_id = ?', [employee.workplace_id, user.id]);
  return !!workplace;
}

// 직원 급여 변경 이력 조회
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    // 권한 확인
    if (!await canAccessEmployee(req.user, employeeId)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
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
