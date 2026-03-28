import express from 'express';
import { run, get, query } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { requirePremium } from '../middleware/planCheck.js';
import { generateContractPDF } from '../utils/contractPdfGenerator.js';

const router = express.Router();

// ============================================
// 1. 근로계약서 생성 (사업주만)
// ============================================
/**
 * @swagger
 * /api/contracts:
 *   get:
 *     summary: 사업장의 모든 계약서 조회
 *     description: workplace_id 또는 employee_id 기준으로 계약서 목록을 조회합니다.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 계약서 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 contracts:
 *                   type: array
 *                   items:
 *                     type: object
 *   post:
 *     summary: 근로계약서 생성
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workplace_id
 *               - employee_id
 *               - contract_start_date
 *             properties:
 *               workplace_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *               employer_name:
 *                 type: string
 *               employee_name:
 *                 type: string
 *               contract_start_date:
 *                 type: string
 *                 format: date
 *               contract_end_date:
 *                 type: string
 *                 format: date
 *               job_description:
 *                 type: string
 *               work_location:
 *                 type: string
 *               work_days:
 *                 type: string
 *               work_start_time:
 *                 type: string
 *               work_end_time:
 *                 type: string
 *               salary_type:
 *                 type: string
 *                 enum: [monthly, hourly, daily, weekly, yearly]
 *               salary_amount:
 *                 type: number
 *               payment_date:
 *                 type: string
 *               social_insurance:
 *                 type: boolean
 *               special_terms:
 *                 type: string
 *     responses:
 *       200:
 *         description: 계약서 생성 성공
 *       400:
 *         description: 필수 항목 누락
 */
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
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
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
router.get('/employee/:employeeId', authenticate, async (req, res) => {
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
router.get('/:id', authenticate, async (req, res) => {
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
// 6. 계약서 PDF 생성
// ============================================
/**
 * @swagger
 * /api/contracts/{id}/pdf:
 *   get:
 *     summary: 근로계약서 PDF 다운로드
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 계약서 ID
 *     responses:
 *       200:
 *         description: PDF 파일
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 계약서를 찾을 수 없음
 */
router.get('/:id/pdf', authenticate, requirePremium('contracts'), async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await get(
      `SELECT lc.*, u.name as employee_display_name, w.name as workplace_name
       FROM labor_contracts lc
       LEFT JOIN users u ON lc.employee_id = u.id
       LEFT JOIN workplaces w ON lc.workplace_id = w.id
       WHERE lc.id = ?`,
      [id]
    );

    if (!contract) {
      return res.status(404).json({ success: false, message: '계약서를 찾을 수 없습니다.' });
    }

    const pdfBuffer = await generateContractPDF(contract);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="labor_contract_${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('계약서 PDF 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
