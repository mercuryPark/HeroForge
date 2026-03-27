/**
 * UIBridgeSystem — syncs ECS component data to Preact signals each logic tick.
 *
 * Reads from: PlayerTag + Stats (HP/MP), Level (XP)
 * Writes to:  hudSignals (Preact signals for HUD reactivity)
 *
 * Also syncs autoBattle state bidirectionally between HUD button and Input module.
 */
import { query, hasComponent } from 'bitecs'
import { Stats } from '@components/combat'
import { PlayerTag, Level, StatAllocation } from '@components/character'
import { hudSignals } from '@ui/hud/HudPanel'
import { availablePointsSignal } from '@ui/signals/statSignals'
import { Input } from '@systems/logic/InputSystem'

/**
 * @param {object} world
 * @returns {object} world
 */
export function UIBridgeSystem(world) {
  const players = query(world, [PlayerTag, Stats])

  for (let i = 0; i < players.length; i++) {
    const eid = players[i]

    // Sync HP / MP
    hudSignals.hp.value = Math.floor(Stats.hp[eid])
    hudSignals.maxHp.value = Math.floor(Stats.maxHp[eid])
    hudSignals.mp.value = Math.floor(Stats.mp[eid])
    hudSignals.maxMp.value = Math.floor(Stats.maxMp[eid])

    // Sync Level / XP
    if (hasComponent(world, eid, Level)) {
      hudSignals.level.value = Level.current[eid]
      hudSignals.xp.value = Math.floor(Level.xp[eid])
      hudSignals.xpToNext.value = Math.floor(Level.xpToNext[eid])
    }

    // Sync available stat points for HUD badge
    if (hasComponent(world, eid, StatAllocation)) {
      availablePointsSignal.value = StatAllocation.availablePoints[eid]
    }
  }

  // Sync gold from loot system playerState (attached to world)
  if (world.playerState) {
    hudSignals.gold.value = world.playerState.gold
  }

  // Bidirectional auto-battle sync: HUD signal is the source of truth.
  // Input reads from it; HUD button toggles the signal directly.
  if (Input.autoBattle !== hudSignals.autoBattle.value) {
    Input.autoBattle = hudSignals.autoBattle.value
  }

  return world
}
