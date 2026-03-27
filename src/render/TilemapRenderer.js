/**
 * TilemapRenderer — loads and renders a Tiled JSON tilemap.
 *
 * Data source: assets/tilemaps/chapter1.json (Tiled 1.10 format)
 *
 * Collision grid values: 0=empty, 1=solid, 2=one-way-platform
 *
 * Tile layer semantics (from Tiled layer names):
 *   "ground"    → tile ID 1 → grid value 1 (solid)
 *   "platforms" → tile ID 2 → grid value 2 (one-way)
 *
 * Map dimensions: 80×23 tiles at 32px = 2560×736 pixels
 */
import { Sprite, Texture, Container } from 'pixi.js'
import { PIXEL } from '@data/constants'
import mapData from '../../assets/tilemaps/chapter1.json'

const TILE_PX = PIXEL.TILE_SIZE * PIXEL.TILE_SCALE // 32px

/** Tiled tile ID → collision grid value */
const TILE_ID_TO_GRID = {
  1: 1, // solid ground
  2: 2, // one-way platform
}

/** Collision grid value → tint color (placeholder visuals) */
const GRID_TINT = {
  1: 0x4a6741, // ground: dark green
  2: 0x8b6914, // platform: brown
}

/**
 * Build a 2D collision grid from Tiled tile layers.
 * @param {object[]} layers - Tiled layer objects
 * @param {number} cols
 * @param {number} rows
 * @returns {Uint8Array[]}
 */
function buildGrid(layers, cols, rows) {
  const grid = Array.from({ length: rows }, () => new Uint8Array(cols))

  for (const layer of layers) {
    if (layer.type !== 'tilelayer') continue
    const { data } = layer
    for (let i = 0; i < data.length; i++) {
      const tileId = data[i]
      if (tileId === 0) continue
      const gridVal = TILE_ID_TO_GRID[tileId]
      if (gridVal === undefined) continue
      const row = Math.floor(i / cols)
      const col = i % cols
      // Higher grid values take priority (solid > oneway)
      if (gridVal > grid[row][col]) {
        grid[row][col] = gridVal
      }
    }
  }

  return grid
}

/**
 * Extract spawn points from the Tiled objects layer.
 * @param {object[]} layers
 * @returns {{ player: {x:number, y:number}, monsters: {x:number, y:number}[] }}
 */
function extractSpawnPoints(layers) {
  const objectLayer = layers.find(l => l.type === 'objectgroup' && l.name === 'objects')

  if (!objectLayer) {
    // Fallback: derive from grid dimensions (should never happen with well-formed JSON)
    const rows = mapData.height
    const cols = mapData.width
    return {
      player: { x: 3 * TILE_PX, y: (rows - 2) * TILE_PX },
      monsters: [],
    }
  }

  let player = null
  const monsters = []

  for (const obj of objectLayer.objects) {
    const objType = obj.type || obj.class || ''
    if (objType === 'player_spawn') {
      player = { x: obj.x, y: obj.y }
    } else if (objType === 'monster_spawn') {
      monsters.push({ x: obj.x, y: obj.y })
    }
  }

  // Fallback player spawn if not defined in objects layer
  if (!player) {
    player = { x: 3 * TILE_PX, y: (mapData.height - 2) * TILE_PX }
  }

  return { player, monsters }
}

/**
 * Render all non-empty tiles as colored rectangles.
 * Renders ground layer first, then platforms on top.
 * @param {Container} tilemapContainer
 * @param {object[]} layers
 * @param {number} cols
 * @param {number} rows
 */
function renderTiles(tilemapContainer, layers, cols, rows) {
  for (const layer of layers) {
    if (layer.type !== 'tilelayer') continue
    const { data } = layer
    for (let i = 0; i < data.length; i++) {
      const tileId = data[i]
      if (tileId === 0) continue
      const gridVal = TILE_ID_TO_GRID[tileId]
      if (gridVal === undefined) continue

      const row = Math.floor(i / cols)
      const col = i % cols

      const sprite = new Sprite(Texture.WHITE)
      sprite.width = TILE_PX
      sprite.height = TILE_PX
      sprite.x = col * TILE_PX
      sprite.y = row * TILE_PX
      sprite.tint = GRID_TINT[gridVal] ?? 0x888888
      tilemapContainer.addChild(sprite)
    }
  }
}

/**
 * @param {import('pixi.js').Container} worldContainer
 * @returns {{ container: Container, grid: Uint8Array[], spawnPoints: object, width: number, height: number, tileSize: number, cols: number, rows: number }}
 */
export function createTilemap(worldContainer) {
  const tilemapContainer = new Container()
  worldContainer.addChild(tilemapContainer)

  const cols = mapData.width
  const rows = mapData.height
  const { layers } = mapData

  const grid = buildGrid(layers, cols, rows)
  renderTiles(tilemapContainer, layers, cols, rows)
  const spawnPoints = extractSpawnPoints(layers)

  return {
    container: tilemapContainer,
    grid,
    spawnPoints,
    width: cols * TILE_PX,
    height: rows * TILE_PX,
    tileSize: TILE_PX,
    cols,
    rows,
  }
}
