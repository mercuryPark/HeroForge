# OpenSpec: HeroForge Idle RPG — Master Execution Plan

> **Version**: 1.1.0
> **Created**: 2026-03-27
> **Status**: Draft → Review
> **Spec Source**: `docs/IDLE_RPG_PROJECT.md` (22 systems, 861 lines)

---

## Executive Summary

본 문서는 MapleStory Idle 스타일의 브라우저 기반 2D Idle RPG "HeroForge"의 **완전한 실행 계획서**입니다.
원본 스펙 22개 시스템을 100% 커버하면서, 게임 업계 전문가 관점에서 **13개 보완 시스템**을 추가합니다.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Systems | 35 (22 원본 + 13 보완) |
| Phases | 6 (Phase 0~5) |
| Sub-phases | 29 |
| Estimated Milestones | 8 (M1~M8) |
| Tech Stack | bitECS v0.4 + PixiJS v8 + Preact + Vite |
| Target | Static deploy (Vercel/Netlify) |

---

## Table of Contents

- [Part 1: Architecture & Technical Foundation](#part-1-architecture--technical-foundation)
- [Part 2: Spec Gap Analysis & Enhancements](#part-2-spec-gap-analysis--enhancements)
- [Part 3: System Dependency Graph](#part-3-system-dependency-graph)
- [Part 4: Phase-by-Phase Execution Plan](#part-4-phase-by-phase-execution-plan)
- [Part 5: Risk Registry & Mitigation](#part-5-risk-registry--mitigation)
- [Part 6: Quality Gates & Milestones](#part-6-quality-gates--milestones)
- [Part 7: Asset Pipeline](#part-7-asset-pipeline)
- [Part 8: Data Schema Registry](#part-8-data-schema-registry)

---

## Part 1: Architecture & Technical Foundation

### 1.1 Tech Stack (확정)

```
┌─────────────────────────────────────────────────┐
│                  Browser Tab                      │
│                                                   │
│  ┌──────────────┐    ┌──────────────────────┐    │
│  │  Preact UI   │    │   PixiJS v8 Canvas   │    │
│  │  (DOM 오버레이)│    │   (WebGL2 렌더링)    │    │
│  │  - HUD       │    │   - Tilemap          │    │
│  │  - Modals    │    │   - Sprites          │    │
│  │  - Menus     │    │   - Particles        │    │
│  │  - Tooltips  │    │   - Camera           │    │
│  └──────┬───────┘    └──────────┬───────────┘    │
│         │   Preact Signals       │                │
│         └──────────┬─────────────┘                │
│                    │                               │
│         ┌──────────▼───────────┐                  │
│         │    UIBridge System   │                  │
│         │  (ECS → Signal 동기화)│                  │
│         └──────────┬───────────┘                  │
│                    │                               │
│  ┌─────────────────▼──────────────────────────┐  │
│  │              bitECS World                    │  │
│  │  Components: TypedArray SoA                  │  │
│  │  Systems: Pure Functions (20 tick/s)          │  │
│  │  Entities: uint32 IDs                        │  │
│  └─────────────────┬──────────────────────────┘  │
│                    │                               │
│  ┌─────────────────▼──────────────────────────┐  │
│  │            Infrastructure                    │  │
│  │  - ObjectPool (particles, dmg numbers)       │  │
│  │  - SpatialHash (collision, targeting)        │  │
│  │  - SaveManager (IndexedDB via idb)           │  │
│  │  - GameLoop (fixed timestep + rAF)           │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  Web Worker (offline simulation)            │  │
│  │  - Headless ECS tick                        │  │
│  │  - Background tab 리소스 누적               │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 1.2 Dependencies (설치 순서)

```bash
# Core
npm i bitecs pixi.js preact idb

# Preact 통합
npm i @preactjs/preset-vite @preact/signals

# 게임 유틸리티
npm i pixi-viewport    # 카메라 시스템
npm i howler            # 오디오

# Dev
npm i -D vite vitest
```

**제거 대상** (현재 React 스캐폴드):
```bash
npm uninstall react react-dom @vitejs/plugin-react
npm uninstall -D @types/react @types/react-dom eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

### 1.3 Directory Structure (확정)

```
src/
  main.js                       # Entry: PixiJS init + Preact mount + GameLoop start
  core/
    GameLoop.js                 # Fixed timestep (20 tick/s) + rAF + alpha interpolation
    World.js                    # bitECS world 생성 + system pipeline 등록
    ObjectPool.js               # Generic pool<T> — particles, dmg numbers, projectiles
    SpatialHash.js              # Grid-based spatial hashing (cell size: 64px)
    SaveManager.js              # IndexedDB CRUD via idb + auto-save + migration
    EventBus.js                 # Typed event emitter (UI notifications, achievements)
    BigNumber.js                # break_eternity.js wrapper (endgame 스케일링)
  components/
    transform.js                # Position, Velocity, Rotation
    physics.js                  # Gravity, Grounded, OnLadder, OnPlatform
    combat.js                   # Stats, Combat, Dead, DamageEvent, LootDrop
    character.js                # Job, Level, XP, StatAllocation, MapleGrade
    equipment.js                # EquipSlot, ScrollEnhance, Starforce, Potential
    weapon.js                   # WeaponSlot, WeaponGrade, WeaponMaterial
    companion.js                # CompanionData, CompanionEquipped, Synergy
    monster.js                  # MonsterType, SpawnPoint, Respawn, EliteMonster
    skill.js                    # SkillSlot, Cooldown, MasteryNode
    warrior.js                  # WarriorPower, AbilityOption, HonorMedal
    relic.js                    # RelicSlot, ActiveEffect, PassiveEffect
    render.js                   # SpriteRef, AnimState, ParticleEmitter, CameraTarget
    meta.js                     # DailyQuest, Achievement, Attendance, GuildMember
  systems/
    logic/                      # ★ 헤드리스 — PixiJS 절대 import 금지
      InputSystem.js            # Keyboard/Touch → intent components
      AISystem.js               # Monster AI + Auto-battle pathfinding
      PhysicsSystem.js          # Gravity, AABB collision, platform/ladder
      CombatSystem.js           # Damage formula, hit/miss, crit, attack speed
      LootSystem.js             # Drop tables, Monster Points, Gold, EXP
      GrowthSystem.js           # Level-up, stat allocation, Maple Grade
      SkillSystem.js            # Cooldown tick, skill activation, mastery effects
      CompanionAISystem.js      # Companion auto-battle behavior
      SpawnSystem.js            # Monster respawn timer, wave management
      OfflineSystem.js          # Offline reward calculation
    render/                     # ★ Read-only on ECS — PixiJS sync only
      SpriteSystem.js           # ECS Position → PixiJS Sprite position (alpha interp)
      AnimationSystem.js        # AnimState → frame selection, playback
      CameraSystem.js           # Smooth follow, lerp, screen shake
      ParticleSystem.js         # Object-pooled particle lifecycle
      DamageNumberSystem.js     # Float-up, color-coded, crit scale pop
      UIBridgeSystem.js         # ECS state → Preact Signals
      TilemapSystem.js          # Tiled JSON → PixiJS display
      ParallaxSystem.js         # Multi-layer background scroll
    meta/                       # ★ 게임 메타 시스템 (UI 트리거 기반)
      EquipmentSystem.js        # 장비 장착/해제, 스탯 재계산
      WeaponSystem.js           # 무기 강화, 등급 승급
      EnhancementSystem.js      # 주문서/스타포스/잠재능력 확률 처리
      GachaSystem.js            # 동료 뽑기 확률, 천장 시스템
      DungeonSystem.js          # 5 성장 던전 로직
      BossSystem.js             # 보스 AI 패턴, 레이드 로직
      ArenaSystem.js            # 비동기 PvP 매칭 + AI 전투
      GuildSystem.js            # 길드 스킬, 길드 보스
      QuestSystem.js            # 일일퀘스트/업적/출석 트래킹
      ShopSystem.js             # 모든 상점 거래 로직
  render/
    PixiApp.js                  # PixiJS Application 초기화 (async init)
    SpriteFactory.js            # Atlas frame → AnimatedSprite 생성
    TilemapRenderer.js          # Tiled JSON 파싱 + 렌더링
    Effects.js                  # Hit flash, death anim, level-up burst
    AudioManager.js             # Howler.js wrapper, BGM/SFX 관리
  ui/                           # Preact 컴포넌트 + CSS Modules
    App.jsx                     # Root: Canvas mount + UI overlay
    screens/
      TitleScreen.jsx           # 타이틀 + 로딩
      JobSelectScreen.jsx       # 직업 선택 (프리뷰 포함)
      GameScreen.jsx            # 메인 게임 + HUD
      TutorialOverlay.jsx       # 단계별 튜토리얼 ★신규
    hud/
      HudPanel.jsx              # HP/MP 바, 레벨, 경험치, 전투력
      MiniMap.jsx               # 현재 맵 미니맵
      QuickSlot.jsx             # 스킬 슬롯 (쿨다운 표시)
      LootCounter.jsx           # 골드/경험치 fly-to-counter
      NotificationToast.jsx     # 알림 토스트 ★신규
    panels/
      EquipmentPanel.jsx        # 장비 10슬롯 + 비교 툴팁
      WeaponPanel.jsx           # 무기 강화 UI
      EnhancementPanel.jsx      # 주문서/스타포스/잠재능력 탭
      CompanionPanel.jsx        # 동료 목록 + 장착 + 시너지
      GachaPanel.jsx            # 뽑기 연출 (카드 뒤집기)
      SkillPanel.jsx            # 스킬 트리 + 마스터리
      WarriorPanel.jsx          # 용사의 힘 + 어빌리티
      RelicPanel.jsx            # 유물 장착/관리
      DungeonPanel.jsx          # 5 던전 선택 + 난이도
      BossPanel.jsx             # 보스 레이드 + 월드보스
      ArenaPanel.jsx            # PvP 매칭 + 전적
      GuildPanel.jsx            # 길드 관리
      PartyQuestPanel.jsx       # 파티퀘스트
      ShopPanel.jsx             # 통합 상점
      CostumePanel.jsx          # 코스튬 (외형 전용)
      InventoryPanel.jsx        # 인벤토리 관리 ★신규
      SettingsPanel.jsx         # 설정 ★신규
    shared/
      PixelButton.jsx           # 공통 버튼
      PixelModal.jsx            # 공통 모달
      PixelTooltip.jsx          # 스탯 비교 툴팁
      GradeFrame.jsx            # 등급별 색상 테두리
      ProgressBar.jsx           # 범용 프로그레스 바
      TabBar.jsx                # 하단 탭 네비게이션
  data/                         # JSON 게임 데이터 (밸런스 분리)
    jobs.json                   # 10 직업 + 스탯 성장률
    stats.json                  # 스탯 공식 상수
    balance.json                # 전투/경험치/골드 밸런스 상수
    chapters.json               # 챕터별 몬스터 + 맵 + 보상
    chapter_bosses.json         # 챕터 보스 패턴/스탯
    equipment.json              # 장비 10슬롯 기본 스탯 + 옵션 풀
    elite_monsters.json         # 엘리트 몬스터 등급별 드롭률
    weapons.json                # 무기 등급/강화 테이블
    scrolls.json                # 주문서 종류/확률/보너스
    starforce.json              # ★0~★25 확률 테이블
    potentials.json             # 잠재능력 등급/옵션 풀
    skills.json                 # 직업별 스킬 + 배율 + 쿨다운
    mastery_tree.json           # 마스터리 트리 노드
    companions.json             # 동료 목록 + 등급 + 효과
    synergies.json              # 동료 시너지 조합
    relics.json                 # 유물 효과 (능동/수동)
    dungeons.json               # 5 던전 난이도/보상
    bosses.json                 # 레이드 보스 20단계 + 자쿰
    arena.json                  # 아레나 매칭/보상
    guild.json                  # 길드 스킬/상점/보스
    party_quests.json           # 파티퀘 난이도/보상
    currencies.json             # 16 재화 정의
    shops.json                  # 모든 상점 상품
    daily_quests.json           # 일일퀘스트 목록
    achievements.json           # 업적 목록 + 조건
    attendance.json             # 출석 28일 보상
    costumes.json               # 코스튬 목록
    offline.json                # 오프라인 보상 공식
    tutorial.json               # 튜토리얼 단계 ★신규
    events.json                 # 이벤트 프레임워크 ★신규
  workers/
    OfflineWorker.js            # 오프라인 시뮬레이션 Web Worker
assets/
  sprites/                      # TexturePacker JSON Hash spritesheets
    heroes/                     # 직업별 캐릭터 (idle, run, jump, attack, death)
    monsters/                   # 몬스터 (idle, attack, death)
    bosses/                     # 보스 (idle, attack, patterns)
    effects/                    # 스킬 이펙트, 히트 스파크
    ui/                         # UI 프레임, 아이콘
  tilemaps/                     # Tiled JSON (.tmj)
    chapter_01.tmj ~ chapter_XX.tmj
  audio/
    bgm/                        # 챕터별 BGM (chiptune)
    sfx/                        # 효과음 (attack, skill, loot, UI 등)
  fonts/
    pixel.fnt                   # BitmapFont (데미지 넘버 등)
tools/
  balance-sim.js                # CLI 밸런스 시뮬레이터
  pack-sprites.js               # free-tex-packer CLI wrapper
tests/
  formulas.test.js              # 데미지 공식 검증
  gacha.test.js                 # 가챠 확률 검증 (10k rolls)
  offline.test.js               # 오프라인 보상 일관성
  enhancement.test.js           # 강화 확률 검증
  save-migration.test.js        # 세이브 마이그레이션 ★신규
```

### 1.4 Design Constants (공유 상수)

#### Pixel Dimensions (에셋 기준 규격)

```
캐릭터/몬스터 기본 크기:  32×32 px
타일 크기:               16×16 px (렌더 시 2x 스케일 → 32px 매칭)
보스 크기:               64×64 px 또는 96×96 px
UI 아이콘:               16×16 px 또는 32×32 px
```

#### Grade Color Palette (등급별 색상 — 전체 UI 공유)

```javascript
// src/data/constants.js
export const GRADE_COLORS = {
  NORMAL:    '#AAAAAA',  // 회색
  RARE:      '#5B9BD5',  // 파란색
  EPIC:      '#9B59B6',  // 보라색
  UNIQUE:    '#F39C12',  // 주황색
  LEGENDARY: '#27AE60',  // 초록색
  MYTHIC:    '#E74C3C',  // 빨간색 (잠재능력 전용)
}

// GradeFrame.jsx, GachaPanel.jsx, EquipmentPanel.jsx 등 모든 등급 표시 UI에서 참조
```

#### UI Visual Rules (UI 디자인 규칙)

- **패널 스타일**: 어두운 반투명 배경 (`rgba(0,0,0,0.75)`) + 픽셀아트 테두리 (UI Essential Pack)
- **모달**: 중앙 정렬, 딤 배경 오버레이 (`rgba(0,0,0,0.6)`), **slide-in 애니메이션** (아래→위, 200ms ease-out)
- **폰트**: **모든 텍스트에 픽셀 비트맵 폰트 사용** (Press Start 2P)
  - PixiJS 캔버스: BitmapText (데미지 넘버, 레벨업 텍스트)
  - Preact DOM: CSS `font-family: 'Press Start 2P', monospace` 전역 적용
  - 시스템 폰트 사용 금지
- **탭바**: 하단 고정, 아이콘 + 라벨, 활성 탭 하이라이트
- **툴팁**: long-press/hover 시 스탯 비교 (현재 vs 선택, +/- 색상 표시)

### 1.5 Code Style Rules (코딩 컨벤션)

```
1. 핫패스 변수명: 짧고 간결하게 — eid, dt, dx, dy, hp, atk, def
2. 시스템 export: `export function PhysicsSystem(world, dt) {}`
3. 시스템 파이프라인: GameLoop.js에서 명시적 순서 배열로 관리
4. Preact 컴포넌트: 함수형 + hooks + Preact Signals
5. 스타일링: CSS Modules 전용 (Tailwind 금지, inline style 금지)
6. 게임 엔티티: class 사용 금지 — ECS only (인프라 클래스는 OK: ObjectPool, SpatialHash)
7. 매직 넘버: 코드 내 금지 — 모든 밸런스 값은 data/*.json에서 로드
```

### 1.6 Git Conventions (Git 규칙)

```
커밋 포맷:
  feat(physics): add platform collision + gravity
  fix(combat): correct crit damage multiplier calculation
  data(balance): adjust chapter 3 monster HP curve
  ui(equipment): add stat comparison tooltip
  test(gacha): add 10k roll probability verification

브랜치 네이밍:
  phase/00-asset-setup
  phase/01-platformer-autobattle
  phase/02-growth-loop
  phase/03-deep-systems
  phase/04-content
  phase/05-retention-polish

규칙:
  - 커밋 전 반드시 npm test 실행
  - pre-commit hook 설정: lint + test (Phase 0.1에서 husky 또는 simple-git-hooks 설치)
  - 시스템/기능 단위로 커밋 (하나의 커밋 = 하나의 논리적 변경)
```

### 1.7 Core Architecture Patterns

#### Game Loop (Fixed Timestep + Alpha Interpolation)

```javascript
// src/core/GameLoop.js
const TICK_RATE = 20          // 20 tick/s
const TICK_MS = 1000 / TICK_RATE  // 50ms
const MAX_CATCHUP = 5         // 최대 5틱 보상

let lastTime = 0
let accumulator = 0

function gameLoop(timestamp) {
  const delta = Math.min(timestamp - lastTime, TICK_MS * MAX_CATCHUP)
  lastTime = timestamp
  accumulator += delta

  while (accumulator >= TICK_MS) {
    // Logic systems: 고정 시간 간격
    logicPipeline.forEach(system => system(world, TICK_MS / 1000))
    accumulator -= TICK_MS
  }

  const alpha = accumulator / TICK_MS
  // Render systems: 보간 렌더링
  renderPipeline.forEach(system => system(world, alpha))

  requestAnimationFrame(gameLoop)
}
```

#### System Pipeline (실행 순서)

```javascript
// Logic Pipeline (20 tick/s) — 순서 중요!
const logicPipeline = [
  InputSystem,          // 1. 입력 수집
  AISystem,             // 2. AI 의사결정
  SkillSystem,          // 3. 스킬 쿨다운/발동
  CombatSystem,         // 4. 전투 판정
  PhysicsSystem,        // 5. 물리 이동
  SpawnSystem,          // 6. 몬스터 리스폰
  LootSystem,           // 7. 전리품 처리
  GrowthSystem,         // 8. 레벨업/스탯
  CompanionAISystem,    // 9. 동료 AI
  OfflineSystem,        // 10. 오프라인 누적
]

// Render Pipeline (rAF) — 순서 중요!
const renderPipeline = [
  TilemapSystem,        // 1. 맵 렌더링
  ParallaxSystem,       // 2. 배경 스크롤
  SpriteSystem,         // 3. 엔티티 스프라이트 동기화
  AnimationSystem,      // 4. 애니메이션 프레임
  ParticleSystem,       // 5. 파티클
  DamageNumberSystem,   // 6. 데미지 넘버
  CameraSystem,         // 7. 카메라 추적
  UIBridgeSystem,       // 8. ECS → Preact Signal 동기화
]
```

#### ECS ↔ UI Bridge (Preact Signals)

```javascript
// src/systems/render/UIBridgeSystem.js
import { signal } from '@preact/signals'

// Signals exported for Preact consumption
export const playerHP = signal(0)
export const playerMaxHP = signal(0)
export const playerLevel = signal(1)
export const playerGold = signal(0)
export const combatPower = signal(0)

export function UIBridgeSystem(world) {
  const playerEid = world.playerEid
  playerHP.value = Stats.hp[playerEid]
  playerMaxHP.value = Stats.maxHp[playerEid]
  playerLevel.value = Level.current[playerEid]
  // ... Preact는 signal.value 변경 시 자동 리렌더링
}
```

---

## Part 2: Spec Gap Analysis & Enhancements

원본 스펙 대비 발견된 **누락 사항** 및 **보완 시스템** 목록.

### 2.1 Critical Gaps (반드시 추가)

| # | Gap | Impact | Resolution |
|---|-----|--------|------------|
| G1 | **튜토리얼/온보딩 없음** | 신규 유저 이탈 | Tutorial System 추가 (Phase 1) |
| G2 | **설정 화면 없음** | 오디오/그래픽 제어 불가 | Settings Panel 추가 (Phase 1) |
| G3 | **인벤토리 관리 없음** | 장비 정리 불가 | Inventory System 추가 (Phase 2) |
| G4 | **사망 패널티 미정의** | 오토 배틀 밸런스 불확실 | "즉시 부활 + 10초 무적" 채택 |
| G5 | **스탯 초기화 미정의** | 잘못된 스탯 배분 복구 불가 | "골드로 리셋" 기능 추가 |
| G6 | **Face Accessory 슬롯 정의 불완전** | 자쿰 레이드 보상 슬롯 미정의 | 11번째 슬롯 풀스펙 추가 |
| G7 | **스킬 AoE 형태 미정의** | 플랫포머 구조와 충돌 | Rect/Circle/Cone 3타입 정의 |
| G8 | **스타포스 "파괴" 의미 모호** | 슬롯 강화인데 장비 파괴? | "★ 단계 3 하락 + 골드 패널티" 채택 |
| G9 | **알림 시스템 없음** | 일퀘/던전 초기화 인지 불가 | Notification System 추가 |
| G10 | **세이브 마이그레이션 없음** | 업데이트 시 데이터 손실 위험 | Version-based migration 추가 |
| G11 | **로딩 화면 없음** | 에셋 로드 중 빈 화면 | Loading Screen 추가 (Phase 1) |
| G12 | **에러 바운더리 없음** | 크래시 시 세이브 손실 | Error boundary + 긴급 저장 |
| G13 | **몬스터 AI 행동 미정의** | 오토배틀 체감 품질 | 3타입 AI 정의 (순찰/추적/고정) |

### 2.2 Enhancement Additions (게임성 향상)

| # | Enhancement | Category | Phase |
|---|-------------|----------|-------|
| E1 | **가챠 천장 시스템** (80연차 SSR 보장) | 동료 | 3 |
| E2 | **장비 프리셋** (보스용/사냥용 세트 저장) | 장비 | 2 |
| E3 | **일괄 강화** (전 슬롯 ★5까지 한번에) | 강화 | 2 |
| E4 | **던전 소탕** (클리어 후 즉시 보상) | 던전 | 4 |
| E5 | **자동 반복 소환** (엘리트 몬스터) | 장비 | 2 |
| E6 | **컴뱃 파워 히스토리** (7일 그래프) | UI | 5 |
| E7 | **복귀 유저 보너스** (7일 미접속 시) | 리텐션 | 5 |
| E8 | **아레나 진형 배치** (전열/후열) | 아레나 | 4 |
| E9 | **업적 알림 뱃지** (빨간 점) | UI | 5 |
| E10 | **스킬 연출 스킵 토글** | QoL | 5 |
| E11 | **직업 프리뷰** (선택 전 스킬 시연) | 캐릭터 | 1 |
| E12 | **추천 강화 타겟** (비용 효율 기반) | 강화 | 2 |
| E13 | **이벤트 프레임워크** (한정 던전/상점) | 리텐션 | 5 |

---

## Part 3: System Dependency Graph

```
LAYER 0: FOUNDATION (의존성 없음)
├── GameLoop
├── bitECS World + Components
├── ObjectPool
├── SpatialHash
├── PixiJS Application
├── Preact Shell + Signals
├── SaveManager (IndexedDB)
└── AudioManager

LAYER 1: WORLD RENDERING (← Foundation)
├── TilemapRenderer (← PixiJS)
├── ParallaxSystem (← TilemapRenderer)
├── CameraSystem (← PixiJS, pixi-viewport)
├── SpriteFactory (← Atlas loading)
└── LoadingScreen (← PixiJS, Assets)

LAYER 2: CHARACTER (← Layer 1)
├── Job System (← data/jobs.json)
├── PhysicsSystem (← Tilemap collision data)
├── Character Movement (← Physics, Input)
├── Auto-Battle AI (← Physics, SpatialHash) ★고난이도
└── Monster Spawning (← Tilemap spawn points)

LAYER 3: COMBAT (← Layer 2)
├── Damage Formula (← Stats, data/balance.json)
├── Hit/Miss System (← Accuracy/Evasion)
├── Attack Speed (← base_interval, atk_speed_pct)
├── Damage Numbers VFX (← ObjectPool, PixiJS)
├── Hit Flash + Death Animation (← SpriteFactory)
├── Loot Drop System (← Drop tables)
└── Loot Particle VFX (← ObjectPool)

LAYER 4: PROGRESSION (← Layer 3)
├── Level-Up + Stat Allocation (← GrowthSystem)
├── Maple Grade (← Stat allocation milestones)
├── Skill System (← Job advancement)
├── Currency System (← Loot drops) ★ALL 후속 시스템 의존
└── Chapter Hunting Loop (← All above)

LAYER 5: EQUIPMENT (← Layer 4, Currency)
├── Equipment Slots (10+1) (← equipment.json)
├── Elite Monster Summon (← Monster Points)
├── Equipment Acquisition (← Elite Monster kill)
├── Inventory Management (← Equipment)
├── Weapon System (← Weapon Dungeon materials) [병렬 가능]
└── Equipment Comparison Tooltip (← UI)

LAYER 6: ENHANCEMENT (← Layer 5)
├── Scroll Enhancement (← scrolls.json)
├── Starforce ★0~★25 (← starforce.json, Starforce Scrolls)
├── Potential System (← potentials.json, ★12 게이트)
│   ├── Normal Cube
│   └── Additional Cube (★12+ 전용)
└── Scroll Saving System (← Scroll Enhancement)

LAYER 7: DEEP SYSTEMS (← Layer 4~6)
├── Warrior's Power (← Warrior Tokens from 던전)
├── Ability System (← Honor Medals, Warrior's Power 티어)
├── Mastery Tree (← Mastery Points, Skill System)
├── Companion System (← companions.json)
│   ├── Gacha (← Gems currency)
│   ├── Companion Combat AI (← Combat System)
│   └── Synergy Buffs (← synergies.json)
└── Relic System (← Boss Raid rewards)

LAYER 8: CONTENT (← Layer 3~7)
├── Chapter Challenge / Boss Gate (← Boss AI)
├── 5 Growth Dungeons (← Combat + Currency)
│   ├── Weapon Dungeon (wave survival)
│   ├── EXP Dungeon (infinite spawn)
│   ├── Equipment Dungeon (1v1 boss)
│   ├── Warrior's Training (escalating waves)
│   └── Enhancement Dungeon (mini-stage)
├── World Boss (← Damage ranking)
├── Boss Raid + Zakum (← Boss AI patterns)
├── Arena PvP (← AI opponent, Combat)
├── Guild (← AI members, Guild boss)
└── Party Quest (← AI party, Boss mechanics)

LAYER 9: RETENTION (← Layer 8)
├── Daily Quests (← All content tracking)
├── Achievements (← Lifetime cumulative)
├── Attendance (← Time tracking)
├── Offline Rewards (← Chapter stats)
├── Quick Hunt (← Gems)
├── Costume System (← Sprite overlay)
├── Settings (← All systems)
└── Event Framework (← All systems)
```

### Parallelizable Work Streams (Phase 2+ 이후)

| Stream A: Combat Depth | Stream B: Meta Systems | Stream C: Content Design | Stream D: UI/Polish |
|------------------------|------------------------|--------------------------|---------------------|
| Damage formula 검증 | Equipment system | Tiled 맵 제작 | HUD panels |
| Skill system | Weapon system | Boss AI 패턴 디자인 | Gacha 연출 |
| Mastery tree | Enhancement (3 sub) | Dungeon 레벨 디자인 | Tooltip system |
| Companion AI | Companion gacha | Arena 매칭 로직 | Settings |

---

## Part 4: Phase-by-Phase Execution Plan

---

### Phase 0: Asset Preparation & Project Setup

> **목표**: 코드 작성 전 모든 에셋 파이프라인 확보 + 프로젝트 뼈대 구성
> **선행조건**: 없음 (최우선)

#### 0.1 프로젝트 초기화

**작업 목록**:
- [ ] React 의존성 전체 제거
- [ ] Preact + @preactjs/preset-vite + @preact/signals 설치
- [ ] bitecs, pixi.js, idb, pixi-viewport, howler 설치
- [ ] vite.config.js: Preact preset + resolve aliases 설정
- [ ] ESLint: Preact JSX pragma로 전환
- [ ] `src/` 디렉토리 구조 생성 (1.3절 참조)
- [ ] `index.html` 타이틀 → "HeroForge"
- [ ] `.gitignore` 업데이트 (assets 원본, node_modules, dist)
- [ ] pre-commit hook 설정 (simple-git-hooks 또는 husky): `npm test && npm run lint`
- [ ] `src/data/constants.js` 생성: GRADE_COLORS, PIXEL_DIMENSIONS, UI 상수 정의

**산출물**: `npm run dev` 실행 시 빈 Preact 앱 + PixiJS 캔버스 마운트 확인

#### 0.2 에셋 수집 및 정리

**작업 목록**:
- [ ] ansimuz Legacy Collection 다운로드 (캐릭터, 몬스터, 타일셋, 배경)
- [ ] GandalfHardcore Sidescroller Pack 다운로드 (직업별 히어로)
- [ ] Monsters Creatures Fantasy (Pixel Frog) 다운로드
- [ ] Super Pixel Effects Gigapack 다운로드 (스킬 이펙트)
- [ ] Complete UI Essential Pack (Crusenho) 다운로드
- [ ] 420 Pixel Art Icons for RPGs 다운로드
- [ ] Press Start 2P 폰트 다운로드 (Google Fonts)
- [ ] CC0/Free 치프튠 BGM 5곡 이상 수집
- [ ] 기본 SFX 세트 수집 (attack, skill, loot, UI, enhance, gacha)
- [ ] `assets/` 폴더 구조에 정리

**라이선스 확인 체크리스트**:
- [ ] ansimuz: 크레딧 조건 확인
- [ ] 각 팩 개별 라이선스 확인
- [ ] `assets/LICENSES.md` 작성

#### 0.3 스프라이트시트 패킹

**작업 목록**:
- [ ] free-tex-packer CLI/웹앱 (또는 대안: Shoebox, TexturePacker 무료 버전)으로 아틀라스 생성
- [ ] 설정: rotation OFF, trim ON, POT ON, max 2048x2048
- [ ] 출력 형식: PixiJS JSON Hash
- [ ] 카테고리별 아틀라스:
  - `heroes.json` + `heroes.png` (직업별 idle/run/jump/attack/death)
  - `monsters.json` + `monsters.png`
  - `effects.json` + `effects.png` (스킬/히트/파티클)
  - `ui.json` + `ui.png` (프레임, 아이콘, 버튼)
- [ ] `tools/pack-sprites.js` 자동화 스크립트 작성
- [ ] PixiJS Assets.load() 테스트

#### 0.4 첫 챕터 타일맵 제작

**작업 목록**:
- [ ] Tiled Map Editor에서 Chapter 1 맵 제작
- [ ] 요구사항:
  - 2D 플랫포머 구조 (멀티 레이어 플랫폼)
  - 사다리 오브젝트 배치
  - 몬스터 스폰 포인트 (오브젝트 레이어)
  - 원웨이 플랫폼 표시
  - 최소 3개 플랫폼 레벨
- [ ] 타일셋 외부 참조 (.tsx)
- [ ] 출력: `assets/tilemaps/chapter_01.tmj`
- [ ] 패럴랙스 배경 레이어 3개 (sky, far, near)
- [ ] PixiJS에서 로드 테스트

#### 0.5 게임 데이터 JSON 초안

**작업 목록**:
- [ ] `data/jobs.json`: 4클래스 × 10직업 기본 스탯/성장률
- [ ] `data/balance.json`: 데미지 공식 상수, 경험치 테이블 (Lv.1~200)
- [ ] `data/chapters.json`: Chapter 1~3 몬스터/보상 (프로토타입용)
- [ ] `data/equipment.json`: 10슬롯 기본 스탯 + 옵션 풀 (초안)
- [ ] `data/currencies.json`: 16 재화 정의
- [ ] 나머지 JSON은 해당 Phase에서 작성

**Quality Gate 0**:
- [ ] `npm run dev` → Preact 앱 + PixiJS 빈 캔버스 표시
- [ ] 모든 스프라이트시트 PixiJS로 로드 성공
- [ ] Chapter 1 타일맵 PixiJS로 렌더링 성공
- [ ] 데이터 JSON 파싱 에러 없음
- [ ] pre-commit hook 작동 (lint + test)
- [ ] Git branch: `phase/00-asset-setup` 생성, 커밋 포맷 준수
- [ ] 전역 CSS에 Press Start 2P 폰트 적용 확인
- [ ] CSS Modules 방식 확인 (inline style / Tailwind 없음)
- [ ] constants.js에 GRADE_COLORS + PIXEL_DIMENSIONS 정의 확인

---

### Phase 1: Foundation (프레임 1부터 완성도 있게)

> **목표**: 캐릭터가 플랫포머 맵에서 자동 사냥하며 데미지 넘버가 뜨는 "Combat Demo"
> **Milestone**: M1 (Walking Demo) → M2 (Combat Demo)

#### 1.1 Core Infrastructure

**작업 목록**:
- [ ] `src/core/GameLoop.js`: Fixed timestep (20 tick/s) + rAF + alpha interpolation
  - accumulator 패턴, MAX_CATCHUP = 5
  - logic pipeline + render pipeline 분리 실행
  - performance.now() 기반 타이밍
- [ ] `src/core/World.js`: bitECS createWorld() + system pipeline 등록
  - logicPipeline, renderPipeline 배열 관리
  - world.time = { delta, elapsed, tick }
  - world.playerEid 참조
- [ ] `src/core/ObjectPool.js`: Generic pool with acquire/release
  - 초기 할당: particles(100), dmgNumbers(50), projectiles(30)
  - `new` 금지 보장 (hot path에서)
- [ ] `src/core/SpatialHash.js`: Grid-based (cellSize: 64px)
  - insert(eid, x, y), query(x, y, radius), clear()
  - 매 틱 rebuild 방식 (simple + fast)
- [ ] `src/core/EventBus.js`: Typed event emitter
  - on(event, handler), emit(event, data), off()
  - UI 알림, 업적 트래킹용

**검증**: Unit test — GameLoop 틱 카운트 정확도, ObjectPool 재사용 검증

#### 1.2 PixiJS Setup + Tilemap + Camera + Parallax

**작업 목록**:
- [ ] `src/render/PixiApp.js`:
  - `new Application()` + `await app.init()` (async 필수 — v8)
  - WebGL2 preference, antialias: false, 해상도 설정
  - Canvas를 DOM에 마운트
  - resize 핸들러 (viewport 동기화)
- [ ] `src/render/TilemapRenderer.js`:
  - Tiled JSON 파싱 (레이어, 타일셋, 오브젝트)
  - 타일 → PixiJS Sprite 배치
  - 충돌 레이어 추출 → PhysicsSystem용 격자
  - 원웨이 플랫폼 플래그 처리
  - 사다리 오브젝트 추출
  - 스폰 포인트 추출
- [ ] `src/systems/render/CameraSystem.js`:
  - worldContainer에 `isRenderGroup: true` 설정 (GPU 가속)
  - 플레이어 추적: lerp(current, target, 0.08)
  - 맵 경계 클램핑
  - Screen shake: random offset 2~4px, 100ms duration
- [ ] `src/systems/render/ParallaxSystem.js`:
  - 3+ 배경 레이어 (sky=0.1, far=0.3, near=0.6 속도)
  - 카메라 이동에 비례한 오프셋
  - 무한 반복 (타일링)

**★ M1 (Walking Demo) 검증 기준**:
- [ ] 타일맵이 화면에 렌더링됨
- [ ] 패럴랙스 배경이 카메라 이동에 반응
- [ ] 카메라가 부드럽게 추적

#### 1.3 Character + Physics + Movement

**작업 목록**:
- [ ] `src/components/transform.js`:
  ```javascript
  Position = { x: new Float32Array(MAX), y: new Float32Array(MAX) }
  Velocity = { x: new Float32Array(MAX), y: new Float32Array(MAX) }
  PrevPosition = { x: new Float32Array(MAX), y: new Float32Array(MAX) }  // 보간용
  ```
- [ ] `src/components/physics.js`:
  ```javascript
  Gravity = { value: new Float32Array(MAX) }  // 기본 980
  Grounded = {}  // tag component
  OnLadder = {}  // tag component
  OnPlatform = { platformY: new Float32Array(MAX) }
  ```
- [ ] `src/systems/logic/PhysicsSystem.js`:
  - 중력: 980 px/s², terminal velocity 600 px/s
  - AABB 충돌: 타일맵 격자 기반
  - 원웨이 플랫폼: 위에서 아래로 통과 + 아래+점프 시 드롭
  - 사다리: 중력 비활성화, 상하 이동 허용
  - PrevPosition 저장 (렌더 보간용)
- [ ] `src/systems/logic/InputSystem.js`:
  - 키보드: Arrow keys + Space (점프) + Down+Space (드롭)
  - 터치: 가상 조이스틱 (Phase 5에서 구현, 여기선 키보드만)
  - Auto-battle ON/OFF 토글
- [ ] `src/render/SpriteFactory.js`:
  - Atlas frame name → AnimatedSprite 생성
  - 애니메이션 상태: idle, run, jump, attack, death
  - 방향 전환: sprite.scale.x = -1
- [ ] `src/systems/render/SpriteSystem.js`:
  - ECS Position → PixiJS sprite.position (alpha 보간)
  - `renderX = prevX + (currX - prevX) * alpha`
- [ ] `src/systems/render/AnimationSystem.js`:
  - AnimState 컴포넌트 → 프레임 선택 + 재생 속도

**★ M1 완성 — 캐릭터가 맵에서 걷고 점프하며 카메라가 따라감**

#### 1.4 Monster + Spawn + Auto-Battle

**작업 목록**:
- [ ] `src/components/monster.js`:
  ```javascript
  MonsterType = { id: new Uint16Array(MAX) }
  SpawnPoint = { x: new Float32Array(MAX), y: new Float32Array(MAX) }
  Respawn = { timer: new Float32Array(MAX), delay: new Float32Array(MAX) }
  ```
- [ ] `src/systems/logic/SpawnSystem.js`:
  - 타일맵 스폰 포인트에서 몬스터 생성
  - 사망 후 N초 뒤 리스폰
  - 화면 밖 스폰 (팝업 방지)
- [ ] `src/components/combat.js`:
  ```javascript
  Stats = {
    hp: new Float32Array(MAX), maxHp: new Float32Array(MAX),
    atk: new Float32Array(MAX), def: new Float32Array(MAX),
    critRate: new Float32Array(MAX), critDmg: new Float32Array(MAX),
    atkSpeed: new Float32Array(MAX), accuracy: new Float32Array(MAX),
    evasion: new Float32Array(MAX)
  }
  Combat = { target: new Uint32Array(MAX), attackTimer: new Float32Array(MAX) }
  Dead = {}  // tag
  DamageEvent = { amount: new Float32Array(MAX), isCrit: new Uint8Array(MAX), source: new Uint32Array(MAX) }
  ```
- [ ] `src/systems/logic/AISystem.js`:
  - **오토배틀 AI** (★ 핵심 난이도):
    1. SpatialHash.query()로 범위 내 적 탐색
    2. 같은 플랫폼에 적 있으면 → 걸어서 접근
    3. 다른 플랫폼이면 → 사다리 경로 탐색 (Navigation Graph)
    4. 사거리 내 도달 시 → 공격 개시
  - **몬스터 AI** (3타입):
    - Stationary: 제자리 (슬라임)
    - Patrol: 플랫폼 내 왕복 (고블린)
    - Chase: 감지 범위 내 추적 (박쥐)
  - **Navigation Graph** 사전 구축:
    - 타일맵 로드 시 플랫폼 노드 + 사다리 엣지 생성
    - BFS로 최단 경로 탐색
- [ ] `src/systems/logic/CombatSystem.js`:
  - 데미지 공식 (스펙 Section 4 완전 구현):
    ```
    base = ATK × skill_mult × (0.95 + rand × 0.10)
    afterDef = max(1, base - target_DEF × (1 - armor_pen))
    crit → afterDef × CRIT_DMG_MULT
    final × (1 + dmg%) × (1 + boss_dmg%) × ...
    ```
  - Hit/Miss: ACCURACY < EVASION → MISS
  - Attack speed: `interval = base / (1 + atkSpd% / 100)`
  - DamageEvent 엔티티 생성 (ECS 이벤트)

**검증**: `tests/formulas.test.js` — 데미지 공식 edge case 100% 커버

#### 1.5 VFX + Loot + HUD

**작업 목록**:
- [ ] `src/systems/render/DamageNumberSystem.js`:
  - ObjectPool에서 BitmapText 획득
  - 색상: white=일반, yellow=크리티컬, red=피격
  - 애니메이션: float up + fade out (easing)
  - 크리티컬: scale pop (1.0 → 1.5 → 1.0)
- [ ] `src/render/Effects.js`:
  - **Hit flash**: sprite tint → 0xFFFFFF for 2 frames
  - **Death animation**: death anim → fade out → loot burst
  - **Level-up**: golden particle burst + "LEVEL UP!" text
  - **Monster spawn**: fade-in 또는 "poof" 파티클
- [ ] `src/systems/logic/LootSystem.js`:
  - Dead 몬스터에서 드롭 생성
  - 드롭: EXP, Gold, Monster Points
  - 드롭 테이블: `data/chapters.json` 참조
- [ ] `src/systems/render/ParticleSystem.js`:
  - ObjectPool 기반 (zero GC)
  - 루트 파티클: gold=yellow, exp=blue 원형
  - HUD 카운터를 향해 날아감 (fly-to-counter)
  - ParticleContainer 사용 (대량 렌더링)
- [ ] `src/ui/hud/HudPanel.jsx`:
  - HP/MP 바 (비율 + 수치)
  - 레벨 + 경험치 바
  - 현재 스테이지 이름
  - 전투력 표시
  - 오토배틀 ON/OFF 버튼
- [ ] `src/ui/hud/LootCounter.jsx`:
  - 골드, 경험치 카운터
  - 루트 파티클 도착점
  - 숫자 increment 애니메이션
- [ ] `src/ui/screens/LoadingScreen.jsx`:
  - PixiJS Assets.load() 프로그레스 바
  - 에셋 로드 완료 시 전환

**★ M2 (Combat Demo) 검증 기준**:
- [ ] 캐릭터가 자동으로 몬스터에게 이동
- [ ] 공격 시 데미지 넘버 표시 (크리티컬 구분)
- [ ] 몬스터 사망 시 death 애니메이션 + 루트 파티클
- [ ] 몬스터 리스폰 작동
- [ ] HUD에 HP, 레벨, 골드 실시간 표시
- [ ] 히트 플래시, 스크린 셰이크 작동
- [ ] 5분 플레이해서 "재미있다" 느낌 검증

#### 1.6 Save/Load + Tutorial + Settings

**작업 목록**:
- [ ] `src/core/SaveManager.js`:
  - IndexedDB via idb wrapper
  - 자동 저장: 30초 주기 + 중요 액션 시
  - 저장 데이터: ECS world state (TypedArray serialize) + meta
  - 스키마 버전 필드 (migration 대비)
  - 수동 내보내기/가져오기 (JSON 파일)
  - 에러 시 자동 백업
- [ ] `src/ui/screens/TitleScreen.jsx`:
  - 게임 타이틀 + "시작" / "이어하기" / "설정"
  - 세이브 존재 시 "이어하기" 활성화
- [ ] `src/ui/screens/TutorialOverlay.jsx`:
  - 단계별 가이드 (data/tutorial.json 기반)
  - Step 1: 이동 조작 안내
  - Step 2: 오토배틀 설명
  - Step 3: HUD 요소 설명
  - Step 4: 직업 선택 유도
  - 이후 단계는 각 시스템 해금 시 추가
- [ ] `src/ui/panels/SettingsPanel.jsx`:
  - BGM/SFX 볼륨 슬라이더
  - 데미지 넘버 표시 토글
  - 그래픽 품질 (파티클 밀도)
  - 언어 (미래 확장)
  - 세이브 내보내기/가져오기

**검증**: 세이브 → 새로고침 → 로드 시 정확히 같은 상태 복원

**Quality Gate 1**:
- [ ] M2 (Combat Demo) 모든 기준 통과
- [ ] 세이브/로드 roundtrip 100% 정확
- [ ] 로딩 화면 → 타이틀 → 게임 전환 정상
- [ ] `npm test` — formulas.test.js 통과
- [ ] 메모리 누수 없음 (5분 프로파일링)
- [ ] 60fps 유지 (몬스터 10마리 동시)

---

### Phase 2: Core Growth Loop

> **목표**: 직업 선택 → 스탯 성장 → 장비 획득 → 강화 시스템 완성
> **Milestone**: M3 (Progression Demo) → M4 (Enhancement Demo)

#### 2.1 Job Selection + Advancement

**작업 목록**:
- [ ] `src/components/character.js`:
  ```javascript
  Job = { classId: new Uint8Array(MAX), jobId: new Uint8Array(MAX), advancement: new Uint8Array(MAX) }
  Level = { current: new Uint16Array(MAX), xp: new Float64Array(MAX), xpToNext: new Float64Array(MAX) }
  StatAllocation = { str: new Uint16Array(MAX), dex: new Uint16Array(MAX), int_: new Uint16Array(MAX), luk: new Uint16Array(MAX), availablePoints: new Uint16Array(MAX) }
  MapleGrade = { level: new Uint16Array(MAX), totalPointsSpent: new Uint32Array(MAX) }
  ```
- [ ] `data/jobs.json` 완성:
  - 4 클래스 × 10 직업 정의
  - 직업별: baseStats, growthPerLevel, skills[], advancement requirements
  - Hero, Dark Knight, Paladin, Archmage(I/L), Archmage(F/P), Bowmaster, Marksman, Night Lord, Shadower
- [ ] `src/ui/screens/JobSelectScreen.jsx`:
  - 4 클래스 카드 → 서브 직업 선택
  - **★E11 직업 프리뷰**: 선택 전 스킬 애니메이션 시연
  - 스탯 성장률 비교 표
  - 확정 후 되돌릴 수 없음 경고
- [ ] Job Advancement 시스템:
  - Lv.10 → 1차 전직 (서브 직업 확정)
  - Lv.30 → 2차 전직 (스탯 보너스 + 새 스킬)
  - Lv.60 → 3차 전직 (새 스킬)
  - Lv.100 → 4차 전직 (궁극기 해금)
  - 전직 퀘스트: 특정 몬스터 N마리 처치

#### 2.2 Stat Allocation + Maple Grade

**작업 목록**:
- [ ] `src/systems/logic/GrowthSystem.js`:
  - 레벨업: XP >= XPToNext → 레벨+1, 능력치 포인트 5 지급
  - 경험치 테이블: `data/balance.json` (지수 증가)
  - 스탯 배분 UI 연동 (Preact Signal)
- [ ] Maple Grade 계산:
  - 25 포인트 투자마다 등급 +1
  - 등급 상승 시 특수 능력치 포인트 지급
- [ ] **★G5 스탯 초기화**:
  - 골드 소비로 전체 스탯 리셋
  - 비용: 레벨 × 1000 골드 (점진적 증가)
- [ ] 스탯 소스 통합 계산:
  - Base(직업+레벨) + 배분 + 장비 + 주문서 + 스타포스 + 잠재 + 동료 + 유물 + 용사의힘 + 어빌리티 + 길드
  - 표시순서: 기본 → 플랫 추가 → % 적용
- [ ] Combat Power 공식:
  - `CP = wATK×ATK + wHP×HP + wDEF×DEF + wCRIT×(CRIT_RATE×CRIT_DMG) + companionEquipStats`
  - 가중치: `data/balance.json`

#### 2.3 Full Damage Formula + Hit/Miss (검증 강화)

**작업 목록**:
- [ ] CombatSystem.js 고도화:
  - 모든 배율 적용 (damage%, boss_dmg%, normal_monster_dmg%, skill_dmg%, final_dmg%)
  - max_damage_multiplier 클램프
  - min/max damage range 적용
- [ ] Hit/Miss System:
  - ACCURACY < EVASION → MISS 표시
  - 초과 ACCURACY → 보너스 데미지 (1% per N)
- [ ] Attack Speed 공식 완성:
  - `interval = base_interval / (1 + atkSpd% / 100)`
  - 일반 공격 = 총 DPS의 80%+ (스킬은 버스트)
- [ ] **★G4 사망 패널티**: 즉시 부활 + 10초 무적 (골드 손실 없음)
- [ ] `tests/formulas.test.js` 확장:
  - Edge cases: DEF > ATK, 0% crit, 100% crit, miss
  - 데미지 범위 분포 검증 (10만 회)
  - 공격 속도 정확도 (틱 경계 정량화)

#### 2.4 Equipment System + Elite Monster

**작업 목록**:
- [ ] `src/components/equipment.js`:
  ```javascript
  // 10 슬롯 (Hat, Top, Bottom, Gloves, Shoes, Cape, Shoulder, Belt, Necklace, Ring)
  // + Face Accessory (11번째, Zakum 드롭)
  EquipSlot = {
    itemGrade: new Uint8Array(MAX),  // Normal=0, Rare=1, Epic=2, Unique=3, Legendary=4
    itemLevel: new Uint16Array(MAX),
    mainStat: new Float32Array(MAX),
    subOpt1: new Float32Array(MAX), subOpt1Type: new Uint8Array(MAX),
    subOpt2: new Float32Array(MAX), subOpt2Type: new Uint8Array(MAX),
    subOpt3: new Float32Array(MAX), subOpt3Type: new Uint8Array(MAX),
  }
  ```
- [ ] 장비 획득 — 엘리트 몬스터 소환:
  - Monster Points 소비 → 엘리트 몬스터 소환
  - 킬 → 장비 드롭 (등급 확률 = Elite Summon Level 기반)
  - Elite Summon Level: Armor Stones로 상승
  - 불필요 장비 → 분해 → Armor Stones
  - **★E5 자동 반복 소환**: "Auto Summon" 버튼
- [ ] 장비 레벨 = 획득 시 플레이어 레벨
- [ ] `data/equipment.json` 완성:
  - 슬롯별 primary stat, special option
  - 등급별 기본 스탯 범위
  - 서브 옵션 풀
- [ ] `data/elite_monsters.json`:
  - 소환 레벨별 등급 드롭 확률
- [ ] **★G6 Face Accessory (11번째 슬롯)**:
  - Zakum Raid 드롭 전용
  - 주문서/스타포스/잠재능력 모두 적용 가능
  - 고유 옵션: 올스탯 %

#### 2.5 Inventory Management (★신규 G3)

**작업 목록**:
- [ ] `src/ui/panels/InventoryPanel.jsx`:
  - 인벤토리 슬롯 100칸 (확장 가능)
  - 정렬: 등급순, 슬롯별, 레벨순
  - 필터: 등급, 슬롯 타입
  - 일괄 분해: 선택한 등급 이하 전체 분해
  - 자동 분해 설정: "Rare 이하 자동 분해" 토글
- [ ] 장비 비교 툴팁:
  - 현재 장착 vs 선택 장비
  - 스탯 차이 (+/- 색상)
  - 전투력 변화 미리보기

#### 2.6 Weapon System

**작업 목록**:
- [ ] `src/components/weapon.js`:
  ```javascript
  WeaponSlot = {
    weaponId: new Uint16Array(MAX),
    grade: new Uint8Array(MAX),
    enhanceLevel: new Uint8Array(MAX),
    baseAtk: new Float32Array(MAX),
  }
  ```
- [ ] 무기 강화:
  - Weapon Materials (무기 던전 보상) 소비
  - 등급 승급: 별도 진행 체계
  - 강화 시 기본 ATK 증가
- [ ] 직업별 무기 타입:
  - Warrior: 검/도끼/창
  - Mage: 지팡이/완드
  - Archer: 활/석궁
  - Thief: 단검/아대
- [ ] `data/weapons.json` 작성

#### 2.7 Scroll Enhancement

**작업 목록**:
- [ ] `src/systems/meta/EnhancementSystem.js` (Scroll 파트):
  - 주문서 종류:
    - **70% 주문서**: 성공률 70%, 저보너스 (가장 안전)
    - **30% 주문서**: 성공률 30%, 고보너스 (도박형)
    - **15% 주문서**: 성공률 15%, 최고보너스 (하이리스크) — 재화표 기준
    - **100% 주문서**: 성공률 100%, 극소보너스 (안전 누적용)
    > **스펙 해소**: 원본 §7a에서 100% 주문서, 재화표(§21)에서 15% 주문서를 각각 정의. 둘 다 별개 아이템으로 공존.
  - 확률 판정 → 성공: 스탯 추가 / 실패: 주문서만 소모
  - 슬롯당 최대 주문서 횟수 제한
  - **★G8 "슬롯 강화"**: 장비를 교체해도 강화 유지
- [ ] Scroll Saving (Section 7d):
  - 실패 시 진행도 보존
  - 마지막 성공 지점에서 재시도 가능
  - Lv.85+ 장비: 향상된 주문서 효율
- [ ] `data/scrolls.json` 작성:
  - 주문서 타입별 성공률, 스탯 보너스
  - 슬롯당 최대 횟수

#### 2.8 Starforce Enhancement

**작업 목록**:
- [ ] EnhancementSystem.js (Starforce 파트):
  - ★0 → ★25 단계
  - 단계별 확률: 성공 / 유지 / 하락 / 파괴
  - ★10+ 실패 시 ★ 하락 가능
  - **★G8 "파괴" = ★ 3단계 하락 + 골드 패널티** (장비 파괴 아님)
  - ★12 도달 시 → Additional Cube 슬롯 해금
  - 각 ★ = 소량 올스탯 보너스
  - Starforce Scrolls 소비 (희소 자원)
  - **Starforce Scroll 획득처** (3곳 한정):
    1. Arena 주간 랭킹 보상
    2. Arena Shop 구매
    3. 이벤트 보상
  - **추천 강화 순서**: all ★3 → all ★5 → Gloves ★12 → Bottom ★10 → 나머지 ★10 → Gloves ★15+
- [ ] `data/starforce.json` 작성:
  - ★0~★25 확률 테이블 (success, maintain, drop, destroy)
  - ★별 스탯 보너스
  - 소비 Starforce Scroll 수
- [ ] 강화 UI:
  - 현재 ★ 표시 + 다음 ★ 성공률
  - 성공/실패 애니메이션 (스파크 + 플래시)
  - enhance_success.wav / enhance_fail.wav

#### 2.9 Potential System

**작업 목록**:
- [ ] EnhancementSystem.js (Potential 파트):
  - Epic+ 등급 장비에만 적용
  - 최대 3줄 옵션
  - **Normal Cube**: 일반 풀에서 리롤
  - **Additional Cube**: ★12+ 슬롯 전용, 별도 풀
  - **Miracle Cube**: 프리미엄 (등급업 확률 증가)
  - 잠재 등급: Rare → Epic → Unique → Legendary → Mythic
  - 슬롯별 고유 옵션 (Hat=쿨감, Top=타겟수+, Gloves=크뎀%, etc.)
- [ ] `data/potentials.json` 작성:
  - 슬롯별 옵션 풀
  - 등급별 옵션 범위
  - 큐브 타입별 등급업 확률
- [ ] `tests/enhancement.test.js`:
  - 스타포스 확률 분포 검증 (10만 회)
  - 잠재능력 등급업 확률 검증

#### 2.10 Currency System (기반)

**작업 목록**:
- [ ] 16 재화 시스템 구현:
  - Gold, Gems, Red Diamonds, Monster Points, Armor Stones
  - Weapon Materials, Warrior Tokens, Honor Medals
  - Dungeon Coins (5종), Boss Coins, World Boss Coins
  - Arena Points, Guild Coins
  - Scrolls, Starforce Scrolls, Cubes (Normal/Additional/Miracle)
  - Mastery Points
- [ ] `data/currencies.json` 완성
- [ ] 재화 UI: 상단 바에 주요 재화 표시

#### 2.11 Equipment Preset (★E2) + Batch Enhancement (★E3)

**작업 목록**:
- [ ] **장비 프리셋**:
  - 최대 3세트 저장 (보스용, 사냥용, PvP용)
  - 원클릭 세트 전환
- [ ] **일괄 강화**:
  - "전 슬롯 ★N까지" 한번에 강화
  - 소비 자원 사전 계산 + 확인
- [ ] **★E12 추천 강화 타겟**:
  - 비용 대비 효율 기반 추천
  - "다음으로 강화할 슬롯: Gloves (★3→★5, 예상 비용: 50k Gold)"

**★ M3 (Progression Demo) 검증 기준**:
- [ ] 직업 선택 → 스탯 배분 → 레벨업 루프 동작
- [ ] 챕터 1~3 사냥 + 챕터 보스 도전 가능
- [ ] 장비 획득 → 장착 → 스탯 변화 확인
- [ ] 무기 강화 동작

**★ M4 (Enhancement Demo) 검증 기준**:
- [ ] 주문서 강화: 성공/실패 확인
- [ ] 스타포스: ★0~★12 테스트 (★12 Additional Cube 해금)
- [ ] 잠재능력: 큐브 사용 → 옵션 리롤 확인
- [ ] 모든 강화 애니메이션/사운드 동작

**Quality Gate 2**:
- [ ] M3 + M4 모든 기준 통과
- [ ] `tests/formulas.test.js` + `tests/enhancement.test.js` 통과
- [ ] 강화 확률 통계적 검증 (p-value < 0.05)
- [ ] 세이브/로드 → 모든 장비/강화 상태 보존
- [ ] 인벤토리 100개 장비 시 프레임 유지

---

### Phase 3: Deep Systems

> **목표**: 용사의 힘, 스킬, 동료, 유물 — 핵심 성장 시스템 완성
> **Milestone**: M5 (Companion Demo)

#### 3.1 Warrior's Power + Ability

**작업 목록**:
- [ ] `src/components/warrior.js`:
  ```javascript
  WarriorPower = {
    tier: new Uint8Array(MAX),
    // 각 티어의 스탯 투자량
    accuracy: new Uint16Array(MAX), damage: new Uint16Array(MAX),
    mainStat: new Uint16Array(MAX), atk: new Uint16Array(MAX),
    hp: new Uint16Array(MAX), def: new Uint16Array(MAX),
  }
  AbilityOption = {
    slot1Grade: new Uint8Array(MAX), slot1Type: new Uint8Array(MAX), slot1Value: new Float32Array(MAX),
    slot2Grade: new Uint8Array(MAX), slot2Type: new Uint8Array(MAX), slot2Value: new Float32Array(MAX),
    slot3Grade: new Uint8Array(MAX), slot3Type: new Uint8Array(MAX), slot3Value: new Float32Array(MAX),
    slot4Grade: new Uint8Array(MAX), slot4Type: new Uint8Array(MAX), slot4Value: new Float32Array(MAX),
    transformLevel: new Uint16Array(MAX),  // 총 리롤 횟수 기반
  }
  ```
- [ ] Warrior's Power 시스템:
  - Warrior Tokens 소비하여 스탯 상승
  - 티어 구조: 현재 티어 스탯 전부 채우면 → 다음 티어 해금
  - 상위 티어 = 더 높은 스탯 + Ability 슬롯 추가
  - 우선순위: Accuracy > Damage > Main Stat > ATK > HP > DEF
- [ ] Ability System:
  - Honor Medals 소비하여 옵션 리롤
  - 최대 4 옵션 슬롯
  - 등급: Rare → Epic → Unique → Legendary → Mythic
  - 자물쇠로 원하는 옵션 고정 (리롤 비용 증가)
  - 프리셋 시스템 (여러 설정 저장)
  - Ability Transformation Level: 총 리롤 횟수 → 고등급 확률 개선
  - 옵션 풀: armor penetration, damage%, main stat, ATK, crit damage%, ATK speed, **EXP 획득량%**, HP, DEF, boss damage%
- [ ] `data/abilities.json` 작성
- [ ] `src/ui/panels/WarriorPanel.jsx`

#### 3.2 Skill System + Mastery Tree

**작업 목록**:
- [ ] `src/components/skill.js`:
  ```javascript
  SkillSlot = {
    // 일반공격 + 액티브 1~3 + 궁극기 = 최대 5 슬롯
    skillId: new Uint16Array(MAX * 5),  // per slot
    level: new Uint8Array(MAX * 5),
    cooldown: new Float32Array(MAX * 5),
    currentCd: new Float32Array(MAX * 5),
  }
  ```
- [ ] 스킬 구조:
  - **Normal Attack**: 자동, 쿨다운 없음, DPS 80%+
  - **Active Skill 1~3**: 쿨다운 기반, AoE
  - **Ultimate**: 4차 전직 해금, 40~60초 쿨다운
  - **★G7 AoE 형태**:
    - Rect: 전방 직사각형 (전사 베기)
    - Circle: 중심 원형 (마법사 폭발)
    - Cone: 전방 부채꼴 (궁수 화살 비)
  - 모든 스킬은 AoE — 싱글 타겟 없음
  - **플랫폼 관통**: 같은 Y 범위 ± 64px 내 적에게 히트
- [ ] 스킬 강화:
  - 스킬 재료 소비 → 레벨업
  - 레벨업 = 배율 증가
- [ ] Mastery Tree:
  - 분기 트리: AoE 확대, 쿨감, 추가 타수, 디버프 부여
  - Mastery Points (레벨업 + 특정 던전 보상)
  - `data/mastery_tree.json` 작성
- [ ] `src/ui/panels/SkillPanel.jsx`:
  - 스킬 아이콘 + 레벨 + 쿨다운 표시
  - 마스터리 트리 시각화 (노드 + 연결선)
- [ ] `src/ui/hud/QuickSlot.jsx`:
  - 하단 스킬 바 (실시간 쿨다운 표시)

#### 3.3 Companion System + Gacha

**작업 목록**:
- [ ] `src/components/companion.js`:
  ```javascript
  CompanionData = {
    companionId: new Uint16Array(MAX),
    rarity: new Uint8Array(MAX),  // R=0, SR=1, SSR=2
    star: new Uint8Array(MAX),    // ★1~★5
    jobClass: new Uint8Array(MAX),
  }
  CompanionEquipped = { slot: new Uint8Array(MAX) }  // 0~3 (최대 4명 장착)
  ```
- [ ] 동료 시스템:
  - 최대 4명 장착
  - 각 동료 = 직업 클래스 + 고유 패시브
  - **Equip Effect**: 파티에 있을 때 활성 (전투력에 포함)
  - **Own Effect**: 소유만으로 항상 활성 (전투력 미포함)
- [ ] 가챠:
  - Gems 소비
  - 1연차 / 10연차 (10연차 SR+ 보장)
  - 기본 확률: R 80%, SR 17%, SSR 3%
  - **★E1 천장 시스템**: 80연차 내 SSR 미획득 시 보장
  - 중복 → ★ 랭크업 (★1~★5, 각 ★ = +20% 스탯)
- [ ] 시너지:
  - 특정 동료 조합 → 보너스 버프
  - 예: 전사 2명 = DEF +10%, 마법사+궁수 = 스킬 DMG +5%
  - `data/synergies.json`
- [ ] 가챠 연출:
  - 카드 뒤집기 애니메이션
  - 등급별 테두리 색상 (R=gray, SR=blue, SSR=gold)
  - gacha_pull.wav / gacha_reveal_ssr.wav
  - **★E10 연출 스킵 토글**
- [ ] `src/systems/logic/CompanionAISystem.js`:
  - 동료 오토배틀 AI (플레이어 AI와 유사)
  - 플레이어 근처 유지 + 몬스터 공격
- [ ] `tests/gacha.test.js`:
  - 10,000회 시뮬레이션
  - R/SR/SSR 비율 통계 검증
  - 천장 보장 작동 확인

#### 3.4 Relic System

**작업 목록**:
- [ ] `src/components/relic.js`:
  ```javascript
  RelicSlot = {
    relicId: new Uint16Array(MAX),
    grade: new Uint8Array(MAX),  // Rare=0, Epic=1, Unique=2, Legendary=3
    activeEffectType: new Uint8Array(MAX),
    activeEffectValue: new Float32Array(MAX),
    passiveEffectType: new Uint8Array(MAX),
    passiveEffectValue: new Float32Array(MAX),
  }
  ```
- [ ] 유물:
  - 최대 3개 장착
  - **Active Effect**: 특정 콘텐츠에서만 활성 (예: "챕터 사냥: 최종데미지 +5%")
  - **Passive Effect**: 항상 활성 (예: "보스 데미지 +2%")
  - 등급: Rare → Epic → Unique → Legendary
  - 획득: Boss Raid 보상, 이벤트
- [ ] `data/relics.json` 작성
- [ ] `src/ui/panels/RelicPanel.jsx`

**★ M5 (Companion Demo) 검증 기준**:
- [ ] 가챠 연출 + 동료 획득 동작
- [ ] 동료 장착 → 전투에 참여 → 시너지 버프
- [ ] 용사의 힘 → 스탯 투자 → 전투력 변화
- [ ] 스킬 사용 → AoE 범위 히트 → 쿨다운 순환
- [ ] 가챠 확률 테스트 통과

**Quality Gate 3**:
- [ ] M5 모든 기준 통과
- [ ] `tests/gacha.test.js` 통과 (확률 분포 검증)
- [ ] 동료 4명 + 플레이어 동시 전투 시 20fps 유지
- [ ] 모든 성장 시스템 세이브/로드 정상

---

### Phase 4: Content

> **목표**: 모든 게임 콘텐츠 구현 — 던전, 보스, PvP, 길드, 파티퀘
> **Milestone**: M6 (Content Demo)

#### 4.1 Chapter Hunting + Chapter Challenge

**작업 목록**:
- [ ] Chapter Hunting (메인 사냥터):
  - 챕터 선택 → 플랫포머 맵 진입 → 오토사냥
  - 몬스터 지속 리스폰
  - 드롭: EXP, Gold, Monster Points
  - 높은 챕터 = 강한 몬스터 = 더 많은 보상
  - 맵 효율 표시 (kills/minute) ★게임 디자인 개선
- [ ] Chapter Challenge (보스 게이트):
  - 시간 제한 내 챕터 보스 처치
  - 클리어 → 다음 챕터 해금
  - 실패 → 이전 챕터 사냥터 복귀
  - 보스 패턴: 텔레그래프 AoE (빨간 존 → 2초 → 데미지)
- [ ] Tiled 맵 추가 제작:
  - Chapter 4~10 (최소 10챕터)
  - 각 챕터: 고유 타일셋 + 배경 + 몬스터 세트
- [ ] `data/chapters.json` 완성 (10+ 챕터)
- [ ] `data/chapter_bosses.json` 작성

#### 4.2 5 Growth Dungeons

**작업 목록**:

| 던전 | 보상 | 형태 | 구현 |
|------|------|------|------|
| Weapon Dungeon | 무기 재료 | Wave survival, 60s | 웨이브 스폰 시스템 |
| EXP Dungeon | 대량 EXP | Infinite spawn, 90s | 타이머 + 킬카운트 |
| Equipment Dungeon | Monster Points + 재료 | 1v1 보스 | 보스 AI |
| Warrior's Training | Warrior Tokens | Escalating waves | 점진적 난이도 |
| Enhancement Dungeon | 주문서, 큐브 | Mini-stage + 기믹 | 특수 스테이지 |

- [ ] 공통 시스템:
  - 일일 입장 횟수 제한 (00:00 초기화)
  - 난이도 티어 (1~10+)
  - **★E4 던전 소탕**: 클리어한 난이도는 즉시 보상 수령
  - Red Diamonds로 추가 입장 (2,000 / 3,000 / 5,000)
- [ ] `data/dungeons.json` 작성
- [ ] `src/ui/panels/DungeonPanel.jsx`:
  - 5 던전 선택 카드
  - 난이도 선택 + 남은 입장 횟수
  - 소탕 버튼 (클리어 완료된 난이도)

#### 4.3 World Boss + Boss Raid

**작업 목록**:
- [ ] World Boss:
  - 시뮬레이션 서버 와이드 보스 (싱글 플레이 → AI 리더보드)
  - 시간 제한: 최대 데미지 딜링
  - 보스 HP = 솔로로 처치 불가능한 수준
  - 데미지 기여 랭킹 → 보상
  - World Boss Coins → World Boss Shop
- [ ] Boss Raid:
  - 20 난이도 티어
  - 120초 시간 제한
  - 보스 패턴:
    - Telegraphed AoE (빨간 존 경고)
    - Minion summon (소환수)
    - Self-buff (ATK 증가)
  - Boss Coins → Boss Shop (SSR 장비 교환)
  - 주간 입장 제한 (기본 3회, **Red Diamonds로 추가 구매 가능**)
- [ ] **Zakum Raid** (특별 레이드):
  - 최소 전투력 요구
  - 고유 드롭: **Face Accessory** (11번째 슬롯)
  - Zakum Helmet (특수 모자)
  - 사망 카운터 공유
  - 난이도: Easy / Normal / Hard
  - 메이플 원작 카오스 자쿰 패턴 참조
- [ ] `data/bosses.json` 작성
- [ ] `src/ui/panels/BossPanel.jsx`

#### 4.4 Arena (PvP)

**작업 목록**:
- [ ] Async PvP:
  - 실시간 아님 — 상대 저장 데이터 로드, AI vs AI
  - 싱글 플레이 → AI 생성 프로필 상대
  - 내 팀 (캐릭터 + 동료 4) vs 상대 팀
  - 60초 시간 제한, 오토배틀
  - 같은 전투력 ≠ 같은 결과 (조합 중요)
- [ ] **★E8 진형 배치**:
  - 전열 / 후열 포지션
  - 전열: 피격 우선, 근접 공격
  - 후열: 보호, 원거리 공격
- [ ] Arena Points → Arena Shop
- [ ] 주간 랭킹 → 등급별 보상
- [ ] `data/arena.json` 작성
- [ ] `src/ui/panels/ArenaPanel.jsx`

#### 4.5 Guild

**작업 목록**:
- [ ] 길드 가입/생성:
  - 싱글 플레이 → AI 길드원
- [ ] Guild Skills: 길드 레벨 → 패시브 버프
- [ ] Guild Shop: Guild Coins 소비
- [ ] Guild Buffs: 시간 제한 부스트
- [ ] Guild Boss Battle: 전원 데미지 합산 → 길드 보스 처치
- [ ] `data/guild.json` 작성
- [ ] `src/ui/panels/GuildPanel.jsx`

#### 4.6 Party Quest

**작업 목록**:
- [ ] **킹슬라임 파티퀘스트**:
  - 최소 3인 파티 (AI 파티원 충원)
  - Easy / Normal 난이도
  - 예상 클리어 타임: ~40~60초
  - 전략: 소형 슬라임 먼저 처치 → 킹 슬라임 공격
  - **고유 보상: Party Quest Ring** (반지 슬롯 전용)
  - 링 고유 옵션
  - 자동 매칭 시스템
- [ ] **Dimensional Rift**:
  - 더 높은 난이도
  - 다른 보상 풀
- [ ] 일일 입장 제한
- [ ] `data/party_quests.json` 작성
- [ ] `src/ui/panels/PartyQuestPanel.jsx`

**★ M6 (Content Demo) 검증 기준**:
- [ ] 10+ 챕터 사냥 + 보스 게이트 순환 동작
- [ ] 5 던전 전부 플레이 가능 + 소탕 기능
- [ ] Boss Raid 3종 + Zakum Raid 동작
- [ ] Arena PvP 매칭 + 전투 + 보상
- [ ] 길드 가입 + 길드 보스 참여
- [ ] 파티퀘스트 클리어 + 링 획득

**Quality Gate 4**:
- [ ] M6 모든 기준 통과
- [ ] 모든 보스 패턴 작동 (AoE, 소환, 자버프)
- [ ] 던전 일일 입장 제한 정상
- [ ] AI 상대/동료 행동 자연스러움
- [ ] 세이브/로드 → 모든 콘텐츠 진행 보존

---

### Phase 5: Retention & Polish

> **목표**: 지속 플레이 유도 시스템 + 전체 폴리시 + 모바일 대응
> **Milestone**: M7 (Retention Demo) → M8 (Release Candidate)

#### 5.1 Daily Quests + Achievements + Attendance

**작업 목록**:
- [ ] Daily Quests (일일 퀘스트):
  - 5~8 태스크/일 (킬 N마리, 던전 N회, 강화 1회, etc.)
  - 완료 → 보상 + 활동 포인트
  - 활동 포인트 마일스톤 → 보너스 보상 상자
  - 00:00 초기화
- [ ] Achievements (업적):
  - 누적 목표 (총 킬수, 총 강화, 총 가챠 등)
  - 업적 달성 → 일회성 보상
  - 티어: Bronze → Silver → Gold → Diamond
  - **★E9 알림 뱃지** (빨간 점)
  - 마일스톤 축하 연출
- [ ] Attendance (출석):
  - 28일 사이클 로그인 보상
  - 연속 출석 보너스
  - 월간 초기화
- [ ] `data/daily_quests.json`, `data/achievements.json`, `data/attendance.json` 작성
- [ ] `src/systems/meta/QuestSystem.js`:
  - 모든 시스템 이벤트 추적
  - EventBus 연동

#### 5.2 Costume System

**작업 목록**:
- [ ] 코스튬 (외형 전용, 스탯 없음):
  - 슬롯: Hat, Top, Bottom, Shoes, Weapon Skin
  - 획득: 이벤트, 특수 상점, 코스튬 가챠
  - Sprite overlay로 렌더링
- [ ] `data/costumes.json`
- [ ] `src/ui/panels/CostumePanel.jsx`

#### 5.3 Offline Rewards + Quick Hunt

**작업 목록**:
- [ ] Offline Rewards:
  - 앱 완전 종료 → 5분 후 오프라인 모드 활성화
  - 수익: (경과분 × kills_per_minute × 효율률)
  - kills_per_minute: 현재 챕터 몬스터 스탯 vs 플레이어 스탯
  - 효율: 온라인의 60%
  - 최대 누적: 24시간
  - 로그인 시 → 보상 팝업 → [수령] 버튼
- [ ] `src/workers/OfflineWorker.js`:
  - Web Worker에서 오프라인 시뮬레이션
  - timestamp 기반 경과 시간 계산
  - 최대 24시간 캡
- [ ] Quick Hunt (빠른사냥):
  - Gems 소비 → N시간 사냥 보상 즉시 수령
  - 일일 3회 제한
- [ ] `tests/offline.test.js`:
  - 오프라인 보상 일관성 검증
  - 온라인/오프라인 보상 비율 검증 (60%)
- [ ] `data/offline.json`

#### 5.4 Currency & Shop Consolidation

**작업 목록**:
- [ ] 모든 상점 통합:
  - Arena Shop, Boss Shop, World Boss Shop, Guild Shop, Dungeon Shop(5종)
  - **Premium Shop** (Red Diamonds 전용): 추가 던전 입장권, 프리미엄 패키지, 편의 아이템
  - 재화별 상품 목록
  - 구매 제한 (일/주간)
- [ ] `data/shops.json` 완성
- [ ] `src/ui/panels/ShopPanel.jsx`:
  - 탭 형태 상점 UI
  - 재화 잔액 표시
  - 구매 확인 모달

#### 5.5 Notification System (★G9)

**작업 목록**:
- [ ] `src/ui/hud/NotificationToast.jsx`:
  - 일퀘 초기화 알림
  - 던전 입장 초기화 알림
  - 오프라인 보상 대기 알림
  - 출석 체크 리마인더
  - 업적 달성 알림
- [ ] 빨간 점 뱃지 (탭바 아이콘)

#### 5.6 Comeback Mechanic (★E7)

**작업 목록**:
- [ ] 복귀 유저 보너스:
  - 7일 미접속 시 "Welcome Back" 패키지
  - 가속 성장 버프 (경험치 +50%, 3일)
  - 보상 상자 (Gems, Scrolls, Gold)

#### 5.7 Event Framework (★E13)

**작업 목록**:
- [ ] `data/events.json` 기본 구조:
  - 이벤트 타입: 한정 던전, 이벤트 상점, 이벤트 재화
  - 시작/종료 시간
  - 보상 풀
- [ ] 이벤트 배너 UI
- [ ] 기본 이벤트 1개 제작 (런칭 이벤트)

#### 5.8 Mobile Touch Controls

**작업 목록**:
- [ ] 반응형 캔버스 스케일링
- [ ] 터치 컨트롤:
  - 왼쪽: 가상 조이스틱 (이동)
  - 오른쪽: 액션 버튼 (점프, 스킬)
- [ ] UI 뷰포트 적응
- [ ] 터치 vs 클릭 이벤트 분리

#### 5.9 Audio Integration

**작업 목록**:
- [ ] `src/render/AudioManager.js`:
  - Howler.js wrapper
  - BGM: 챕터별 루프 재생
  - SFX: attack_hit, attack_miss, skill_*, monster_death, loot_pickup, level_up, ui_*, enhance_*, gacha_*
  - 볼륨 컨트롤 (Settings 연동)
  - 탭 비활성 시 BGM 일시정지

#### 5.10 Balance Tuning

**작업 목록**:
- [ ] `tools/balance-sim.js`:
  - CLI 밸런스 시뮬레이터
  - 경험치 커브 검증
  - 골드 경제 시뮬레이션
  - 강화 비용 대비 스탯 효율
  - 가챠 ROI (Gems 대비 전투력)
- [ ] 밸런스 포인트 검증:
  - 챕터 진행 속도 (시간당 챕터 클리어)
  - 장비 갱신 주기
  - 병목 자원 (Starforce Scrolls, Gems)
  - 오프라인 vs 온라인 보상 비율

#### 5.11 Combat Power History (★E6)

**작업 목록**:
- [ ] 7일 전투력 그래프
- [ ] 일별 전투력 기록 (세이브에 저장)
- [ ] 차트 시각화 (Canvas 기반 간단 그래프)

#### 5.12 Final Testing + Optimization

**작업 목록**:
- [ ] Performance profiling:
  - 60fps 유지 검증 (몬스터 20마리 + 동료 4 + 파티클)
  - Memory leak 체크 (30분 세션)
  - Bundle size 최적화 (목표: <500KB gzip)
  - 초기 로드 시간 (목표: <3초)
- [ ] Cross-browser 테스트:
  - Chrome, Firefox, Safari, Edge
  - iOS Safari, Android Chrome
- [ ] Error boundary 최종 검증
- [ ] 세이브 마이그레이션 테스트

**★ M7 (Retention Demo) 검증 기준**:
- [ ] 일퀘 5개 완료 → 보상 수령 → 활동 포인트 마일스톤
- [ ] 업적 3개 이상 달성 + 축하 연출
- [ ] 출석 체크 28일 사이클 동작
- [ ] 오프라인 보상 (5분+ 미접속 후 복귀)
- [ ] 모든 상점 구매 정상
- [ ] 코스튬 장착 → 외형 변경

**★ M8 (Release Candidate) 검증 기준**:
- [ ] 모바일 터치 컨트롤 동작
- [ ] BGM/SFX 전체 재생
- [ ] 밸런스 시뮬레이션 통과
- [ ] Cross-browser 테스트 통과
- [ ] 60fps 유지 (20 엔티티 동시)
- [ ] Bundle < 500KB gzip
- [ ] 초기 로드 < 3초
- [ ] 메모리 누수 없음

**Quality Gate 5 (Final)**:
- [ ] M7 + M8 모든 기준 통과
- [ ] 전체 테스트 스위트 통과 (formulas, gacha, offline, enhancement, save-migration)
- [ ] `npm run build` 에러 없음
- [ ] Vercel/Netlify 배포 테스트
- [ ] 10분 플레이 세션: "계속 하고 싶다" 느낌 검증

---

## Part 5: Risk Registry & Mitigation

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| R1 | 플랫폼 경로 탐색 AI 난이도 | HIGH | HIGH | Phase 1에서 Navigation Graph 프로토타입 우선 제작. BFS 기반 단순 구현 후 점진적 개선 |
| R2 | 에셋 파이프라인 지연 | HIGH | HIGH | Phase 0를 절대 건너뛰지 않음. placeholder 스프라이트(색상 사각형)로 임시 대체 불가 — 최소 ansimuz 1팩이라도 적용 |
| R3 | 강화 확률 버그 | MEDIUM | HIGH | TDD: enhancement.test.js 먼저 작성 후 구현. 10만 회 시뮬레이션 통계 검증 |
| R4 | PixiJS + Preact 라이프사이클 충돌 | MEDIUM | MEDIUM | UIBridge를 Preact Signals로 단방향 통신. DOM ↔ Canvas 이벤트 명확히 분리 |
| R5 | 세이브 데이터 크기/성능 | MEDIUM | MEDIUM | 초기부터 세이브 크기 모니터링. 엔드게임 상태(장비 100개+)에서 벤치마크 |
| R6 | 밸런스 붕괴 | HIGH | HIGH | Phase별 balance-sim.js 실행. 시스템 추가 시마다 경제 영향 검증 |
| R7 | 오프라인 보상 어뷰징 | MEDIUM | LOW | 클라이언트 timestamp 외에 서버사이드 검증은 불가 (정적 사이트). Math.min(elapsed, 24h) 캡으로 최소 방어 |
| R8 | 번들 크기 초과 | MEDIUM | MEDIUM | 에셋 lazy loading. PixiJS tree-shaking 확인. 스프라이트시트 2048x2048 제한 |
| R9 | Web Worker SharedArrayBuffer COOP/COEP | LOW | MEDIUM | Vercel/Netlify 헤더 설정. 불가 시 postMessage fallback |
| R10 | 보스 AI 패턴 체감 | MEDIUM | HIGH | 각 보스 패턴 독립 프로토타입 + 플레이테스트 반복 |

---

## Part 6: Quality Gates & Milestones

### Milestone Timeline

```
Phase 0 ────── Phase 1 ──────────── Phase 2 ────────────── Phase 3 ──── Phase 4 ──────────── Phase 5 ──────────
   │              │    │                │    │                │              │                     │    │
   ▼              ▼    ▼                ▼    ▼                ▼              ▼                     ▼    ▼
  QG0            M1   M2              M3   M4               M5             M6                   M7   M8
  Setup       Walking Combat     Progress Enhance       Companion      Content              Retain  RC
```

### Quality Gate Criteria (Summary)

| Gate | Phase | Must Pass |
|------|-------|-----------|
| QG0 | 0 | Preact+PixiJS 마운트, 아틀라스 로드, 타일맵 렌더, JSON 파싱 |
| QG1 | 1 | M2 전체, 세이브/로드, formulas.test.js, 메모리 OK, 60fps |
| QG2 | 2 | M3+M4 전체, enhancement.test.js, 확률 통계, 인벤토리 성능 |
| QG3 | 3 | M5 전체, gacha.test.js, 동료 4인 전투 성능, 세이브 무결성 |
| QG4 | 4 | M6 전체, 보스 패턴, 던전 제한, AI 품질, 세이브 무결성 |
| QG5 | 5 | M7+M8 전체, 모든 테스트, 빌드, 배포, 모바일, 성능, 밸런스 |

---

## Part 7: Asset Pipeline

### 7.1 Spritesheet Naming Convention

```
{category}_{entity}_{action}_{frame}.png

예:
hero_warrior_idle_00.png
hero_warrior_idle_01.png
hero_warrior_run_00.png
monster_slime_idle_00.png
monster_slime_death_00.png
effect_slash_00.png
ui_button_normal.png
ui_frame_epic.png
```

### 7.2 Atlas Organization

| Atlas | Contents | Max Size |
|-------|----------|----------|
| `heroes.json` | 10 직업 × 5 액션 × 4~8 프레임 | 2048×2048 |
| `monsters.json` | 20+ 몬스터 × 3 액션 × 4 프레임 | 2048×2048 |
| `bosses.json` | 10+ 보스 × 4 액션 × 6 프레임 | 2048×2048 |
| `effects.json` | 스킬 이펙트, 히트 스파크, 파티클 | 2048×2048 |
| `ui.json` | 프레임, 아이콘, 버튼, 등급 테두리 | 2048×2048 |

### 7.3 Tilemap Convention

```
chapter_XX.tmj           # Tiled JSON 맵 파일
chapter_XX_tileset.tsx    # 타일셋 참조
chapter_XX_bg_sky.png     # 패럴랙스 sky (가장 뒤)
chapter_XX_bg_far.png     # 패럴랙스 far
chapter_XX_bg_near.png    # 패럴랙스 near

Tiled 레이어 구조:
- background (타일 레이어)
- platforms (타일 레이어, 충돌)
- one_way_platforms (타일 레이어, 원웨이)
- ladders (오브젝트 레이어)
- spawn_points (오브젝트 레이어)
- decorations (타일 레이어, 비충돌)
```

### 7.4 Audio Convention

```
bgm/
  chapter_01.ogg ~ chapter_XX.ogg    # 챕터별 BGM (OGG for web)
  boss.ogg                            # 보스전 BGM
  town.ogg                            # 메뉴/상점 BGM

sfx/
  attack_hit.wav
  attack_miss.wav
  skill_fire.wav, skill_ice.wav, skill_slash.wav, skill_lightning.wav
  monster_death.wav
  loot_pickup.wav
  level_up.wav
  ui_click.wav, ui_open.wav, ui_close.wav
  enhance_success.wav, enhance_fail.wav
  gacha_pull.wav, gacha_reveal_ssr.wav
  boss_warning.wav                    # 보스 AoE 경고
```

---

## Part 8: Data Schema Registry

모든 JSON 데이터 파일의 스키마 정의.

### 8.1 jobs.json

```json
{
  "jobs": [
    {
      "id": "warrior_hero",
      "class": "warrior",
      "name": "Hero",
      "nameKr": "히어로",
      "baseStats": {
        "str": 15, "dex": 5, "int": 3, "luk": 4,
        "hp": 200, "mp": 50, "atk": 12, "def": 10,
        "atkSpeed": 1.0, "critRate": 0.05, "critDmg": 1.5
      },
      "growthPerLevel": {
        "str": 5, "dex": 2, "int": 1, "luk": 1,
        "hp": 50, "mp": 10, "atk": 3, "def": 2
      },
      "skills": ["normal_slash", "power_strike", "brandish", "combo_fury"],
      "advancements": [
        { "level": 10, "quest": { "kill": "slime", "count": 30 } },
        { "level": 30, "bonusStats": { "str": 10, "atk": 5 }, "newSkill": "power_strike" },
        { "level": 60, "newSkill": "brandish" },
        { "level": 100, "ultimate": "combo_fury" }
      ],
      "weaponType": "sword"
    }
  ]
}
```

### 8.2 balance.json

```json
{
  "damage": {
    "randomRange": [0.95, 1.05],
    "armorPenCap": 0.8,
    "minDamage": 1,
    "excessAccuracyBonus": { "perN": 10, "bonusPct": 1 }
  },
  "experience": {
    "baseXP": 100,
    "growthRate": 1.12,
    "formula": "baseXP * growthRate^level"
  },
  "combatPower": {
    "weights": { "atk": 3.0, "hp": 0.5, "def": 1.0, "critRate": 200, "critDmg": 100 }
  },
  "deathPenalty": {
    "type": "instant_revive",
    "invincibilitySeconds": 10,
    "goldLoss": 0
  },
  "statReset": {
    "costFormula": "level * 1000"
  },
  "attackSpeed": {
    "baseInterval": 1.0,
    "formula": "baseInterval / (1 + atkSpeedPct / 100)"
  }
}
```

### 8.3 starforce.json

```json
{
  "maxStars": 25,
  "additionalCubeUnlock": 12,
  "levels": [
    { "star": 0, "success": 0.95, "maintain": 0.05, "drop": 0, "destroy": 0, "cost": 1, "statBonus": { "allStat": 1 } },
    { "star": 1, "success": 0.90, "maintain": 0.10, "drop": 0, "destroy": 0, "cost": 1, "statBonus": { "allStat": 1 } },
    { "star": 5, "success": 0.75, "maintain": 0.20, "drop": 0.05, "destroy": 0, "cost": 2, "statBonus": { "allStat": 2 } },
    { "star": 10, "success": 0.50, "maintain": 0.25, "drop": 0.20, "destroy": 0.05, "cost": 3, "statBonus": { "allStat": 3 } },
    { "star": 12, "success": 0.40, "maintain": 0.20, "drop": 0.30, "destroy": 0.10, "cost": 4, "statBonus": { "allStat": 4 } },
    { "star": 15, "success": 0.30, "maintain": 0.15, "drop": 0.35, "destroy": 0.20, "cost": 5, "statBonus": { "allStat": 5 } },
    { "star": 20, "success": 0.15, "maintain": 0.10, "drop": 0.40, "destroy": 0.35, "cost": 8, "statBonus": { "allStat": 8 } },
    { "star": 25, "success": 0.05, "maintain": 0.10, "drop": 0.40, "destroy": 0.45, "cost": 15, "statBonus": { "allStat": 15 } }
  ],
  "destroyPenalty": {
    "type": "star_drop",
    "dropAmount": 3,
    "goldPenalty": "star * 5000"
  }
}
```

### 8.4 companions.json

```json
{
  "gachaRates": { "R": 0.80, "SR": 0.17, "SSR": 0.03 },
  "tenPullGuarantee": "SR+",
  "pitySystem": { "enabled": true, "ssrGuaranteeAt": 80 },
  "maxEquipped": 4,
  "starRankUp": { "maxStar": 5, "statBonusPerStar": 0.20 },
  "companions": [
    {
      "id": "knight_elena",
      "name": "Elena",
      "rarity": "SR",
      "class": "warrior",
      "equipEffect": { "type": "def_percent", "value": 10 },
      "ownEffect": { "type": "hp_flat", "value": 500 },
      "passive": "Shield Wall: 15% 확률로 데미지 50% 감소"
    }
  ],
  "synergies": [
    { "companions": ["warrior", "warrior"], "bonus": { "def_percent": 10 } },
    { "companions": ["mage", "archer"], "bonus": { "skill_dmg_percent": 5 } }
  ]
}
```

### 8.5 tutorial.json

```json
{
  "steps": [
    { "id": "move", "trigger": "first_load", "highlight": "joystick", "text": "방향키로 이동할 수 있어요!", "nextOn": "player_move" },
    { "id": "autobattle", "trigger": "after_move", "highlight": "auto_button", "text": "오토배틀을 켜면 자동으로 사냥해요", "nextOn": "toggle_auto" },
    { "id": "hud", "trigger": "after_autobattle", "highlight": "hud_panel", "text": "여기서 HP와 경험치를 확인하세요", "nextOn": "any_click" },
    { "id": "job_select", "trigger": "level_2", "highlight": "job_button", "text": "직업을 선택하세요! 한번 정하면 바꿀 수 없어요", "nextOn": "job_selected" },
    { "id": "equipment", "trigger": "first_equip_drop", "highlight": "equipment_tab", "text": "장비를 획득했어요! 장착해보세요", "nextOn": "equip_item" },
    { "id": "enhancement", "trigger": "level_10", "highlight": "enhance_tab", "text": "주문서로 장비를 강화할 수 있어요", "nextOn": "enhance_once" }
  ]
}
```

---

## Appendix A: Spec Section → Plan Mapping

원본 스펙의 모든 섹션이 실행 계획에 매핑되었는지 100% 검증.

| Spec Section | Plan Location | Status |
|---|---|---|
| §1 Core Loop & Map | Phase 1.1~1.2 | ✅ Covered |
| §2 Character & Jobs | Phase 2.1 | ✅ Covered |
| §3 Stat System | Phase 2.2 | ✅ Covered + G5 스탯 리셋 추가 |
| §4 Combat & Damage Formula | Phase 1.4 + 2.3 | ✅ Covered + G4 사망 패널티 추가 |
| §5 Equipment System | Phase 2.4~2.5 | ✅ Covered + G3 인벤토리 + G6 Face Accessory |
| §6 Weapon System | Phase 2.6 | ✅ Covered |
| §7a Scroll Enhancement | Phase 2.7 | ✅ Covered |
| §7b Starforce | Phase 2.8 | ✅ Covered + G8 파괴 정의 |
| §7c Potential | Phase 2.9 | ✅ Covered |
| §7d Scroll Saving | Phase 2.7 | ✅ Covered |
| §8 Warrior's Power & Ability | Phase 3.1 | ✅ Covered |
| §9 Companion System | Phase 3.3 | ✅ Covered + E1 천장 시스템 |
| §10 Relic System | Phase 3.4 | ✅ Covered |
| §11 Skill & Mastery | Phase 3.2 | ✅ Covered + G7 AoE 형태 |
| §12 Chapter Hunting & Challenge | Phase 4.1 | ✅ Covered |
| §13 5 Growth Dungeons | Phase 4.2 | ✅ Covered + E4 소탕 |
| §14 World Boss & Boss Raid | Phase 4.3 | ✅ Covered |
| §15 Arena (PvP) | Phase 4.4 | ✅ Covered + E8 진형 배치 |
| §16 Guild | Phase 4.5 | ✅ Covered |
| §17 Party Quest | Phase 4.6 | ✅ Covered |
| §18 Costume System | Phase 5.2 | ✅ Covered |
| §19 Daily/Achievement/Attendance | Phase 5.1 | ✅ Covered + E9 알림 뱃지 |
| §20 Offline Rewards & Quick Hunt | Phase 5.3 | ✅ Covered |
| §21 Currency System | Phase 2.10 | ✅ Covered |
| §22 Save/Load & Deployment | Phase 1.6 + 5.12 | ✅ Covered + G10 마이그레이션 |
| §23 Visual Design & Assets | Phase 0 + Part 7 | ✅ Covered |

**Coverage: 22/22 원본 섹션 + 13 Gap/Enhancement + 19 Audit Fixes (v1.1) = 100%**

### Audit v1.1 Fixes (감사 보완 항목)

| # | 항목 | 수정 내용 |
|---|------|----------|
| M1 | 등급 색상 hex 코드 | Part 1.4 Design Constants에 GRADE_COLORS 추가 |
| M2 | Git 커밋 포맷 | Part 1.6 Git Conventions 섹션 신설 |
| M3 | 브랜치 네이밍 | Part 1.6 Git Conventions에 phase/ 패턴 추가 |
| M4 | 스타포스 추천 순서 | Phase 2.8에 추천 강화 순서 추가 |
| M5 | 킹슬라임 클리어 타임 | Phase 4.6에 ~40-60초 추가 |
| M6 | 픽셀 크기 규격 | Part 1.4에 32x32/16x16 추가 |
| M7 | 핫패스 변수 네이밍 | Part 1.5 Code Style Rules 섹션 신설 |
| M8 | Premium Shop | Phase 5.4에 Red Diamonds 전용 상점 추가 |
| P1 | 주문서 15% vs 100% 모순 | Phase 2.7에 4종 주문서 전부 정의 + 해소 노트 |
| P2 | 보스 레이드 프리미엄 확장 | Phase 4.3에 "Red Diamonds로 추가 구매" 추가 |
| P3 | Starforce Scroll 획득처 | Phase 2.8에 3곳 명시 (Arena주간/Arena상점/이벤트) |
| P4 | UI 패널 스타일 | Part 1.4에 "어두운 반투명 + 픽셀아트 테두리" 명시 |
| P5 | 모달 애니메이션 | Part 1.4에 "slide-in 200ms ease-out" 명시 |
| P6 | 전체 비트맵 폰트 | Part 1.4에 Canvas(BitmapText) + DOM(CSS font-family) 양쪽 적용 규칙 |
| P7 | CSS Modules 강제 | Part 1.5 + QG0에 검증 항목 추가 |
| P8 | 엔티티 class 금지 | Part 1.5 Code Style Rules에 명시 |
| P9 | pre-commit hook | Phase 0.1 + QG0에 추가 |
| P10 | 스프라이트 도구 대안 | Phase 0.3에 Shoebox/TexturePacker 대안 병기 |
| P11 | Ability EXP 획득량 옵션 | Phase 3.1 옵션 풀에 "EXP 획득량%" 추가 |

---

## Appendix B: Technology Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| React vs Preact | **Preact** | 스펙 준수 + 3KB vs 44KB 번들. 게임에서 UI 프레임워크 크기 최소화 중요 |
| State management | **Preact Signals** | ECS→UI 단방향 동기화에 최적. Redux/Zustand 대비 경량 |
| Camera library | **pixi-viewport** | v8 호환. 줌/팬/팔로우/클램핑 내장 |
| Audio library | **Howler.js** | 크로스 브라우저, sprite 지원, 성숙한 라이브러리 |
| Big numbers | **break_eternity.js** | 후반부 숫자 스케일링 대비. idle 게임 표준 |
| Tilemap loader | **Custom parser** | pixi-tiledmap v8 호환성 불확실. 직접 파싱이 안전 |
| Offline simulation | **Web Worker + formula** | 간단한 공식이면 Worker 불필요하지만, 배경 탭 리소스 누적은 Worker 필요 |
| Save format | **IndexedDB (idb)** | 스펙 준수. localStorage 용량 한계 (5MB) 회피 |
| Spritesheet tool | **free-tex-packer** | 무료, PixiJS JSON Hash 직접 출력 |

---

*Last updated: 2026-03-27*
*Author: HeroForge Game Architecture Team*
*Spec version: IDLE_RPG_PROJECT.md v1.0*
