# HeroForge - Claude Code 프로젝트 지침

## 1. 프로젝트 개요

브라우저 기반 2D Idle RPG (MapleStory Idle 스타일).
Pure JavaScript (ES2024+) — TypeScript 절대 금지.
스택: bitECS v0.4 + PixiJS v8 + Preact + @preact/signals + Vite + Howler + idb

---

## 2. 핵심 아키텍처 규칙 (위반 금지)

**ECS SoA 패턴** — 컴포넌트는 `new TypedArray(MAX_ENTITIES)` 인스턴스. MAX_ENTITIES=10000.
```js
// CORRECT:
Position = { x: new Float32Array(10000), y: new Float32Array(10000) }
// WRONG (모든 컴포넌트가 같은 생성자 참조 공유):
Position = { x: Float32Array, y: Float32Array }
```

**bitECS v0.4 API** — `addComponent(world, eid, Component)` — eid 두 번째, component 세 번째.

**Logic/Render 분리**
- `src/systems/logic/` — PixiJS import 절대 금지
- `src/systems/render/` — ECS 데이터 READ-ONLY
- 렌더 시스템 전체 제거 시 헤드리스 시뮬레이션이 동작해야 함

**고정 타임스텝** — Logic 20 tick/s, Render rAF + alpha 보간.

**Preact Signals** — 템플릿 리터럴에서 반드시 `.value` 사용.
`${signal}` → `[object Signal]` 버그. 반드시 `${signal.value}`.

**CSS Modules 전용** — Tailwind 금지, 인라인 스타일 금지. 모든 UI 스타일은 `.module.css`.

**폰트** — Press Start 2P를 모든 텍스트에 사용 (PixiJS + DOM). 시스템 폰트 금지.

**Hot Path GC 없음** — ObjectPool 사용. 프레임당 시스템에서 `new` 또는 객체 리터럴 금지.

**데이터 주도** — 모든 게임 밸런스는 `src/data/*.json`. 코드 내 매직 넘버 금지.

**엔티티에 클래스 금지** — ECS만 사용. 인프라용 클래스(ObjectPool, SpatialHash)는 허용.

---

## 3. 빌드 & 실행

```bash
npm install
npm run dev          # localhost:5173
npm run build        # dist/
npm test             # vitest
node tools/screenshot.mjs  # Playwright 시각 검증
```

---

## 4. 프로젝트 구조

```
src/
  components/      # ECS 컴포넌트 정의 (SoA TypedArrays)
    character.js, combat.js, loot.js, monster.js,
    physics.js, sprite.js, transform.js, index.js
  core/            # 인프라
    GameLoop.js, World.js, EventBus.js,
    ObjectPool.js, SpatialHash.js, SaveManager.js
  data/            # 게임 밸런스 JSON + constants.js
  render/          # PixiJS 초기화
    PixiApp.js, SpriteFactory.js, TilemapRenderer.js
  systems/
    logic/         # 순수 로직 (PixiJS 금지)
      AISystem, CombatSystem, InputSystem, LootSystem,
      PhysicsSystem, SpawnSystem, TileCollisionSystem, UIBridgeSystem
    render/        # 렌더 시스템 (ECS 읽기 전용)
      AnimationSystem, CameraSystem, DamageNumberSystem,
      ParallaxSystem, SpriteSystem
    meta/          # 메타 시스템
  ui/              # Preact UI 컴포넌트
    hud/, panels/, screens/, shared/
  workers/         # Web Workers
assets/            # 스프라이트, 타일맵 등
docs/              # 기획 문서
tests/             # Vitest 테스트
tools/             # 개발 도구 (screenshot.mjs 등)
```

---

## 5. 플랜 참조

- 전체 스펙: `docs/IDLE_RPG_PROJECT.md` (22 시스템, 861줄)
- 실행 계획: `docs/OPENSPEC_EXECUTION_PLAN.md` (6 페이즈, 35 시스템)
- **진행 추적: `docs/COVERAGE.md`** ← 모든 작업 전 반드시 확인

---

## 6. 작업 프로토콜 (필수)

```
작업 시작 전:
1. docs/COVERAGE.md 읽어서 현재 진행 상황 파악
2. 해당 작업이 속한 Phase/Sub-phase 확인
3. 현재 페이즈 미완료 항목 먼저 완료 후 다음 페이즈 진행
4. 작업 완료 후 docs/COVERAGE.md 체크박스 업데이트

절대 금지:
- 현재 페이즈 미완료 상태에서 다음 페이즈 건너뛰기
- 실행 계획에 없는 기능 추가 (논의 없이)
- TypeScript 사용
- assets/ 에 실제 스프라이트가 있는데 플레이스홀더 사각형 사용
- 매직 넘버 사용 (data/*.json 사용)
- logic 시스템에서 PixiJS import

항상:
- OPENSPEC_EXECUTION_PLAN.md의 Phase 순서 준수
- sub-phase 완료 후 COVERAGE.md 업데이트
- `npm run dev` 로 테스트, screenshot 도구로 시각 확인
- 올바른 ECS 패턴 사용 (SoA TypedArrays, entity IDs)
```

---

## 7. Vite 별칭

```js
@        → src/
@data    → src/data/
@core    → src/core/
@components → src/components/
@systems → src/systems/
@render  → src/render/
@ui      → src/ui/
```

---

## 8. Git 커밋 컨벤션

```
feat(system): 설명
fix(system): 설명
data(category): 설명
ui(component): 설명
test(category): 설명
```

---

## 9. 등급 색상 상수

```
Normal=#AAAAAA  Rare=#5B9BD5  Epic=#9B59B6
Unique=#F39C12  Legendary=#27AE60  Mythic=#E74C3C
```

---

## 10. 알려진 함정 (디버깅에서 학습)

- **TypedArray 생성자 vs 인스턴스**: `Float32Array` ≠ `new Float32Array(N)`. 생성자는 모든 컴포넌트가 공유하는 함수 참조.
- **Preact signals in JSX**: `${hp}` → `[object Signal]`. 반드시 `${hp.value}` 사용.
- **GameLoop**: 시스템 파이프라인에 try-catch 필수. 없으면 rAF 무음 사망.
- **world.time**: `world.time.renderDelta` (렌더 델타) ≠ `world.time.delta` (로직 틱 델타).
- **Vite dep 캐시**: "Outdated Optimize Dep" 504 에러 시 `rm -rf node_modules/.vite`.
- **Playwright WebGL**: `--use-gl=angle --use-angle=swiftshader` 플래그 필요.
