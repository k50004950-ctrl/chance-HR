-- 커뮤니티 게시글 추천(좋아요) 테이블 추가 (PostgreSQL)
CREATE TABLE IF NOT EXISTS community_post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id) -- 한 사용자가 같은 게시글에 중복 추천 방지
);

-- like_count 컬럼이 없는 경우에만 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'like_count'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN like_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_post_likes(user_id);
