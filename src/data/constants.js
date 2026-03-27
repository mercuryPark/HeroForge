/** Grade color palette — shared across all UI */
export const GRADE_COLORS = {
  NORMAL:    '#AAAAAA',
  RARE:      '#5B9BD5',
  EPIC:      '#9B59B6',
  UNIQUE:    '#F39C12',
  LEGENDARY: '#27AE60',
  MYTHIC:    '#E74C3C',
}

/** Pixel dimension standards */
export const PIXEL = {
  CHAR_SIZE:  32,   // Character/monster base: 32x32
  TILE_SIZE:  16,   // Tile base: 16x16 (rendered at 2x = 32px)
  TILE_SCALE: 2,    // Tile render scale
  BOSS_SIZE:  64,   // Boss base: 64x64
  ICON_SIZE:  16,   // UI icon: 16x16
}

/** Game loop constants */
export const TICK_RATE = 20           // Logic ticks per second
export const TICK_MS = 1000 / TICK_RATE  // 50ms per tick
export const MAX_CATCHUP = 5         // Max catch-up ticks

/** Physics constants */
export const GRAVITY = 980           // px/s²
export const TERMINAL_VELOCITY = 600 // px/s

/** Spatial hash */
export const SPATIAL_CELL_SIZE = 64  // px

/** ECS */
export const MAX_ENTITIES = 10000

/** Save */
export const AUTOSAVE_INTERVAL = 30000  // 30 seconds
export const SAVE_VERSION = 1
