/**
 * TilemapRenderer — procedural tilemap generator.
 *
 * Generates a playable platformer level with:
 *   - Ground floor spanning full width
 *   - 6 floating one-way platforms at varying heights
 *   - Player spawn and 10 monster spawn points
 *
 * Collision grid values: 0=empty, 1=solid, 2=one-way-platform
 *
 * Map dimensions: 80×23 tiles at 32px = 2560×736 pixels
 */
import { Sprite, Texture, Container } from 'pixi.js'
import { PIXEL } from '@data/constants'

const MAP_COLS = 80
const MAP_ROWS = 23
const TILE_PX = PIXEL.TILE_SIZE * PIXEL.TILE_SCALE // 32px

/**
 * @param {import('pixi.js').Container} worldContainer
 * @returns {{ container: Container, grid: Uint8Array[], spawnPoints: object, width: number, height: number, tileSize: number, cols: number, rows: number }}
 */
export function createTilemap(worldContainer) {
  const tilemapContainer = new Container()
  worldContainer.addChild(tilemapContainer)

  // Build collision grid
  const grid = Array.from({ length: MAP_ROWS }, () => new Uint8Array(MAP_COLS))

  // Ground floor (bottom row)
  for (let x = 0; x < MAP_COLS; x++) grid[MAP_ROWS - 1][x] = 1

  // One-way platforms (type 2)
  const platforms = [
    { row: 17, x0: 5,  x1: 15 },
    { row: 13, x0: 20, x1: 35 },
    { row: 9,  x0: 10, x1: 25 },
    { row: 17, x0: 40, x1: 55 },
    { row: 13, x0: 55, x1: 70 },
    { row: 9,  x0: 45, x1: 60 },
  ]

  for (const p of platforms) {
    for (let x = p.x0; x <= p.x1; x++) grid[p.row][x] = 2
  }

  // Render tiles as colored rectangles (placeholder visuals)
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tile = grid[row][col]
      if (tile === 0) continue

      const sprite = new Sprite(Texture.WHITE)
      sprite.width = TILE_PX
      sprite.height = TILE_PX
      sprite.x = col * TILE_PX
      sprite.y = row * TILE_PX
      sprite.tint = tile === 1 ? 0x4a6741 : 0x8b6914
      tilemapContainer.addChild(sprite)
    }
  }

  // Spawn points
  const spawnPoints = {
    player: { x: 3 * TILE_PX, y: (MAP_ROWS - 2) * TILE_PX },
    monsters: [
      // Ground level
      { x: 15 * TILE_PX, y: (MAP_ROWS - 2) * TILE_PX },
      { x: 25 * TILE_PX, y: (MAP_ROWS - 2) * TILE_PX },
      { x: 35 * TILE_PX, y: (MAP_ROWS - 2) * TILE_PX },
      { x: 50 * TILE_PX, y: (MAP_ROWS - 2) * TILE_PX },
      { x: 65 * TILE_PX, y: (MAP_ROWS - 2) * TILE_PX },
      // Platform spawns (one row above platform surface)
      { x: 10 * TILE_PX, y: 16 * TILE_PX },
      { x: 28 * TILE_PX, y: 12 * TILE_PX },
      { x: 48 * TILE_PX, y: 16 * TILE_PX },
      { x: 62 * TILE_PX, y: 12 * TILE_PX },
      { x: 18 * TILE_PX, y: 8 * TILE_PX },
    ],
  }

  return {
    container: tilemapContainer,
    grid,
    spawnPoints,
    width: MAP_COLS * TILE_PX,
    height: MAP_ROWS * TILE_PX,
    tileSize: TILE_PX,
    cols: MAP_COLS,
    rows: MAP_ROWS,
  }
}
