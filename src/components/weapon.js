/**
 * Weapon component — separate from equipment system.
 * Each player has exactly one weapon slot.
 *
 * weaponId: index into weapons.json
 * grade: 0=normal, 1=rare, 2=epic, 3=unique, 4=legendary
 * enhanceLevel: 0-30, increases baseAtk
 * baseAtk: current ATK from weapon (base + enhance bonuses)
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

export const WeaponSlot = {
  weaponId: new Uint16Array(MAX),
  grade: new Uint8Array(MAX),
  enhanceLevel: new Uint8Array(MAX),
  baseAtk: new Float32Array(MAX),
}
