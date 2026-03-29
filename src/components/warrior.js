/**
 * Warrior's Power + Ability components.
 *
 * WarriorPower: tiered stat investment using Warrior Tokens
 * AbilityOption: 4-slot rerollable abilities using Honor Medals
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Warrior's Power — stat investment per tier */
export const WarriorPower = {
  tier: new Uint8Array(MAX),
  accuracy: new Uint16Array(MAX),
  damage: new Uint16Array(MAX),
  mainStat: new Uint16Array(MAX),
  atk: new Uint16Array(MAX),
  hp: new Uint16Array(MAX),
  def: new Uint16Array(MAX),
}

/**
 * Ability Options — 4 slots, each with grade/type/value.
 * Grade: 0=rare, 1=epic, 2=unique, 3=legendary, 4=mythic
 * Locked: 0=unlocked, 1=locked (won't reroll)
 */
export const AbilityOption = {
  slot1Grade: new Uint8Array(MAX),
  slot1Type: new Uint8Array(MAX),
  slot1Value: new Float32Array(MAX),
  slot1Locked: new Uint8Array(MAX),
  slot2Grade: new Uint8Array(MAX),
  slot2Type: new Uint8Array(MAX),
  slot2Value: new Float32Array(MAX),
  slot2Locked: new Uint8Array(MAX),
  slot3Grade: new Uint8Array(MAX),
  slot3Type: new Uint8Array(MAX),
  slot3Value: new Float32Array(MAX),
  slot3Locked: new Uint8Array(MAX),
  slot4Grade: new Uint8Array(MAX),
  slot4Type: new Uint8Array(MAX),
  slot4Value: new Float32Array(MAX),
  slot4Locked: new Uint8Array(MAX),
  transformLevel: new Uint16Array(MAX),
}
