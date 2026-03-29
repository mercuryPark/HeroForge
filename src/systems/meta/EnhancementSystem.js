/**
 * EnhancementSystem — Scroll, Starforce, and Potential enhancement logic.
 *
 * Not a per-tick system. Provides functions called by UI on demand.
 * All probability data comes from JSON files (no magic numbers).
 */
import { signal } from '@preact/signals'
import scrollsData from '@data/scrolls.json'
import starforceData from '@data/starforce.json'
import potentialsData from '@data/potentials.json'

/* ────────── Currency Signals ────────── */
export const enhancementCurrencies = {
  starforceScrolls: signal(0),
  normalCubes: signal(0),
  additionalCubes: signal(0),
  miracleCubes: signal(0),
}

/* ────────── Scroll System (2.7) ────────── */

const SCROLL_MAP = {}
for (const s of scrollsData.scrollTypes) {
  SCROLL_MAP[s.id] = s
}

/**
 * Apply a scroll to an equipment item.
 * @param {object} item - equipment item from inventory
 * @param {string} scrollId - 'scroll_100', 'scroll_70', etc.
 * @returns {{ success: boolean, bonuses: object|null }}
 */
export function applyScroll(item, scrollId) {
  const scroll = SCROLL_MAP[scrollId]
  if (!scroll) return { success: false, bonuses: null }

  // Check remaining scroll slots
  if (item.scrollSlots == null) item.scrollSlots = scroll.maxSlots
  if (item.scrollSlots <= 0) return { success: false, bonuses: null }

  item.scrollSlots--

  // Roll success
  const roll = Math.random() * 100
  if (roll >= scroll.successRate) {
    return { success: false, bonuses: null }
  }

  // Calculate bonuses
  const baseBonus = scrollsData.baseBonus[item.slotId] || {}
  const mult = scroll.statMultiplier
  const highLevel = item.itemLevel >= scrollsData.highLevelBonus.levelThreshold
    ? scrollsData.highLevelBonus.multiplier : 1.0

  const bonuses = {}
  for (const [key, val] of Object.entries(baseBonus)) {
    bonuses[key] = Math.max(1, Math.floor(val * mult * highLevel))
  }

  // Apply bonuses to item mainStat
  for (const [key, val] of Object.entries(bonuses)) {
    item.mainStat[key] = (item.mainStat[key] || 0) + val
  }

  // Track scroll history
  if (!item.scrollHistory) item.scrollHistory = []
  item.scrollHistory.push({ scrollId, bonuses })

  return { success: true, bonuses }
}

/** Get scroll info for UI */
export function getScrollTypes() {
  return scrollsData.scrollTypes
}

/* ────────── Starforce System (2.8) ────────── */

const SF_TABLE = starforceData.table

/**
 * Attempt starforce enhancement on an item.
 * @param {object} item - equipment item
 * @param {object} goldSignal - signal for gold currency
 * @returns {{ result: 'success'|'maintain'|'drop'|'destroy', newStars: number, goldCost: number }}
 */
export function attemptStarforce(item, goldSignal) {
  if (enhancementCurrencies.starforceScrolls.value < starforceData.scrollCostPerAttempt) {
    return { result: 'no_scrolls', newStars: item.starforce || 0, goldCost: 0 }
  }

  const currentStars = item.starforce || 0
  if (currentStars >= starforceData.maxStars) {
    return { result: 'max', newStars: currentStars, goldCost: 0 }
  }

  const entry = SF_TABLE[currentStars]
  if (!entry) return { result: 'error', newStars: currentStars, goldCost: 0 }

  // Gold cost: base + stars * multiplier
  const goldCost = 1000 + currentStars * currentStars * 500
  if (goldSignal.value < goldCost) {
    return { result: 'no_gold', newStars: currentStars, goldCost }
  }

  // Consume resources
  enhancementCurrencies.starforceScrolls.value -= starforceData.scrollCostPerAttempt
  goldSignal.value -= goldCost

  // Roll outcome
  const roll = Math.random() * 100
  let cumulative = 0
  let result = 'maintain'

  cumulative += entry.success
  if (roll < cumulative) {
    item.starforce = currentStars + 1
    // Apply allStat bonus
    if (!item.starforceBonus) item.starforceBonus = { allStat: 0 }
    item.starforceBonus.allStat += entry.allStat
    return { result: 'success', newStars: item.starforce, goldCost }
  }

  cumulative += entry.maintain
  if (roll < cumulative) {
    return { result: 'maintain', newStars: currentStars, goldCost }
  }

  cumulative += entry.drop
  if (roll < cumulative) {
    item.starforce = Math.max(0, currentStars - 1)
    // Remove last allStat bonus
    if (item.starforceBonus && currentStars > 0) {
      const prevEntry = SF_TABLE[currentStars - 1]
      item.starforceBonus.allStat = Math.max(0, item.starforceBonus.allStat - (prevEntry?.allStat || 0))
    }
    return { result: 'drop', newStars: item.starforce, goldCost }
  }

  // Destroy (star drop by 3 + gold penalty, NOT item destruction per G8)
  const penalty = starforceData.destroyPenalty
  item.starforce = Math.max(0, currentStars - penalty.starDrop)
  // Recalculate starforce bonus
  let totalAllStat = 0
  for (let s = 0; s < item.starforce; s++) {
    totalAllStat += SF_TABLE[s]?.allStat || 0
  }
  if (!item.starforceBonus) item.starforceBonus = { allStat: 0 }
  item.starforceBonus.allStat = totalAllStat

  const goldPenalty = penalty.goldPenaltyBase + currentStars * penalty.goldPenaltyPerStar
  goldSignal.value = Math.max(0, goldSignal.value - goldPenalty)

  return { result: 'destroy', newStars: item.starforce, goldCost: goldCost + goldPenalty }
}

/** Get starforce info for UI */
export function getStarforceInfo(item) {
  const stars = item.starforce || 0
  const entry = SF_TABLE[stars]
  return {
    currentStars: stars,
    maxStars: starforceData.maxStars,
    successRate: entry?.success || 0,
    allStatBonus: item.starforceBonus?.allStat || 0,
    unlockAdditionalCube: stars >= 12,
    goldCost: 1000 + stars * stars * 500,
    scrollCost: starforceData.scrollCostPerAttempt,
  }
}

/* ────────── Potential System (2.9) ────────── */

const POT_GRADES = potentialsData.potentialGrades
const COMMON_POOL = potentialsData.optionPool.common
const SLOT_POOL = potentialsData.optionPool.slotSpecific

/**
 * Reroll potential lines on an item using a cube.
 * @param {object} item - equipment item (must be epic+ grade)
 * @param {string} cubeType - 'normal', 'additional', 'miracle'
 * @returns {{ success: boolean, gradeUp: boolean, lines: Array }}
 */
export function rerollPotential(item, cubeType) {
  const cubeData = potentialsData.cubeTypes[cubeType]
  if (!cubeData) return { success: false, gradeUp: false, lines: [] }

  // Check item grade requirement
  if (item.grade < potentialsData.minGradeForPotential) {
    return { success: false, gradeUp: false, lines: [] }
  }

  // Check additional cube starforce requirement
  if (cubeType === 'additional' && (item.starforce || 0) < (cubeData.requireStarforce || 0)) {
    return { success: false, gradeUp: false, lines: [] }
  }

  // Check currency
  const currencyKey = cubeType === 'normal' ? 'normalCubes'
    : cubeType === 'additional' ? 'additionalCubes' : 'miracleCubes'
  if (enhancementCurrencies[currencyKey].value <= 0) {
    return { success: false, gradeUp: false, lines: [] }
  }
  enhancementCurrencies[currencyKey].value -= 1

  // Determine potential grade
  if (!item.potentialGrade) item.potentialGrade = 0 // rare index

  // Grade up check
  let gradeUp = false
  if (item.potentialGrade < POT_GRADES.length - 1) {
    if (Math.random() * 100 < cubeData.gradeUpChance) {
      item.potentialGrade += 1
      gradeUp = true
    }
  }

  const gradeKey = POT_GRADES[item.potentialGrade]

  // Generate lines
  const lines = []
  const slotSpecific = SLOT_POOL[item.slotId]

  for (let i = 0; i < potentialsData.maxLines; i++) {
    // 30% chance for slot-specific option
    if (slotSpecific && Math.random() < 0.3) {
      const range = slotSpecific.range[gradeKey]
      if (range) {
        const value = randInt(range[0], range[1])
        lines.push({ id: slotSpecific.id, nameKr: slotSpecific.nameKr, value })
        continue
      }
    }

    // Pick from common pool
    const opt = COMMON_POOL[Math.floor(Math.random() * COMMON_POOL.length)]
    const range = opt.range[gradeKey]
    if (range) {
      const value = randInt(range[0], range[1])
      lines.push({ id: opt.id, nameKr: opt.nameKr, value })
    }
  }

  item.potentialLines = lines
  return { success: true, gradeUp, lines }
}

/** Get potential info for UI */
export function getPotentialInfo(item) {
  return {
    hasPotential: item.grade >= potentialsData.minGradeForPotential,
    potentialGrade: item.potentialGrade != null ? POT_GRADES[item.potentialGrade] : null,
    potentialGradeKr: item.potentialGrade != null ? ['레어', '에픽', '유니크', '레전더리', '미시크'][item.potentialGrade] : null,
    lines: item.potentialLines || [],
    canUseAdditional: (item.starforce || 0) >= 12,
  }
}

/* ────────── Batch Enhancement (E3) ────────── */

/**
 * Batch starforce: enhance all equipped items to a target star level.
 * Returns summary of results.
 *
 * @param {Array} equippedItems - array of 11 items (null for empty slots)
 * @param {number} targetStars - desired star level
 * @param {object} goldSignal - gold signal
 * @returns {{ totalAttempts: number, totalSuccess: number, totalGold: number, results: Array }}
 */
export function batchStarforce(equippedItems, targetStars, goldSignal) {
  let totalAttempts = 0
  let totalSuccess = 0
  let totalGold = 0
  const results = []

  for (let i = 0; i < equippedItems.length; i++) {
    const item = equippedItems[i]
    if (!item) continue

    const currentStars = item.starforce || 0
    if (currentStars >= targetStars) continue

    let slotAttempts = 0
    let slotSuccess = 0
    const maxAttempts = 200 // safety cap

    while ((item.starforce || 0) < targetStars && slotAttempts < maxAttempts) {
      if (enhancementCurrencies.starforceScrolls.value <= 0) break
      if (goldSignal.value < 1000) break

      const result = attemptStarforce(item, goldSignal)
      slotAttempts++
      totalAttempts++
      totalGold += result.goldCost

      if (result.result === 'success') {
        slotSuccess++
        totalSuccess++
      }
      if (result.result === 'no_scrolls' || result.result === 'no_gold') break
    }

    results.push({ slotIndex: i, attempts: slotAttempts, successes: slotSuccess, finalStars: item.starforce || 0 })
  }

  return { totalAttempts, totalSuccess, totalGold, results }
}

/**
 * Estimate cost for batch starforce to target.
 * Uses average attempts based on success rates.
 */
export function estimateBatchCost(equippedItems, targetStars) {
  let totalScrolls = 0
  let totalGold = 0

  for (const item of equippedItems) {
    if (!item) continue
    let star = item.starforce || 0
    while (star < targetStars && star < starforceData.maxStars) {
      const entry = SF_TABLE[star]
      if (!entry || entry.success <= 0) break
      const avgAttempts = Math.ceil(100 / entry.success)
      const goldPerAttempt = 1000 + star * star * 500
      totalScrolls += avgAttempts
      totalGold += avgAttempts * goldPerAttempt
      star++
    }
  }

  return { totalScrolls, totalGold }
}

/* ────────── Recommendation (E12) ────────── */

/**
 * Recommend the next best slot to enhance based on cost efficiency.
 * Lower cost-per-allStat = better efficiency.
 *
 * @param {Array} equippedItems - array of 11 items
 * @returns {{ slotIndex: number, slotName: string, currentStars: number, nextStars: number, estimatedCost: number, allStatGain: number } | null}
 */
export function recommendEnhanceTarget(equippedItems) {
  const SLOT_NAMES = ['모자', '상의', '하의', '장갑', '신발', '망토', '어깨', '벨트', '목걸이', '반지', '얼굴']
  let bestSlot = null
  let bestEfficiency = Infinity

  for (let i = 0; i < equippedItems.length; i++) {
    const item = equippedItems[i]
    if (!item) continue

    const currentStars = item.starforce || 0
    if (currentStars >= starforceData.maxStars) continue

    const entry = SF_TABLE[currentStars]
    if (!entry) continue

    const avgAttempts = Math.ceil(100 / entry.success)
    const goldCost = avgAttempts * (1000 + currentStars * currentStars * 500)
    const scrollCost = avgAttempts
    const allStatGain = entry.allStat

    // Efficiency = gold cost per allStat point gained
    const efficiency = allStatGain > 0 ? goldCost / allStatGain : Infinity

    if (efficiency < bestEfficiency) {
      bestEfficiency = efficiency
      bestSlot = {
        slotIndex: i,
        slotName: SLOT_NAMES[i],
        currentStars,
        nextStars: currentStars + 1,
        estimatedGold: goldCost,
        estimatedScrolls: scrollCost,
        allStatGain,
      }
    }
  }

  return bestSlot
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}
