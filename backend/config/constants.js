// 중앙화된 설정값 - 앱 전체에서 이 파일을 import하여 사용
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 명시적으로 development/test 환경일 때만 fallback 허용.
// (NODE_ENV 미설정/오설정 등 그 외 모든 경우는 production처럼 fail-closed)
const IS_DEV_ENV = ['development', 'test'].includes(process.env.NODE_ENV);

// JWT_SECRET 필수 검증 (import 시 자동 실행)
// 'production'이 아니어도, 명시적 dev/test가 아니면 fail-closed 한다.
if (!JWT_SECRET && !IS_DEV_ENV) {
  console.error('❌ FATAL: JWT_SECRET 환경변수가 설정되지 않았습니다.');
  console.error('   프로덕션/스테이징에서는 반드시 JWT_SECRET을 설정해주세요.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET 미설정 - 개발용 기본값 사용 중 (프로덕션에서는 위험!)');
}

// 개발환경(development/test) 전용 fallback - 그 외 환경에서는 위에서 exit됨
export const JWT_SECRET_SAFE = JWT_SECRET || 'dev-only-secret-DO-NOT-USE-IN-PRODUCTION';
