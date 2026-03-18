export const SKILL_UPGRADE_RULES = {
  q: { label: "Q 스킬", baseCost: 120, growth: 1.45, maxLevel: 15, bonusPerLevel: 0.12 },
  e: { label: "E 스킬", baseCost: 150, growth: 1.5, maxLevel: 15, bonusPerLevel: 0.14 },
  r: { label: "R 스킬", baseCost: 220, growth: 1.58, maxLevel: 15, bonusPerLevel: 0.18 },
}

export function getSkillUpgradeCost(skillKey, level) {
  const rule = SKILL_UPGRADE_RULES[skillKey]
  if (!rule) return Infinity
  return Math.floor(rule.baseCost * Math.pow(rule.growth, level - 1))
}

export function getSkillDamageMultiplier(skillKey, level) {
  const rule = SKILL_UPGRADE_RULES[skillKey]
  if (!rule) return 1
  return 1 + (level - 1) * rule.bonusPerLevel
}
