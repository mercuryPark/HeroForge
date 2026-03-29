/**
 * WarriorSystem — Warrior's Power stat investment and Ability reroll logic.
 * Not a per-tick system. Called by UI on demand.
 */
import abilitiesData from '@data/abilities.json'
import { WarriorPower, AbilityOption } from '@components/warrior'
import { getCurrency, spendCurrency } from '@core/CurrencyManager'

const WP = abilitiesData.warriorPower
const AB = abilitiesData.ability
const GRADES = AB.grades

/* ── Warrior's Power ── */

/** Get current warrior power info for UI */
export function getWarriorPowerInfo(eid) {
  const tier = WarriorPower.tier[eid]
  const cap = WP.tierCaps[tier] || WP.tierCaps[WP.tierCaps.length - 1]
  const stats = {
    accuracy: WarriorPower.accuracy[eid],
    damage: WarriorPower.damage[eid],
    mainStat: WarriorPower.mainStat[eid],
    atk: WarriorPower.atk[eid],
    hp: WarriorPower.hp[eid],
    def: WarriorPower.def[eid],
  }
  const totalInvested = stats.accuracy + stats.damage + stats.mainStat + stats.atk + stats.hp + stats.def
  return { tier, maxTier: WP.maxTier, cap, totalInvested, stats, priority: WP.priority }
}

/**
 * Invest a point into a warrior power stat.
 * @param {number} eid
 * @param {string} statKey - 'accuracy', 'damage', 'mainStat', 'atk', 'hp', 'def'
 * @returns {boolean} success
 */
export function investWarriorPoint(eid, statKey) {
  if (!WP.statPerPoint[statKey]) return false
  if (!spendCurrency('warrior_tokens', WP.tokenCostPerPoint)) return false

  WarriorPower[statKey][eid] += 1

  // Check tier advancement
  const tier = WarriorPower.tier[eid]
  if (tier < WP.maxTier) {
    const cap = WP.tierCaps[tier]
    const total = WP.priority.reduce((sum, k) => sum + WarriorPower[k][eid], 0)
    if (total >= cap) {
      WarriorPower.tier[eid] = tier + 1
    }
  }

  return true
}

/** Get effective bonus stats from warrior power */
export function getWarriorBonusStats(eid) {
  const sp = WP.statPerPoint
  return {
    accuracy: WarriorPower.accuracy[eid] * sp.accuracy,
    damage: WarriorPower.damage[eid] * sp.damage,
    mainStat: WarriorPower.mainStat[eid] * sp.mainStat,
    atk: WarriorPower.atk[eid] * sp.atk,
    hp: WarriorPower.hp[eid] * sp.hp,
    def: WarriorPower.def[eid] * sp.def,
  }
}

/* ── Ability System ── */

/** Get ability info for UI */
export function getAbilityInfo(eid) {
  const tier = WarriorPower.tier[eid]
  const activeSlots = AB.slotsPerTier[tier] || 1
  const transformLevel = AbilityOption.transformLevel[eid]
  const slots = []

  for (let i = 1; i <= 4; i++) {
    slots.push({
      grade: AbilityOption[`slot${i}Grade`][eid],
      type: AbilityOption[`slot${i}Type`][eid],
      value: AbilityOption[`slot${i}Value`][eid],
      locked: AbilityOption[`slot${i}Locked`][eid] === 1,
      active: i <= activeSlots,
    })
  }

  return { slots, activeSlots, transformLevel }
}

/** Get option name from type index */
export function getAbilityOptionName(typeIndex) {
  const opt = AB.optionPool[typeIndex]
  return opt ? opt.nameKr : '???'
}

/** Get grade name */
export function getAbilityGradeName(gradeIndex) {
  return ['레어', '에픽', '유니크', '레전더리', '미시크'][gradeIndex] || '???'
}

/**
 * Reroll ability options (unlocked slots only).
 * @param {number} eid
 * @returns {{ success: boolean, gradeUps: number }}
 */
export function rerollAbilities(eid) {
  const tier = WarriorPower.tier[eid]
  const activeSlots = AB.slotsPerTier[tier] || 1

  // Count locked slots for cost multiplier
  let lockedCount = 0
  for (let i = 1; i <= activeSlots; i++) {
    if (AbilityOption[`slot${i}Locked`][eid] === 1) lockedCount++
  }

  const cost = AB.rerollCostBase * Math.pow(AB.lockCostMultiplier, lockedCount)
  if (!spendCurrency('honor_medals', cost)) return { success: false, gradeUps: 0 }

  AbilityOption.transformLevel[eid] += 1
  const transformBonus = AbilityOption.transformLevel[eid] * AB.transformLevelBonus
  let gradeUps = 0

  for (let i = 1; i <= activeSlots; i++) {
    if (AbilityOption[`slot${i}Locked`][eid] === 1) continue

    // Roll new option
    const optIndex = Math.floor(Math.random() * AB.optionPool.length)
    const opt = AB.optionPool[optIndex]

    // Roll grade
    let grade = AbilityOption[`slot${i}Grade`][eid]
    if (grade < GRADES.length - 1) {
      const baseChance = AB.gradeUpBaseChance[grade] || 0
      const chance = baseChance + transformBonus
      if (Math.random() * 100 < chance) {
        grade += 1
        gradeUps++
      }
    }

    const gradeKey = GRADES[grade]
    const range = opt.range[gradeKey]
    const value = range ? randInt(range[0], range[1]) : 0

    AbilityOption[`slot${i}Grade`][eid] = grade
    AbilityOption[`slot${i}Type`][eid] = optIndex
    AbilityOption[`slot${i}Value`][eid] = value
  }

  return { success: true, gradeUps }
}

/** Toggle lock on an ability slot */
export function toggleAbilityLock(eid, slotIndex) {
  const key = `slot${slotIndex}Locked`
  AbilityOption[key][eid] = AbilityOption[key][eid] === 1 ? 0 : 1
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}
