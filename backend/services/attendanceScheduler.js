import { query, run } from '../config/database.js';
import { sendPushToUser } from './webPush.js';

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

// 퇴근 미체크 알림 및 자동 처리
export const checkIncompleteCheckouts = async () => {
  try {
    const now = getKstNow();
    const today = getKstDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    console.log(`[퇴근 체크 스케줄러] 실행 중... ${now.toISOString()}`);

    // 오늘 출근했지만 퇴근하지 않은 기록 조회
    const incompleteRecords = await query(
      `SELECT 
        a.id as attendance_id,
        a.user_id,
        a.workplace_id,
        a.check_in_time,
        a.date,
        u.name as user_name,
        u.work_days,
        u.work_hours,
        w.name as workplace_name,
        w.owner_id
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      JOIN workplaces w ON a.workplace_id = w.id
      WHERE a.date = ? 
      AND a.check_in_time IS NOT NULL 
      AND a.check_out_time IS NULL
      AND a.leave_type IS NULL`,
      [today]
    );

    if (incompleteRecords.length === 0) {
      console.log('[퇴근 체크 스케줄러] 미완료 출퇴근 기록 없음');
      return;
    }

    console.log(`[퇴근 체크 스케줄러] ${incompleteRecords.length}개 미완료 기록 발견`);

    for (const record of incompleteRecords) {
      try {
        const checkInTime = new Date(record.check_in_time);
        const checkInKst = new Date(checkInTime.getTime() + (9 * 60 * 60 * 1000)); // UTC -> KST
        const hoursElapsed = (now - checkInKst) / (1000 * 60 * 60); // 시간 차이

        // 1. 6시간 경과 시 자동 퇴근 처리
        if (hoursElapsed >= 6) {
          const autoCheckOutTime = new Date(checkInKst.getTime() + (6 * 60 * 60 * 1000));
          const workHours = 6;

          await run(
            `UPDATE attendance 
             SET check_out_time = ?, 
                 work_hours = ?, 
                 status = 'auto_completed',
                 check_out_lat = check_in_lat,
                 check_out_lng = check_in_lng
             WHERE id = ?`,
            [autoCheckOutTime.toISOString(), workHours, record.attendance_id]
          );

          console.log(`[자동 퇴근 처리] ${record.user_name} - 출근 후 6시간 경과`);

          // 근로자에게 알림
          await sendPushToUser(record.user_id, {
            title: '⚠️ 자동 퇴근 처리',
            body: '출근 후 6시간이 경과하여 자동으로 퇴근 처리되었습니다. 퇴근 체크를 잊지 마세요!',
            url: `${process.env.FRONTEND_URL || ''}`
          }).catch(err => console.error('근로자 알림 실패:', err));

          // 사업주에게 알림
          if (record.owner_id) {
            await sendPushToUser(record.owner_id, {
              title: '⚠️ 자동 퇴근 처리',
              body: `${record.user_name}님이 퇴근 체크를 하지 않아 자동 처리되었습니다. (${record.workplace_name})`,
              url: `${process.env.FRONTEND_URL || ''}`
            }).catch(err => console.error('사업주 알림 실패:', err));

          continue; // 다음 레코드로
        }

        // 2. 근무 종료 시간 확인 및 알림
        if (record.work_hours) {
          try {
            // 근무 시간 파싱 (예: "mon:09:00-18:00,tue:09:00-18:00")
            const workHoursData = record.work_hours.split(',');
            const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
            const currentDay = now.getDay();

            for (const daySchedule of workHoursData) {
              const [day, timeRange] = daySchedule.split(':');
              if (dayMap[day.toLowerCase()] === currentDay && timeRange) {
                const [startTime, endTime] = timeRange.split('-');
                if (endTime) {
                  const [endHour, endMinute] = endTime.split(':').map(Number);
                  const scheduledEndMinutes = endHour * 60 + endMinute;

                  // 근무 종료 시간이 지났는지 확인 (30분 여유)
                  const timeSinceEnd = currentTimeMinutes - scheduledEndMinutes;

                  if (timeSinceEnd >= 30 && timeSinceEnd < 60) {
                    // 30분~1시간 사이에만 알림 (중복 방지)
                    console.log(`[퇴근 알림] ${record.user_name} - 근무 종료 시간 ${timeSinceEnd}분 경과`);

                    // 근로자에게 알림
                    await sendPushToUser(record.user_id, {
                      title: '🔔 퇴근 체크 알림',
                      body: `근무 종료 시간이 지났습니다. 퇴근 체크를 해주세요!`,
                      url: `${process.env.FRONTEND_URL || ''}`
                    }).catch(err => console.error('근로자 알림 실패:', err));

                    // 사업주에게 알림
                    if (record.owner_id) {
                      await sendPushToUser(record.owner_id, {
                        title: '🔔 퇴근 미체크 알림',
                        body: `${record.user_name}님이 근무 종료 시간이 지났지만 퇴근 체크를 하지 않았습니다. (${record.workplace_name})`,
                        url: `${process.env.FRONTEND_URL || ''}`
                      }).catch(err => console.error('사업주 알림 실패:', err));
                    }
                  }
                }
                break;
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

// 스케줄러 시작 (30분마다 실행)
export const startAttendanceScheduler = () => {
  console.log('✅ 출퇴근 자동 관리 스케줄러 시작 (30분 간격)');
  
  // 즉시 한 번 실행
  checkIncompleteCheckouts();
  
  // 30분마다 실행
  setInterval(checkIncompleteCheckouts, 30 * 60 * 1000);
};
