import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 과거 급여 기록 조회 (직원 본인 또는 사업주)
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    if (req.user.role === 'employee' && req.user.id !== parseInt(employeeId, 10)) {
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

    const records = await query(
      'SELECT * FROM employee_past_payroll WHERE user_id = ? ORDER BY start_date DESC',
      [employeeId]
    );

    res.json(records);
  } catch (error) {
    console.error('과거 급여 기록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 과거 급여 기록 등록 (사업주)
router.post('/:employeeId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const employeeId = req.params.employeeId;
    const { start_date, end_date, salary_type, amount, notes } = req.body;

    if (!start_date || !end_date || !salary_type || !amount) {
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
    if (!workplace || workplace.id !== employee.workplace_id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const result = await run(
      `INSERT INTO employee_past_payroll (user_id, start_date, end_date, salary_type, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, start_date, end_date, salary_type, amount, notes || '']
    );

    res.status(201).json({ id: result.id, message: '과거 급여 기록이 등록되었습니다.' });
  } catch (error) {
    console.error('과거 급여 기록 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 과거 급여 기록 삭제 (사업주)
router.delete('/:employeeId/:recordId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { employeeId, recordId } = req.params;

    const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
    if (!employee) {
      return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
    }
    const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
    if (!workplace || workplace.id !== employee.workplace_id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await run('DELETE FROM employee_past_payroll WHERE id = ? AND user_id = ?', [recordId, employeeId]);

    res.json({ message: '과거 급여 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error('과거 급여 기록 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
