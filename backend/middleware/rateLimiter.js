import rateLimit from 'express-rate-limit';

// Redis store 생성 (REDIS_URL이 있을 때만)
async function createStore(prefix) {
  if (!process.env.REDIS_URL) return undefined;
  try {
    const { getRedis } = await import('../config/redis.js');
    const { RedisStore } = await import('rate-limit-redis');
    const redis = getRedis();
    if (redis._isMemoryFallback) return undefined;
    return new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`
    });
  } catch {
    return undefined;
  }
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
