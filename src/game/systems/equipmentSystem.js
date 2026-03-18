import { ENHANCE_RULES, EQUIPMENT_SLOT_WEIGHTS, EQUIPMENT_SLOTS, FUSION_REQUIREMENT, RARITY_TABLE } from "../data/equipment"
import { rollWeighted } from "../core/formulas"

export function rollEquipmentDrop(rng) {
  return rollWeighted(RARITY_TABLE, rng)
}

export function rollEquipmentSlot(rng) {
  return rollWeighted(EQUIPMENT_SLOT_WEIGHTS, rng).id
}

export function createEquipmentItem(drop, slot, idSeed = Date.now()) {
  const slotLabel = EQUIPMENT_SLOTS.find((entry) => entry.id === slot)?.label ?? "장비"
  const stats = {
    weapon: { atkBonus: drop.atkBonus, defBonus: 0, hpBonus: 0 },
    armor: { atkBonus: Math.max(0, Math.floor(drop.atkBonus * 0.35)), defBonus: Math.max(1, Math.floor(drop.atkBonus * 0.75) + 1), hpBonus: 8 + drop.atkBonus * 2 },
    helmet: { atkBonus: Math.max(0, Math.floor(drop.atkBonus * 0.2)), defBonus: Math.max(1, Math.floor(drop.atkBonus * 0.45) + 1), hpBonus: 5 + Math.floor(drop.atkBonus * 1.3) },
  }[slot] ?? { atkBonus: 0, defBonus: 0, hpBonus: 0 }

  return {
    id: `it-${slot}-${idSeed}-${Math.floor(Math.random() * 9999)}`,
    slot,
    slotLabel,
    name: `${drop.label} ${slotLabel}`,
    rarity: drop.id,
    rarityLabel: drop.label,
    ...stats,
    obtainedAt: Date.now(),
  }
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

export function getFusionResult(rarityId) {
  const currentIndex = RARITY_TABLE.findIndex((item) => item.id === rarityId)
  if (currentIndex < 0) return null
  const next = RARITY_TABLE[currentIndex + 1]
  if (!next) return null

  return {
    source: RARITY_TABLE[currentIndex],
    target: next,
    requirement: FUSION_REQUIREMENT,
  }
}
