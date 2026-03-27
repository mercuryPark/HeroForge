/**
 * SpawnSystem — manages monster lifecycle: initial spawning, death respawn timers,
 * and respawning at original spawn points.
 */
import { query, hasComponent, addComponent, removeComponent } from 'bitecs'
import { Position, PrevPosition, Velocity } from '@components/transform'
import { Gravity, Collider } from '@components/physics'
import { Stats, Combat, Dead } from '@components/combat'
import { MonsterTag, MonsterType, SpawnPoint, Respawn, AIBehavior } from '@components/monster'
import { AnimState } from '@components/sprite'
import { GRAVITY } from '@data/constants'

/**
 * Monster presets — inline data for Phase 1.
 * Later phases can pull from chapters.json dynamically.
 */
const MONSTER_PRESETS = [
  { id: 0, name: 'Slime',    hp: 50,  atk: 8,   def: 2,  exp: 10,  gold: 5,  aiType: 0, respawnDelay: 3 },
  { id: 1, name: 'Mushroom', hp: 80,  atk: 12,  def: 4,  exp: 15,  gold: 8,  aiType: 1, respawnDelay: 3 },
  { id: 2, name: 'Goblin',   hp: 120, atk: 18,  def: 6,  exp: 25,  gold: 12, aiType: 1, respawnDelay: 5 },
  { id: 3, name: 'Bat',      hp: 60,  atk: 15,  def: 3,  exp: 20,  gold: 10, aiType: 2, respawnDelay: 4 },
  { id: 4, name: 'Skeleton', hp: 150, atk: 22,  def: 8,  exp: 35,  gold: 18, aiType: 1, respawnDelay: 5 },
]

export { MONSTER_PRESETS }

/**
 * Spawn a single monster entity with all required components.
 * @param {object} world - bitECS world
 * @param {number} spawnX - X coordinate
 * @param {number} spawnY - Y coordinate
 * @param {number} presetIndex - index into MONSTER_PRESETS
 * @returns {number} entity ID
 */
export function spawnMonster(world, spawnX, spawnY, presetIndex) {
  const preset = MONSTER_PRESETS[presetIndex % MONSTER_PRESETS.length]
  const eid = world.spawn()

  addComponent(world, eid, Position)
  Position.x[eid] = spawnX
  Position.y[eid] = spawnY

  addComponent(world, eid, PrevPosition)
  PrevPosition.x[eid] = spawnX
  PrevPosition.y[eid] = spawnY

  addComponent(world, eid, Velocity)
  Velocity.x[eid] = 0
  Velocity.y[eid] = 0

  addComponent(world, eid, Gravity)
  Gravity.value[eid] = GRAVITY

  addComponent(world, eid, Collider)
  Collider.width[eid] = 28
  Collider.height[eid] = 28
  Collider.offsetX[eid] = 2
  Collider.offsetY[eid] = 4

  addComponent(world, eid, Stats)
  Stats.hp[eid] = preset.hp
  Stats.maxHp[eid] = preset.hp
  Stats.atk[eid] = preset.atk
  Stats.def[eid] = preset.def
  Stats.critRate[eid] = 0
  Stats.critDmg[eid] = 1.0
  Stats.atkSpeed[eid] = 0.8
  Stats.accuracy[eid] = 50
  Stats.evasion[eid] = 5

  addComponent(world, eid, Combat)
  Combat.target[eid] = 0
  Combat.attackTimer[eid] = 0
  Combat.attackRange[eid] = 40

  addComponent(world, eid, MonsterTag)
  addComponent(world, eid, MonsterType)
  MonsterType.id[eid] = preset.id

  addComponent(world, eid, SpawnPoint)
  SpawnPoint.x[eid] = spawnX
  SpawnPoint.y[eid] = spawnY

  addComponent(world, eid, Respawn)
  Respawn.timer[eid] = 0
  Respawn.delay[eid] = preset.respawnDelay

  addComponent(world, eid, AIBehavior)
  AIBehavior.type[eid] = preset.aiType
  AIBehavior.patrolLeft[eid] = spawnX - 100
  AIBehavior.patrolRight[eid] = spawnX + 100
  AIBehavior.detectRange[eid] = 200
  AIBehavior.direction[eid] = 1 // start facing right

  addComponent(world, eid, AnimState)
  AnimState.current[eid] = 0 // idle
  AnimState.speed[eid] = 8
  AnimState.loop[eid] = 1

  world.eventBus?.emit('entity:spawn', { eid, x: spawnX, y: spawnY })

  return eid
}

/**
 * SpawnSystem — handles respawning dead monsters after their respawn delay.
 * @param {object} world
 * @returns {object} world
 */
export function SpawnSystem(world) {
  const dt = world.time.delta
  const deadMonsters = query(world, [Dead, MonsterTag, Respawn, SpawnPoint])

  for (let i = 0; i < deadMonsters.length; i++) {
    const eid = deadMonsters[i]
    Respawn.timer[eid] += dt

    if (Respawn.timer[eid] >= Respawn.delay[eid]) {
      // Reset position to spawn point
      Position.x[eid] = SpawnPoint.x[eid]
      Position.y[eid] = SpawnPoint.y[eid]
      PrevPosition.x[eid] = SpawnPoint.x[eid]
      PrevPosition.y[eid] = SpawnPoint.y[eid]

      // Reset physics
      Velocity.x[eid] = 0
      Velocity.y[eid] = 0

      // Reset combat state
      Stats.hp[eid] = Stats.maxHp[eid]
      Combat.target[eid] = 0
      Combat.attackTimer[eid] = 0
      Respawn.timer[eid] = 0

      // Reset animation
      AnimState.current[eid] = 0 // idle

      // Revive
      removeComponent(world, eid, Dead)
      world.eventBus?.emit('entity:spawn', {
        eid,
        x: SpawnPoint.x[eid],
        y: SpawnPoint.y[eid],
      })
    }
  }

  return world
}
