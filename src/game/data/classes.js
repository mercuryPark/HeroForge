export const HERO_CLASSES = {
  warrior: {
    id: "warrior",
    name: "전사",
    title: "근접 탱커",
    summary: "높은 체력과 방어력으로 전선을 버티는 직업",
    base: { hp: 180, atk: 18, def: 10, attackSpeed: 0.9, critRate: 0.08, critDmg: 0.5, evasion: 0.04, accuracy: 105 },
    growth: { hp: 28, atk: 4.2, def: 2.2, critRate: 0.001 },
    skill: { id: "shield_break", name: "방패 파쇄", cooldown: 8, multiplier: 2.5 },
  },
  mage: {
    id: "mage",
    name: "마법사",
    title: "원거리 광역",
    summary: "강한 스킬 피해와 광역 공격에 특화된 직업",
    base: { hp: 120, atk: 24, def: 5, attackSpeed: 1.0, critRate: 0.12, critDmg: 0.6, evasion: 0.05, accuracy: 108 },
    growth: { hp: 18, atk: 5.8, def: 1.3, critRate: 0.0015 },
    skill: { id: "arcane_burst", name: "아케인 폭발", cooldown: 10, multiplier: 3.2 },
  },
  archer: {
    id: "archer",
    name: "궁수",
    title: "지속 딜러",
    summary: "빠른 공속과 치명타로 안정적인 피해를 주는 직업",
    base: { hp: 135, atk: 20, def: 6, attackSpeed: 1.25, critRate: 0.18, critDmg: 0.55, evasion: 0.08, accuracy: 114 },
    growth: { hp: 20, atk: 4.7, def: 1.5, critRate: 0.0018 },
    skill: { id: "rapid_fire", name: "속사", cooldown: 7, multiplier: 2.1 },
  },
  thief: {
    id: "thief",
    name: "도적",
    title: "기동 폭딜",
    summary: "높은 회피와 기습 피해로 순간 폭발력이 강한 직업",
    base: { hp: 128, atk: 22, def: 5, attackSpeed: 1.15, critRate: 0.16, critDmg: 0.7, evasion: 0.14, accuracy: 110 },
    growth: { hp: 19, atk: 5.0, def: 1.4, critRate: 0.0016 },
    skill: { id: "shadow_strike", name: "그림자 기습", cooldown: 9, multiplier: 2.9 },
  },
}

export const DEFAULT_CLASS = "warrior"
