import webpush from 'web-push';
import { query, run, get } from '../config/database.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@chance-hr.local';

const isConfigured = () => !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isConfigured()) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const getVapidPublicKey = () => VAPID_PUBLIC_KEY || null;

const removeSubscriptionByEndpoint = async (endpoint) => {
  if (!endpoint) return;
  try {
    await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  } catch (error) {
    console.error('Push 구독 삭제 오류:', error);
  }
};

export const upsertSubscription = async ({ userId, workplaceId, subscription, userAgent }) => {
  if (!subscription?.endpoint) {
    throw new Error('구독 endpoint가 필요합니다.');
  }

  const endpoint = subscription.endpoint;
  const existing = await get('SELECT * FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  const payload = JSON.stringify(subscription);

  if (existing) {
    await run(
      'UPDATE push_subscriptions SET user_id = ?, workplace_id = ?, subscription = ?, user_agent = ? WHERE endpoint = ?',
      [userId, workplaceId || null, payload, userAgent || '', endpoint]
    );
    return;
  }

  await run(
    'INSERT INTO push_subscriptions (user_id, workplace_id, endpoint, subscription, user_agent) VALUES (?, ?, ?, ?, ?)',
    [userId, workplaceId || null, endpoint, payload, userAgent || '']
  );
};

export const removeSubscription = async ({ endpoint }) => {
  await removeSubscriptionByEndpoint(endpoint);
};

export const sendPushToUser = async (userId, payload) => {
  if (!isConfigured()) {
    return { skipped: true, reason: 'vapid-not-configured' };
  }

  try {
    const subscriptions = await query(
      'SELECT * FROM push_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (row) => {
        try {
          const subscription = JSON.parse(row.subscription);
          await webpush.sendNotification(subscription, JSON.stringify(payload));
          return { ok: true };
        } catch (error) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await removeSubscriptionByEndpoint(row.endpoint);
          } else {
            console.error('Push 알림 전송 오류:', error);
          }
          return { ok: false };
        }
      })
    );

    const sent = results.filter((result) => result.status === 'fulfilled' && result.value?.ok).length;
    return { sent };
  } catch (error) {
    console.error('Push 전송 오류:', error);
    return { sent: 0 };
  }
};

export const sendPushToWorkplace = async (workplaceId, payload, excludeUserId = null) => {
  if (!isConfigured()) return { skipped: true, reason: 'vapid-not-configured' };

  try {
    let sql = 'SELECT * FROM push_subscriptions WHERE workplace_id = ?';
    const params = [workplaceId];

    if (excludeUserId) {
      sql += ' AND user_id != ?';
      params.push(excludeUserId);
    }

    const subscriptions = await query(sql, params);
    if (!subscriptions || subscriptions.length === 0) return { sent: 0 };

    const results = await Promise.allSettled(
      subscriptions.map(async (row) => {
        try {
          const subscription = JSON.parse(row.subscription);
          await webpush.sendNotification(subscription, JSON.stringify(payload));
          return { ok: true };
        } catch (error) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await removeSubscriptionByEndpoint(row.endpoint);
          }
          return { ok: false };
        }
      })
    );

    return { sent: results.filter(r => r.status === 'fulfilled' && r.value?.ok).length };
  } catch (error) {
    console.error('Workplace push 오류:', error);
    return { sent: 0 };
  }
};

export const sendPushToOwner = async (workplaceId, payload) => {
  if (!isConfigured()) return { skipped: true };
  try {
    const workplace = await get('SELECT owner_id FROM workplaces WHERE id = ?', [workplaceId]);
    if (!workplace) return { sent: 0 };
    return sendPushToUser(workplace.owner_id, payload);
  } catch (error) {
    console.error('Owner push 오류:', error);
    return { sent: 0 };
  }
};
