# HeroForge 자동 개발 루프

이 명령은 HeroForge 게임의 전체 개발 계획을 자동으로 실행하는 루프를 시작합니다.

## 시작 절차

1. `.omc/autodev-active` 파일을 생성하여 자동화 모드 활성화
2. `docs/COVERAGE.md`를 읽어 현재 진행 상황 파악
3. `docs/OPENSPEC_EXECUTION_PLAN.md`에서 다음 작업의 상세 스펙 확인

## 반복 루프 (모든 Phase 완료까지)

각 Sub-phase마다 아래 3단계를 반복:

### Step 1: 구현
- COVERAGE.md에서 현재 Phase의 첫 번째 미완료 sub-phase 선택
- OPENSPEC_EXECUTION_PLAN.md에서 해당 sub-phase의 상세 작업 목록 확인
- 작업 목록의 모든 항목을 구현
- CLAUDE.md의 핵심 아키텍처 규칙 준수 (ECS SoA, Logic/Render 분리, CSS Modules, Hot-path GC 없음 등)

### Step 2: 검증
- `npm run dev` 서버 시작
- `node tools/screenshot.mjs --console` 으로 스크린샷 + 콘솔 로그 캡처
- 스크린샷을 확인하여 시각적 정상 동작 확인
- 콘솔 에러가 있으면 수정
- 코드 리뷰 에이전트(`oh-my-claudecode:code-reviewer`)로 구현 품질 점검 (불가 시 CLAUDE.md 아키텍처 규칙 기준으로 수동 점검)
- 발견된 이슈 수정 (CRITICAL/HIGH는 반드시, MEDIUM은 가능한 한)
- `npm test` 테스트 통과 확인

### Step 3: 완료 및 다음 진행
- COVERAGE.md 체크박스 업데이트 (완료된 항목 체크)
- 진행률 수치 업데이트
- `tools/autodev-loop.sh` 실행하여 다음 미완료 작업 확인
- 미완료 작업이 있으면 Step 1으로 돌아감
- 모든 작업 완료 시 `.omc/autodev-active` 삭제하고 최종 보고

## 중요 규칙
- 현재 Phase 미완료 상태에서 다음 Phase로 절대 건너뛰지 않기
- 각 sub-phase 완료 후 반드시 스크린샷 검증
- 에러가 발생하면 수정 후 다시 검증
- 매직 넘버 금지 — data/*.json 사용
- logic 시스템에서 PixiJS import 금지

지금 바로 자동화 루프를 시작해줘. `.omc/autodev-active` 파일을 만들고 첫 번째 미완료 sub-phase부터 시작.
