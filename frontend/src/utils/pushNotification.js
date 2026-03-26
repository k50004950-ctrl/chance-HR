import { pushAPI } from '../services/api';

export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const getPushPermission = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
};

export const subscribeToPush = async () => {
  if (!isPushSupported()) throw new Error('푸시 알림을 지원하지 않는 브라우저입니다.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('알림 권한이 거부되었습니다.');

  // Get VAPID public key from server
  const keyRes = await pushAPI.getPublicKey();
  const publicKey = keyRes.data.publicKey;
  if (!publicKey) throw new Error('푸시 설정이 되지 않았습니다.');

  // Register minimal service worker for push
  let registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/push-sw.js');
    await navigator.serviceWorker.ready;
  }

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  // Send to server
  await pushAPI.subscribe({
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent
  });

  return true;
};

export const unsubscribeFromPush = async () => {
  const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
  if (registration) {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await pushAPI.unsubscribe({ endpoint });
    }
  }
};

export const isSubscribed = async () => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
