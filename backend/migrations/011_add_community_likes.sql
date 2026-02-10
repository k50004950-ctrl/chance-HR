-- 커뮤니티 게시글 추천(좋아요) 테이블 추가
CREATE TABLE IF NOT EXISTS community_post_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id) -- 한 사용자가 같은 게시글에 중복 추천 방지
);

-- 추천 수 컬럼 추가
ALTER TABLE community_posts ADD COLUMN like_count INTEGER DEFAULT 0;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_post_likes(user_id);
