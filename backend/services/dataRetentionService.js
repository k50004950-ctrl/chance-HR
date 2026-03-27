import { run, query } from '../config/database.js';

/**
 * 데이터 보관기간 자동 삭제 서비스
 * - 출근기록: 3년 보관 (근로기준법 제42조)
 * - 접근 로그(audit_logs): 3개월 보관 (통신비밀보호법)
 * - 급여/세금 기록: 5년 보관 (국세기본법) → 삭제하지 않음
 */
export const cleanExpiredData = async () => {
  const results = {
    attendance: 0,
    auditLogs: 0,
    errors: []
  };

  console.log('[데이터 보관기간 관리] 만료 데이터 정리 시작...');

  // 1. 출근 기록: 3년 경과 삭제 (근로기준법 제42조)
  try {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

    const result = await run(
      `DELETE FROM attendance WHERE date < ?`,
      [threeYearsAgoStr]
    );
    results.attendance = result.changes || 0;
    console.log(`[데이터 보관기간 관리] 출근 기록 ${results.attendance}건 삭제 (3년 초과, 기준일: ${threeYearsAgoStr})`);
  } catch (error) {
    console.error('[데이터 보관기간 관리] 출근 기록 삭제 오류:', error);
    results.errors.push({ type: 'attendance', error: error.message });
  }

  // 2. 접근 로그(audit_logs): 3개월 경과 삭제 (통신비밀보호법)
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString();

    const result = await run(
      `DELETE FROM audit_logs WHERE created_at < ?`,
      [threeMonthsAgoStr]
    );
    results.auditLogs = result.changes || 0;
    console.log(`[데이터 보관기간 관리] 접근 로그 ${results.auditLogs}건 삭제 (3개월 초과, 기준일: ${threeMonthsAgoStr})`);
  } catch (error) {
    console.error('[데이터 보관기간 관리] 접근 로그 삭제 오류:', error);
    results.errors.push({ type: 'audit_logs', error: error.message });
  }

  // 3. 급여/세금 기록: 삭제하지 않음 (국세기본법 5년 보관 의무)
  console.log('[데이터 보관기간 관리] 급여/세금 기록은 법적 보관 의무(5년)에 따라 삭제하지 않습니다.');

  console.log('[데이터 보관기간 관리] 완료', results);
  return results;
};
