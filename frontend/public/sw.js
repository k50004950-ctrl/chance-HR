// Service Worker for PWA
const CACHE_NAME = 'chance-attendance-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker: 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: 캐시 생성 실패', error);
      })
  );
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker: 활성화 중...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 오래된 캐시 삭제', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 (Network First 전략)
self.addEventListener('fetch', (event) => {
  // API 요청은 항상 네트워크 우선
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: '오프라인 상태입니다.' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 정적 리소스는 캐시 우선
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // 유효한 응답만 캐시
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
      .catch(() => {
        // 오프라인일 때 기본 페이지 반환
        return caches.match('/index.html');
      })
  );
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('푸시 알림 수신:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'attendance-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('찬스 출퇴근 관리', options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (let client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
