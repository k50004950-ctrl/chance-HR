import {
  getRecoveryCredentialRequirement,
  normalizeRecoveryCredential
} from '../utils/accountRecovery.js';

describe('Account recovery credential rules', () => {
  test('owner recovery uses business number, not resident registration number', () => {
    const requirement = getRecoveryCredentialRequirement('owner');

    expect(requirement.field).toBe('business_number');
    expect(requirement.pattern.test('1234567890')).toBe(true);
    expect(requirement.pattern.test('1234567')).toBe(false);
    expect(requirement.invalidMessage).toBe('사업주는 사업자등록번호 10자리를 입력해주세요.');
    expect(requirement.invalidMessage).not.toContain('주민');
  });

  test('employee recovery uses last 7 digits of resident registration number', () => {
    const requirement = getRecoveryCredentialRequirement('employee');

    expect(requirement.field).toBe('ssn_last7');
    expect(requirement.pattern.test('1234567')).toBe(true);
    expect(requirement.pattern.test('1234567890')).toBe(false);
    expect(requirement.invalidMessage).toContain('주민등록번호 뒤 7자리');
  });

  test('credential normalization keeps digits only', () => {
    expect(normalizeRecoveryCredential('123-45-67890')).toBe('1234567890');
    expect(normalizeRecoveryCredential('  123456-7654321  ')).toBe('1234567654321');
    expect(normalizeRecoveryCredential(null)).toBe('');
  });
});
