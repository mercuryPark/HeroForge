export const HERO_CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    base: { hp: 180, atk: 18, def: 10, attackSpeed: 0.9, critRate: 0.08, critDmg: 0.5, evasion: 0.04, accuracy: 105 },
    growth: { hp: 28, atk: 4.2, def: 2.2, critRate: 0.001 },
    skill: { id: "shield_break", name: "Shield Break", cooldown: 8, multiplier: 2.5 },
  },
  mage: {
    id: "mage",
    name: "Mage",
    base: { hp: 120, atk: 24, def: 5, attackSpeed: 1.0, critRate: 0.12, critDmg: 0.6, evasion: 0.05, accuracy: 108 },
    growth: { hp: 18, atk: 5.8, def: 1.3, critRate: 0.0015 },
    skill: { id: "arcane_burst", name: "Arcane Burst", cooldown: 10, multiplier: 3.2 },
  },
  archer: {
    id: "archer",
    name: "Archer",
    base: { hp: 135, atk: 20, def: 6, attackSpeed: 1.25, critRate: 0.18, critDmg: 0.55, evasion: 0.08, accuracy: 114 },
    growth: { hp: 20, atk: 4.7, def: 1.5, critRate: 0.0018 },
    skill: { id: "rapid_fire", name: "Rapid Fire", cooldown: 7, multiplier: 2.1 },
  },
  thief: {
    id: "thief",
    name: "Thief",
    base: { hp: 128, atk: 22, def: 5, attackSpeed: 1.15, critRate: 0.16, critDmg: 0.7, evasion: 0.14, accuracy: 110 },
    growth: { hp: 19, atk: 5.0, def: 1.4, critRate: 0.0016 },
    skill: { id: "shadow_strike", name: "Shadow Strike", cooldown: 9, multiplier: 2.9 },
  },
}

export const DEFAULT_CLASS = "warrior"
