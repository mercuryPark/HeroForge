import { ENHANCE_RULES, RARITY_TABLE } from "../data/equipment"
import { rollWeighted } from "../core/formulas"

export function rollEquipmentDrop(rng) {
  return rollWeighted(RARITY_TABLE, rng)
}

export function enhanceWeapon(hero, goldCost, rng) {
  if (hero.gold < goldCost) {
    return { hero, result: "not_enough_gold" }
  }

  const level = hero.weapon.level
  const rule = ENHANCE_RULES[Math.min(level, 9)]
  const success = rng() <= rule.success

  const heroNext = {
    ...hero,
    gold: hero.gold - goldCost,
    weapon: {
      ...hero.weapon,
      level: success ? hero.weapon.level + 1 : hero.weapon.level,
      bonusAtk: success ? hero.weapon.bonusAtk + rule.bonus : hero.weapon.bonusAtk,
    },
  }

  return { hero: heroNext, result: success ? "success" : "fail" }
}
