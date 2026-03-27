/**
 * Monster components — type, spawn, respawn, AI behavior.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Tag: identifies an entity as a monster */
export const MonsterTag = {}

/** Monster type ID (maps to monster data table) */
export const MonsterType = { id: new Uint16Array(MAX) }

/** Original spawn coordinates for respawning */
export const SpawnPoint = { x: new Float32Array(MAX), y: new Float32Array(MAX) }

/** Respawn timer state */
export const Respawn = {
  timer: new Float32Array(MAX),
  delay: new Float32Array(MAX),
}

/**
 * AI behavior configuration.
 *   type: 0=stationary, 1=patrol, 2=chase
 *   direction: 0=left, 1=right
 */
export const AIBehavior = {
  type: new Uint8Array(MAX),
  patrolLeft: new Float32Array(MAX),
  patrolRight: new Float32Array(MAX),
  detectRange: new Float32Array(MAX),
  direction: new Uint8Array(MAX),
}
