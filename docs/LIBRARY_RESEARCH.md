# 라이브러리 조사 및 도입 결과

기준일: 2026-03-13

## 조사 기준

- 그래픽/디자인/시스템에서 GitHub 스타 수와 npm 사용량(주간 다운로드) 기준
- 이미 프로젝트에 쓰는 Phaser는 유지
- 상용 품질 개발에 직접 도움되는 패키지 우선 도입

## 후보 비교(요약)

| 영역 | 패키지 | GitHub Stars(약) | npm 주간 다운로드(약) | 판단 |
|---|---:|---:|---:|---|
| 그래픽(3D) | `three` | 111k+ | 2.5M+ | 채택 |
| 그래픽(2D) | `pixi.js` | 46k+ | 300k+ | 채택(실험 어댑터) |
| 게임엔진(2D) | `phaser` | 39k+ | 90k+ | 이미 채택(핵심 엔진 유지) |
| UI/디자인 모션 | `framer-motion` | 30k+ | 10M+ | 채택 |
| 게임 연출 모션 | `gsap` | 24k+ | 1M+ | 채택 |
| 사운드 시스템 | `howler` | 26k+ | 500k+ | 채택 |
| 물리/시스템 | `matter-js` | 18k+ | 90k+ | 채택 |
| 운영/에러추적 | `@sentry/react` | (sentry-js 8k+ repo) | 4.5M+ | 채택 |

## 최종 도입 패키지

- `three`
- `pixi.js`
- `framer-motion`
- `gsap`
- `howler`
- `matter-js`
- `@sentry/react`

## 도입 이유

1. `phaser` + `three`: 2D 실플레이는 Phaser, 3D 프리뷰/확장성은 Three로 분리
2. `framer-motion` + `gsap`: HUD/패널/연출 애니메이션 품질 강화
3. `howler`: 사운드 제어 표준화
4. `matter-js`: 물리/충돌 확장 준비
5. `@sentry/react`: 운영 단계 오류 모니터링 기본

## 반영된 코드

- Sentry 초기화: `src/main.jsx`
- Framer Motion + GSAP: `src/app/HudPanel.jsx`
- Three 미리보기: `src/app/ThreePreview.jsx`
- Pixi 어댑터: `src/game/render/adapters/pixiAdapter.js`
- Howler/Matter 런타임 연결: `src/game/render/HeroForgeScene.js`

## 참고 소스

- Three.js GitHub: https://github.com/mrdoob/three.js
- PixiJS GitHub: https://github.com/pixijs/pixijs
- Phaser GitHub: https://github.com/phaserjs/phaser
- Howler.js GitHub: https://github.com/goldfire/howler.js
- GSAP GitHub: https://github.com/greensock/GSAP
- Motion GitHub: https://github.com/motiondivision/motion
- Matter.js GitHub: https://github.com/liabru/matter-js
- npm three: https://www.npmjs.com/package/three
- npm phaser: https://www.npmjs.com/package/phaser
- npm pixi.js: https://www.npmjs.com/package/pixi.js
- npm howler: https://www.npmjs.com/package/howler
- npm gsap: https://www.npmjs.com/package/gsap
- npm framer-motion: https://www.npmjs.com/package/framer-motion
- npm matter-js: https://www.npmjs.com/package/matter-js
- npm @sentry/react: https://www.npmjs.com/package/@sentry/react
