/**
 * SkillSystem — skill assignment, cooldown tick, enhancement, mastery tree.
 *
 * Provides:
 *   - initSkills(): assign job skills to player
 *   - SkillCooldownSystem(): per-tick cooldown decrement (logic system)
 *   - enhanceSkill(): level up a skill with materials
 *   - unlockMasteryNode(): spend mastery points
 */
import { hasComponent } from 'bitecs'
import skillsData from '@data/skills.json'
import masteryData from '@data/mastery_tree.json'
import { SkillSlot, SKILL_SLOTS, MasteryProgress } from '@components/skill'
import { PlayerTag, Job } from '@components/character'
import { spendCurrency } from '@core/CurrencyManager'

const JOB_ID_TO_STRING = [
  'hero', 'dark_knight', 'paladin', 'archmage_il', 'archmage_fp',
  'bowmaster', 'marksman', 'night_lord', 'shadower',
]

const AOE_MAP = { rect: 0, circle: 1, cone: 2 }
const ENH = skillsData.enhancement

/**
 * Initialize skills for a player entity based on their job.
 * @param {number} eid
 * @param {string} jobId - e.g. 'hero'
 */
export function initSkills(eid, jobId) {
  const jobSkills = skillsData.skills[jobId]
  if (!jobSkills) return

  for (const skill of jobSkills) {
    const idx = eid * SKILL_SLOTS + skill.slot
    SkillSlot.skillId[idx] = skill.slot // simple mapping
    SkillSlot.level[idx] = 1
    SkillSlot.cooldown[idx] = skill.cooldown
    SkillSlot.currentCd[idx] = 0
    SkillSlot.multiplier[idx] = skill.baseMultiplier
    SkillSlot.aoeType[idx] = AOE_MAP[skill.aoeType] ?? 0
    SkillSlot.aoeRange[idx] = skill.aoeRange
  }
}

/**
 * Get skill info for UI display.
 * @param {number} eid
 * @param {string} jobId
 * @returns {Array<object>}
 */
export function getSkillInfo(eid, jobId) {
  const jobSkills = skillsData.skills[jobId]
  if (!jobSkills) return []

  return jobSkills.map((skill, i) => {
    const idx = eid * SKILL_SLOTS + skill.slot
    return {
      id: skill.id,
      nameKr: skill.nameKr,
      slot: skill.slot,
      level: SkillSlot.level[idx],
      cooldown: SkillSlot.cooldown[idx],
      currentCd: SkillSlot.currentCd[idx],
      multiplier: SkillSlot.multiplier[idx],
      aoeType: skill.aoeType,
      aoeRange: SkillSlot.aoeRange[idx],
      maxLevel: ENH.maxLevel,
      enhanceCost: ENH.materialCostBase + SkillSlot.level[idx] * ENH.materialCostPerLevel,
    }
  })
}

/**
 * Enhance a skill by 1 level.
 * @param {number} eid
 * @param {number} slotIndex
 * @param {string} jobId
 * @returns {boolean}
 */
export function enhanceSkill(eid, slotIndex, jobId) {
  const idx = eid * SKILL_SLOTS + slotIndex
  if (SkillSlot.level[idx] >= ENH.maxLevel) return false

  const cost = ENH.materialCostBase + SkillSlot.level[idx] * ENH.materialCostPerLevel
  if (!spendCurrency('mastery_points', cost)) return false

  SkillSlot.level[idx] += 1

  // Increase multiplier based on job skill data
  const jobSkills = skillsData.skills[jobId]
  if (jobSkills && jobSkills[slotIndex]) {
    SkillSlot.multiplier[idx] = jobSkills[slotIndex].baseMultiplier +
      (SkillSlot.level[idx] - 1) * jobSkills[slotIndex].levelMultBonus
  }

  return true
}

/**
 * Per-tick cooldown system — decrements active cooldowns.
 * This runs in the logic pipeline.
 */
export function SkillCooldownSystem(world) {
  const dt = world.time.delta
  const eid = world.playerEid
  if (!eid) return world

  for (let s = 0; s < SKILL_SLOTS; s++) {
    const idx = eid * SKILL_SLOTS + s
    if (SkillSlot.currentCd[idx] > 0) {
      SkillSlot.currentCd[idx] -= dt
      if (SkillSlot.currentCd[idx] < 0) SkillSlot.currentCd[idx] = 0
    }
  }

  return world
}

/* ── Mastery Tree ── */

/**
 * Get mastery tree info for UI.
 */
export function getMasteryInfo(eid) {
  const available = MasteryProgress.points[eid] - MasteryProgress.usedPoints[eid]
  const unlocked = MasteryProgress.unlockedNodes[eid]

  return {
    available,
    totalPoints: MasteryProgress.points[eid],
    usedPoints: MasteryProgress.usedPoints[eid],
    nodes: masteryData.nodes.map(node => ({
      ...node,
      isUnlocked: (unlocked & (1 << node.id)) !== 0,
      canUnlock: !(unlocked & (1 << node.id)) &&
        node.requires.every(req => (unlocked & (1 << req)) !== 0) &&
        available >= node.cost,
    })),
  }
}

/**
 * Unlock a mastery tree node.
 */
export function unlockMasteryNode(eid, nodeId) {
  const node = masteryData.nodes.find(n => n.id === nodeId)
  if (!node) return false

  const unlocked = MasteryProgress.unlockedNodes[eid]
  if (unlocked & (1 << nodeId)) return false // already unlocked

  // Check prerequisites
  if (!node.requires.every(req => (unlocked & (1 << req)) !== 0)) return false

  // Check points
  const available = MasteryProgress.points[eid] - MasteryProgress.usedPoints[eid]
  if (available < node.cost) return false

  MasteryProgress.usedPoints[eid] += node.cost
  MasteryProgress.unlockedNodes[eid] |= (1 << nodeId)

  return true
}
