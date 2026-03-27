import React from 'react';

const CalendarTab = ({
  selectedMonth,
  setSelectedMonth,
  buildOwnerCalendarDays,
  formatNameList
}) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#374151' }}>📅 캘린더</h3>
        <input
          type="month"
          className="form-input"
          style={{ width: 'auto' }}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#6b7280' }}>
          <span style={{ color: '#16a34a' }}>완료</span>
          <span style={{ color: '#f97316' }}>미완료</span>
          <span style={{ color: '#dc2626' }}>결근</span>
          <span style={{ color: '#2563eb' }}>연차</span>
          <span style={{ color: '#0ea5e9' }}>유급휴가</span>
          <span style={{ color: '#8b5cf6' }}>무급휴가</span>
          <span style={{ color: '#dc2626' }}>공휴일</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
          <div
            key={label}
            style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}
          >
            {label}
          </div>
        ))}
        {buildOwnerCalendarDays().map((day) => {
          if (day.empty) {
            return <div key={day.key} style={{ height: '120px' }} />;
          }
          return (
            <div
              key={day.key}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                minHeight: '120px',
                background: day.holiday ? '#fef2f2' : 'white'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '600', color: day.holiday ? '#dc2626' : '#374151' }}>
                {day.day}
              </div>
              {day.holiday && (
                <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                  {day.holiday}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                완료 {day.completed} / 미완료 {day.incomplete}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                결근 {day.absent}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                휴가 {day.annual + day.paid + day.unpaid}
              </div>
              {day.completedNames.length > 0 && (
                <div style={{ fontSize: '10px', color: '#15803d', marginTop: '4px' }}>
                  완료: {formatNameList(day.completedNames)}
                </div>
              )}
              {day.absentNames.length > 0 && (
                <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '4px' }}>
                  결근: {formatNameList(day.absentNames)}
                </div>
              )}
              {day.incompleteNames.length > 0 && (
                <div style={{ fontSize: '10px', color: '#c2410c', marginTop: '4px' }}>
                  미완료: {formatNameList(day.incompleteNames)}
                </div>
              )}
              {day.leaveNames.length > 0 && (
                <div style={{ fontSize: '10px', color: '#1d4ed8', marginTop: '4px' }}>
                  휴가: {formatNameList(day.leaveNames)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarTab;
