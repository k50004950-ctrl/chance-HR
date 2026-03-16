import { run } from '../config/database.js';

export const logAudit = async (req, { action, entityType, entityId = null, details = null }) => {
  try {
    const userId = req.user?.id || null;
    const userName = req.user?.name || req.user?.username || 'system';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    await run(
      `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, action, entityType, entityId, detailsStr, ip]
    );
  } catch (error) {
    console.error('[감사로그 저장 오류]:', error.message);
  }
};
