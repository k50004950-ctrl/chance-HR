import { get, query } from '../config/database.js';
import type { Response, NextFunction } from 'express';
import type { AuthRequest, PremiumFeature, SubscriptionPlan } from '../types/index.js';

/**
 * Premium plan feature names:
 * - excel_import: 엑셀 대량 가져오기
 * - email: 급여명세서 이메일 발송
 * - contracts: 근로계약서
 * - manual_calc: 수기급여계산
 * - community: 커뮤니티
 * - push: 푸시알림
 */

const FEATURE_LABELS: Record<PremiumFeature, string> = {
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
export const requirePremium = (featureName: PremiumFeature) => async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // super_admin bypasses plan check
    if (req.user?.role === 'super_admin') {
      return next();
    }

    const workplaceId = req.body?.workplace_id || req.params?.workplaceId || req.user?.workplace_id;

    if (!workplaceId) {
      // If no workplace context, let it pass (other middleware will catch auth issues)
      return next();
    }

    const plan = await get(
      `SELECT * FROM subscription_plans WHERE workplace_id = ? AND is_active = true ORDER BY id DESC LIMIT 1`,
      [workplaceId]
    ) as SubscriptionPlan | undefined;

    if (plan && plan.plan_type === 'premium') {
      // Check expiration
      if (!plan.expires_at || new Date(plan.expires_at) > new Date()) {
        return next();
      }
    }

    const label = FEATURE_LABELS[featureName] || featureName;
    res.status(403).json({
      success: false,
      message: `'${label}' 기능은 프리미엄 플랜에서만 사용할 수 있습니다.`,
      code: 'PREMIUM_REQUIRED',
      feature: featureName
    });
  } catch (error) {
    console.error('Plan check error:', error);
    // On error, allow through to avoid blocking users due to DB issues
    next();
  }
};

/**
 * Middleware: check employee limit for free plan (max 5)
 */
export const checkEmployeeLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    ) as SubscriptionPlan | undefined;

    if (plan && plan.plan_type === 'premium') {
      if (!plan.expires_at || new Date(plan.expires_at) > new Date()) {
        return next(); // Premium = unlimited
      }
    }

    // Free plan: count current employees
    const result = await get(
      `SELECT COUNT(*) as count FROM users WHERE workplace_id = ? AND role = 'employee' AND (is_deleted IS NULL OR is_deleted = false)`,
      [workplaceId]
    ) as { count: number } | undefined;

    const currentCount = result?.count || 0;

    if (currentCount >= FREE_EMPLOYEE_LIMIT) {
      res.status(403).json({
        success: false,
        message: `무료 플랜은 직원 ${FREE_EMPLOYEE_LIMIT}명까지만 등록할 수 있습니다. (현재 ${currentCount}명) 프리미엄으로 업그레이드하세요.`,
        code: 'EMPLOYEE_LIMIT',
        currentCount,
        limit: FREE_EMPLOYEE_LIMIT
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Employee limit check error:', error);
    next();
  }
};
