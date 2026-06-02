import express from 'express';
import { query, run, get } from '../config/database.js';
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

// 과거 급여 기록 조회 (직원 본인 또는 사업주)
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    if (!await canAccessEmployee(req.user, employeeId)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    const records = await query(
      'SELECT * FROM employee_past_payroll WHERE user_id = ? ORDER BY start_date DESC',
      [employeeId]
    );

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('과거 급여 기록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 과거 급여 기록 등록 (사업주)
router.post('/:employeeId', authenticate, async (req, res) => {
  try {
    if (!['owner', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    const employeeId = req.params.employeeId;
    const { start_date, end_date, salary_type, amount, notes } = req.body;

    if (!start_date || !end_date || !salary_type || !amount) {
      return res.status(400).json({ success: false, message: '필수 정보를 입력해주세요.' });
    }

    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }
    if (!await canAccessEmployee(req.user, employeeId)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    const result = await run(
      `INSERT INTO employee_past_payroll (user_id, start_date, end_date, salary_type, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, start_date, end_date, salary_type, amount, notes || '']
    );

    res.status(201).json({ success: true, id: result.id, message: '과거 급여 기록이 등록되었습니다.' });
  } catch (error) {
    console.error('과거 급여 기록 등록 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 과거 급여 기록 삭제 (사업주)
router.delete('/:employeeId/:recordId', authenticate, async (req, res) => {
  try {
    if (!['owner', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    const { employeeId, recordId } = req.params;

    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '직원을 찾을 수 없습니다.' });
    }
    if (!await canAccessEmployee(req.user, employeeId)) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }

    await run('DELETE FROM employee_past_payroll WHERE id = ? AND user_id = ?', [recordId, employeeId]);

    res.json({ success: true, message: '과거 급여 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error('과거 급여 기록 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
