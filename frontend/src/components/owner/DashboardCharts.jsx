import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DashboardCharts = ({ employees, attendance, salaryData, selectedMonth, isMobile }) => {

  // 1. 출근 현황 차트 (이번 달 일별)
  const attendanceChartData = useMemo(() => {
    if (!attendance || !selectedMonth) return [];

    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayRecords = attendance.filter(a => a.date === dateStr);
      const completed = dayRecords.filter(a => a.check_in_time && a.check_out_time).length;
      const late = dayRecords.filter(a => {
        if (!a.check_in_time) return false;
        const checkIn = new Date(a.check_in_time);
        return checkIn.getHours() >= 9 && checkIn.getMinutes() > 10;
      }).length;

      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      data.push({
        date: `${day}일`,
        출근: completed,
        지각: late,
        결근: Math.max(0, (employees?.filter(e => e.employment_status === 'active')?.length || 0) - completed - late)
      });
    }
    return data;
  }, [attendance, selectedMonth, employees]);

  // 2. 직원 현황 파이차트
  const employeeStatusData = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    const active = employees.filter(e => e.employment_status === 'active').length;
    const resigned = employees.filter(e => e.employment_status === 'resigned').length;
    const onLeave = employees.filter(e => e.employment_status === 'on_leave').length;

    return [
      { name: '재직', value: active },
      ...(resigned > 0 ? [{ name: '퇴사', value: resigned }] : []),
      ...(onLeave > 0 ? [{ name: '휴직', value: onLeave }] : [])
    ].filter(d => d.value > 0);
  }, [employees]);

  // 3. 급여 유형 분포
  const salaryTypeData = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    const hourly = employees.filter(e => e.salary_type === 'hourly').length;
    const monthly = employees.filter(e => e.salary_type === 'monthly').length;
    const daily = employees.filter(e => e.salary_type === 'daily').length;
    const noSalary = employees.filter(e => !e.salary_type).length;

    return [
      ...(monthly > 0 ? [{ name: '월급', value: monthly }] : []),
      ...(hourly > 0 ? [{ name: '시급', value: hourly }] : []),
      ...(daily > 0 ? [{ name: '일급', value: daily }] : []),
      ...(noSalary > 0 ? [{ name: '미설정', value: noSalary }] : [])
    ];
  }, [employees]);

  if (!employees || employees.length === 0) return null;

  const chartHeight = isMobile ? 200 : 280;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

      {/* 출근 현황 바 차트 */}
      {attendanceChartData.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', color: '#374151', fontSize: '15px' }}>
            📊 {selectedMonth} 출근 현황
          </h4>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={attendanceChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={isMobile ? 4 : 2} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="출근" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="지각" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="결근" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 직원 현황 파이차트 */}
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ margin: '0 0 16px', color: '#374151', fontSize: '15px' }}>
          👥 직원 현황
        </h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {employeeStatusData.length > 0 && (
            <ResponsiveContainer width={isMobile ? '100%' : '45%'} height={chartHeight}>
              <PieChart>
                <Pie
                  data={employeeStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 50}
                  outerRadius={isMobile ? 65 : 80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}명`}
                >
                  {employeeStatusData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          {salaryTypeData.length > 0 && (
            <ResponsiveContainer width={isMobile ? '100%' : '45%'} height={chartHeight}>
              <PieChart>
                <Pie
                  data={salaryTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 50}
                  outerRadius={isMobile ? 65 : 80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}명`}
                >
                  {salaryTypeData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
