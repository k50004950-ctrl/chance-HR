describe('Annual Leave Calculation (근로기준법)', () => {

  // Helper: calculate annual leave
  const calculateAnnualLeave = (hireDateStr) => {
    const hireDate = new Date(hireDateStr);
    const now = new Date();
    const diffMs = now - hireDate;
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (diffYears < 1) {
      // Under 1 year: 1 day per month worked (max 11)
      const monthsWorked = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      return Math.min(monthsWorked, 11);
    } else {
      // 1+ years: 15 base + 1 per 2 years over first year (max 25)
      const yearsOver1 = Math.floor(diffYears - 1);
      const bonus = Math.floor(yearsOver1 / 2);
      return Math.min(15 + bonus, 25);
    }
  };

  test('new hire (0 months) should get 0 days', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(calculateAnnualLeave(today)).toBe(0);
  });

  test('6 months should get 5-6 days', () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const result = calculateAnnualLeave(sixMonthsAgo.toISOString().split('T')[0]);
    expect(result).toBeGreaterThanOrEqual(5);
    expect(result).toBeLessThanOrEqual(6);
  });

  test('11 months should get 10-11 days (max for under 1 year)', () => {
    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
    const result = calculateAnnualLeave(elevenMonthsAgo.toISOString().split('T')[0]);
    expect(result).toBeGreaterThanOrEqual(10);
    expect(result).toBeLessThanOrEqual(11);
  });

  test('1 year should get 15 days', () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setDate(oneYearAgo.getDate() - 1); // just past 1 year
    expect(calculateAnnualLeave(oneYearAgo.toISOString().split('T')[0])).toBe(15);
  });

  test('3 years should get 16 days (15 + 1)', () => {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    threeYearsAgo.setDate(threeYearsAgo.getDate() - 1);
    expect(calculateAnnualLeave(threeYearsAgo.toISOString().split('T')[0])).toBe(16);
  });

  test('5 years should get 17 days (15 + 2)', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    fiveYearsAgo.setDate(fiveYearsAgo.getDate() - 1);
    expect(calculateAnnualLeave(fiveYearsAgo.toISOString().split('T')[0])).toBe(17);
  });

  test('21+ years should cap at 25 days', () => {
    const twentyOneYearsAgo = new Date();
    twentyOneYearsAgo.setFullYear(twentyOneYearsAgo.getFullYear() - 25);
    expect(calculateAnnualLeave(twentyOneYearsAgo.toISOString().split('T')[0])).toBe(25);
  });
});
