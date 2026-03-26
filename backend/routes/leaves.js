import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { sendPushToOwner, sendPushToUser } from '../services/webPush.js';

const router = express.Router();

// Helper: calculate days for a leave request
function calculateDays(leaveType, startDate, endDate) {
  if (leaveType === 'half_am' || leaveType === 'half_pm') {
    return 0.5;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

// Helper: calculate annual leave entitlement based on Korean labor law (근로기준법)
function calculateAnnualEntitlement(hireDate) {
  if (!hireDate) return 0;

  const hire = new Date(hireDate);
  const now = new Date();
  const diffMs = now.getTime() - hire.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  if (diffYears < 1) {
    // Under 1 year: 1 day per month worked (max 11)
    const monthsWorked = Math.floor(diffDays / 30);
    return Math.min(monthsWorked, 11);
  } else {
    // 1+ years: 15 days base + 1 day per 2 years over 1 year (max 25)
    const yearsOver1 = Math.floor(diffYears - 1);
    const additionalDays = Math.floor(yearsOver1 / 2);
    return Math.min(15 + additionalDays, 25);
  }
}

// 1. 휴가 신청 (직원)
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leave_type, start_date, end_date, reason } = req.body;

    // Validation
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: '휴가 유형, 시작일, 종료일은 필수입니다.'
      });
    }

    const validTypes = ['annual', 'half_am', 'half_pm', 'sick', 'special', 'unpaid'];
    if (!validTypes.includes(leave_type)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 휴가 유형입니다.'
      });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: '시작일이 종료일보다 늦을 수 없습니다.'
      });
    }

    const days = calculateDays(leave_type, start_date, end_date);

    // Get user's workplace
    const user = await get('SELECT workplace_id FROM users WHERE id = ?', [userId]);
    const workplaceId = user?.workplace_id || null;

    // Check remaining annual leave for annual/half-day types
    if (['annual', 'half_am', 'half_pm'].includes(leave_type)) {
      const empDetail = await get('SELECT hire_date FROM employee_details WHERE user_id = ?', [userId]);
      const totalAnnual = calculateAnnualEntitlement(empDetail?.hire_date);

      const year = new Date(start_date).getFullYear();
      const usedRows = await query(
        `SELECT COALESCE(SUM(days), 0) as used FROM leaves
         WHERE user_id = ? AND status IN ('approved', 'pending')
         AND leave_type IN ('annual', 'half_am', 'half_pm')
         AND start_date >= ? AND start_date < ?`,
        [userId, `${year}-01-01`, `${year + 1}-01-01`]
      );
      const usedAnnual = parseFloat(usedRows[0]?.used || 0);

      if (usedAnnual + days > totalAnnual) {
        return res.status(400).json({
          success: false,
          message: `연차가 부족합니다. (총 ${totalAnnual}일, 사용/신청 ${usedAnnual}일, 잔여 ${totalAnnual - usedAnnual}일)`
        });
      }
    }

    const result = await run(
      `INSERT INTO leaves (user_id, workplace_id, leave_type, start_date, end_date, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, workplaceId, leave_type, start_date, end_date, days, reason || null]
    );

    // 사업주에게 휴가 신청 알림 (non-blocking)
    sendPushToOwner(workplaceId, {
      title: '휴가 신청',
      body: `${req.user.name} 님이 ${leave_type === 'annual' ? '연차' : '휴가'}를 신청했습니다. (${start_date}~${end_date})`,
      url: '/#/owner'
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: '휴가가 신청되었습니다.',
      data: {
        id: result.id,
        user_id: userId,
        workplace_id: workplaceId,
        leave_type,
        start_date,
        end_date,
        days,
        reason,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('휴가 신청 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 2. 내 휴가 목록 (직원)
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const leaves = await query(
      `SELECT l.*, u.name as approved_by_name
       FROM leaves l
       LEFT JOIN users u ON l.approved_by = u.id
       WHERE l.user_id = ? AND l.start_date >= ? AND l.start_date < ?
       ORDER BY l.start_date DESC`,
      [userId, `${targetYear}-01-01`, `${parseInt(targetYear) + 1}-01-01`]
    );

    // Annual leave summary
    const empDetail = await get('SELECT hire_date FROM employee_details WHERE user_id = ?', [userId]);
    const totalAnnual = calculateAnnualEntitlement(empDetail?.hire_date);

    const usedRows = await query(
      `SELECT COALESCE(SUM(days), 0) as used FROM leaves
       WHERE user_id = ? AND status = 'approved'
       AND leave_type IN ('annual', 'half_am', 'half_pm')
       AND start_date >= ? AND start_date < ?`,
      [userId, `${targetYear}-01-01`, `${parseInt(targetYear) + 1}-01-01`]
    );
    const usedAnnual = parseFloat(usedRows[0]?.used || 0);

    res.json({
      success: true,
      data: {
        leaves,
        summary: {
          total_annual: totalAnnual,
          used_annual: usedAnnual,
          remaining: totalAnnual - usedAnnual
        },
        year: parseInt(targetYear)
      }
    });
  } catch (error) {
    console.error('내 휴가 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 3. 사업장 휴가 목록 (사업주)
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const { workplaceId } = req.params;
    const { status, year } = req.query;
    const targetYear = year || new Date().getFullYear();

    // 사업장 소유권 확인: owner는 자신의 사업장만, super_admin은 모두 가능
    if (req.user.role !== 'super_admin') {
      const workplace = await get('SELECT id FROM workplaces WHERE id = ? AND owner_id = ?', [workplaceId, req.user.id]);
      if (!workplace) {
        return res.status(403).json({ success: false, message: '해당 사업장에 대한 권한이 없습니다.' });
      }
    }

    let sql = `
      SELECT l.*, u.name as user_name
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.workplace_id = ? AND l.start_date >= ? AND l.start_date < ?
    `;
    const params = [workplaceId, `${targetYear}-01-01`, `${parseInt(targetYear) + 1}-01-01`];

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.created_at DESC';

    const leaves = await query(sql, params);

    res.json({
      success: true,
      data: { leaves, year: parseInt(targetYear) }
    });
  } catch (error) {
    console.error('사업장 휴가 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 4. 휴가 승인/거부 (사업주)
router.put('/:id/approve', authenticate, authorizeRole(['owner', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '유효한 상태값을 입력해주세요. (approved 또는 rejected)'
      });
    }

    const leave = await get('SELECT * FROM leaves WHERE id = ?', [id]);
    if (!leave) {
      return res.status(404).json({ success: false, message: '휴가 신청을 찾을 수 없습니다.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '대기 중인 휴가만 승인/거부할 수 있습니다.'
      });
    }

    await run(
      `UPDATE leaves SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, req.user.id, id]
    );

    // 직원에게 휴가 승인/반려 알림 (non-blocking)
    sendPushToUser(leave.user_id, {
      title: status === 'approved' ? '휴가 승인' : '휴가 반려',
      body: status === 'approved' ? '휴가가 승인되었습니다.' : '휴가가 반려되었습니다.',
      url: '/#/employee'
    }).catch(() => {});

    const statusText = status === 'approved' ? '승인' : '거부';
    res.json({
      success: true,
      message: `휴가가 ${statusText}되었습니다.`,
      data: { id: parseInt(id), status, approved_by: req.user.id }
    });
  } catch (error) {
    console.error('휴가 승인/거부 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 5. 휴가 취소 (직원 - pending만 가능)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const leave = await get('SELECT * FROM leaves WHERE id = ?', [id]);
    if (!leave) {
      return res.status(404).json({ success: false, message: '휴가 신청을 찾을 수 없습니다.' });
    }

    if (leave.user_id !== userId) {
      return res.status(403).json({ success: false, message: '본인의 휴가만 취소할 수 있습니다.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '대기 중인 휴가만 취소할 수 있습니다.'
      });
    }

    await run('UPDATE leaves SET status = ? WHERE id = ?', ['cancelled', id]);

    res.json({
      success: true,
      message: '휴가가 취소되었습니다.',
      data: { id: parseInt(id), status: 'cancelled' }
    });
  } catch (error) {
    console.error('휴가 취소 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 6. 연차 현황 조회
router.get('/annual-summary/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    // 권한 확인: 직원은 본인만, owner는 자기 사업장 직원만, super_admin은 모두 가능
    if (req.user.role === 'employee') {
      if (req.user.id !== parseInt(userId, 10)) {
        return res.status(403).json({ success: false, message: '본인의 연차 현황만 조회할 수 있습니다.' });
      }
    } else if (req.user.role === 'owner') {
      const targetUser = await get('SELECT workplace_id FROM users WHERE id = ?', [userId]);
      const ownerWorkplace = await get('SELECT id FROM workplaces WHERE owner_id = ?', [req.user.id]);
      if (!targetUser || !ownerWorkplace || targetUser.workplace_id !== ownerWorkplace.id) {
        return res.status(403).json({ success: false, message: '해당 직원에 대한 권한이 없습니다.' });
      }
    }

    const empDetail = await get('SELECT hire_date FROM employee_details WHERE user_id = ?', [userId]);
    if (!empDetail || !empDetail.hire_date) {
      return res.status(404).json({
        success: false,
        message: '직원 정보(입사일)를 찾을 수 없습니다.'
      });
    }

    const totalAnnual = calculateAnnualEntitlement(empDetail.hire_date);

    // Get used annual leave (approved only)
    const usedRows = await query(
      `SELECT COALESCE(SUM(days), 0) as used FROM leaves
       WHERE user_id = ? AND status = 'approved'
       AND leave_type IN ('annual', 'half_am', 'half_pm')
       AND start_date >= ? AND start_date < ?`,
      [userId, `${targetYear}-01-01`, `${parseInt(targetYear) + 1}-01-01`]
    );
    const usedAnnual = parseFloat(usedRows[0]?.used || 0);

    // Get detailed breakdown
    const details = await query(
      `SELECT leave_type, COUNT(*) as count, COALESCE(SUM(days), 0) as total_days
       FROM leaves
       WHERE user_id = ? AND status = 'approved'
       AND start_date >= ? AND start_date < ?
       GROUP BY leave_type`,
      [userId, `${targetYear}-01-01`, `${parseInt(targetYear) + 1}-01-01`]
    );

    // Calculate years of service
    const hire = new Date(empDetail.hire_date);
    const now = new Date();
    const yearsOfService = ((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);

    res.json({
      success: true,
      data: {
        total: totalAnnual,
        used: usedAnnual,
        remaining: totalAnnual - usedAnnual,
        hire_date: empDetail.hire_date,
        years_of_service: parseFloat(yearsOfService),
        year: parseInt(targetYear),
        details: details.map(d => ({
          leave_type: d.leave_type,
          count: d.count,
          total_days: parseFloat(d.total_days)
        }))
      }
    });
  } catch (error) {
    console.error('연차 현황 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
