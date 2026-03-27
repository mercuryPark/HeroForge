/**
 * SpriteFactory — creates and manages PixiJS sprites for ECS entities.
 * Uses real sprite atlas textures with colored rectangle fallback.
 */
import { Graphics, Container, Sprite, Texture } from 'pixi.js'
import { PIXEL } from '@data/constants'
import { getAtlasTexture, getFramesByPrefix } from '@render/AtlasLoader'

// Map of eid → { container, body, hpBar, size, lastHpRatio, frames }
const spriteMap = new Map()

const FALLBACK_COLORS = {
  player:  0x4488ff,
  monster: 0xff4444,
  boss:    0xff8800,
}

/**
 * Build a texture array from atlas frames by prefix, returning Texture objects.
 * Returns empty array if none found.
 * @param {string} category
 * @param {string} prefix
 * @returns {Texture[]}
 */
function buildFrames(category, prefix) {
  const names = getFramesByPrefix(category, prefix)
  return names.map(n => getAtlasTexture(category, n)).filter(Boolean)
}

/**
 * Build a frames map for the player.
 * @returns {object}
 */
function buildPlayerFrames() {
  return {
    idle:   buildFrames('heroes', 'church-player-idle'),
    run:    buildFrames('heroes', 'church-player-walk'),
    jump:   buildFrames('heroes', 'church-player-jump'),
    attack: buildFrames('heroes', 'church-player-punch'),
    death:  buildFrames('monsters', 'cemetery-enemy-enemy-death'),
    hit:    buildFrames('heroes', 'church-player-hurt'),
  }
}

/**
 * Build a frames map for a monster by type ID.
 * @param {number} typeId - 0-4
 * @returns {object}
 */
function buildMonsterFrames(typeId) {
  const PREFIXES = [
    'cemetery-enemy-ghost-',           // 0 Slime
    'cemetery-enemy-hell-gato-',        // 1 Mushroom
    'cemetery-enemy-skeleton-',         // 2 Goblin
    'church-burning-ghoul-burning-ghoul-', // 3 Bat
    'church-wizard-wizard-idle-',       // 4 Skeleton
  ]
  const prefix = PREFIXES[typeId] ?? PREFIXES[0]
  const walkFrames = buildFrames('monsters', prefix)
  return {
    idle:   walkFrames,
    run:    walkFrames,
    jump:   walkFrames,
    attack: walkFrames,
    death:  buildFrames('monsters', 'cemetery-enemy-enemy-death'),
    hit:    walkFrames,
  }
}

/**
 * Create a Graphics rectangle fallback body.
 * @param {number} size
 * @param {number} color
 * @returns {Graphics}
 */
function createFallbackBody(size, color) {
  const body = new Graphics()
  body.rect(-size / 2, -size, size, size)
  body.fill(color)
  body.stroke({ width: 3, color: 0xffffff, alpha: 1.0 })
  return body
}

/**
 * Create a sprite for an entity. Attempts to use atlas textures; falls back to
 * colored rectangles if atlases are unavailable.
 *
 * @param {import('pixi.js').Container} worldContainer
 * @param {number} eid - Entity ID
 * @param {'player'|'monster'|'boss'} type
 * @param {number} [monsterTypeId=0] - 0-4, used when type === 'monster'
 * @returns {import('pixi.js').Container}
 */
export function createSprite(worldContainer, eid, type = 'monster', monsterTypeId = 0) {
  const size = type === 'boss' ? PIXEL.BOSS_SIZE : PIXEL.CHAR_SIZE

  const container = new Container()

  // --- Build frames map ---
  let frames = null
  if (type === 'player') {
    frames = buildPlayerFrames()
  } else {
    frames = buildMonsterFrames(monsterTypeId)
  }

  // --- Create body (Sprite or fallback Graphics) ---
  let body
  const idleFrames = frames.idle
  if (idleFrames && idleFrames.length > 0) {
    body = new Sprite(idleFrames[0])
    body.anchor.set(0.5, 1)

    // Scale so the sprite's height fits a visually appropriate size.
    // Use 3x CHAR_SIZE for display (96px for regular, 192px for boss).
    const displaySize = size * 3
    const naturalHeight = body.texture.height
    if (naturalHeight > 0) {
      const scale = displaySize / naturalHeight
      body.scale.set(scale)
    }
  } else {
    // Fallback: colored rectangle
    body = createFallbackBody(size, FALLBACK_COLORS[type] ?? 0xff4444)
    frames = null  // signal no real animation available
  }

  container.addChild(body)

  // HP bar: position above the actual sprite display height
  const hpBarWidth = size
  const hpBarY = frames ? -(size * 3) - 8 : -size - 8

  // HP bar background
  const hpBg = new Graphics()
  hpBg.rect(-hpBarWidth / 2, hpBarY, hpBarWidth, 4)
  hpBg.fill(0x333333)
  container.addChild(hpBg)

  // HP bar fill
  const hpBar = new Graphics()
  hpBar.rect(-hpBarWidth / 2, hpBarY, hpBarWidth, 4)
  hpBar.fill(0x44ff44)
  hpBar.label = 'hpBar'
  container.addChild(hpBar)

  worldContainer.addChild(container)
  spriteMap.set(eid, { container, body, hpBar, hpBarY, size, lastHpRatio: 1, frames })

  return container
}

/**
 * @param {number} eid
 * @returns {{ container, body, hpBar, size, lastHpRatio, frames } | undefined}
 */
export function getSprite(eid) {
  return spriteMap.get(eid)
}

/**
 * Destroy and remove a sprite entry.
 * @param {number} eid
 */
export function removeSprite(eid) {
  const entry = spriteMap.get(eid)
  if (entry) {
    entry.container.destroy({ children: true })
    spriteMap.delete(eid)
  }
}

/**
 * Redraw HP bar to reflect current ratio.
 * @param {number} eid
 * @param {number} hpRatio  0–1
 */
export function updateHpBar(eid, hpRatio) {
  const entry = spriteMap.get(eid)
  if (!entry) return
  const clamped = Math.max(0, Math.min(1, hpRatio))
  const quantized = Math.round(clamped * 100) / 100
  if (quantized === entry.lastHpRatio) return
  entry.lastHpRatio = quantized
  const { hpBar, hpBarY, size } = entry
  hpBar.clear()
  hpBar.rect(-size / 2, hpBarY, size * clamped, 4)
  hpBar.fill(clamped > 0.5 ? 0x44ff44 : clamped > 0.25 ? 0xffaa00 : 0xff4444)
}

/** Destroy all sprites — call on scene teardown. */
export function clearAllSprites() {
  for (const [, entry] of spriteMap) {
    entry.container.destroy({ children: true })
  }
  spriteMap.clear()
}
