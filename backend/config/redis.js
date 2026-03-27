// Redis 클라이언트 + 인메모리 폴백
// REDIS_URL 환경변수가 있으면 Redis 사용, 없으면 인메모리 Map 사용

import Redis from 'ioredis';

let redisClient = null;

/**
 * 인메모리 폴백 객체 (Redis API 호환)
 * get/set/del/expire 메서드를 가진 Map 기반 객체
 */
function createMemoryStore() {
  const store = new Map();
  const timers = new Map();

  return {
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      return item;
    },

    async set(key, value, ...args) {
      store.set(key, value);
      // set key value EX seconds 패턴 지원
      if (args[0] === 'EX' && args[1]) {
        const ttl = parseInt(args[1], 10) * 1000;
        this._setTTL(key, ttl);
      }
      return 'OK';
    },

    async del(key) {
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
        timers.delete(key);
      }
      const existed = store.has(key) ? 1 : 0;
      store.delete(key);
      return existed;
    },

    async expire(key, seconds) {
      if (!store.has(key)) return 0;
      this._setTTL(key, seconds * 1000);
      return 1;
    },

    async ttl(key) {
      // 인메모리에서는 정확한 TTL 추적이 어려우므로 -1 반환
      if (!store.has(key)) return -2;
      return -1;
    },

    _setTTL(key, ms) {
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
      }
      const timer = setTimeout(() => {
        store.delete(key);
        timers.delete(key);
      }, ms);
      // Node.js에서 타이머가 프로세스 종료를 막지 않도록
      if (timer.unref) timer.unref();
      timers.set(key, timer);
    },

    // rate-limit-redis가 사용하는 sendCommand 호환
    async sendCommand(command, ...args) {
      const cmd = command.toLowerCase();
      if (typeof this[cmd] === 'function') {
        return this[cmd](...args);
      }
      return null;
    },

    _isMemoryFallback: true
  };
}

/**
 * Redis 클라이언트 반환 (또는 인메모리 폴백 객체)
 */
export function getRedis() {
  if (redisClient) return redisClient;

  if (process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) {
            console.warn('⚠️ Redis 연결 실패, 인메모리 폴백으로 전환');
            redisClient = createMemoryStore();
            return null; // 재시도 중단
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis 연결 성공');
      });

      redisClient.on('error', (err) => {
        console.error('Redis 오류:', err.message);
      });

      // 연결 시도
      redisClient.connect().catch(() => {
        console.warn('⚠️ Redis 연결 불가, 인메모리 폴백 사용');
        redisClient = createMemoryStore();
      });

    } catch (err) {
      console.warn('⚠️ Redis 초기화 실패, 인메모리 폴백 사용:', err.message);
      redisClient = createMemoryStore();
    }
  } else {
    console.log('ℹ️ REDIS_URL 미설정, 인메모리 저장소 사용');
    redisClient = createMemoryStore();
  }

  return redisClient;
}

export default getRedis;
