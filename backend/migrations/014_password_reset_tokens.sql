-- 014: Secure password reset tokens
-- 기존 base64(userId:timestamp) 방식 → crypto.randomBytes + SHA-256 해시 저장

-- PostgreSQL
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- SQLite (run separately, ALTER TABLE ADD COLUMN IF NOT EXISTS not supported)
-- ALTER TABLE users ADD COLUMN reset_token_hash TEXT;
-- ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;
