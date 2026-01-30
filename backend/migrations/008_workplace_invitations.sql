-- 008_workplace_invitations.sql
-- 사업장 초대 링크 시스템

-- 초대 링크 테이블
CREATE TABLE IF NOT EXISTS workplace_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workplace_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL, -- owner user_id
  expires_at TIMESTAMP,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- PostgreSQL용 (Railway 배포 시 자동 변환)
-- CREATE TABLE IF NOT EXISTS workplace_invitations (
--   id SERIAL PRIMARY KEY,
--   workplace_id INTEGER NOT NULL,
--   company_id INTEGER NOT NULL,
--   token TEXT NOT NULL UNIQUE,
--   created_by INTEGER NOT NULL,
--   expires_at TIMESTAMP,
--   max_uses INTEGER DEFAULT NULL,
--   uses_count INTEGER DEFAULT 0,
--   is_active BOOLEAN DEFAULT TRUE,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
--   FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
--   FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
-- );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_invitations_token ON workplace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_workplace ON workplace_invitations(workplace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_active ON workplace_invitations(is_active);
