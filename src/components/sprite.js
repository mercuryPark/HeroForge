/**
 * Sprite / rendering components — PixiJS display object reference, animation.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Reference to PixiJS display object (stored by numeric ID) */
export const SpriteRef = {
  pixiId: new Uint32Array(MAX),
}

/**
 * Animation state machine.
 *   current: 0=idle, 1=run, 2=jump, 3=attack, 4=death, 5=hit
 *   loop:    0=no, 1=yes
 *   flipX:   0=right-facing, 1=left-facing
 */
export const AnimState = {
  current: new Uint8Array(MAX),
  frame: new Uint16Array(MAX),
  timer: new Float32Array(MAX),
  speed: new Float32Array(MAX),
  loop: new Uint8Array(MAX),
  flipX: new Uint8Array(MAX),
}
