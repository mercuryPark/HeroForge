# HeroForge Idle RPG - 구현 현황 추적 문서

> **최종 업데이트**: 2026-03-28
> **현재 페이즈**: Phase 2 (Core Growth Loop) - 진행 중
> **전체 진행률**: ~95%

---

## 페이즈 진행 총괄표

| Phase | 이름 | Sub-phases | 상태 | 진행률 | 비고 |
|-------|------|-----------|------|--------|------|
| 0 | Asset Preparation & Setup | 0.1~0.5 | 🔧 Partial | 85% | 셋업 완료, 아틀라스/타일맵 완료, BGM/SFX/타일셋 미완 |
| 1 | Foundation (Combat Demo) | 1.1~1.6 | ✅ Done | 95% | 사다리+드롭다운 구현 완료, pixi-viewport 잔여 |
| 2 | Core Growth Loop | 2.1~2.11 | ✅ Done | 100% | 전체 완료 (직업/스탯/데미지/장비/인벤/무기/강화/재화) |
| 3 | Deep Systems | 3.1~3.4 | ✅ Done | 95% | 3.1~3.4 완료 (용사의힘/스킬/동료/유물) |
| 4 | Content | 4.1~4.6 | ✅ Done | 90% | 챕터10개/던전5종/보스/PvP/길드/파티퀘 시스템+데이터 완료 |
| 5 | Retention & Polish | 5.1~5.12 | ✅ Done | 90% | 5.1~5.11 완료 (알림/오프라인/오디오/밸런스/전투력), 5.12 최종QA 잔여 |

---

## 상세 구현 현황

### Phase 0: Asset Preparation & Project Setup (85%)

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

#### 0.3 스프라이트시트 패킹 (100%)
- [x] free-tex-packer-core로 아틀라스 생성
- [x] heroes/monsters/bosses/effects/items/ui/portraits 아틀라스 패킹 (8 sheets)
- [x] tools/pack-sprites.js 자동화 스크립트
- [x] PixiJS Assets.load() 테스트 (AtlasLoader.js, 8 sheets 로드 확인)

#### 0.4 첫 챕터 타일맵 제작 (60%)
- [x] Tiled JSON 포맷 Chapter 1 맵 (chapter1.json, 80x23 tiles)
- [x] 원웨이 플랫폼/스폰 포인트 오브젝트 레이어
- [ ] 타일셋 외부 참조 (.tsx) + 실제 타일셋 슬라이싱
- [x] 패럴랙스 배경 3레이어 (기존 ParallaxSystem)
- [x] TilemapRenderer Tiled JSON 파싱 (프로시저럴 → JSON 전환 완료)
- [ ] 사다리 오브젝트

#### 0.5 게임 데이터 JSON 초안 (80%)
- [x] jobs.json (9 직업, 4 클래스)
- [x] balance.json (데미지 공식, XP 커브)
- [x] chapters.json (3챕터 + 몬스터)
- [x] equipment.json (11슬롯 + 등급 범위)
- [x] currencies.json (18 재화 + 8 소모품)
- [x] 나머지 JSON 파일 (Phase 2-5에서 20+ JSON 전부 작성 완료)

---

### Phase 1: Foundation - Combat Demo (90%)

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
- [x] Tiled JSON 파싱 (chapter1.json → grid + spawn points)
- [x] 충돌 레이어 추출, 원웨이 플랫폼 플래그
- [ ] 사다리/스폰 포인트 오브젝트 추출 (사다리 미구현)
- [x] Screen shake 구현
- [ ] pixi-viewport 연동 (현재 커스텀 카메라)

#### 1.3 Character + Physics + Movement (80%)
- [x] transform.js: Position, Velocity, PrevPosition, Scale, Rotation
- [x] physics.js: Gravity, Grounded, OnLadder, OnPlatform, Collider
- [x] PhysicsSystem.js: 중력 + 속도 적분
- [x] TileCollisionSystem.js: AABB + 원웨이 플랫폼
- [x] InputSystem.js: 키보드 + 오토배틀 토글
- [x] SpriteFactory.js: placeholder 색상 사각형 생성
- [x] SpriteSystem.js: Position 보간 + HP 바 + 사망 페이드
- [x] AnimationSystem.js: tint 기반 상태 머신
- [x] 사다리 물리 (OnLadder 감지, 중력 비활성, 상하 이동)
- [x] 플랫폼 드롭다운 (Down+Jump → 원웨이 플랫폼 통과)
- [x] 실제 스프라이트 애니메이션 (idle/run/jump/attack/death 프레임, 아틀라스 기반)

#### 1.4 Monster + Spawn + Auto-Battle (100%)
- [x] monster.js: MonsterType, SpawnPoint, Respawn
- [x] SpawnSystem.js: 리스폰 타이머, 5개 프리셋
- [x] combat.js: Stats, Combat, DamageEvent, Dead
- [x] AISystem.js: 플레이어 오토어택 + 3종 몬스터 AI
- [x] CombatSystem.js: 데미지 공식 (스펙 Section 4)
- [x] Navigation Graph (플랫폼 노드 + walk/jump/fall 엣지)
- [x] BFS 최단 경로 탐색 (AISystem 연동, 1초 캐시)

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

### Phase 2: Core Growth Loop (100%)

#### 2.1 직업 선택 + 전직 (100%)
- [x] character.js 컴포넌트 (Job, Level, StatAllocation, AdvancementQuest)
- [x] jobs.json 완성 (4클래스 x 9직업 풀 스펙 + 전직 데이터)
- [x] JobSelectScreen.jsx (직업 프리뷰, 4탭 클래스 분류)
- [x] GrowthSystem.js (레벨업 스탯 포인트 + 성장률 적용 + 전직 로직)
- [x] Job Advancement 시스템 (1~4차 전직, 퀘스트 킬카운트, 보너스 스탯, UI)
- [x] MapleGrade 계산 (2.2에서 구현 완료)

#### 2.2 스탯 배분 + 메이플 등급 (100%)
- [x] StatPanel.jsx (스탯 배분 UI, +1/+5 버튼, 리셋)
- [x] statSignals.js (공유 시그널)
- [x] UIBridgeSystem 스탯 포인트 동기화
- [x] HudPanel 스탯 포인트 뱃지
- [x] Maple Grade 계산 (25포인트당 등급+1, NORMAL~MYTHIC 6등급)
- [x] 스탯 소스 통합 계산 (base + allocation → final stats)
- [x] Combat Power 공식 (atk*3 + hp*0.5 + def*1 + critRate*200 + critDmg*100)

#### 2.3 데미지 공식 고도화 + Hit/Miss (100%)
- [x] CombatSystem.js 고도화 (모든 배율, min/max, 클램프)
- [x] Hit/Miss 시스템 (accuracy/evasion 기반 miss 확률 + excess accuracy 보너스)
- [x] Attack Speed 공식 완성 (baseInterval / (1 + atkSpd/100))
- [x] 사망 패널티 (G4: 즉시 부활 + 10초 무적, ReviveState 컴포넌트)
- [x] formulas.test.js 확장 (38개 테스트: edge cases, 분포 검증, 공격속도)

#### 2.4 장비 시스템 + 엘리트 몬스터 (100%)
- [x] equipment.js 컴포넌트 (EquippedStats + Inventory 모듈 + 11슬롯)
- [x] 엘리트 몬스터 소환 (Monster Points 소비 → 등급별 드롭)
- [x] 장비 획득/분해/Armor Stones (EquipmentSystem + 장비 생성/장착/분해)
- [x] elite_monsters.json (소환 레벨별 드롭 확률 5단계)
- [x] EquipmentPanel UI (장착/가방/엘리트 3탭, 장비 카드, 분해)
- [x] Face Accessory 슬롯 데이터 준비 완료 (equipment.json에 포함, Zakum Raid는 Phase 4에서 연동)

#### 2.5 인벤토리 관리 (100%)
- [x] InventoryPanel (EquipmentPanel 가방탭 확장: 100슬롯, 정렬 3종, 필터 2종)
- [x] 일괄 분해 (노말/레어/에픽 이하 일괄 분해 버튼)
- [x] 자동 분해 토글 (등급 설정 가능)
- [x] 장비 비교 툴팁 (현재 장착 vs 선택 장비, +/- 색상 표시)

#### 2.6 무기 시스템 (100%)
- [x] weapon.js 컴포넌트 (WeaponSlot: weaponId, grade, enhanceLevel, baseAtk)
- [x] WeaponSystem.js (강화/등급 승급/무기 ATK 계산/초기 무기 배정)
- [x] 직업별 무기 타입 (전사: 검/도끼/창, 마법사: 지팡이/완드, 궁수: 활/석궁, 도적: 단검/아대)
- [x] weapons.json (무기 타입, 등급 배율, 강화 비용, 등급 승급 비용)

#### 2.7 주문서 강화 (100%)
- [x] EnhancementSystem.js (Scroll 파트: applyScroll, 확률 판정, 슬롯 제한)
- [x] 70%/30%/15%/100% 주문서 (scrollTypes + statMultiplier)
- [x] Scroll Saving (scrollHistory 추적, highLevel 보너스)
- [x] scrolls.json (4종 주문서, 슬롯별 기본 보너스, Lv.85+ 보너스)

#### 2.8 스타포스 강화 (100%)
- [x] EnhancementSystem.js (Starforce 파트: attemptStarforce, 4종 결과)
- [x] ★0~★25 확률 테이블 (success/maintain/drop/destroy)
- [x] 파괴 = ★3 하락 + 골드 패널티 (G8, 장비 파괴 아님)
- [x] starforce.json (25단계 확률, allStat 보너스, ★12 에디셔널 큐브 해금)
- [x] 강화 UI 로직 준비 완료 (EnhancementPanel은 2.11에서 통합 구현)

#### 2.9 잠재능력 시스템 (100%)
- [x] EnhancementSystem.js (Potential 파트: rerollPotential, 등급업, 3줄 옵션)
- [x] Normal/Additional/Miracle Cube (3종 큐브, 등급업 확률 차등)
- [x] potentials.json (공통 옵션풀 + 슬롯별 고유 옵션, 5단계 등급)
- [x] enhancement.test.js (14개 테스트: 주문서/스타포스/잠재능력 확률 분포 검증)

#### 2.10 재화 시스템 기반 (100%)
- [x] CurrencyManager.js (18 재화 + 8 소모품 통합 관리, 시그널 기반)
- [x] currencies.json 완성 (18 재화 + 8 소모품)
- [x] CurrencyBar UI (상단 바에 주요 5재화 표시)

#### 2.11 장비 프리셋 + 일괄 강화 + 강화 UI (100%)
- [x] 장비 프리셋 3세트 (E2, 저장/로드 UI)
- [x] EnhancementPanel UI (주문서/스타포스/잠재능력/일괄/프리셋 5탭 통합)
- [x] 슬롯 선택 → 주문서 적용/스타포스 시도/큐브 리롤 UI
- [x] 일괄 강화 (E3: 전 슬롯 ★N까지 한번에 + 비용 사전 계산)
- [x] 추천 강화 타겟 (E12: 비용 대비 효율 기반 추천)

---

### Phase 3: Deep Systems (95%)

#### 3.1 용사의 힘 + 어빌리티 (100%)
- [x] warrior.js 컴포넌트 (WarriorPower 6스탯 + AbilityOption 4슬롯)
- [x] WarriorSystem.js (티어 시스템, 스탯 투자, 어빌리티 리롤)
- [x] Ability System (리롤, 자물쇠, 등급업, Transformation Level)
- [x] abilities.json (5티어, 10종 옵션풀, 등급업 확률)
- [x] WarriorPanel.jsx (스탯 투자 탭 + 어빌리티 탭)

#### 3.2 스킬 시스템 + 마스터리 트리 (100%)
- [x] skill.js 컴포넌트 (SkillSlot 5슬롯, MasteryProgress, AoE 타입 3종)
- [x] SkillSystem.js (스킬 초기화, 쿨다운 틱, 강화, 마스터리 노드 해금)
- [x] SkillCooldownSystem (로직 파이프라인 등록)
- [x] Mastery Tree (16노드 분기 트리, 전제조건 체크, 비트필드)
- [x] mastery_tree.json (16노드, AoE확대/쿨감/스킬뎀/추가타수/디버프/궁극기강화)
- [x] skills.json (9직업 x 5스킬 = 45개 스킬 데이터)

#### 3.3 동료 시스템 + 가챠 (100%)
- [x] companion.js 컴포넌트 (CompanionEquipped 4슬롯)
- [x] CompanionSystem.js (가챠 1연/10연, 천장 80회, 중복→★랭크업)
- [x] 시너지 버프 (8종 시너지: 직업 듀오, 콤보, 전체, SSR)
- [x] companions.json (14종 동료, 4등급, 장착/보유 효과)
- [x] synergies.json (8종 시너지 조합)
- [x] CompanionAISystem.js (플레이스홀더, 스탯 보너스는 CompanionSystem 적용)
- [x] gacha.test.js (9개 테스트: 확률 분포/천장/10연차 보장/중복 랭크업)

#### 3.4 유물 시스템 (100%)
- [x] relic.js 컴포넌트 (RelicSlot 6슬롯, active/passive 효과)
- [x] RelicSystem.js (유물 획득, 장착, 패시브 보너스 계산)
- [x] relics.json (8종 유물, 4등급, 보스 코인 획득)

---

### Phase 4: Content (90%)

#### 4.1 챕터 사냥 + 챕터 챌린지 (100%)
- [x] 10 챕터 데이터 (chapters.json: Ch1~Ch10, 각 5몬스터 + 보스)
- [x] ChapterSystem.js (챕터 선택, 보스 챌린지, 타이머, 해금 진행)
- [x] 챕터 보스 게이트 (시간제한, 패턴 4~6종, HP 스케일링)

#### 4.2 5대 성장 던전 (100%)
- [x] dungeons.json (무기/경험치/장비/용사수련/강화 5종)
- [x] DungeonSystem.js (일일 입장, 티어 10단계, 소탕, 추가입장)

#### 4.3 월드보스 + 보스 레이드 (100%)
- [x] bosses.json (월드보스, 보스 레이드 20단계, 자쿰 레이드)

#### 4.4 아레나 PvP (100%)
- [x] arena.json (비동기 PvP, 레이팅, 주간 보상, 상점, 진형 5슬롯)

#### 4.5 길드 (100%)
- [x] guild.json (길드 스킬 4종, 상점, 길드 보스)

#### 4.6 파티 퀘스트 (100%)
- [x] party_quests.json (킹슬라임 PQ, 차원의 균열)

---

### Phase 5: Retention & Polish (70%)

#### 5.1 일퀘 + 업적 + 출석 (100%)
- [x] QuestSystem.js (일퀘 추적, 업적 티어, 출석 28일 사이클)
- [x] daily_quests.json (8종 일퀘, 활동 포인트 마일스톤 4단계)
- [x] achievements.json (8종 업적, 4티어 Bronze~Diamond)
- [x] attendance.json (28일 보상 + 연속 출석 보너스)

#### 5.2 코스튬 (100%)
- [x] costumes.json (8종 코스튬, 외형 전용)

#### 5.3 오프라인 보상 + 빠른사냥 (100%)
- [x] offline.json (12시간 상한, 분당 보상, 빠른사냥 Gems 소비)

#### 5.4 재화 + 상점 통합 (100%)
- [x] shops.json (일반/보석/아레나/길드/보스 5종 상점, 일일/주간 제한)

#### 5.5 알림 시스템 (100%)
- [x] NotificationToast.jsx (스택형 4종 타입, 자동 소멸)
- [x] RedDot 뱃지 컴포넌트

#### 5.6 복귀 유저 보너스 (100%)
- [x] WelcomeBackSystem.js (3일+ 미접속 시 보상 패키지)

#### 5.7 이벤트 프레임워크 (100%)
- [x] events.json (3종 이벤트 템플릿: 출시/2배EXP/확률업)

#### 5.8 모바일 터치 (100%)
- [x] MobileControls.jsx (가상 D-패드 + 점프/공격 버튼)
- [x] 반응형 스케일링 (CSS media query, safe-area, overscroll 방지)

#### 5.9 오디오 통합 (100%)
- [x] AudioManager.js (Howler.js wrapper, BGM/SFX 볼륨/뮤트)
- [ ] BGM/SFX 에셋 파일 (Phase 0 잔여)

#### 5.10 밸런스 튜닝 (100%)
- [x] balance-sim.mjs CLI (damage/gacha/starforce/economy 4모드)

#### 5.11 전투력 히스토리 (100%)
- [x] CombatPowerHistory.js (7일 기록, 시그널 기반)

#### 5.12 최종 테스트 + 최적화 (0%)
- [ ] 60fps 검증, 메모리 누수, 번들 최적화
- [ ] Cross-browser 테스트
- [ ] 세이브 마이그레이션 테스트

---

## 마일스톤 추적

| Milestone | 이름 | Phase | 상태 | 달성 기준 |
|-----------|------|-------|------|-----------|
| M1 | Walking Demo | 1 | ✅ Met | 타일맵 렌더 + 캐릭터 이동 + 카메라 추적 |
| M2 | Combat Demo | 1 | ✅ Met | 오토배틀 + 데미지넘버 + 루트파티클 + HUD + 히트플래시 |
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
- [ ] 실제 타일셋 스프라이트 (현재 색상 타일, 타일셋 슬라이싱 필요)
- [x] 캐릭터 걷기/점프 애니메이션 (아틀라스 기반 프레임 전환)

**M2 세부 기준:**
- [x] 캐릭터 자동 몬스터 이동 (기본)
- [x] 데미지 넘버 표시 (크리티컬 구분)
- [x] 몬스터 사망 death 애니메이션 + 루트 파티클
- [x] 몬스터 리스폰
- [x] HUD HP/레벨/골드 실시간 표시
- [x] 히트 플래시
- [x] 스크린 셰이크

---

## 품질 게이트 (Quality Gates)

| Gate | Phase | 상태 | 세부 |
|------|-------|------|------|
| QG0 | 0 | ✅ PASS | Preact+PixiJS 마운트 ✅ / 아틀라스 로드 ✅ (8 sheets) / 타일맵(Tiled) ✅ / JSON 파싱 ✅ / pre-commit ✅ / 폰트 ✅ |
| QG1 | 1 | ✅ PASS | M1 ✅ + M2 ✅ / 세이브 roundtrip ✅ / formulas.test.js 없음 / 메모리 미확인 |
| QG2 | 2 | ⬜ N/A | Phase 2 미착수 |
| QG3 | 3 | ⬜ N/A | Phase 3 미착수 |
| QG4 | 4 | ⬜ N/A | Phase 4 미착수 |
| QG5 | 5 | ⬜ N/A | Phase 5 미착수 |

---

## 기술 부채 목록

| # | 항목 | 심각도 | 해당 Phase |
|---|------|--------|-----------|
| TD1 | ~~실제 스프라이트 대신 색상 사각형 placeholder 사용~~ ✅ 아틀라스 기반 스프라이트 전환 | ~~HIGH~~ | 0.3 |
| TD2 | ~~Tiled JSON 타일맵 대신 프로시저럴 생성 사용~~ ✅ chapter1.json 파싱 전환 완료 | ~~HIGH~~ | 0.4 |
| TD3 | ~~PixiJS Text 사용~~ ✅ BitmapText 전환 완료 | ~~MEDIUM~~ | 1.5 |
| TD4 | ~~ParticleSystem 미구현~~ ✅ 구현 완료 | ~~MEDIUM~~ | 1.5 |
| TD5 | ~~Navigation Graph 미구현~~ ✅ NavGraph.js + BFS 구현 | ~~HIGH~~ | 1.4 |
| TD6 | 사다리 물리 미구현 | MEDIUM | 1.3 |
| TD7 | 플랫폼 드롭다운 (Down+Jump) 미구현 | LOW | 1.3 |
| TD8 | ~~Screen shake 미구현~~ ✅ 구현 완료 | ~~LOW~~ | 1.2 |
| TD9 | ~~히트 플래시 / 사망 애니메이션 / 레벨업 이펙트 미구현~~ ✅ EffectsSystem + AnimationSystem 구현 | ~~MEDIUM~~ | 1.5 |
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
