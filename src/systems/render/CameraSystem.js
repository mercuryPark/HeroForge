/**
 * CameraSystem — smooth camera that follows the player entity.
 *
 * Uses render-interpolation alpha for sub-tick smoothness and
 * lerp-based easing clamped to the map boundaries.
 */
import { hasComponent } from 'bitecs'
import { Position, PrevPosition } from '@components/transform'

const LERP_SPEED = 0.08

/**
 * Factory: creates a CameraSystem bound to the given world container and map dimensions.
 *
 * @param {import('pixi.js').Container} worldContainer — the container that moves with the camera
 * @param {number} mapWidth  — total map width in pixels
 * @param {number} mapHeight — total map height in pixels
 * @param {number} screenWidth  — viewport width (1280)
 * @param {number} screenHeight — viewport height (720)
 * @returns {(world: object) => object} system function
 */
export function createCameraSystem(worldContainer, mapWidth, mapHeight, screenWidth, screenHeight) {
  return function CameraSystem(world) {
    const eid = world.playerEid
    if (!eid) return world

    const alpha = world.time.alpha

    // Interpolate player position for smooth rendering between ticks
    let px, py
    if (hasComponent(world, eid, PrevPosition)) {
      px = PrevPosition.x[eid] + (Position.x[eid] - PrevPosition.x[eid]) * alpha
      py = PrevPosition.y[eid] + (Position.y[eid] - PrevPosition.y[eid]) * alpha
    } else {
      px = Position.x[eid]
      py = Position.y[eid]
    }

    // Target: center player on screen
    let targetX = screenWidth / 2 - px
    let targetY = screenHeight / 2 - py

    // Clamp to map bounds (camera cannot move past edges)
    targetX = Math.min(0, Math.max(screenWidth - mapWidth, targetX))
    targetY = Math.min(0, Math.max(screenHeight - mapHeight, targetY))

    // Lerp for smoothness
    worldContainer.x += (targetX - worldContainer.x) * LERP_SPEED
    worldContainer.y += (targetY - worldContainer.y) * LERP_SPEED

    return world
  }
}
