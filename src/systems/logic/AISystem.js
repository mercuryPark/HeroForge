/**
 * AISystem — drives monster AI behavior and player auto-battle targeting.
 *
 * Monster AI types:
 *   0 = Stationary: stays at spawn, attacks if player in range
 *   1 = Patrol: walks between patrol bounds, chases player if in detect range
 *   2 = Chase: always pursues player when in detect range
 *
 * Platform-aware pathfinding:
 *   When the player and monster are on different platforms, AISystem uses
 *   NavGraph.findPath() to compute a BFS route and follows it waypoint by
 *   waypoint (walk / jump / fall). Path is recalculated at most once per
 *   PATH_RECALC_INTERVAL seconds (throttled to avoid per-frame work).
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
import { findPath, findPlatformAt } from '@core/NavGraph'

const MOVE_SPEED = 150          // px/s
const JUMP_VELOCITY = -400      // px/s (negative = upward)
const CHASE_SPEED_FACTOR = 0.7  // fraction of MOVE_SPEED for chase AI
const PATROL_SPEED_FACTOR = 0.3 // fraction of MOVE_SPEED for patrol AI
const PATROL_CHASE_FACTOR = 0.5 // fraction of MOVE_SPEED when patrol is chasing

// How close to a waypoint x before we consider it reached (pixels)
const WAYPOINT_REACH_DIST = 24

// Seconds between full path recalculations per monster entity
const PATH_RECALC_INTERVAL = 1.0

/**
 * Lightweight per-entity path cache stored outside ECS TypedArrays.
 * Key: entity ID, Value: { path: Waypoint[]|null, timer: number, waypointIdx: number }
 */
const _pathCache = new Map()

function _getPathState(eid) {
  if (!_pathCache.has(eid)) {
    _pathCache.set(eid, { path: null, timer: PATH_RECALC_INTERVAL, waypointIdx: 0 })
  }
  return _pathCache.get(eid)
}

function _clearPathState(eid) {
  _pathCache.delete(eid)
}

/**
 * Drive monster navigation toward a target using navGraph pathfinding.
 * Returns the x velocity the monster should use this tick.
 * Mutates Velocity.y if a jump is needed.
 *
 * @param {number}  eid          - monster entity id
 * @param {number}  targetX      - target world x
 * @param {number}  targetY      - target world y
 * @param {object}  world        - ECS world (needs world.navGraph)
 * @param {number}  dt           - logic delta time (seconds)
 * @param {boolean} isGrounded   - is the monster currently grounded?
 * @param {number}  speedPxPerS  - desired movement speed
 * @returns {number} velocity x to apply
 */
function _navigateToward(eid, targetX, targetY, world, dt, isGrounded, speedPxPerS) {
  const navGraph = world.navGraph
  if (!navGraph) {
    // NavGraph not ready — fall back to horizontal chase
    const dx = targetX - Position.x[eid]
    return dx > 0 ? speedPxPerS : -speedPxPerS
  }

  const mx = Position.x[eid]
  const my = Position.y[eid]

  const monsterPlatform = findPlatformAt(navGraph, mx, my)
  const targetPlatform  = findPlatformAt(navGraph, targetX, targetY)

  // Same platform (or no platform info) → plain horizontal chase
  if (!monsterPlatform || !targetPlatform || monsterPlatform.id === targetPlatform.id) {
    _clearPathState(eid)
    const dx = targetX - mx
    return dx > 0 ? speedPxPerS : -speedPxPerS
  }

  // Different platform — use pathfinding
  const ps = _getPathState(eid)
  ps.timer -= dt

  // Recalculate path when timer expires or path is exhausted
  if (ps.timer <= 0 || ps.path === null) {
    ps.path = findPath(navGraph, mx, my, targetX, targetY)
    ps.waypointIdx = 0
    ps.timer = PATH_RECALC_INTERVAL
  }

  if (!ps.path || ps.path.length === 0) {
    // No path found — fall back to horizontal chase
    const dx = targetX - mx
    return dx > 0 ? speedPxPerS : -speedPxPerS
  }

  // Advance past reached waypoints
  while (ps.waypointIdx < ps.path.length) {
    const wp = ps.path[ps.waypointIdx]
    if (Math.abs(mx - wp.x) <= WAYPOINT_REACH_DIST) {
      ps.waypointIdx++
    } else {
      break
    }
  }

  if (ps.waypointIdx >= ps.path.length) {
    // Path completed — clear so we recalc next tick
    ps.path = null
    const dx = targetX - mx
    return dx > 0 ? speedPxPerS : -speedPxPerS
  }

  const wp = ps.path[ps.waypointIdx]
  const dx = wp.x - mx

  // Execute jump action when we're close enough and grounded
  if (wp.action === 'jump' && isGrounded && Math.abs(dx) < WAYPOINT_REACH_DIST * 2) {
    Velocity.y[eid] = JUMP_VELOCITY
  }

  // For fall edges just walk toward the target edge (gravity does the rest)
  return dx > 0 ? speedPxPerS : -speedPxPerS
}

/**
 * @param {object} world
 * @returns {object} world
 */
export function AISystem(world) {
  const dt = world.time ? world.time.delta : (1 / 20)  // fallback 20 tps

  const players  = query(world, [PlayerTag, Position, Velocity, Stats, Combat])
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

    const isGrounded = hasComponent(world, eid, Grounded)

    if (aiType === 0) {
      // Stationary — don't move, target player only if in attack range
      Velocity.x[eid] = 0
      _clearPathState(eid)
      if (playerEid && playerDist < Combat.attackRange[eid]) {
        Combat.target[eid] = playerEid
      } else {
        Combat.target[eid] = 0
      }

    } else if (aiType === 1) {
      // Patrol — walk between boundaries; chase player if in detect range
      if (playerEid && playerDist < AIBehavior.detectRange[eid]) {
        const speed = MOVE_SPEED * PATROL_CHASE_FACTOR
        const vx = _navigateToward(
          eid,
          Position.x[playerEid], Position.y[playerEid],
          world, dt, isGrounded, speed
        )
        Velocity.x[eid] = vx
        AIBehavior.direction[eid] = vx > 0 ? 1 : 0
        Combat.target[eid] = playerEid
      } else {
        // Patrol back and forth (no nav needed, same platform)
        _clearPathState(eid)
        if (AIBehavior.direction[eid] === 1) {
          Velocity.x[eid] = MOVE_SPEED * PATROL_SPEED_FACTOR
          if (Position.x[eid] >= AIBehavior.patrolRight[eid]) AIBehavior.direction[eid] = 0
        } else {
          Velocity.x[eid] = -MOVE_SPEED * PATROL_SPEED_FACTOR
          if (Position.x[eid] <= AIBehavior.patrolLeft[eid]) AIBehavior.direction[eid] = 1
        }
        Combat.target[eid] = 0
      }
      AnimState.flipX[eid] = AIBehavior.direction[eid] === 0 ? 1 : 0
      AnimState.current[eid] = 1 // run while moving

    } else if (aiType === 2) {
      // Chase — always follow player if in detect range
      if (playerEid && playerDist < AIBehavior.detectRange[eid]) {
        const speed = MOVE_SPEED * CHASE_SPEED_FACTOR
        const vx = _navigateToward(
          eid,
          Position.x[playerEid], Position.y[playerEid],
          world, dt, isGrounded, speed
        )
        Velocity.x[eid] = vx
        AIBehavior.direction[eid] = vx > 0 ? 1 : 0
        AnimState.flipX[eid] = vx > 0 ? 0 : 1
        AnimState.current[eid] = 1
        Combat.target[eid] = playerEid
      } else {
        Velocity.x[eid] = 0
        _clearPathState(eid)
        Combat.target[eid] = 0
        AnimState.current[eid] = 0
      }
    }
  }

  return world
}
