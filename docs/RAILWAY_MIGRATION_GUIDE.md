# 🚂 Railway 데이터베이스 마이그레이션 가이드

## 📌 문제 상황
커뮤니티 좋아요 기능 사용 시 500 에러 발생
→ `community_post_likes` 테이블이 프로덕션 데이터베이스에 없음

---

## ✅ 해결 방법 1: Railway 대시보드에서 직접 실행 (권장)

### 1단계: Railway 대시보드 접속
1. https://railway.app 접속
2. 프로젝트 선택
3. **PostgreSQL** 데이터베이스 클릭

### 2단계: Query 탭에서 SQL 실행
1. 상단 메뉴에서 **Query** 탭 클릭
2. 아래 SQL을 복사하여 붙여넣기:

```sql
-- 커뮤니티 게시글 추천(좋아요) 테이블 추가
CREATE TABLE IF NOT EXISTS community_post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);

-- like_count 컬럼 추가 (이미 있으면 에러 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'like_count'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN like_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_post_likes(user_id);
```

3. **Run Query** 버튼 클릭
4. 성공 메시지 확인

### 3단계: 사이트 새로고침
- 브라우저에서 F5 (새로고침)
- 좋아요 기능 정상 작동 확인 ✅

---

## ✅ 해결 방법 2: Railway CLI 사용

### 1단계: Railway CLI 설치 (처음만)
```bash
npm install -g @railway/cli
railway login
```

### 2단계: 프로젝트 연결
```bash
cd c:\chance10P
railway link
```

### 3단계: 마이그레이션 실행
```bash
railway run node backend/migrations/run-migration.js
```

---

## 🔍 확인 방법

### 테이블 생성 확인
Railway Query 탭에서 실행:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%community%';
```

예상 결과:
- `community_posts`
- `community_comments`
- `community_post_likes` ← 이 테이블이 있어야 함

### like_count 컬럼 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_posts';
```

`like_count` 컬럼이 보여야 함 ✅

---

## 💡 주의사항

1. **백업 먼저!** (Railway 자동 백업 있음)
2. **한 번만 실행**하세요 (중복 실행 시 에러 무시됨)
3. **마이그레이션 후 서버 재시작 불필요** (즉시 적용)

---

## ❓ 문제 해결

### "relation already exists" 에러
→ 이미 테이블이 있다는 의미입니다. 무시하고 진행하세요.

### "column already exists" 에러
→ 이미 컬럼이 있다는 의미입니다. 정상입니다.

### 여전히 500 에러
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. 사이트 완전 새로고침 (Ctrl+F5)
3. 시크릿 모드로 테스트

---

## 📝 마이그레이션 파일 위치
`backend/migrations/011_add_community_likes_postgresql.sql`
