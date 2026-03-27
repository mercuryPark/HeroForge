# HeroForge Idle RPG - 구현 현황 추적 문서

> **최종 업데이트**: 2026-03-27
> **현재 페이즈**: Phase 1 (Foundation) - 진행 중
> **전체 진행률**: ~25%

---

## 페이즈 진행 총괄표

| Phase | 이름 | Sub-phases | 상태 | 진행률 | 비고 |
|-------|------|-----------|------|--------|------|
| 0 | Asset Preparation & Setup | 0.1~0.5 | 🔧 Partial | 55% | 셋업 완료, 에셋 미정리, 스프라이트시트/타일맵 미완 |
| 1 | Foundation (Combat Demo) | 1.1~1.6 | 🔧 Partial | 70% | 코어+VFX+튜토리얼+세이브 완료, 스프라이트/타일맵/네비 미완 |
| 2 | Core Growth Loop | 2.1~2.11 | ⬜ Not Started | 0% | 직업/장비/강화 시스템 전체 미구현 |
| 3 | Deep Systems | 3.1~3.4 | ⬜ Not Started | 0% | 용사의힘/스킬/동료/유물 전체 미구현 |
| 4 | Content | 4.1~4.6 | ⬜ Not Started | 0% | 던전/보스/PvP/길드/파티퀘 전체 미구현 |
| 5 | Retention & Polish | 5.1~5.12 | ⬜ Not Started | 0% | 일퀘/업적/오프라인/모바일/밸런스 전체 미구현 |

---

## 상세 구현 현황

### Phase 0: Asset Preparation & Project Setup (55%)

#### 0.1 프로젝트 초기화 (100%)
- [x] React 의존성 전체 제거, Preact + signals 설치
- [x] bitECS, pixi.js, idb, howler 설치
- [x] vite.config.js: Preact preset + resolve aliases
- [x] ESLint: Preact JSX pragma 전환
- [x] src/ 디렉토리 구조 생성
- [x] index.html 타이틀 "HeroForge"
- [x] .gitignore 업데이트
- [x] pre-commit hook 설정 (.githooks/pre-commit)
- [x] constants.js: GRADE_COLORS, PIXEL_DIMENSIONS 정의

#### 0.2 에셋 수집 및 정리 (70%)
- [x] 에셋 다운로드 완료 (2,410 PNGs in assets/)
- [x] assets/ 폴더 구조에 카테고리별 정리 (sprites/heroes,monsters,bosses,effects,items,ui,portraits + backgrounds + tilemaps + audio)
- [x] LICENSES.md 작성
- [x] Press Start 2P 폰트 다운로드
- [ ] BGM/SFX 수집

#### 0.3 스프라이트시트 패킹 (0%)
- [ ] free-tex-packer 또는 대안으로 아틀라스 생성
- [ ] heroes/monsters/effects/ui 아틀라스 패킹
- [ ] tools/pack-sprites.js 자동화 스크립트
- [ ] PixiJS Assets.load() 테스트

#### 0.4 첫 챕터 타일맵 제작 (0%)
- [ ] Tiled Map Editor로 Chapter 1 맵 제작
- [ ] 사다리/원웨이 플랫폼/스폰 포인트 오브젝트
- [ ] 타일셋 외부 참조 (.tsx)
- [ ] 패럴랙스 배경 3레이어
- [ ] PixiJS 로드 테스트

#### 0.5 게임 데이터 JSON 초안 (80%)
- [x] jobs.json (9 직업, 4 클래스)
- [x] balance.json (데미지 공식, XP 커브)
- [x] chapters.json (3챕터 + 몬스터)
- [x] equipment.json (11슬롯 + 등급 범위)
- [x] currencies.json (18 재화 + 8 소모품)
- [ ] 나머지 JSON 파일 (해당 Phase에서 작성)

---

### Phase 1: Foundation - Combat Demo (45%)

#### 1.1 Core Infrastructure (100%)
- [x] GameLoop.js: Fixed timestep 20 tick/s + rAF + alpha interpolation
- [x] World.js: bitECS world + system pipeline 등록
- [x] ObjectPool.js: Generic acquire/release
- [x] SpatialHash.js: Grid-based 64px
- [x] EventBus.js: Typed event emitter

#### 1.2 PixiJS + Tilemap + Camera + Parallax (50%)
- [x] PixiApp.js: 3-layer container hierarchy, WebGL2
- [x] TilemapRenderer.js: 프로시저럴 80x23 타일, 6 플랫폼
- [x] CameraSystem.js: lerp follow + 맵 경계 클램핑
- [x] ParallaxSystem.js: 3-layer 패럴랙스
- [ ] Tiled JSON 파싱 (현재 프로시저럴 — 실제 타일맵 아님)
- [ ] 충돌 레이어 추출, 원웨이 플랫폼 플래그
- [ ] 사다리/스폰 포인트 오브젝트 추출
- [x] Screen shake 구현
- [ ] pixi-viewport 연동 (현재 커스텀 카메라)

#### 1.3 Character + Physics + Movement (65%)
- [x] transform.js: Position, Velocity, PrevPosition, Scale, Rotation
- [x] physics.js: Gravity, Grounded, OnLadder, OnPlatform, Collider
- [x] PhysicsSystem.js: 중력 + 속도 적분
- [x] TileCollisionSystem.js: AABB + 원웨이 플랫폼
- [x] InputSystem.js: 키보드 + 오토배틀 토글
- [x] SpriteFactory.js: placeholder 색상 사각형 생성
- [x] SpriteSystem.js: Position 보간 + HP 바 + 사망 페이드
- [x] AnimationSystem.js: tint 기반 상태 머신
- [ ] 사다리 물리 (중력 비활성 + 상하 이동)
- [ ] 플랫폼 드롭다운 (Down + Jump)
- [ ] 실제 스프라이트 애니메이션 (idle/run/jump/attack/death 프레임)

#### 1.4 Monster + Spawn + Auto-Battle (70%)
- [x] monster.js: MonsterType, SpawnPoint, Respawn
- [x] SpawnSystem.js: 리스폰 타이머, 5개 프리셋
- [x] combat.js: Stats, Combat, DamageEvent, Dead
- [x] AISystem.js: 플레이어 오토어택 + 3종 몬스터 AI
- [x] CombatSystem.js: 데미지 공식 (스펙 Section 4)
- [ ] Navigation Graph (플랫폼 노드 + 사다리 엣지)
- [ ] BFS 최단 경로 탐색

#### 1.5 VFX + Loot + HUD (75%)
- [x] DamageNumberSystem.js: float up, 색상 구분, crit 스케일 (PixiJS Text 사용)
- [x] LootSystem.js: EXP/Gold/MonsterPoints 드롭, 레벨업
- [x] HudPanel.jsx: HP/MP/EXP 바, 레벨, 골드, 오토배틀 토글
- [x] Effects.js: 히트 플래시, 사망 애니메이션, 레벨업 버스트, 몬스터 스폰 효과
- [x] ParticleSystem.js: ObjectPool 기반 zero-GC 파티클
- [x] LootCounter.jsx: 골드/경험치 fly-to-counter
- [x] BitmapText 전환 (현재 PixiJS Text → 성능 이슈)
- [x] Screen shake 연동

#### 1.6 Save/Load + Tutorial + Settings (80%)
- [x] SaveManager.js: IndexedDB via idb, 자동 저장, export/import
- [x] TitleScreen.jsx: 타이틀 + 새 게임/이어하기
- [x] LoadingScreen.jsx: 프로그레스 바
- [x] SettingsPanel.jsx: BGM/SFX 슬라이더, 데미지 넘버 토글, 세이브 관리
- [x] TutorialOverlay.jsx: 단계별 가이드
- [x] tutorial.json: 튜토리얼 데이터
- [x] 세이브/로드 완전 통합 (ECS world state 직렬화)

---

### Phase 2: Core Growth Loop (0%)

#### 2.1 직업 선택 + 전직 (0%)
- [ ] character.js 컴포넌트 (Job, Level, StatAllocation, MapleGrade)
- [ ] jobs.json 완성 (4클래스 x 10직업 풀 스펙)
- [ ] JobSelectScreen.jsx (직업 프리뷰 E11 포함)
- [ ] Job Advancement 시스템 (1~4차 전직)

#### 2.2 스탯 배분 + 메이플 등급 (0%)
- [ ] GrowthSystem.js (레벨업 + 능력치 포인트)
- [ ] Maple Grade 계산 (25포인트당 등급+1)
- [ ] 스탯 초기화 기능 (G5)
- [ ] 스탯 소스 통합 계산
- [ ] Combat Power 공식

#### 2.3 데미지 공식 고도화 + Hit/Miss (0%)
- [ ] CombatSystem.js 고도화 (모든 배율, min/max, 클램프)
- [ ] Hit/Miss 시스템
- [ ] Attack Speed 공식 완성
- [ ] 사망 패널티 (G4: 즉시 부활 + 10초 무적)
- [ ] formulas.test.js 확장

#### 2.4 장비 시스템 + 엘리트 몬스터 (0%)
- [ ] equipment.js 컴포넌트 (EquipSlot 10+1)
- [ ] 엘리트 몬스터 소환 (Monster Points)
- [ ] 장비 획득/분해/Armor Stones
- [ ] elite_monsters.json
- [ ] Face Accessory 11번째 슬롯 (G6)

#### 2.5 인벤토리 관리 (0%)
- [ ] InventoryPanel.jsx (100슬롯, 정렬/필터)
- [ ] 장비 비교 툴팁

#### 2.6 무기 시스템 (0%)
- [ ] weapon.js 컴포넌트
- [ ] 무기 강화/등급 승급
- [ ] 직업별 무기 타입
- [ ] weapons.json

#### 2.7 주문서 강화 (0%)
- [ ] EnhancementSystem.js (Scroll)
- [ ] 70%/30%/15%/100% 주문서
- [ ] Scroll Saving
- [ ] scrolls.json

#### 2.8 스타포스 강화 (0%)
- [ ] EnhancementSystem.js (Starforce)
- [ ] ★0~★25 확률 테이블
- [ ] 파괴 = ★3 하락 + 골드 패널티 (G8)
- [ ] starforce.json
- [ ] 강화 UI + 애니메이션

#### 2.9 잠재능력 시스템 (0%)
- [ ] EnhancementSystem.js (Potential)
- [ ] Normal/Additional/Miracle Cube
- [ ] potentials.json
- [ ] enhancement.test.js

#### 2.10 재화 시스템 기반 (0%)
- [ ] 16 재화 시스템 구현
- [ ] currencies.json 완성
- [ ] 재화 UI

#### 2.11 장비 프리셋 + 일괄 강화 (0%)
- [ ] 장비 프리셋 3세트 (E2)
- [ ] 일괄 강화 (E3)
- [ ] 추천 강화 타겟 (E12)

---

### Phase 3: Deep Systems (0%)

#### 3.1 용사의 힘 + 어빌리티 (0%)
- [ ] warrior.js 컴포넌트
- [ ] Warrior's Power 티어 시스템
- [ ] Ability System (리롤, 자물쇠, 프리셋)
- [ ] abilities.json
- [ ] WarriorPanel.jsx

#### 3.2 스킬 시스템 + 마스터리 트리 (0%)
- [ ] skill.js 컴포넌트
- [ ] SkillSystem.js (쿨다운, AoE 형태 3종 G7)
- [ ] Mastery Tree (분기 트리)
- [ ] mastery_tree.json, skills.json
- [ ] SkillPanel.jsx, QuickSlot.jsx

#### 3.3 동료 시스템 + 가챠 (0%)
- [ ] companion.js 컴포넌트
- [ ] 가챠 (1연차/10연차, 천장 E1)
- [ ] 시너지 버프
- [ ] CompanionAISystem.js
- [ ] companions.json, synergies.json
- [ ] CompanionPanel.jsx, GachaPanel.jsx
- [ ] gacha.test.js

#### 3.4 유물 시스템 (0%)
- [ ] relic.js 컴포넌트
- [ ] Active/Passive Effect
- [ ] relics.json
- [ ] RelicPanel.jsx

---

### Phase 4: Content (0%)

#### 4.1 챕터 사냥 + 챕터 챌린지 (0%)
- [ ] 10+ 챕터 맵 (Tiled)
- [ ] 챕터 보스 게이트 (시간제한)
- [ ] chapters.json 완성, chapter_bosses.json

#### 4.2 5대 성장 던전 (0%)
- [ ] 무기/경험치/장비/용사의수련/강화 던전
- [ ] 일일 입장 제한, 소탕 (E4)
- [ ] dungeons.json, DungeonPanel.jsx

#### 4.3 월드보스 + 보스 레이드 (0%)
- [ ] World Boss (데미지 랭킹)
- [ ] Boss Raid 20단계
- [ ] Zakum Raid (Face Accessory 드롭)
- [ ] bosses.json, BossPanel.jsx

#### 4.4 아레나 PvP (0%)
- [ ] 비동기 PvP (AI vs AI)
- [ ] 진형 배치 (E8)
- [ ] arena.json, ArenaPanel.jsx

#### 4.5 길드 (0%)
- [ ] 길드 스킬/상점/보스
- [ ] guild.json, GuildPanel.jsx

#### 4.6 파티 퀘스트 (0%)
- [ ] 킹슬라임 파티퀘, Dimensional Rift
- [ ] party_quests.json, PartyQuestPanel.jsx

---

### Phase 5: Retention & Polish (0%)

#### 5.1 일퀘 + 업적 + 출석 (0%)
- [ ] Daily Quests, Achievements, Attendance
- [ ] QuestSystem.js
- [ ] daily_quests.json, achievements.json, attendance.json

#### 5.2 코스튬 (0%)
- [ ] 코스튬 시스템 (외형 전용)
- [ ] costumes.json, CostumePanel.jsx

#### 5.3 오프라인 보상 + 빠른사냥 (0%)
- [ ] OfflineWorker.js (Web Worker)
- [ ] Quick Hunt (Gems 소비)
- [ ] offline.json, offline.test.js

#### 5.4 재화 + 상점 통합 (0%)
- [ ] 모든 상점 통합 UI
- [ ] shops.json, ShopPanel.jsx

#### 5.5 알림 시스템 (0%)
- [ ] NotificationToast.jsx
- [ ] 빨간 점 뱃지

#### 5.6 복귀 유저 보너스 (0%)
- [ ] Welcome Back 패키지 (E7)

#### 5.7 이벤트 프레임워크 (0%)
- [ ] events.json (E13)
- [ ] 이벤트 배너 UI

#### 5.8 모바일 터치 (0%)
- [ ] 반응형 스케일링, 가상 조이스틱

#### 5.9 오디오 통합 (0%)
- [ ] AudioManager.js (Howler.js wrapper)
- [ ] BGM/SFX 전체 연동

#### 5.10 밸런스 튜닝 (0%)
- [ ] balance-sim.js CLI
- [ ] 경제 시뮬레이션 검증

#### 5.11 전투력 히스토리 (0%)
- [ ] 7일 그래프 (E6)

#### 5.12 최종 테스트 + 최적화 (0%)
- [ ] 60fps 검증, 메모리 누수, 번들 최적화
- [ ] Cross-browser 테스트
- [ ] 세이브 마이그레이션 테스트

---

## 마일스톤 추적

| Milestone | 이름 | Phase | 상태 | 달성 기준 |
|-----------|------|-------|------|-----------|
| M1 | Walking Demo | 1 | 🔧 Partial | 타일맵 렌더 + 캐릭터 이동 + 카메라 추적 |
| M2 | Combat Demo | 1 | ⬜ Not Met | 오토배틀 + 데미지넘버 + 루트파티클 + HUD + 히트플래시 |
| M3 | Progression Demo | 2 | ⬜ Not Met | 직업선택 + 스탯배분 + 레벨업 + 장비획득 |
| M4 | Enhancement Demo | 2 | ⬜ Not Met | 주문서/스타포스/잠재능력 + 애니메이션 |
| M5 | Companion Demo | 3 | ⬜ Not Met | 가챠 + 동료전투 + 시너지 + 용사의힘 + 스킬 |
| M6 | Content Demo | 4 | ⬜ Not Met | 10+챕터 + 5던전 + 보스 + PvP + 길드 + 파티퀘 |
| M7 | Retention Demo | 5 | ⬜ Not Met | 일퀘 + 업적 + 출석 + 오프라인보상 + 상점 |
| M8 | Release Candidate | 5 | ⬜ Not Met | 모바일 + 오디오 + 밸런스 + 성능 + 빌드 |

**M1 세부 기준:**
- [x] 타일맵 화면 렌더링
- [x] 패럴랙스 배경이 카메라 이동에 반응
- [x] 카메라 부드러운 추적
- [ ] 실제 타일셋 스프라이트 (현재 색상 사각형)
- [ ] 캐릭터 걷기/점프 애니메이션 (현재 tint 기반)

**M2 세부 기준:**
- [x] 캐릭터 자동 몬스터 이동 (기본)
- [x] 데미지 넘버 표시 (크리티컬 구분)
- [ ] 몬스터 사망 death 애니메이션 + 루트 파티클
- [x] 몬스터 리스폰
- [x] HUD HP/레벨/골드 실시간 표시
- [x] 히트 플래시
- [x] 스크린 셰이크

---

## 품질 게이트 (Quality Gates)

| Gate | Phase | 상태 | 세부 |
|------|-------|------|------|
| QG0 | 0 | ❌ FAIL | Preact+PixiJS 마운트 ✅ / 아틀라스 로드 ❌ / 타일맵(Tiled) ❌ / JSON 파싱 ✅ / pre-commit ✅ / 폰트 ✅ |
| QG1 | 1 | ❌ FAIL | M2 미충족 / 세이브 roundtrip 미검증 / formulas.test.js 없음 / 메모리 미확인 |
| QG2 | 2 | ⬜ N/A | Phase 2 미착수 |
| QG3 | 3 | ⬜ N/A | Phase 3 미착수 |
| QG4 | 4 | ⬜ N/A | Phase 4 미착수 |
| QG5 | 5 | ⬜ N/A | Phase 5 미착수 |

---

## 기술 부채 목록

| # | 항목 | 심각도 | 해당 Phase |
|---|------|--------|-----------|
| TD1 | 실제 스프라이트 대신 색상 사각형 placeholder 사용 | HIGH | 0.3 |
| TD2 | Tiled JSON 타일맵 대신 프로시저럴 생성 사용 | HIGH | 0.4 |
| TD3 | ~~PixiJS Text 사용~~ ✅ BitmapText 전환 완료 | ~~MEDIUM~~ | 1.5 |
| TD4 | ~~ParticleSystem 미구현~~ ✅ 구현 완료 | ~~MEDIUM~~ | 1.5 |
| TD5 | Navigation Graph 미구현 (경로 탐색 불가) | HIGH | 1.4 |
| TD6 | 사다리 물리 미구현 | MEDIUM | 1.3 |
| TD7 | 플랫폼 드롭다운 (Down+Jump) 미구현 | LOW | 1.3 |
| TD8 | ~~Screen shake 미구현~~ ✅ 구현 완료 | ~~LOW~~ | 1.2 |
| TD9 | 히트 플래시 / 사망 애니메이션 / 레벨업 이펙트 미구현 | MEDIUM | 1.5 |
| TD10 | ~~SaveManager ECS 직렬화 미완~~ ✅ 구현 완료 | ~~HIGH~~ | 1.6 |
| TD11 | ~~UIBridgeSystem 위치 오류~~ ✅ render/로 이동 완료 | ~~LOW~~ | 1.2 |
| TD12 | pixi-viewport 미사용 (커스텀 카메라 구현) | LOW | 1.2 |
| TD13 | ~~pre-commit hook 미설정~~ ✅ 설정 완료 | ~~LOW~~ | 0.1 |
| TD14 | ~~Press Start 2P 폰트 미적용~~ ✅ 적용 완료 | ~~MEDIUM~~ | 0.2 |
| TD15 | 에셋 미정리 (2,410 PNGs 정리 필요) | HIGH | 0.2 |

---

## 다음 액션 (우선순위순)

### Phase 1 완료를 위한 필수 작업

1. ~~**Effects.js 생성**~~ ✅ 히트 플래시, 사망 애니메이션, 레벨업 버스트, 몬스터 스폰 효과
2. ~~**ParticleSystem.js 생성**~~ ✅ ObjectPool 기반 zero-GC 파티클 (루트 파티클, fly-to-counter)
3. ~~**LootCounter.jsx 생성**~~ ✅ 골드/경험치 카운터 + 파티클 도착점
4. ~~**DamageNumberSystem BitmapText 전환**~~ ✅ PixiJS Text → BitmapText (GC 최소화)
5. ~~**Screen shake 구현**~~ ✅ CameraSystem에 추가
6. ~~**TutorialOverlay.jsx + tutorial.json**~~ ✅ 단계별 온보딩 가이드
7. ~~**세이브/로드 ECS 직렬화 통합**~~ ✅ SaveManager가 실제 world state를 저장/복원하도록
8. ~~**UIBridgeSystem 위치 이동**~~ ✅ systems/logic/ → systems/render/

### Phase 0 기술 부채 해소 (Phase 2 진입 전 권장)

9. **에셋 카테고리별 정리** — assets/ 폴더를 sprites/heroes, monsters, effects, ui 구조로 재배치
10. **스프라이트시트 패킹** — tools/pack-sprites.js + 아틀라스 생성
11. **Tiled JSON 타일맵 전환** — 프로시저럴 → 실제 Tiled 맵
12. **Press Start 2P 폰트 적용** — 전역 CSS + BitmapFont
13. **LICENSES.md 작성**
14. **pre-commit hook 설정**

### Phase 2 진입 시 최우선

15. **character.js 컴포넌트 + GrowthSystem.js** — 직업/레벨/스탯 시스템
16. **JobSelectScreen.jsx** — 직업 선택 UI
17. **EquipmentSystem.js + equipment.js** — 장비 장착/해제
18. **EnhancementSystem.js** — 주문서/스타포스/잠재능력 (3-in-1)
