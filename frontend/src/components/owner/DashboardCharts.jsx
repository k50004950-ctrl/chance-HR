import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DashboardCharts = ({ employees, attendance, selectedMonth, isMobile }) => {

  const attendanceChartData = useMemo(() => {
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0 || !selectedMonth) return [];

    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const activeCount = employees?.filter(e => e.employment_status === 'active')?.length || 0;
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dayRecords = attendance.filter(a => a.date === dateStr);
      const completed = dayRecords.filter(a => a.check_in_time && a.check_out_time).length;
      const late = dayRecords.filter(a => {
        if (!a.check_in_time) return false;
        const checkIn = new Date(a.check_in_time);
        return checkIn.getHours() >= 9 && checkIn.getMinutes() > 10;
      }).length;

      data.push({
        date: `${day}`,
        출근: completed,
        지각: late,
        결근: Math.max(0, activeCount - completed - late)
      });
    }
    return data;
  }, [attendance, selectedMonth, employees]);

  const employeeStatusData = useMemo(() => {
    if (!employees || !Array.isArray(employees) || employees.length === 0) return [];
    const active = employees.filter(e => e.employment_status === 'active').length;
    const resigned = employees.filter(e => e.employment_status === 'resigned').length;
    const onLeave = employees.filter(e => e.employment_status === 'on_leave').length;
    return [
      { name: '재직', value: active },
      ...(resigned > 0 ? [{ name: '퇴사', value: resigned }] : []),
      ...(onLeave > 0 ? [{ name: '휴직', value: onLeave }] : [])
    ].filter(d => d.value > 0);
  }, [employees]);

  const salaryTypeData = useMemo(() => {
    if (!employees || !Array.isArray(employees) || employees.length === 0) return [];
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

  const hasAttendanceData = attendanceChartData.length > 0 && attendanceChartData.some(d => d.출근 > 0 || d.지각 > 0);
  const hasEmployeeData = employeeStatusData.length > 0;
  const hasSalaryData = salaryTypeData.length > 0;

  if (!hasAttendanceData && !hasEmployeeData && !hasSalaryData) return null;

  const chartHeight = isMobile ? 180 : 260;

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* 출근 현황 바 차트 */}
      {hasAttendanceData && (
        <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
          <h4 style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px' }}>
            📊 {selectedMonth} 출근 현황
          </h4>
          <div style={{ width: '100%', minWidth: 50, height: chartHeight, minHeight: 50 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={isMobile ? 4 : 2} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="출근" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="지각" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="결근" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 직원/급여 파이차트 */}
      {(hasEmployeeData || hasSalaryData) && (
        <div style={{ display: 'grid', gridTemplateColumns: hasEmployeeData && hasSalaryData ? '1fr 1fr' : '1fr', gap: '12px' }}>
          {hasEmployeeData && (
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ margin: '0 0 8px', color: '#374151', fontSize: '14px', textAlign: 'center' }}>
                👥 직원 현황
              </h4>
              <div style={{ width: '100%', minWidth: 50, height: isMobile ? 160 : 200, minHeight: 50 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={employeeStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 45}
                      outerRadius={isMobile ? 55 : 70}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name} ${value}`}
                    >
                      {employeeStatusData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {hasSalaryData && (
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ margin: '0 0 8px', color: '#374151', fontSize: '14px', textAlign: 'center' }}>
                💰 급여 유형
              </h4>
              <div style={{ width: '100%', minWidth: 50, height: isMobile ? 160 : 200, minHeight: 50 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salaryTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 45}
                      outerRadius={isMobile ? 55 : 70}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name} ${value}`}
                    >
                      {salaryTypeData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardCharts;
