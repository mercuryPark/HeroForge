# HeroForge Quality Upgrade Plan

## Goal

현 프로토타입을 스토어 출시 가능한 액션 성장 RPG 퀄리티로 끌어올린다.

## Current Vertical Slice Scope (implemented)

- 탑다운 3인칭 카메라
- 방향키/WASD 이동
- 기본 공격(J)
- 스킬 3종(Q/E/R) + 대시(Space)
- 몬스터 추적 AI + 근접 공격
- 피해 숫자와 스킬 이펙트
- 스테이지 진행과 성장 스토어 연동

## Target Quality Definition (store-ready)

1. 15~30분 반복 플레이가 가능한 콘텐츠 루프
2. 직업별 플레이 체감이 확실히 다름
3. 전투 타격감(VFX/SFX/애니메이션) 확보
4. 모바일 터치 조작과 세로/가로 대응
5. 안정성: 크래시율 낮고 저장 데이터 안전

## Production Plan

### Phase A: Combat Feel (2 weeks)

- 스프라이트/애니메이션 도입(캐릭터, 몬스터)
- 타격 경직, 피격 플래시, 카메라 쉐이크
- 스킬별 시전/후딜/범위 텔레그래프
- 사운드 디자인(BGM, 히트, 스킬, UI)

Deliverable:
- 체감 타격감이 있는 1직업 완성 빌드

### Phase B: Class Identity (2 weeks)

- Warrior/Mage/Archer/Thief 전용 스킬셋 4~6개씩
- 패시브/시너지(치명, 관통, 회피, 보호막 등)
- 클래스별 성장곡선 분리

Deliverable:
- 직업 선택이 플레이 체감에 영향

### Phase C: Content Loop (2 weeks)

- 스테이지/엘리트/보스 구조
- 장비 파밍 구간 설계(초반-중반-후반)
- 강화/옵션/세트 효과 1차 도입
- AFK 보상과 실시간 플레이 보상 균형

Deliverable:
- 1시간 이상 반복 플레이 가능 루프

### Phase D: UX + Mobile (2 weeks)

- 모바일 가상 조이스틱/스킬 버튼
- HUD/인벤토리/강화/상점 UX 정리
- 튜토리얼 5분 흐름
- 성능 최적화(저사양 모바일 기준)

Deliverable:
- 모바일 플레이 안정화(PWA + Capacitor)

### Phase E: Live Ops Readiness (2 weeks)

- 밸런스 텔레메트리(클래스별 DPS, stage reach)
- 크래시/오류 모니터링(Sentry)
- 세이브 스키마 마이그레이션 테스트
- 첫 시즌형 업데이트 플랜 수립

Deliverable:
- 소프트런치 가능한 운영 체계

## Art and Copyright Safety

- 캐릭터 실루엣, 몬스터 디자인, UI 프레임을 완전 독자 제작
- 타 게임의 명칭/아이콘/색배치/연출 카피 금지
- 벤치마킹은 시스템 구조와 루프만 참고

## KPI for Launch Readiness

- Day1 retention proxy: 35%+
- 20분 세션 평균 stage clear progression 정상
- 클래스 간 성장 편차 ±10% 이내
- 치명적 버그(진행 불가/저장 유실) 0건

## Weekly Operating Rhythm

1. 월: 밸런스 리뷰(수치 조정)
2. 화-수: 기능 개발
3. 목: QA 및 퍼포먼스 점검
4. 금: 플레이테스트 + 다음주 우선순위 결정

