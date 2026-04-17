import express from 'express';
import { get, query, run } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/plans/current:
 *   get:
 *     summary: 현재 구독 플랜 조회
 *     description: 현재 사업장의 활성화된 구독 플랜 정보를 반환합니다.
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workplace_id
 *         schema:
 *           type: integer
 *         description: 사업장 ID (미지정 시 토큰의 workplace_id 사용)
 *     responses:
 *       200:
 *         description: 플랜 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 plan:
 *                   type: object
 *                   properties:
 *                     plan_type:
 *                       type: string
 *                       enum: [free, premium]
 *                     is_active:
 *                       type: boolean
 *                 employee_count:
 *                   type: integer
 *                 employee_limit:
 *                   type: integer
 *                   nullable: true
 */
// GET /api/plans/current - 현재 플랜 조회
router.get('/current', authenticate, async (req, res) => {
  try {
    const workplaceId = req.query.workplace_id || req.user.workplace_id;

    if (!workplaceId) {
      return res.json({
        success: true,
        plan: { plan_type: 'free', is_active: true }
      });
    }

    const plan = await get(
      `SELECT * FROM subscription_plans WHERE workplace_id = ? AND is_active = true ORDER BY id DESC LIMIT 1`,
      [workplaceId]
    );

    // Count current employees
    const empCount = await get(
      `SELECT COUNT(*) as count FROM users WHERE workplace_id = ? AND role = 'employee' AND (is_deleted IS NULL OR is_deleted = false)`,
      [workplaceId]
    );

    if (plan) {
      // Check if expired
      if (plan.expires_at && new Date(plan.expires_at) <= new Date()) {
        plan.is_active = false;
        plan.plan_type = 'free';
      }
    }

    res.json({
      success: true,
      plan: plan || { plan_type: 'free', is_active: true },
      employee_count: empCount?.count || 0,
      employee_limit: plan?.plan_type === 'premium' ? null : 5
    });
  } catch (error) {
    console.error('플랜 조회 오류:', error);
    res.status(500).json({ success: false, message: '플랜 조회에 실패했습니다.' });
  }
});

// POST /api/plans/upgrade - 프리미엄 업그레이드 (결제 미구현, 상태만 변경)
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    if (!['owner', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '사업주만 플랜을 변경할 수 있습니다.' });
    }

    const { workplace_id } = req.body;

    if (!workplace_id) {
      return res.status(400).json({ success: false, message: '사업장을 선택해주세요.' });
    }

    // 사업장 소유권 확인 (super_admin 제외)
    if (req.user.role !== 'super_admin') {
      const workplace = await get('SELECT owner_id FROM workplaces WHERE id = ?', [workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ success: false, message: '본인 소유 사업장만 업그레이드할 수 있습니다.' });
      }
    }

    // Deactivate existing plans
    await run(
      `UPDATE subscription_plans SET is_active = false WHERE workplace_id = ?`,
      [workplace_id]
    );

    // Create new premium plan (30 days trial)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await run(
      `INSERT INTO subscription_plans (workplace_id, plan_type, started_at, expires_at, is_active) VALUES (?, 'premium', CURRENT_TIMESTAMP, ?, true)`,
      [workplace_id, expiresAt.toISOString()]
    );

    res.json({
      success: true,
      message: '프리미엄 플랜이 활성화되었습니다. (30일 체험)',
      plan: {
        id: result.id,
        workplace_id,
        plan_type: 'premium',
        expires_at: expiresAt.toISOString(),
        is_active: true
      }
    });
  } catch (error) {
    console.error('플랜 업그레이드 오류:', error);
    res.status(500).json({ success: false, message: '플랜 업그레이드에 실패했습니다.' });
  }
});

export default router;
