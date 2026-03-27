// 중앙화된 설정값 - 앱 전체에서 이 파일을 import하여 사용

export const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

// JWT_SECRET 필수 검증 (import 시 자동 실행)
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET 환경변수가 설정되지 않았습니다.');
  console.error('   프로덕션에서는 반드시 JWT_SECRET을 설정해주세요.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.warn('JWT_SECRET 미설정 - 개발용 기본값 사용 중 (프로덕션에서는 위험!)');
}

// 개발환경 fallback (프로덕션에서는 위에서 exit됨)
export const JWT_SECRET_SAFE: string = JWT_SECRET || 'dev-only-secret-DO-NOT-USE-IN-PRODUCTION';
