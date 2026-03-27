/**
 * Physics components — gravity, ground state, colliders.
 * Tag components are empty objects `{}`.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Per-entity gravity multiplier (px/s^2). Default should be set to 980. */
export const Gravity = { value: new Float32Array(MAX) }

/** Tag: entity is standing on solid ground */
export const Grounded = {}

/** Tag: entity is on a ladder */
export const OnLadder = {}

/** Tag + data: entity is on a one-way platform */
export const OnPlatform = { platformY: new Float32Array(MAX) }

/** Axis-aligned bounding box collider (relative to Position) */
export const Collider = {
  width: new Float32Array(MAX),
  height: new Float32Array(MAX),
  offsetX: new Float32Array(MAX),
  offsetY: new Float32Array(MAX),
}
