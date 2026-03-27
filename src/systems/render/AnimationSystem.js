/**
 * AnimationSystem — drives the animation state machine for all sprite entities.
 *
 * Animation states (mirrors AnimState.current values):
 *   0 = idle     — looping
 *   1 = run      — looping
 *   2 = jump     — looping
 *   3 = attack   — play once, auto-returns to idle
 *   4 = death    — play once, hold last frame
 *   5 = hit      — play once, auto-returns to idle
 *
 * When a real Sprite body with `frames` is available, cycles texture frames.
 * Falls back to tint changes for Graphics placeholder bodies.
 *
 * Runs in the render pipeline (every animation frame).
 */
import { query } from 'bitecs'
import { AnimState } from '@components/sprite'
import { getSprite } from '@render/SpriteFactory'

/** Map AnimState.current → frames key */
const STATE_TO_FRAMES = ['idle', 'run', 'jump', 'attack', 'death', 'hit']

/** Default playback speeds (fps) per state when AnimState.speed is 0 */
const DEFAULT_SPEED = {
  0: 8,   // idle
  1: 10,  // run
  2: 6,   // jump
  3: 12,  // attack
  4: 8,   // death
  5: 12,  // hit
}

/** Duration (seconds) before transient states auto-reset to idle (fallback tint mode). */
const STATE_DURATION_TINT = {
  3: 0.3,  // attack
  5: 0.1,  // hit
}

/** Tint overrides for fallback Graphics bodies. */
const STATE_TINTS = {
  0: null,
  1: null,
  2: null,
  3: 0xFFFF00,  // attack — yellow
  4: 0x666666,  // death  — grey
  5: 0xFFFFFF,  // hit    — white flash
}

/**
 * @param {object} world - bitECS world
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
    const { body, frames } = sprite

    if (frames && body.isSprite !== false && typeof body.texture !== 'undefined') {
      // --- Real sprite animation ---
      const frameKey = STATE_TO_FRAMES[state] ?? 'idle'
      const frameArr = frames[frameKey] ?? frames.idle ?? []
      const frameCount = frameArr.length

      if (frameCount === 0) continue

      const fps = AnimState.speed[eid] > 0 ? AnimState.speed[eid] : DEFAULT_SPEED[state] ?? 8
      AnimState.timer[eid] += dt

      // Advance frames based on accumulated time
      if (AnimState.timer[eid] >= 1 / fps) {
        AnimState.timer[eid] -= 1 / fps

        const isDeath = state === 4
        const isOnce = state === 3 || state === 5  // attack or hit

        let nextFrame = AnimState.frame[eid] + 1

        if (nextFrame >= frameCount) {
          if (isDeath) {
            // Hold last frame
            nextFrame = frameCount - 1
          } else if (isOnce) {
            // Return to idle
            nextFrame = 0
            AnimState.current[eid] = 0
            AnimState.frame[eid] = 0
            AnimState.timer[eid] = 0
            // Apply idle first frame immediately
            const idleFrames = frames.idle ?? []
            if (idleFrames.length > 0) body.texture = idleFrames[0]
            continue
          } else {
            // Loop
            nextFrame = 0
          }
        }

        AnimState.frame[eid] = nextFrame
        const tex = frameArr[nextFrame]
        if (tex) body.texture = tex
      }

      // Apply flipX via scale
      const flipX = AnimState.flipX[eid]
      const absScaleX = Math.abs(body.scale.x)
      body.scale.x = flipX ? -absScaleX : absScaleX

      // Apply death tint (grey) as overlay effect
      if (state === 4) {
        body.tint = 0x888888
      } else if (state === 5) {
        // Brief white flash on hit
        body.tint = 0xFFFFFF
      } else {
        body.tint = 0xFFFFFF
      }

    } else {
      // --- Fallback: tint-based animation for Graphics rectangles ---
      const tint = STATE_TINTS[state]
      body.tint = tint != null ? tint : 0xFFFFFF

      const duration = STATE_DURATION_TINT[state]
      if (duration !== undefined) {
        AnimState.timer[eid] += dt
        if (AnimState.timer[eid] >= duration) {
          AnimState.current[eid] = 0
          AnimState.timer[eid] = 0
        }
      }
    }
  }

  return world
}
