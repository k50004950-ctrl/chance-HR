import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 과거 직원 목록 조회
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 사업주의 사업장 ID 조회
    const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
    if (!workplace) {
      return res.status(404).json({ message: '사업장을 찾을 수 없습니다.' });
    }

    const pastEmployees = await query(
      'SELECT * FROM past_employees WHERE workplace_id = ? ORDER BY resignation_date DESC',
      [workplace.id]
    );

    res.json(pastEmployees);
  } catch (error) {
    console.error('과거 직원 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 과거 직원 등록
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { name, hire_date, resignation_date, average_monthly_salary, notes } = req.body;

    // 유효성 검사
    if (!name || !hire_date || !resignation_date || !average_monthly_salary) {
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    // 사업주의 사업장 ID 조회
    const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
    if (!workplace) {
      return res.status(404).json({ message: '사업장을 찾을 수 없습니다.' });
    }

    // 퇴직금 계산
    const hireDate = new Date(hire_date);
    const resignationDate = new Date(resignation_date);
    const yearsOfService = (resignationDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25);

    let severancePay = 0;
    if (yearsOfService >= 1) {
      // 퇴직금 = 평균 월급여 × 근속연수
      severancePay = Math.round(average_monthly_salary * yearsOfService);
    }

    // 과거 직원 등록
    const result = await run(
      `INSERT INTO past_employees 
       (workplace_id, name, hire_date, resignation_date, average_monthly_salary, severance_pay, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workplace.id, name, hire_date, resignation_date, average_monthly_salary, severancePay, notes || '']
    );

    res.status(201).json({
      id: result.id,
      message: '과거 직원이 등록되었습니다.',
      severance_pay: severancePay,
      years_of_service: yearsOfService.toFixed(2)
    });
  } catch (error) {
    console.error('과거 직원 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 과거 직원 삭제
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const pastEmployeeId = req.params.id;

    // 사업주의 사업장 ID 조회
    const workplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
    if (!workplace) {
      return res.status(404).json({ message: '사업장을 찾을 수 없습니다.' });
    }

    // 해당 직원이 사업주의 사업장 소속인지 확인
    const pastEmployee = await get(
      'SELECT * FROM past_employees WHERE id = ? AND workplace_id = ?',
      [pastEmployeeId, workplace.id]
    );

    if (!pastEmployee) {
      return res.status(404).json({ message: '과거 직원을 찾을 수 없습니다.' });
    }

    await run('DELETE FROM past_employees WHERE id = ?', [pastEmployeeId]);

    res.json({ message: '과거 직원이 삭제되었습니다.' });
  } catch (error) {
    console.error('과거 직원 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
