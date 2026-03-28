import rateLimit from 'express-rate-limit';

// REDIS_URL이 없으면 store를 설정하지 않음 (express-rate-limit 기본 인메모리 사용)

// 로그인 시도 제한: 15분에 10회
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Redis 사용 시 store 설정 가능 (현재 인메모리)
});

// 회원가입 제한: 1시간에 5회
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '회원가입 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 일반 API 제한: 1분에 100회
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 비밀번호 재설정 제한: 15분에 5회
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '비밀번호 재설정 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});
