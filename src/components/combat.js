/**
 * Combat components — stats, targeting, damage events.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Core RPG stat block (all floats for formula flexibility) */
export const Stats = {
  hp: new Float32Array(MAX),
  maxHp: new Float32Array(MAX),
  mp: new Float32Array(MAX),
  maxMp: new Float32Array(MAX),
  atk: new Float32Array(MAX),
  def: new Float32Array(MAX),
  critRate: new Float32Array(MAX),
  critDmg: new Float32Array(MAX),
  atkSpeed: new Float32Array(MAX),
  accuracy: new Float32Array(MAX),
  evasion: new Float32Array(MAX),
  armorPen: new Float32Array(MAX),
  dmgPercent: new Float32Array(MAX),
  bossDmgPercent: new Float32Array(MAX),
  normalMonsterDmgPercent: new Float32Array(MAX),
  skillDmgPercent: new Float32Array(MAX),
  finalDmgPercent: new Float32Array(MAX),
  maxDmgMultiplier: new Float32Array(MAX),
  minDmgRatio: new Float32Array(MAX),
  maxDmgRatio: new Float32Array(MAX),
}

/** Tag: marks entity as a boss (applied by SpawnSystem for boss encounters in Phase 4+) */
export const BossTag = {}

/** Death/revive state */
export const ReviveState = {
  invincibleTimer: new Float32Array(MAX),
}

/** Active combat state */
export const Combat = {
  target: new Uint32Array(MAX),
  attackTimer: new Float32Array(MAX),
  attackRange: new Float32Array(MAX),
}

/** Tag: entity is dead (awaiting removal or respawn) */
export const Dead = {}

/** One-shot damage event — consumed by the DamageSystem each tick */
export const DamageEvent = {
  amount: new Float32Array(MAX),
  isCrit: new Uint8Array(MAX),
  source: new Uint32Array(MAX),
}
