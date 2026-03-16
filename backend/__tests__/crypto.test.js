import { encrypt, decrypt, encryptSSN, decryptSSN, isEncrypted } from '../utils/crypto.js';

describe('Crypto Utils', () => {
  test('encrypt and decrypt should be reversible', () => {
    const plaintext = '9001011234567';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  test('encrypt should return iv:data:tag format', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
  });

  test('decrypt should handle plain text (legacy)', () => {
    expect(decrypt('plaintext')).toBe('plaintext');
  });

  test('decrypt null should return null', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt('')).toBeNull();
  });

  test('encryptSSN should not double-encrypt', () => {
    const ssn = '9001011234567';
    const first = encryptSSN(ssn);
    const second = encryptSSN(first);
    expect(second).toBe(first); // Should not re-encrypt
  });

  test('isEncrypted should detect encrypted values', () => {
    const encrypted = encrypt('test');
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted('plaintext')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });

  test('decryptSSN should handle null', () => {
    expect(decryptSSN(null)).toBeNull();
    expect(decryptSSN(undefined)).toBeNull();
  });
});
