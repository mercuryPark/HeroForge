/**
 * LootSystem — generates EXP, Gold, and Monster Points on monster death.
 *
 * Event-driven: listens for 'combat:death' events and awards loot to the killer.
 * Uses a factory pattern (createLootSystem) to encapsulate mutable player economy
 * state that will migrate to proper ECS components in later phases.
 */
import { hasComponent } from 'bitecs'
import { MonsterTag, MonsterType } from '@components/monster'
import { PlayerTag, Level } from '@components/character'
import { Position } from '@components/transform'

/** Loot table indexed by MonsterType.id */
const LOOT_TABLE = [
  { id: 0, exp: 10,  gold: 5,  mp: 1 }, // Slime
  { id: 1, exp: 15,  gold: 8,  mp: 1 }, // Mushroom
  { id: 2, exp: 25,  gold: 12, mp: 2 }, // Goblin
  { id: 3, exp: 20,  gold: 10, mp: 1 }, // Bat
  { id: 4, exp: 35,  gold: 18, mp: 2 }, // Skeleton
]

/**
 * Create a LootSystem instance with encapsulated economy state.
 * @returns {{ playerState: object, init: function, system: function }}
 */
export function createLootSystem() {
  const playerState = {
    gold: 0,
    monsterPoints: 0,
  }

  /**
   * Handle monster death: award EXP, gold, MP to killer.
   * @param {object} world
   * @param {object} event - combat:death event payload
   */
  function onMonsterDeath(world, event) {
    if (!event.isMonster) return

    const monsterEid = event.target
    const playerEid = event.killer

    if (!hasComponent(world, playerEid, PlayerTag)) return

    const monsterId = MonsterType.id[monsterEid]
    const loot = LOOT_TABLE[monsterId] || LOOT_TABLE[0]

    // Award EXP and check level-up
    if (hasComponent(world, playerEid, Level)) {
      Level.xp[playerEid] += loot.exp

      if (Level.xp[playerEid] >= Level.xpToNext[playerEid]) {
        Level.xp[playerEid] -= Level.xpToNext[playerEid]
        Level.current[playerEid] += 1

        // XP curve: base * level^1.5
        Level.xpToNext[playerEid] = Math.floor(
          100 * Math.pow(Level.current[playerEid], 1.5)
        )

        world.eventBus?.emit('player:levelup', {
          level: Level.current[playerEid],
          eid: playerEid,
          x: Position.x[playerEid],
          y: Position.y[playerEid],
        })
      }
    }

    // Award gold and monster points
    playerState.gold += loot.gold
    playerState.monsterPoints += loot.mp

    world.eventBus?.emit('loot:drop', {
      x: event.x,
      y: event.y,
      gold: loot.gold,
      exp: loot.exp,
      monsterPoints: loot.mp,
    })
  }

  return {
    playerState,

    /**
     * Bind event listener — call once after world.eventBus is ready.
     * @param {object} world
     */
    init(world) {
      world.eventBus?.on('combat:death', (e) => onMonsterDeath(world, e))
    },

    /**
     * Per-tick system function (currently event-driven, no per-tick work).
     * @param {object} world
     * @returns {object} world
     */
    system: function LootSystem(world) {
      return world
    },
  }
}
