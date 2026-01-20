import { query, run } from '../config/database.js';
import { sendPushToUser } from './webPush.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date) => {
  if (!date) return null;
  const d = startOfDay(date);
  return d.toISOString().slice(0, 10);
};

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const buildMonthlyPayDate = (year, monthIndex, payDay) => {
  const lastDay = daysInMonth(year, monthIndex);
  const day = !payDay || payDay <= 0 ? lastDay : Math.min(payDay, lastDay);
  return new Date(year, monthIndex, day);
};

export const getNextPayDate = (schedule) => {
  const today = startOfDay(new Date());
  if (!schedule) return null;

  const type = schedule.pay_schedule_type;
  if (type === 'after_hire_days') {
    const hireDate = schedule.hire_date ? new Date(schedule.hire_date) : null;
    const afterDays = Number(schedule.pay_after_days || 0);
    if (!hireDate || Number.isNaN(hireDate.getTime()) || afterDays <= 0) return null;

    const firstPayDate = startOfDay(new Date(hireDate.getTime() + afterDays * MS_PER_DAY));
    if (today <= firstPayDate) return firstPayDate;

    const diffDays = Math.floor((today - firstPayDate) / MS_PER_DAY);
    const cycles = Math.floor(diffDays / afterDays) + 1;
    return startOfDay(new Date(firstPayDate.getTime() + cycles * afterDays * MS_PER_DAY));
  }

  if (type === 'monthly_fixed') {
    const payDay = Number(schedule.pay_day || 0);
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    const candidate = buildMonthlyPayDate(year, monthIndex, payDay);
    if (today <= candidate) return candidate;
    return buildMonthlyPayDate(year, monthIndex + 1, payDay);
  }

  return null;
};

export const sendPaydayNotifications = async () => {
  try {
    const rows = await query(`
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.workplace_id,
        ed.hire_date,
        ed.pay_schedule_type,
        ed.pay_day,
        ed.pay_after_days,
        ed.payroll_period_start_day,
        ed.payroll_period_end_day,
        ed.last_pay_notice_date,
        w.owner_id AS owner_id
      FROM users u
      JOIN workplaces w ON u.workplace_id = w.id
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      WHERE u.role = 'employee'
        AND u.employment_status = 'active'
        AND ed.pay_schedule_type IS NOT NULL
    `);

    const today = startOfDay(new Date());
    const todayKey = formatDate(today);
    const notifyMap = new Map();
    const updates = [];

    rows.forEach((row) => {
      const nextPayDate = getNextPayDate(row);
      if (!nextPayDate) return;

      const diffDays = Math.ceil((startOfDay(nextPayDate) - today) / MS_PER_DAY);
      if (diffDays !== 5) return;

      if (row.last_pay_notice_date === todayKey) return;

      const ownerId = row.owner_id;
      const payload = notifyMap.get(ownerId) || [];
      payload.push({
        employeeName: row.user_name,
        payDate: formatDate(nextPayDate)
      });
      notifyMap.set(ownerId, payload);
      updates.push({ userId: row.user_id });
    });

    for (const [ownerId, items] of notifyMap.entries()) {
      const summary = items
        .map((item) => `${item.employeeName}(${item.payDate})`)
        .join(', ');
      await sendPushToUser(ownerId, {
        title: '급여일 D-5 알림',
        body: `급여일이 5일 남았습니다: ${summary}`
      });
    }

    for (const update of updates) {
      await run('UPDATE employee_details SET last_pay_notice_date = ? WHERE user_id = ?', [
        todayKey,
        update.userId
      ]);
    }
  } catch (error) {
    console.error('급여일 알림 처리 오류:', error);
  }
};

export const startPaydayScheduler = () => {
  const runJob = async () => {
    await sendPaydayNotifications();
  };

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(9, 0, 0, 0);
    if (now >= next) {
      next.setDate(next.getDate() + 1);
    }
    const delay = next.getTime() - now.getTime();
    setTimeout(async () => {
      await runJob();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
};
