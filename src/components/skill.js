/**
 * Skill components — skill slots, cooldowns, mastery.
 *
 * Each entity has up to 5 skill slots:
 *   0 = Normal Attack (auto, no cooldown)
 *   1-3 = Active Skills (cooldown-based, AoE)
 *   4 = Ultimate (4th advancement, 40-60s cooldown)
 *
 * Stored as flat arrays: index = eid * 5 + slotIndex
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES
const SLOTS_PER_ENTITY = 5

export const SKILL_SLOTS = SLOTS_PER_ENTITY

export const SkillSlot = {
  skillId: new Uint16Array(MAX * SLOTS_PER_ENTITY),
  level: new Uint8Array(MAX * SLOTS_PER_ENTITY),
  cooldown: new Float32Array(MAX * SLOTS_PER_ENTITY),
  currentCd: new Float32Array(MAX * SLOTS_PER_ENTITY),
  multiplier: new Float32Array(MAX * SLOTS_PER_ENTITY),
  aoeType: new Uint8Array(MAX * SLOTS_PER_ENTITY),  // 0=rect, 1=circle, 2=cone
  aoeRange: new Float32Array(MAX * SLOTS_PER_ENTITY),
}

/** Mastery tree progress */
export const MasteryProgress = {
  points: new Uint16Array(MAX),
  usedPoints: new Uint16Array(MAX),
  /** Bitfield for unlocked mastery nodes (up to 32 nodes) */
  unlockedNodes: new Uint32Array(MAX),
}

/** AoE type constants */
export const AOE_RECT = 0
export const AOE_CIRCLE = 1
export const AOE_CONE = 2
