import express from 'express';
import { run, get, query } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { requirePremium } from '../middleware/planCheck.js';

const router = express.Router();

// ============================================
// 1. 근로계약서 생성 (사업주만)
// ============================================
router.post('/', authenticate, requirePremium('contracts'), authorizeRole('owner', 'admin'), async (req, res) => {
  try {
    const {
      workplace_id, employee_id, employer_name, employee_name,
      contract_start_date, contract_end_date, job_description, work_location,
      work_days, work_start_time, work_end_time,
      salary_type, salary_amount, payment_date,
      social_insurance, special_terms
    } = req.body;

    if (!workplace_id || !employee_id || !contract_start_date) {
      return res.status(400).json({
        success: false,
        message: '필수 항목(사업장, 직원, 계약 시작일)을 입력해주세요.'
      });
    }

    const result = await run(
      `INSERT INTO labor_contracts (
        workplace_id, employee_id, employer_name, employee_name,
        contract_start_date, contract_end_date, job_description, work_location,
        work_days, work_start_time, work_end_time,
        salary_type, salary_amount, payment_date,
        social_insurance, special_terms,
        employer_signed, employer_signed_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP, 'pending')`,
      [
        workplace_id, employee_id, employer_name, employee_name,
        contract_start_date, contract_end_date || null, job_description, work_location,
        work_days, work_start_time, work_end_time,
        salary_type, salary_amount, payment_date,
        social_insurance !== false, special_terms || null
      ]
    );

    res.json({
      success: true,
      message: '근로계약서가 생성되었습니다.',
      contractId: result.id
    });
  } catch (error) {
    console.error('근로계약서 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ============================================
// 2. 사업장의 모든 계약서 조회
// ============================================
router.get('/workplace/:workplaceId', authenticate, requirePremium('contracts'), async (req, res) => {
  try {
    const { workplaceId } = req.params;
    const contracts = await query(
      `SELECT lc.*, u.name as employee_display_name
       FROM labor_contracts lc
       LEFT JOIN users u ON lc.employee_id = u.id
       WHERE lc.workplace_id = ?
       ORDER BY lc.created_at DESC`,
      [workplaceId]
    );

    res.json({ success: true, contracts });
  } catch (error) {
    console.error('계약서 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ============================================
// 3. 직원별 계약서 조회
// ============================================
router.get('/employee/:employeeId', authenticate, requirePremium('contracts'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const contracts = await query(
      `SELECT lc.*, u.name as employee_display_name
       FROM labor_contracts lc
       LEFT JOIN users u ON lc.employee_id = u.id
       WHERE lc.employee_id = ?
       ORDER BY lc.created_at DESC`,
      [employeeId]
    );

    res.json({ success: true, contracts });
  } catch (error) {
    console.error('직원 계약서 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ============================================
// 4. 특정 계약서 조회
// ============================================
router.get('/:id', authenticate, requirePremium('contracts'), async (req, res) => {
  try {
    const { id } = req.params;
    // Non-numeric IDs pass through
    if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, message: '유효하지 않은 계약서 ID입니다.' });

    const contract = await get(
      `SELECT lc.*, u.name as employee_display_name
       FROM labor_contracts lc
       LEFT JOIN users u ON lc.employee_id = u.id
       WHERE lc.id = ?`,
      [id]
    );

    if (!contract) {
      return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });
    }

    res.json({ success: true, contract });
  } catch (error) {
    console.error('계약서 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ============================================
// 5. 직원 서명 (employee signs the contract)
// ============================================
router.put('/:id/sign', authenticate, requirePremium('contracts'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const contract = await get('SELECT * FROM labor_contracts WHERE id = ?', [id]);
    if (!contract) {
      return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });
    }

    if (contract.employee_id !== userId) {
      return res.status(403).json({ success: false, message: '본인의 계약서만 서명할 수 있습니다.' });
    }

    if (contract.employee_signed) {
      return res.status(400).json({ success: false, message: '이미 서명된 계약서입니다.' });
    }

    // Determine new status: if employer already signed, mark as fully signed
    const newStatus = contract.employer_signed ? 'signed' : 'pending';

    await run(
      `UPDATE labor_contracts
       SET employee_signed = true,
           employee_signed_at = CURRENT_TIMESTAMP,
           status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, id]
    );

    res.json({ success: true, message: '계약서에 서명되었습니다.' });
  } catch (error) {
    console.error('계약서 서명 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ============================================
// 6. 계약서 PDF 생성 (간이 텍스트 형태)
// ============================================
router.get('/:id/pdf', authenticate, requirePremium('contracts'), async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await get(
      `SELECT lc.*, u.name as employee_display_name
       FROM labor_contracts lc
       LEFT JOIN users u ON lc.employee_id = u.id
       WHERE lc.id = ?`,
      [id]
    );

    if (!contract) {
      return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });
    }

    // Generate a simple text-based contract document
    const socialInsuranceText = contract.social_insurance ? '적용' : '미적용';
    const contractEndText = contract.contract_end_date || '무기한';
    const employerSignedText = contract.employer_signed
      ? `서명 완료 (${new Date(contract.employer_signed_at).toLocaleString('ko-KR')})`
      : '미서명';
    const employeeSignedText = contract.employee_signed
      ? `서명 완료 (${new Date(contract.employee_signed_at).toLocaleString('ko-KR')})`
      : '미서명';

    const content = `
========================================
          근 로 계 약 서
========================================

1. 계약 당사자
   사업주: ${contract.employer_name || '-'}
   근로자: ${contract.employee_name || contract.employee_display_name || '-'}

2. 계약 기간
   시작일: ${contract.contract_start_date}
   종료일: ${contractEndText}

3. 업무 내용
   ${contract.job_description || '-'}

4. 근무 장소
   ${contract.work_location || '-'}

5. 근무 시간
   근무일: ${contract.work_days || '-'}
   시작: ${contract.work_start_time || '-'}
   종료: ${contract.work_end_time || '-'}

6. 급여
   급여 유형: ${contract.salary_type || '-'}
   급여 금액: ${contract.salary_amount ? contract.salary_amount.toLocaleString() + '원' : '-'}
   지급일: ${contract.payment_date || '-'}

7. 4대보험: ${socialInsuranceText}

8. 특약사항
   ${contract.special_terms || '없음'}

========================================
           서 명 확 인
========================================
사업주: ${employerSignedText}
근로자: ${employeeSignedText}

※ 본 근로계약서는 근로기준법 제17조에 의거하여 작성되었습니다.
========================================
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="labor_contract_${id}.txt"`);
    res.send(content);
  } catch (error) {
    console.error('계약서 PDF 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
