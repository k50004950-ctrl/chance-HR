import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis } from '../config/redis.js';
import type { MemoryStore } from '../types/index.js';

// Redis store 생성 (REDIS_URL이 있을 때만)
function createStore(prefix: string): any {
  const redis = getRedis() as MemoryStore;
  if (redis._isMemoryFallback) {
    return undefined; // express-rate-limit 기본 인메모리 store 사용
  }
  return new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: `rl:${prefix}:`
  });
}

// 로그인 시도 제한: 15분에 10회
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('login')
});

// 회원가입 제한: 1시간에 5회
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '회원가입 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('signup')
});

// 일반 API 제한: 1분에 100회
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('api')
});

// 비밀번호 재설정 제한: 15분에 5회
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '비밀번호 재설정 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('pwreset')
});
