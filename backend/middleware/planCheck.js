import { get, query } from '../config/database.js';

/**
 * Premium plan feature names:
 * - excel_import: 엑셀 대량 가져오기
 * - email: 급여명세서 이메일 발송
 * - contracts: 근로계약서
 * - manual_calc: 수기급여계산
 * - community: 커뮤니티
 * - push: 푸시알림
 */

const FEATURE_LABELS = {
  excel_import: '엑셀 가져오기',
  email: '급여명세서 이메일 발송',
  contracts: '근로계약서',
  manual_calc: '수기급여계산',
  community: '커뮤니티',
  push: '푸시알림'
};

const FREE_EMPLOYEE_LIMIT = 5;

/**
 * Middleware: require active premium plan for a specific feature
 */
export const requirePremium = (featureName) => async (req, res, next) => {
  try {
    // super_admin bypasses plan check
    if (req.user?.role === 'super_admin') {
      return next();
    }

    let workplaceId = req.body?.workplace_id || req.body?.workplaceId || req.params?.workplaceId || req.user?.workplace_id;

    if (!workplaceId) {
      if (req.params?.slipId) {
        const slip = await get('SELECT workplace_id FROM salary_slips WHERE id = ?', [req.params.slipId]);
        workplaceId = slip?.workplace_id;
      } else if (featureName === 'contracts' && req.params?.id) {
        const contract = await get('SELECT workplace_id FROM labor_contracts WHERE id = ?', [req.params.id]);
        workplaceId = contract?.workplace_id;
      }
    }

    if (!workplaceId) {
      return res.status(400).json({
        success: false,
        message: '프리미엄 기능 확인을 위한 사업장 정보가 필요합니다.',
        code: 'WORKPLACE_REQUIRED',
        feature: featureName
      });
    }

    const plan = await get(
      `SELECT * FROM subscription_plans WHERE workplace_id = ? AND is_active = true ORDER BY id DESC LIMIT 1`,
      [workplaceId]
    );

    if (plan && plan.plan_type === 'premium') {
      // Check expiration
      if (!plan.expires_at || new Date(plan.expires_at) > new Date()) {
        return next();
      }
    }

    const label = FEATURE_LABELS[featureName] || featureName;
    return res.status(403).json({
      success: false,
      message: `'${label}' 기능은 프리미엄 플랜에서만 사용할 수 있습니다.`,
      code: 'PREMIUM_REQUIRED',
      feature: featureName
    });
  } catch (error) {
    console.error('Plan check error:', error);
    // Fail-closed: 오류 시 프리미엄 기능을 통과시키지 않는다 (과금/권한 우회 방지)
    return res.status(503).json({
      success: false,
      message: '플랜 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      code: 'PLAN_CHECK_FAILED',
      feature: featureName
    });
  }
};

/**
 * Middleware: check employee limit for free plan (max 5)
 */
export const checkEmployeeLimit = async (req, res, next) => {
  try {
    // super_admin bypasses
    if (req.user?.role === 'super_admin') {
      return next();
    }

    const workplaceId = req.body?.workplace_id || req.user?.workplace_id;

    if (!workplaceId) {
      return next();
    }

    // Check if premium
    const plan = await get(
      `SELECT * FROM subscription_plans WHERE workplace_id = ? AND is_active = true ORDER BY id DESC LIMIT 1`,
      [workplaceId]
    );

    if (plan && plan.plan_type === 'premium') {
      if (!plan.expires_at || new Date(plan.expires_at) > new Date()) {
        return next(); // Premium = unlimited
      }
    }

    // Free plan: count current employees
    const result = await get(
      `SELECT COUNT(*) as count FROM users WHERE workplace_id = ? AND role = 'employee' AND (is_deleted IS NULL OR is_deleted = false)`,
      [workplaceId]
    );

    const currentCount = result?.count || 0;

    if (currentCount >= FREE_EMPLOYEE_LIMIT) {
      return res.status(403).json({
        success: false,
        message: `무료 플랜은 직원 ${FREE_EMPLOYEE_LIMIT}명까지만 등록할 수 있습니다. (현재 ${currentCount}명) 프리미엄으로 업그레이드하세요.`,
        code: 'EMPLOYEE_LIMIT',
        currentCount,
        limit: FREE_EMPLOYEE_LIMIT
      });
    }

    next();
  } catch (error) {
    console.error('Employee limit check error:', error);
    // Fail-closed: 오류 시 직원 추가를 허용하지 않는다 (무료 한도 우회 방지)
    return res.status(503).json({
      success: false,
      message: '플랜 한도 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      code: 'PLAN_CHECK_FAILED'
    });
  }
};
