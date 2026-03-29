/**
 * EquipmentSystem — item generation, equip/unequip, stat recalculation,
 * elite monster summoning, and dismantling.
 *
 * This is a meta system (not per-tick). It provides functions called by UI
 * and event handlers, plus a recalcEquipStats() that updates the ECS
 * EquippedStats component from the current equipped items.
 */
import { hasComponent } from 'bitecs'
import equipmentData from '@data/equipment.json'
import { EquippedStats, GRADE_IDS, getNextItemId } from '@components/equipment'
import { Stats } from '@components/combat'
import { PlayerTag } from '@components/character'
import {
  getAllEquipped, equipItem, addToBag, dismantleItem,
  inventorySignals,
} from '@core/Inventory'

/** Slot data indexed by slotId for fast lookup */
const SLOT_MAP = {}
for (const slot of equipmentData.slots) {
  SLOT_MAP[slot.slotId] = slot
}

/** Grade names for lookup */
const GRADE_KEYS = ['normal', 'rare', 'epic', 'unique', 'legendary']

/**
 * Generate a random number in [min, max] (inclusive, integer).
 */
function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

/**
 * Generate a random float in [min, max].
 */
function randFloat(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * Generate a random equipment item.
 *
 * @param {string} slotId - e.g. 'hat', 'gloves'
 * @param {number} grade - 0=normal, 1=rare, etc.
 * @param {number} playerLevel - used as item level
 * @returns {object} item object
 */
export function generateItem(slotId, grade, playerLevel) {
  const slotData = SLOT_MAP[slotId]
  if (!slotData) return null

  const gradeKey = GRADE_KEYS[grade] ?? 'normal'
  const gradeData = slotData.grades[gradeKey]
  if (!gradeData) return null

  // Generate main stat based on grade range
  const mainStat = {}
  if (gradeData.def) mainStat.def = randInt(gradeData.def[0], gradeData.def[1])
  if (gradeData.atk) mainStat.atk = randInt(gradeData.atk[0], gradeData.atk[1])
  if (gradeData.hp) mainStat.hp = randInt(gradeData.hp[0], gradeData.hp[1])
  if (gradeData.critRate) mainStat.critRate = randInt(gradeData.critRate[0], gradeData.critRate[1])
  if (gradeData.critDmg) mainStat.critDmg = randInt(gradeData.critDmg[0], gradeData.critDmg[1])
  if (gradeData.atkSpeed) mainStat.atkSpeed = randFloat(gradeData.atkSpeed[0], gradeData.atkSpeed[1])
  if (gradeData.statBonus) mainStat.statBonus = randInt(gradeData.statBonus[0], gradeData.statBonus[1])
  if (gradeData.allStat) mainStat.allStat = randInt(gradeData.allStat[0], gradeData.allStat[1])
  if (gradeData.speed) mainStat.speed = randInt(gradeData.speed[0], gradeData.speed[1])

  // Generate sub-options (0 for Normal, 1 for Rare, 2 for Epic, 3 for Unique/Legendary)
  const subOptionCount = Math.min(grade, 3)
  const subOptions = []
  const pool = [...slotData.subOptionPool]

  for (let i = 0; i < subOptionCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const key = pool.splice(idx, 1)[0]
    const value = generateSubOptionValue(key, grade)
    subOptions.push({ key, value })
  }

  return {
    id: getNextItemId(),
    slotId,
    grade,
    itemLevel: playerLevel,
    mainStat,
    subOptions,
    specialOption: null, // filled by scrolls/potential system later
  }
}

/**
 * Generate a sub-option value based on key and grade.
 */
function generateSubOptionValue(key, grade) {
  const multiplier = 1 + grade * 0.5
  if (key.endsWith('_pct') || key === 'boss_dmg_pct' || key === 'ignore_def_pct' || key === 'exp_bonus_pct') {
    return Math.round(randFloat(1, 5) * multiplier * 10) / 10
  }
  if (key === 'atkSpeed') {
    return Math.round(randFloat(0.01, 0.05) * multiplier * 100) / 100
  }
  if (key === 'crit_rate') {
    return randInt(1, 3 + grade * 2)
  }
  if (key === 'crit_dmg') {
    return randInt(2, 5 + grade * 3)
  }
  // Flat stats
  return randInt(2, 8 + grade * 5)
}

/**
 * Calculate the total stats from all equipped items and write to EquippedStats.
 *
 * @param {number} eid - player entity ID
 */
export function recalcEquipStats(eid) {
  // Reset aggregated stats
  EquippedStats.hp[eid] = 0
  EquippedStats.mp[eid] = 0
  EquippedStats.atk[eid] = 0
  EquippedStats.def[eid] = 0
  EquippedStats.critRate[eid] = 0
  EquippedStats.critDmg[eid] = 0
  EquippedStats.atkSpeed[eid] = 0
  EquippedStats.bossDmgPercent[eid] = 0
  EquippedStats.allStat[eid] = 0

  const equipped = getAllEquipped()
  for (let i = 0; i < equipped.length; i++) {
    const item = equipped[i]
    if (!item) continue

    const ms = item.mainStat
    if (ms.hp) EquippedStats.hp[eid] += ms.hp
    if (ms.atk) EquippedStats.atk[eid] += ms.atk
    if (ms.def) EquippedStats.def[eid] += ms.def
    if (ms.critRate) EquippedStats.critRate[eid] += ms.critRate
    if (ms.critDmg) EquippedStats.critDmg[eid] += ms.critDmg
    if (ms.atkSpeed) EquippedStats.atkSpeed[eid] += ms.atkSpeed
    if (ms.allStat) EquippedStats.allStat[eid] += ms.allStat

    // Sub-options
    for (const sub of item.subOptions) {
      addSubOptionToStats(eid, sub.key, sub.value)
    }
  }
}

function addSubOptionToStats(eid, key, value) {
  switch (key) {
    case 'hp_flat': EquippedStats.hp[eid] += value; break
    case 'atk_flat': EquippedStats.atk[eid] += value; break
    case 'def_flat': EquippedStats.def[eid] += value; break
    case 'crit_rate': EquippedStats.critRate[eid] += value; break
    case 'crit_dmg': EquippedStats.critDmg[eid] += value; break
    case 'atkSpeed': EquippedStats.atkSpeed[eid] += value; break
    case 'boss_dmg_pct': EquippedStats.bossDmgPercent[eid] += value; break
    case 'all_stat': EquippedStats.allStat[eid] += value; break
    // Percentage bonuses stored for later application
    case 'hp_pct': case 'atk_pct': case 'def_pct':
    case 'str_flat': case 'dex_flat': case 'luk_flat': case 'int_flat':
    case 'speed_flat': case 'ignore_def_pct': case 'exp_bonus_pct':
      // These are tracked but applied differently (percentage or non-combat)
      break
  }
}

/**
 * Apply equipped stats to the player's combat Stats.
 * Call after recalcEquipStats and after base stats are set.
 *
 * @param {number} eid - player entity ID
 * @param {object} baseStats - the job's base + growth stats (before equipment)
 */
export function applyEquipStatsToPlayer(eid) {
  // Equipment bonuses are additive on top of base stats
  // The base stats are already in Stats[] from GrowthSystem
  // We just need to ensure equipment bonuses are included
  // This is called by the UI when equipment changes
  Stats.maxHp[eid] += EquippedStats.hp[eid]
  Stats.hp[eid] = Math.min(Stats.hp[eid], Stats.maxHp[eid])
  Stats.atk[eid] += EquippedStats.atk[eid]
  Stats.def[eid] += EquippedStats.def[eid]
  Stats.critRate[eid] += EquippedStats.critRate[eid]
  Stats.critDmg[eid] += EquippedStats.critDmg[eid]
  Stats.atkSpeed[eid] += EquippedStats.atkSpeed[eid]
  Stats.bossDmgPercent[eid] += EquippedStats.bossDmgPercent[eid]
}

/**
 * Elite monster drop grade probability based on elite summon level.
 * Higher summon level → better grade chances.
 */
const ELITE_DROP_TABLE = [
  // [normal%, rare%, epic%, unique%, legendary%]
  [60, 30, 8, 2, 0],    // level 1
  [45, 35, 15, 4, 1],   // level 2
  [30, 35, 22, 10, 3],  // level 3
  [15, 30, 30, 18, 7],  // level 4
  [5,  20, 35, 28, 12], // level 5+
]

/**
 * Roll a grade for an elite monster drop based on current elite summon level.
 * @returns {number} grade (0-4)
 */
export function rollEliteDropGrade() {
  const level = inventorySignals.eliteSummonLevel.value
  const tableIdx = Math.min(level - 1, ELITE_DROP_TABLE.length - 1)
  const table = ELITE_DROP_TABLE[tableIdx]

  const roll = Math.random() * 100
  let cumulative = 0
  for (let i = 0; i < table.length; i++) {
    cumulative += table[i]
    if (roll < cumulative) return i
  }
  return 0
}

/**
 * Generate a random equipment drop from elite monster kill.
 * @param {number} playerLevel
 * @returns {object} item
 */
export function generateEliteDrop(playerLevel) {
  const grade = rollEliteDropGrade()
  // Random slot (excluding face_accessory which is Zakum-only)
  const slotKeys = ['hat', 'top', 'bottom', 'gloves', 'shoes', 'cape', 'shoulder', 'belt', 'necklace', 'ring']
  const slotId = slotKeys[Math.floor(Math.random() * slotKeys.length)]
  return generateItem(slotId, grade, playerLevel)
}

/** Cost to summon an elite monster (in Monster Points) */
export const ELITE_SUMMON_COST = 100

/** Cost to upgrade elite summon level (in Armor Stones) */
export function getEliteUpgradeCost() {
  const level = inventorySignals.eliteSummonLevel.value
  return level * 50
}

/** Upgrade elite summon level */
export function upgradeEliteSummonLevel() {
  const cost = getEliteUpgradeCost()
  if (inventorySignals.armorStones.value < cost) return false
  inventorySignals.armorStones.value -= cost
  inventorySignals.eliteSummonLevel.value += 1
  return true
}
