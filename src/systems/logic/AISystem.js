/**
 * AISystem — drives monster AI behavior and player auto-battle targeting.
 *
 * Monster AI types:
 *   0 = Stationary: stays at spawn, attacks if player in range
 *   1 = Patrol: walks between patrol bounds, chases player if in detect range
 *   2 = Chase: always pursues player when in detect range
 *
 * Player auto-battle:
 *   Finds nearest alive monster, walks toward it, stops at attack range.
 *   When autoBattle is OFF, manual keyboard control applies.
 */
import { query, hasComponent } from 'bitecs'
import { Position, Velocity } from '@components/transform'
import { Grounded } from '@components/physics'
import { Stats, Combat, Dead } from '@components/combat'
import { MonsterTag, AIBehavior } from '@components/monster'
import { PlayerTag } from '@components/character'
import { AnimState } from '@components/sprite'
import { Input } from './InputSystem'

const MOVE_SPEED = 150     // px/s
const JUMP_VELOCITY = -400 // px/s (negative = upward)

/**
 * @param {object} world
 * @returns {object} world
 */
export function AISystem(world) {
  const players = query(world, [PlayerTag, Position, Velocity, Stats, Combat])
  const monsters = query(world, [MonsterTag, Position, Stats])

  // --- Player AI (auto-battle) ---
  for (let p = 0; p < players.length; p++) {
    const pid = players[p]
    if (hasComponent(world, pid, Dead)) continue

    if (Input.autoBattle) {
      // Find nearest alive monster (Manhattan distance)
      let nearestEid = 0
      let nearestDist = Infinity

      for (let m = 0; m < monsters.length; m++) {
        const mid = monsters[m]
        if (hasComponent(world, mid, Dead)) continue

        const dx = Position.x[mid] - Position.x[pid]
        const dy = Position.y[mid] - Position.y[pid]
        const dist = Math.abs(dx) + Math.abs(dy)

        if (dist < nearestDist) {
          nearestDist = dist
          nearestEid = mid
        }
      }

      Combat.target[pid] = nearestEid

      if (nearestEid) {
        const dx = Position.x[nearestEid] - Position.x[pid]
        const range = Combat.attackRange[pid]

        if (Math.abs(dx) > range) {
          // Move toward target
          Velocity.x[pid] = dx > 0 ? MOVE_SPEED : -MOVE_SPEED
          AnimState.flipX[pid] = dx > 0 ? 0 : 1
          AnimState.current[pid] = 1 // run
        } else {
          // In range — stop, face target (attack handled by CombatSystem)
          Velocity.x[pid] = 0
          AnimState.flipX[pid] = dx > 0 ? 0 : 1
        }
      } else {
        // No target — idle
        Velocity.x[pid] = 0
        if (AnimState.current[pid] !== 3) AnimState.current[pid] = 0
      }
    } else {
      // Manual keyboard control
      Combat.target[pid] = 0

      if (Input.left) {
        Velocity.x[pid] = -MOVE_SPEED
        AnimState.flipX[pid] = 1
        AnimState.current[pid] = 1
      } else if (Input.right) {
        Velocity.x[pid] = MOVE_SPEED
        AnimState.flipX[pid] = 0
        AnimState.current[pid] = 1
      } else {
        Velocity.x[pid] = 0
        if (AnimState.current[pid] === 1) AnimState.current[pid] = 0
      }

      // Jump (one-shot, only when grounded)
      if (Input.jump && hasComponent(world, pid, Grounded)) {
        Velocity.y[pid] = JUMP_VELOCITY
      }
    }
  }

  // --- Monster AI ---
  const aliveMonsters = query(world, [MonsterTag, Position, Velocity, AIBehavior, Stats])

  for (let i = 0; i < aliveMonsters.length; i++) {
    const eid = aliveMonsters[i]
    if (hasComponent(world, eid, Dead)) continue

    const aiType = AIBehavior.type[eid]

    // Find player distance
    let playerEid = world.playerEid
    let playerDist = Infinity
    if (playerEid && !hasComponent(world, playerEid, Dead)) {
      playerDist = Math.abs(Position.x[playerEid] - Position.x[eid])
    } else {
      playerEid = 0
    }

    if (aiType === 0) {
      // Stationary — don't move, target player only if in attack range
      Velocity.x[eid] = 0
      if (playerEid && playerDist < Combat.attackRange[eid]) {
        Combat.target[eid] = playerEid
      } else {
        Combat.target[eid] = 0
      }
    } else if (aiType === 1) {
      // Patrol — walk between boundaries; chase player if in detect range
      if (playerEid && playerDist < AIBehavior.detectRange[eid]) {
        const dx = Position.x[playerEid] - Position.x[eid]
        Velocity.x[eid] = dx > 0 ? MOVE_SPEED * 0.5 : -MOVE_SPEED * 0.5
        AIBehavior.direction[eid] = dx > 0 ? 1 : 0
        Combat.target[eid] = playerEid
      } else {
        // Patrol back and forth
        if (AIBehavior.direction[eid] === 1) {
          Velocity.x[eid] = MOVE_SPEED * 0.3
          if (Position.x[eid] >= AIBehavior.patrolRight[eid]) AIBehavior.direction[eid] = 0
        } else {
          Velocity.x[eid] = -MOVE_SPEED * 0.3
          if (Position.x[eid] <= AIBehavior.patrolLeft[eid]) AIBehavior.direction[eid] = 1
        }
        Combat.target[eid] = 0
      }
      AnimState.flipX[eid] = AIBehavior.direction[eid] === 0 ? 1 : 0
      AnimState.current[eid] = 1 // run while moving
    } else if (aiType === 2) {
      // Chase — always follow player if in detect range
      if (playerEid && playerDist < AIBehavior.detectRange[eid]) {
        const dx = Position.x[playerEid] - Position.x[eid]
        Velocity.x[eid] = dx > 0 ? MOVE_SPEED * 0.7 : -MOVE_SPEED * 0.7
        AIBehavior.direction[eid] = dx > 0 ? 1 : 0
        AnimState.flipX[eid] = dx > 0 ? 0 : 1
        AnimState.current[eid] = 1
        Combat.target[eid] = playerEid
      } else {
        Velocity.x[eid] = 0
        Combat.target[eid] = 0
        AnimState.current[eid] = 0
      }
    }
  }

  return world
}
