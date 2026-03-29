/**
 * PhysicsSystem — applies gravity and integrates velocity into position.
 * Runs at fixed TICK_RATE. Tile collision is handled separately by TileCollisionSystem.
 */
import { query, hasComponent } from 'bitecs'
import { Position, PrevPosition, Velocity } from '@components/transform'
import { Gravity, Grounded, Collider, OnLadder } from '@components/physics'
import { GRAVITY, TERMINAL_VELOCITY } from '@data/constants'

/**
 * @param {object} world - bitECS world (must have world.time.delta in seconds)
 * @returns {object} world
 */
export function PhysicsSystem(world) {
  const dt = world.time.delta
  const ents = query(world, [Position, Velocity, Collider])

  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]

    // Snapshot previous position for render interpolation
    if (hasComponent(world, eid, PrevPosition)) {
      PrevPosition.x[eid] = Position.x[eid]
      PrevPosition.y[eid] = Position.y[eid]
    }

    // Apply gravity when airborne (skip on ladder)
    if (hasComponent(world, eid, Gravity) && !hasComponent(world, eid, Grounded) && !hasComponent(world, eid, OnLadder)) {
      Velocity.y[eid] += Gravity.value[eid] * dt

      // Clamp to terminal velocity
      if (Velocity.y[eid] > TERMINAL_VELOCITY) {
        Velocity.y[eid] = TERMINAL_VELOCITY
      }
    }

    // Integrate velocity
    Position.x[eid] += Velocity.x[eid] * dt
    Position.y[eid] += Velocity.y[eid] * dt
  }

  return world
}
