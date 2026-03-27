// bitECS World — entity/component/system management
import { createWorld as bitCreateWorld, addEntity, removeEntity } from 'bitecs'

export function createGameWorld() {
  const world = bitCreateWorld()

  // Timing state (mutated in-place by game loop, zero alloc)
  world.time = { delta: 0, elapsed: 0, tick: 0, alpha: 0 }

  // Player entity id (set during spawn)
  world.playerEid = 0

  // Shared services (attached during boot)
  world.spatialHash = null
  world.eventBus = null
  world.pixiApp = null
  world.objectPools = {}

  // Entity management helpers
  world.spawn = () => addEntity(world)
  world.despawn = (eid) => removeEntity(world, eid)

  return world
}
