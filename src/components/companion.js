/**
 * Companion components — companion data, gacha, equip slots.
 *
 * Companions are stored as plain objects in a module-level collection
 * (similar to inventory), with ECS used only for equipped slot tracking.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Rarity IDs */
export const RARITY = { R: 0, SR: 1, SSR: 2 }
export const RARITY_NAMES = ['R', 'SR', 'SSR']
export const RARITY_NAMES_KR = ['레어', 'S레어', 'SS레어']

/** Max companions that can be equipped */
export const MAX_EQUIPPED_COMPANIONS = 4

/** Equipped companion slots (stores companion collection index, 0=empty) */
export const CompanionEquipped = {
  slot0: new Uint16Array(MAX),
  slot1: new Uint16Array(MAX),
  slot2: new Uint16Array(MAX),
  slot3: new Uint16Array(MAX),
}

/**
 * Companion object shape (stored in collection, not ECS):
 * {
 *   id: number,
 *   companionId: string,  // e.g. 'warrior_knight'
 *   nameKr: string,
 *   rarity: number,       // 0=R, 1=SR, 2=SSR
 *   star: number,         // 1-5
 *   jobClass: string,     // 'warrior', 'mage', etc.
 *   equipEffect: { stat: string, value: number },
 *   ownEffect: { stat: string, value: number },
 * }
 */
