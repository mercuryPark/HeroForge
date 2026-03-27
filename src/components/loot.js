/**
 * Loot / reward components — attached to monsters, consumed on kill.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

export const LootDrop = {
  gold: new Uint32Array(MAX),
  exp: new Float32Array(MAX),
  monsterPoints: new Uint32Array(MAX),
}
