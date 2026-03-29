/**
 * WeaponSystem — weapon assignment, enhancement, and grade upgrade.
 *
 * Not a per-tick system. Provides functions called by UI/events.
 */
import { signal } from '@preact/signals'
import weaponsData from '@data/weapons.json'
import jobsData from '@data/jobs.json'
import { WeaponSlot } from '@components/weapon'
import { Stats } from '@components/combat'

const GRADE_KEYS = ['normal', 'rare', 'epic', 'unique', 'legendary']
const GRADE_MULT = weaponsData.gradeAtkMultiplier
const ENH = weaponsData.enhancement

/** Weapon materials currency signal */
export const weaponMaterials = signal(0)

/** Job map for weapon type lookup */
const JOB_MAP = {}
for (const job of jobsData.jobs) {
  JOB_MAP[job.id] = job
}

/**
 * Get available weapon types for a job class.
 * @param {string} className - 'warrior', 'mage', etc.
 * @returns {Array}
 */
export function getWeaponTypes(className) {
  return weaponsData.weaponTypes[className] || []
}

/**
 * Assign an initial weapon to a player when they select a job.
 * Picks the first weapon type for their class at Normal grade.
 *
 * @param {number} eid - player entity
 * @param {string} jobId - e.g. 'hero'
 */
export function assignInitialWeapon(eid, jobId) {
  const jobData = JOB_MAP[jobId]
  if (!jobData) return

  const types = getWeaponTypes(jobData.class)
  if (types.length === 0) return

  // Match job's weaponType to available types
  const matched = types.find(t => t.id === jobData.weaponType) || types[0]
  const baseAtk = randInt(matched.baseAtk[0], matched.baseAtk[1])

  WeaponSlot.weaponId[eid] = types.indexOf(matched)
  WeaponSlot.grade[eid] = 0 // Normal
  WeaponSlot.enhanceLevel[eid] = 0
  WeaponSlot.baseAtk[eid] = baseAtk
}

/**
 * Get the current weapon ATK contribution (base * grade multiplier + enhance bonus).
 */
export function getWeaponAtk(eid) {
  const grade = WeaponSlot.grade[eid]
  const gradeKey = GRADE_KEYS[grade] || 'normal'
  const mult = GRADE_MULT[gradeKey] || 1.0
  const enhanceBonus = WeaponSlot.enhanceLevel[eid] * ENH.atkPerLevel
  return Math.floor(WeaponSlot.baseAtk[eid] * mult) + enhanceBonus
}

/**
 * Enhance weapon by 1 level. Costs weapon materials.
 * @returns {boolean} success
 */
export function enhanceWeapon(eid) {
  if (WeaponSlot.enhanceLevel[eid] >= ENH.maxEnhanceLevel) return false

  const level = WeaponSlot.enhanceLevel[eid]
  const cost = ENH.materialCostBase + level * ENH.materialCostPerLevel
  if (weaponMaterials.value < cost) return false

  weaponMaterials.value -= cost
  WeaponSlot.enhanceLevel[eid] += 1
  return true
}

/**
 * Upgrade weapon grade (normal→rare→epic→unique→legendary).
 * @returns {boolean} success
 */
export function upgradeWeaponGrade(eid, goldSignal) {
  const currentGrade = WeaponSlot.grade[eid]
  if (currentGrade >= 4) return false

  const upgradeKey = `${GRADE_KEYS[currentGrade]}_to_${GRADE_KEYS[currentGrade + 1]}`
  const cost = ENH.gradeUpCost[upgradeKey]
  if (!cost) return false

  if (weaponMaterials.value < cost.materials) return false
  if (goldSignal.value < cost.gold) return false

  weaponMaterials.value -= cost.materials
  goldSignal.value -= cost.gold
  WeaponSlot.grade[eid] += 1
  return true
}

/**
 * Apply weapon ATK to player Stats (additive on top of base atk).
 */
export function applyWeaponStats(eid) {
  Stats.atk[eid] += getWeaponAtk(eid)
}

/**
 * Get weapon info for UI display.
 */
export function getWeaponInfo(eid, jobId) {
  const jobData = JOB_MAP[jobId]
  if (!jobData) return null

  const types = getWeaponTypes(jobData.class)
  const weaponType = types[WeaponSlot.weaponId[eid]] || types[0]
  if (!weaponType) return null

  return {
    name: weaponType.nameKr,
    type: weaponType.id,
    grade: WeaponSlot.grade[eid],
    enhanceLevel: WeaponSlot.enhanceLevel[eid],
    baseAtk: WeaponSlot.baseAtk[eid],
    totalAtk: getWeaponAtk(eid),
    enhanceCost: ENH.materialCostBase + WeaponSlot.enhanceLevel[eid] * ENH.materialCostPerLevel,
    maxEnhance: ENH.maxEnhanceLevel,
  }
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}
