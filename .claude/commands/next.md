# 다음 작업 실행

docs/COVERAGE.md 를 읽고 현재 Phase에서 완료되지 않은 항목 중 가장 우선순위가 높은 작업을 식별한 뒤, 그 작업을 바로 실행해줘.

작업 규칙:
1. docs/COVERAGE.md의 "다음 액션" 섹션에서 가장 상위 미완료 항목 선택
2. 현재 Phase 미완료 항목이 있으면 다음 Phase로 넘어가지 않기
3. 작업 완료 후 docs/COVERAGE.md 체크박스를 업데이트
4. 작업 완료 후 `npm run dev`로 동작 확인하고 `node tools/screenshot.mjs`로 시각 검증

사용자에게 먼저 "다음에 할 작업: [항목명]" 을 알리고 진행.
