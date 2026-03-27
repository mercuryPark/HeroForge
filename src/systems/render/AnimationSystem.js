/**
 * AnimationSystem — drives the animation state machine for all sprite entities.
 *
 * With placeholder rectangle sprites, "animation" is expressed as body tint changes.
 * Real frame-based animation can be wired in here once sprite atlases are available.
 *
 * Animation states (mirrors AnimState.current values):
 *   0 = idle     — default tint
 *   1 = run      — default tint (movement handled by SpriteSystem position)
 *   2 = jump     — default tint
 *   3 = attack   — yellow flash, auto-returns to idle after 0.3 s
 *   4 = death    — grey tint (permanent until entity is removed)
 *   5 = hit      — white flash, auto-returns to idle after 0.1 s
 *
 * Runs in the render pipeline (every animation frame).
 */
import { query } from 'bitecs'
import { AnimState } from '@components/sprite'
import { getSprite } from '@render/SpriteFactory'

/** Tint overrides per animation state. null = use sprite's original color. */
const STATE_TINTS = {
  0: null,       // idle
  1: null,       // run
  2: null,       // jump
  3: 0xFFFF00,   // attack — yellow
  4: 0x666666,   // death  — grey
  5: 0xFFFFFF,   // hit    — white flash
}

/** Duration (seconds) before timed states auto-reset to idle. */
const STATE_DURATION = {
  3: 0.3,   // attack
  5: 0.1,   // hit
}

/**
 * @param {object} world - bitECS world
 *   world.time.renderDelta — seconds since last render frame
 * @returns {object} world
 */
export function AnimationSystem(world) {
  const dt = world.time.renderDelta || 1 / 60
  const ents = query(world, [AnimState])

  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i]
    const sprite = getSprite(eid)
    if (!sprite) continue

    const state = AnimState.current[eid]

    // Only apply tint for transient states (attack, hit, death);
    // for idle/run/jump, leave the original fill color untouched.
    const tint = STATE_TINTS[state]
    if (tint != null) {
      sprite.body.tint = tint
    } else {
      // Reset tint to neutral so original Graphics fill color shows through
      sprite.body.tint = 0xFFFFFF
    }

    // Advance timer and auto-reset transient states
    const duration = STATE_DURATION[state]
    if (duration !== undefined) {
      AnimState.timer[eid] += dt
      if (AnimState.timer[eid] >= duration) {
        AnimState.current[eid] = 0  // return to idle
        AnimState.timer[eid] = 0
      }
    }
  }

  return world
}
