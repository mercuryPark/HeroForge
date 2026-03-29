/**
 * Equipment components — equipped stat aggregates + inventory store.
 *
 * Design:
 *   Items are plain JS objects stored in the Inventory module (not ECS entities).
 *   EquippedStats is an ECS component that holds the AGGREGATED bonus from all
 *   currently equipped items. EquipmentSystem recalculates it on equip/unequip.
 *
 * Slot IDs: hat=0, top=1, bottom=2, gloves=3, shoes=4, cape=5,
 *           shoulder=6, belt=7, necklace=8, ring=9, face_accessory=10
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Slot name → numeric ID mapping */
export const EQUIP_SLOT_IDS = {
  hat: 0, top: 1, bottom: 2, gloves: 3, shoes: 4,
  cape: 5, shoulder: 6, belt: 7, necklace: 8, ring: 9,
  face_accessory: 10,
}

export const EQUIP_SLOT_COUNT = 11

/** Grade name → numeric ID */
export const GRADE_IDS = {
  normal: 0, rare: 1, epic: 2, unique: 3, legendary: 4,
}

export const GRADE_NAMES = ['Normal', 'Rare', 'Epic', 'Unique', 'Legendary']
export const GRADE_NAMES_KR = ['노말', '레어', '에픽', '유니크', '레전더리']

/**
 * Aggregated stats from all equipped items.
 * Recalculated by EquipmentSystem whenever equipment changes.
 */
export const EquippedStats = {
  hp: new Float32Array(MAX),
  mp: new Float32Array(MAX),
  atk: new Float32Array(MAX),
  def: new Float32Array(MAX),
  critRate: new Float32Array(MAX),
  critDmg: new Float32Array(MAX),
  atkSpeed: new Float32Array(MAX),
  bossDmgPercent: new Float32Array(MAX),
  allStat: new Float32Array(MAX),
}

/**
 * Item object shape (stored in Inventory, NOT in ECS):
 * {
 *   id: number,           // unique item ID
 *   slotId: string,       // 'hat', 'top', etc.
 *   grade: number,        // 0=normal, 1=rare, ...
 *   itemLevel: number,    // level when acquired
 *   mainStat: { key: string, value: number },  // primary stat
 *   subOptions: [{ key: string, value: number }, ...],  // 0-3 sub options
 *   specialOption: { key: string, value: number } | null,
 * }
 */

/** Auto-increment item ID counter */
let _nextItemId = 1

export function getNextItemId() {
  return _nextItemId++
}

export function setNextItemId(id) {
  _nextItemId = id
}
