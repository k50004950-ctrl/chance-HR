# 사업장 수정 스크립트 실행 가이드

## 🎯 목적
V2로 가입했지만 사업장이 생성되지 않은 사용자를 위한 수정 스크립트

## 🚀 실행 방법

### Railway에서 실행:

1. **Railway CLI 사용**
```bash
cd c:\chance10P
railway run node backend/scripts/fix-missing-workplaces.js
```

2. **또는 Railway 대시보드에서 일회성 실행**
   - Railway 프로젝트 → Service 클릭
   - "Settings" 탭 → "Custom Start Command" 수정
   - 임시로 변경:
     ```bash
     node backend/scripts/fix-missing-workplaces.js
     ```
   - 재배포
   - 완료 후 다시 원래대로:
     ```bash
     node server.js
     ```

## 📊 스크립트 동작

1. `workplace_id`가 NULL인 사업주 찾기
2. 해당 사업주의 `business_number`로 `companies` 테이블 조회
3. 사업장 생성:
   - `workplaces` 테이블에 레코드 생성
   - `users.workplace_id` 업데이트
4. 완료 메시지 출력

## ✅ 성공 로그 예시

```
🔧 사업장 없는 사업주 확인 및 수정 시작...

📋 사업장이 없는 사업주: 3명

👤 처리 중: 홍길동 (hong123)
   사업자등록번호: 1234567890
   📍 company_id: 5
   🏢 새 사업장 생성 중...
   🏢 사업장 생성 완료 (ID: 12)
   🔗 사용자와 사업장 연결 완료
   ✅ 홍길동 처리 완료!

🎉 모든 사업주 처리 완료!
✅ 모든 사업주가 사업장을 가지고 있습니다!
```

## 🆘 문제 발생 시

Railway CLI가 없거나 실행이 어려우면 **UI에서 수동 등록**을 사용하세요:
1. 로그인
2. "🏢 사업장 등록하기" 버튼 클릭
3. 정보 입력 후 등록
