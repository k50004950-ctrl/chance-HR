import express from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { getVapidPublicKey, upsertSubscription, removeSubscription, sendPushToUser } from '../services/webPush.js';

const router = express.Router();

router.get('/public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ message: '웹 푸시가 설정되지 않았습니다.' });
  }
  res.json({ publicKey });
});

router.post('/subscribe', authenticate, authorizeRole('owner', 'admin'), async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: '구독 정보가 필요합니다.' });
    }

    await upsertSubscription({
      userId: req.user.id,
      workplaceId: req.user.workplace_id || null,
      subscription,
      userAgent
    });

    res.json({ message: '구독이 저장되었습니다.' });
  } catch (error) {
    console.error('Push 구독 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/unsubscribe', authenticate, authorizeRole('owner', 'admin'), async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'endpoint가 필요합니다.' });
    }

    await removeSubscription({ endpoint });
    res.json({ message: '구독이 해제되었습니다.' });
  } catch (error) {
    console.error('Push 구독 해제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/test', authenticate, authorizeRole('owner', 'admin'), async (req, res) => {
  try {
    const result = await sendPushToUser(req.user.id, {
      title: '출퇴근 알림 테스트',
      body: '알림이 정상적으로 설정되었습니다.',
      url: `${process.env.FRONTEND_URL || ''}`
    });

    res.json({ message: '테스트 알림을 전송했습니다.', result });
  } catch (error) {
    console.error('Push 테스트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
