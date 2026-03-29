/**
 * Relic components — active/passive relics with effects.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Max relic slots */
export const MAX_RELIC_SLOTS = 6

/**
 * RelicSlot — stores equipped relics.
 * Each relic has an active effect (manual trigger) and passive effect (always on).
 */
export const RelicSlot = {
  relicId: new Uint16Array(MAX * MAX_RELIC_SLOTS),
  grade: new Uint8Array(MAX * MAX_RELIC_SLOTS),
  activeEffectType: new Uint8Array(MAX * MAX_RELIC_SLOTS),
  activeEffectValue: new Float32Array(MAX * MAX_RELIC_SLOTS),
  passiveEffectType: new Uint8Array(MAX * MAX_RELIC_SLOTS),
  passiveEffectValue: new Float32Array(MAX * MAX_RELIC_SLOTS),
}
