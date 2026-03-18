# HeroForge 디자인 패키지 선별 메모

## 결론
- 1차 적용 방향: `Intersect-Assets`
- 유지 중인 참고 패키지: `Universal LPC Spritesheet Character Generator`
- 보조 후보: `Kenney`

## 선별 이유

### Intersect-Assets
- 캐릭터, 장비 파츠, UI, 몬스터 계열이 같은 판타지 톤으로 묶여 있음
- 상업적 사용이 가능한 라이선스가 README에 명시되어 있음
- HeroForge처럼 `직업 구분이 분명한 RPG`에 더 잘 맞음
- LPC보다 체형이 단정하고, 목/어깨/장비 실루엣이 읽기 쉬운 편

### LPC
- 커뮤니티 사용량과 레퍼런스는 매우 많음
- 조합 자유도는 높지만 현재 HeroForge에서 보이는 체형 문제와 실루엣 약점이 있음
- 참조용으로는 좋지만 최종 아트 방향으로는 한계가 있음

### Kenney
- 사용성과 라이선스는 아주 좋음
- 다만 HeroForge가 원하는 한국형 키우기 RPG 감성에는 상대적으로 덜 맞음

## 이번 패치 반영
- 상단 `처음부터 다시` 버튼 추가
- 영웅 기본 렌더링을 LPC에서 HeroForge 전용 SVG 실루엣으로 전환
- 전사/마법사/궁수/도적 실루엣 차이 강화
- 몬스터 SVG도 실루엣과 볼륨을 재정리

## 다음 단계
- `Intersect-Assets main_full` 브랜치의 완성형 시트를 선별
- HeroForge 직업별로 맞는 기본 파츠 조합을 정함
- Phaser에서 방향별 프레임 시트로 연결
- 기존 SVG는 로딩 실패 대비 fallback으로 유지
