/**
 * Transform components — position, velocity, scale, rotation.
 * Each property is a separate TypedArray instance to avoid shared-reference bugs.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Current world position (px) */
export const Position = { x: new Float32Array(MAX), y: new Float32Array(MAX) }

/** Previous-frame position for render interpolation */
export const PrevPosition = { x: new Float32Array(MAX), y: new Float32Array(MAX) }

/** Linear velocity (px/s) */
export const Velocity = { x: new Float32Array(MAX), y: new Float32Array(MAX) }

/** Non-uniform scale multiplier */
export const Scale = { x: new Float32Array(MAX), y: new Float32Array(MAX) }

/** Rotation in radians */
export const Rotation = { angle: new Float32Array(MAX) }
