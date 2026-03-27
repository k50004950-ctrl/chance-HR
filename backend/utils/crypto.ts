import crypto from 'crypto';

// AES-256-GCM encryption for sensitive data (SSN, etc.)
const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY 또는 JWT_SECRET 환경변수가 설정되지 않았습니다. 프로덕션에서는 필수입니다.');
    }
    // 개발 환경 전용 기본 키
    return crypto.createHash('sha256').update('dev-only-key-not-for-production').digest();
  }
  // Derive a consistent 32-byte key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a plaintext string
 * Returns format: iv:encrypted:authTag (all hex-encoded)
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  const text = String(plaintext);
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:encrypted:authTag (all hex-encoded)
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;

  const text = String(encryptedText);

  // If the text doesn't look encrypted (no colons), return as-is (legacy plain text)
  if (!text.includes(':')) {
    return text;
  }

  const parts = text.split(':');
  if (parts.length !== 3) {
    // Not in expected format, return as-is
    return text;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    // Decryption failed - likely legacy plain text that happens to contain colons
    console.warn('SSN decryption failed, returning as-is:', error.message);
    return text;
  }
}

/**
 * Check if a value is already encrypted (has the iv:data:tag format)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const text = String(value);
  const parts = text.split(':');
  if (parts.length !== 3) return false;
  // Check if all parts are valid hex
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * Encrypt SSN only if not already encrypted
 */
export function encryptSSN(ssn: string | null | undefined): string | null {
  if (!ssn) return null;
  if (isEncrypted(ssn)) return ssn;
  return encrypt(ssn);
}

/**
 * Decrypt SSN (handles both encrypted and legacy plain text)
 */
export function decryptSSN(encryptedSSN: string | null | undefined): string | null {
  if (!encryptedSSN) return null;
  return decrypt(encryptedSSN);
}
