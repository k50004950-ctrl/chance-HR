describe('Input Validation Rules', () => {
  test('username regex allows valid usernames', () => {
    const regex = /^[a-zA-Z0-9_]+$/;
    expect(regex.test('admin')).toBe(true);
    expect(regex.test('user_123')).toBe(true);
    expect(regex.test('Test_User')).toBe(true);
  });

  test('username regex rejects invalid characters', () => {
    const regex = /^[a-zA-Z0-9_]+$/;
    expect(regex.test('user name')).toBe(false);
    expect(regex.test('user@name')).toBe(false);
    expect(regex.test("admin'; DROP TABLE")).toBe(false);
    expect(regex.test('<script>alert(1)</script>')).toBe(false);
  });

  test('phone regex allows valid formats', () => {
    const regex = /^[0-9\-]+$/;
    expect(regex.test('010-1234-5678')).toBe(true);
    expect(regex.test('01012345678')).toBe(true);
  });

  test('phone regex rejects invalid input', () => {
    const regex = /^[0-9\-]+$/;
    expect(regex.test('abc')).toBe(false);
    expect(regex.test('+82-10-1234')).toBe(false);
  });

  test('SSN format validation (13 digits)', () => {
    const regex = /^\d{13}$/;
    expect(regex.test('9001011234567')).toBe(true);
    expect(regex.test('900101123456')).toBe(false); // 12 digits
    expect(regex.test('90010112345678')).toBe(false); // 14 digits
    expect(regex.test('900101-1234567')).toBe(false); // with hyphen
  });

  test('business number format (10 digits)', () => {
    const regex = /^\d{10}$/;
    expect(regex.test('1234567890')).toBe(true);
    expect(regex.test('123-45-67890')).toBe(false);
    expect(regex.test('12345')).toBe(false);
  });
});
