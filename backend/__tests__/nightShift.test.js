describe('Night Shift Detection', () => {
  // Replicate the isNightShift function
  const isNightShift = (workStartTime, workEndTime) => {
    if (!workStartTime || !workEndTime) return false;
    try {
      const [startH, startM] = workStartTime.split(':').map(Number);
      const [endH, endM] = workEndTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return endMinutes < startMinutes;
    } catch {
      return false;
    }
  };

  test('09:00-18:00 is NOT night shift', () => {
    expect(isNightShift('09:00', '18:00')).toBe(false);
  });

  test('22:00-06:00 IS night shift', () => {
    expect(isNightShift('22:00', '06:00')).toBe(true);
  });

  test('20:00-04:00 IS night shift', () => {
    expect(isNightShift('20:00', '04:00')).toBe(true);
  });

  test('06:00-14:00 is NOT night shift', () => {
    expect(isNightShift('06:00', '14:00')).toBe(false);
  });

  test('null times return false', () => {
    expect(isNightShift(null, null)).toBe(false);
    expect(isNightShift('09:00', null)).toBe(false);
    expect(isNightShift(null, '18:00')).toBe(false);
  });

  test('23:00-07:00 IS night shift', () => {
    expect(isNightShift('23:00', '07:00')).toBe(true);
  });
});
