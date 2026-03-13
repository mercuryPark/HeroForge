# HeroForge 캐릭터 스프라이트 라이브러리 적용 가이드

## 결론
현재 프로젝트의 캐릭터 디자인/스프라이트 참조 라이브러리는 **LPC(Universal LPC Spritesheet Character Generator)** 를 채택했다.

- 저장소: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
- 적용 이유:
  - GitHub에서 장기간 검증된 오픈 캐릭터 리소스 생태계
  - 클래스별(전사/마법사/궁수/도적) 외형 변형 확장에 유리한 파츠 구조
  - 2D 탑다운/액션 RPG에서 바로 쓰기 쉬운 프레임 기반 시트 제공

## 현재 적용 상태
- 경로: `public/assets/reference/lpc/`
- 포함 파일:
  - `body_idle_light.png`
  - `body_walk_light.png`
  - `body_slash_light.png`
  - `body_hurt_light.png`
  - `LICENSE.txt`

게임 씬에서 위 스프라이트를 Phaser `spritesheet`로 로드하고,
다음 애니메이션 키로 사용한다.

- `lpc-idle-anim`
- `lpc-run-anim`
- `lpc-attack-anim`
- `lpc-hit-anim`
- `lpc-dead-anim`

## 클래스 구분 방식
현재는 단일 베이스 바디 시트를 사용하고, 클래스마다 색상 톤을 달리해 즉시 구분 가능하도록 적용했다.

- 전사: 붉은 계열
- 마법사: 푸른 계열
- 궁수: 녹색 계열
- 도적: 보라 계열

## 다음 고도화 단계(권장)
출시 퀄리티(10만 다운로드 수준)로 가려면 아래 순서로 확장 권장:

1. 클래스별 파츠(무기/머리/갑옷) 분리 레이어링
2. 공격 타입별 전용 모션(베기/사격/캐스팅/암습)
3. 피격/사망/스킬 캐스팅 프레임 추가
4. 장비에 따라 외형이 실제로 바뀌는 시각 피드백 연결

## 라이선스/운영 가이드
- 반드시 `public/assets/reference/lpc/LICENSE.txt`를 배포 산출물에 포함한다.
- 아트 교체 시에도 현재 애니메이션 키(`lpc-*-anim`)를 유지하면 코드 변경량을 최소화할 수 있다.
- 상용 배포 전에는 최종 아트셋별 라이선스 문서를 `docs/ART_LICENSES.md`로 통합 관리한다.
