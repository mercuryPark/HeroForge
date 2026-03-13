# HeroForge 선별 라이브러리 (적용본)

목표: 캐릭터 디자인/스킬 표현/게임 시스템에 바로 쓰이는 GitHub 기반 고사용량 라이브러리만 채택.

## 최종 선별

1. `phaser3-rex-plugins`
- 이유: Phaser 생태계에서 UI/입력/연출 확장 표준급
- 적용: 가상 조이스틱 입력
- 코드: `src/app/GameCanvas.jsx`, `src/game/render/HeroForgeScene.js`

2. `@iconify/react` + `@iconify-icons/game-icons`
- 이유: `game-icons/icons`(GitHub 대형 아이콘 리포) 아이콘을 개별 import로 경량 적용 가능
- 적용: 직업/스킬 아이콘 배지
- 코드: `src/app/HudPanel.jsx`

3. 기존 유지 + 보강
- `phaser`: 실플레이 전투 엔진
- `howler`: 오디오
- `matter-js`: 물리 확장
- `framer-motion`, `gsap`: HUD 모션
- `three`, `pixi.js`: 그래픽 확장 실험 베이스

## 최적화 포인트

- Phaser 핵심 루프는 유지하고, 부가 기능만 플러그인으로 확장
- 아이콘은 경량 JSON 모듈 단위 import로 사용
- 모바일 조작은 rexVirtualJoystick으로 수동 입력 로직 대비 안정성 향상
