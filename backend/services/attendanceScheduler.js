import { query, run } from '../config/database.js';
import { sendPushToUser } from './webPush.js';
import { createNotification } from '../routes/notifications.js';
import { cleanExpiredData } from './dataRetentionService.js';

// 한국 시간대 날짜/시간 가져오기
const getKstNow = () => {
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (kstOffset * 60000));
};

const getKstDateString = (date = null) => {
  const d = date || getKstNow();
  return d.toISOString().split('T')[0];
};

// 야간근무 판별: 근무종료시간 < 근무시작시간이면 야간 (예: 22:00~06:00)
const isNightShift = (workStartTime, workEndTime) => {
  if (!workStartTime || !workEndTime) return false;
  try {
    const [startH, startM] = workStartTime.split(':').map(Number);
    const [endH, endM] = workEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes < startMinutes; // 06:00(360) < 22:00(1320) = true
  } catch {
    return false;
  }
};

// 미퇴근 기록 조회 공용 쿼리
const getIncompleteRecords = async (dateStr) => {
  return query(
    `SELECT
      a.id as attendance_id,
      a.user_id,
      a.workplace_id,
      a.check_in_time,
      a.date,
      u.name as user_name,
      ed.work_days,
      ed.work_start_time,
      ed.work_end_time,
      w.name as workplace_name,
      w.owner_id
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    JOIN workplaces w ON a.workplace_id = w.id
    LEFT JOIN employee_details ed ON ed.user_id = u.id
    WHERE a.date = ?
    AND a.check_in_time IS NOT NULL
    AND a.check_out_time IS NULL
    AND a.leave_type IS NULL`,
    [dateStr]
  );
};

// 퇴근 미체크 알림 (30분마다)
export const checkIncompleteCheckouts = async () => {
  try {
    const now = getKstNow();
    const today = getKstDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    console.log(`[퇴근 체크 스케줄러] 실행 중... ${now.toISOString()}`);

    // 오늘 + 전일(야간근무) 미퇴근 기록 조회
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getKstDateString(yesterday);

    const todayRecords = await getIncompleteRecords(today);
    const yesterdayRecords = await getIncompleteRecords(yesterdayStr);

    // 야간근무자: 전일 출근했지만 아직 근무 중인 건
    const nightShiftRecords = yesterdayRecords.filter(r =>
      isNightShift(r.work_start_time, r.work_end_time)
    );

    const allRecords = [...todayRecords, ...nightShiftRecords];

    if (allRecords.length === 0) {
      console.log('[퇴근 체크 스케줄러] 미완료 출퇴근 기록 없음');
      return;
    }

    console.log(`[퇴근 체크 스케줄러] ${allRecords.length}개 미완료 기록 발견 (야간: ${nightShiftRecords.length}건)`);

    for (const record of allRecords) {
      try {
        const checkInTime = new Date(record.check_in_time);
        const checkInKst = new Date(checkInTime.getTime() + (9 * 60 * 60 * 1000));
        const hoursElapsed = (now - checkInKst) / (1000 * 60 * 60);

        // 1. 6시간 경과 시 경고 알림
        if (hoursElapsed >= 6 && hoursElapsed < 6.5) {
          console.log(`[퇴근 미체크 경고] ${record.user_name} - 출근 후 6시간 경과`);

          await sendPushToUser(record.user_id, {
            title: '🚨 퇴근 체크 필수!',
            body: '출근 후 6시간이 경과했습니다. 반드시 퇴근 체크를 해주세요!',
            url: `${process.env.FRONTEND_URL || ''}`
          }).catch(err => console.error('근로자 알림 실패:', err));

          if (record.owner_id) {
            await sendPushToUser(record.owner_id, {
              title: '🚨 퇴근 미체크 경고',
              body: `${record.user_name}님이 출근 후 6시간이 경과했지만 퇴근 체크를 하지 않았습니다. (${record.workplace_name})`,
              url: `${process.env.FRONTEND_URL || ''}`
            }).catch(err => console.error('사업주 알림 실패:', err));
          }
        }

        // 2. 근무 종료 시간 확인 및 알림
        if (record.work_end_time) {
          try {
            const [endHour, endMinute] = record.work_end_time.split(':').map(Number);
            let scheduledEndMinutes = endHour * 60 + endMinute;

            // 야간근무: 종료시간이 다음날이므로, 오늘 날짜 기준으로 비교
            const isNight = isNightShift(record.work_start_time, record.work_end_time);
            let timeSinceEnd;

            if (isNight && record.date !== today) {
              // 전일 출근 야간근무자: 오늘 종료시간과 현재 비교
              timeSinceEnd = currentTimeMinutes - scheduledEndMinutes;
            } else if (!isNight) {
              // 주간근무: 같은 날 종료시간과 비교
              timeSinceEnd = currentTimeMinutes - scheduledEndMinutes;
            } else {
              continue; // 오늘 출근한 야간근무자는 아직 종료 전
            }

            if (timeSinceEnd >= 30 && timeSinceEnd < 60) {
              console.log(`[퇴근 알림] ${record.user_name} - 근무 종료 시간 ${timeSinceEnd}분 경과`);

              await sendPushToUser(record.user_id, {
                title: '🔔 퇴근 체크 알림',
                body: `근무 종료 시간이 지났습니다. 퇴근 체크를 해주세요!`,
                url: `${process.env.FRONTEND_URL || ''}`
              }).catch(err => console.error('근로자 알림 실패:', err));

              if (record.owner_id) {
                await sendPushToUser(record.owner_id, {
                  title: '🔔 퇴근 미체크 알림',
                  body: `${record.user_name}님이 근무 종료 시간이 지났지만 퇴근 체크를 하지 않았습니다. (${record.workplace_name})`,
                  url: `${process.env.FRONTEND_URL || ''}`
                }).catch(err => console.error('사업주 알림 실패:', err));
              }
            }
          } catch (parseError) {
            console.error(`[근무시간 파싱 오류] ${record.user_name}:`, parseError);
          }
        }
      } catch (recordError) {
        console.error(`[레코드 처리 오류] ${record.user_name}:`, recordError);
      }
    }

    console.log('[퇴근 체크 스케줄러] 완료');
  } catch (error) {
    console.error('[퇴근 체크 스케줄러 오류]:', error);
  }
};

// 자동 퇴근 처리 (주간근무자) - 매일 00:05 KST
export const autoCheckoutDayShift = async () => {
  try {
    const now = getKstNow();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getKstDateString(yesterday);

    console.log(`[자동 퇴근-주간] 전일(${yesterdayStr}) 주간 미퇴근 기록 처리...`);

    const incompleteRecords = await getIncompleteRecords(yesterdayStr);

    // 야간근무자는 제외 (오전에 별도 처리)
    const dayShiftRecords = incompleteRecords.filter(r =>
      !isNightShift(r.work_start_time, r.work_end_time)
    );
    const skippedNight = incompleteRecords.length - dayShiftRecords.length;

    if (dayShiftRecords.length === 0) {
      console.log(`[자동 퇴근-주간] 처리할 기록 없음 (야간근무 ${skippedNight}건 보류)`);
      return;
    }

    console.log(`[자동 퇴근-주간] ${dayShiftRecords.length}건 처리 (야간근무 ${skippedNight}건 보류)`);

    for (const record of dayShiftRecords) {
      await processAutoCheckout(record, yesterdayStr, false);
    }

    console.log('[자동 퇴근-주간] 완료');
  } catch (error) {
    console.error('[자동 퇴근-주간 오류]:', error);
  }
};

// 자동 퇴근 처리 (야간근무자) - 매일 10:00 KST
export const autoCheckoutNightShift = async () => {
  try {
    const now = getKstNow();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getKstDateString(yesterday);

    // 이틀 전 기록도 확인 (혹시 전날 자정 처리에서 누락된 야간근무)
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = getKstDateString(twoDaysAgo);

    console.log(`[자동 퇴근-야간] 야간근무 미퇴근 기록 처리...`);

    const yesterdayRecords = await getIncompleteRecords(yesterdayStr);
    const twoDaysAgoRecords = await getIncompleteRecords(twoDaysAgoStr);

    // 야간근무자만 필터
    const nightRecords = [
      ...twoDaysAgoRecords.filter(r => isNightShift(r.work_start_time, r.work_end_time)),
      ...yesterdayRecords.filter(r => isNightShift(r.work_start_time, r.work_end_time))
    ];

    if (nightRecords.length === 0) {
      console.log('[자동 퇴근-야간] 처리할 야간근무 기록 없음');
      return;
    }

    console.log(`[자동 퇴근-야간] ${nightRecords.length}건 야간근무 자동 퇴근 처리`);

    for (const record of nightRecords) {
      // 야간근무: 퇴근 시간은 출근일 다음 날의 work_end_time
      const checkInDate = new Date(record.date + 'T00:00:00');
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = getKstDateString(nextDay);

      await processAutoCheckout(record, nextDayStr, true);
    }

    console.log('[자동 퇴근-야간] 완료');
  } catch (error) {
    console.error('[자동 퇴근-야간 오류]:', error);
  }
};

// 공통 자동 퇴근 처리 로직
const processAutoCheckout = async (record, checkoutDateStr, isNight) => {
  try {
    let checkOutTime;
    if (record.work_end_time) {
      checkOutTime = `${checkoutDateStr} ${record.work_end_time}:00`;
    } else {
      // 야간근무인데 종료시간 없으면 다음날 06:00, 주간이면 23:59
      checkOutTime = isNight
        ? `${checkoutDateStr} 06:00:00`
        : `${record.date} 23:59:00`;
    }

    // 근무시간 계산
    const checkIn = new Date(record.check_in_time);
    const checkOut = new Date(checkOutTime);
    const workHours = Math.max(0, (checkOut - checkIn) / (1000 * 60 * 60));

    const statusLabel = isNight ? 'auto_checkout_night' : 'auto_checkout';

    await run(
      `UPDATE attendance
       SET check_out_time = ?, work_hours = ?, status = ?
       WHERE id = ?`,
      [checkOutTime, Math.round(workHours * 100) / 100, statusLabel, record.attendance_id]
    );

    const shiftType = isNight ? '야간' : '주간';
    console.log(`  ✅ ${record.user_name} (${shiftType}) - 자동 퇴근 (${checkOutTime}, ${workHours.toFixed(1)}h)`);

    // 사업주에게 푸시 + DB 알림
    if (record.owner_id) {
      const notifTitle = `자동 퇴근 처리 (${shiftType})`;
      const notifMsg = `${record.user_name}님의 ${record.date} ${shiftType}근무 기록이 자동 퇴근 처리되었습니다.`;

      await sendPushToUser(record.owner_id, {
        title: `⚠️ ${notifTitle}`,
        body: notifMsg,
        url: `${process.env.FRONTEND_URL || ''}`
      }).catch(err => console.error('사업주 알림 실패:', err));

      await createNotification(record.owner_id, {
        type: 'attendance',
        title: notifTitle,
        message: notifMsg,
        urgent: false
      });
    }
  } catch (recordError) {
    console.error(`[자동 퇴근 오류] ${record.user_name}:`, recordError);
  }
};

// 스케줄러 시작
export const startAttendanceScheduler = () => {
  console.log('✅ 출퇴근 자동 관리 스케줄러 시작 (30분 체크 + 자정 주간퇴근 + 오전 야간퇴근)');

  // 즉시 한 번 실행
  checkIncompleteCheckouts();

  // 30분마다 미퇴근 체크 실행
  setInterval(checkIncompleteCheckouts, 30 * 60 * 1000);

  // 스케줄 등록: KST 기준 특정 시각에 실행
  const scheduleAtKstTime = (hour, minute, fn, label) => {
    const now = getKstNow();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);

    // 이미 지났으면 내일로
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const msUntil = target - now;
    console.log(`⏰ ${label}: ${target.toISOString()} (${Math.round(msUntil / 60000)}분 후)`);

    setTimeout(() => {
      fn();
      setInterval(fn, 24 * 60 * 60 * 1000);
    }, msUntil);
  };

  // 00:05 KST - 주간근무 자동 퇴근
  scheduleAtKstTime(0, 5, autoCheckoutDayShift, '주간근무 자동 퇴근');

  // 10:00 KST - 야간근무 자동 퇴근
  scheduleAtKstTime(10, 0, autoCheckoutNightShift, '야간근무 자동 퇴근');

  // 03:00 KST - 데이터 보관기간 만료 데이터 자동 삭제
  scheduleAtKstTime(3, 0, cleanExpiredData, '데이터 보관기간 자동 삭제');

  // 서버 시작 시 한 번 실행 (미처리 건 정리)
  autoCheckoutDayShift();
  autoCheckoutNightShift();
};
