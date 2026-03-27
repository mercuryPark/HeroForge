/**
 * SpriteSystem — syncs ECS position data → PixiJS display objects each render frame.
 *
 * Responsibilities:
 *  - Interpolates position: renderPos = prevPos + (currPos - prevPos) * alpha
 *  - Flips sprite horizontally based on AnimState.flipX
 *  - Updates HP bars via SpriteFactory
 *  - Dims dead entities to 30% alpha
 *
 * Runs in the render pipeline (every animation frame), NOT the fixed logic tick.
 */
import { query, hasComponent } from 'bitecs'
import { Position, PrevPosition } from '@components/transform'
import { Stats, Dead } from '@components/combat'
import { AnimState } from '@components/sprite'
import { getSprite, updateHpBar } from '@render/SpriteFactory'

/**
 * @param {object} world - bitECS world
 *   world.time.alpha  — interpolation factor in [0, 1]
 *   world.time.delta  — seconds since last render frame
 * @returns {object} world
 */
export function SpriteSystem(world) {
  const alpha = world.time.alpha

  // All entities with a position and animation state are expected to have a sprite
  const ents = query(world, [Position, AnimState])

  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]
    const sprite = getSprite(eid)
    if (!sprite) continue

    // --- Interpolated position ---
    let rx, ry
    if (hasComponent(world, eid, PrevPosition)) {
      rx = PrevPosition.x[eid] + (Position.x[eid] - PrevPosition.x[eid]) * alpha
      ry = PrevPosition.y[eid] + (Position.y[eid] - PrevPosition.y[eid]) * alpha
    } else {
      rx = Position.x[eid]
      ry = Position.y[eid]
    }

    sprite.container.x = rx
    sprite.container.y = ry

    // --- Horizontal flip based on facing direction ---
    sprite.container.scale.x = AnimState.flipX[eid] ? -1 : 1

    // --- HP bar update ---
    if (hasComponent(world, eid, Stats)) {
      const ratio = Stats.maxHp[eid] > 0
        ? Stats.hp[eid] / Stats.maxHp[eid]
        : 0
      updateHpBar(eid, ratio)
    }

    // --- Death fade ---
    sprite.container.alpha = hasComponent(world, eid, Dead) ? 0.3 : 1.0
  }

  return world
}
