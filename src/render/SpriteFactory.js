/**
 * SpriteFactory — creates and manages PixiJS placeholder sprites for ECS entities.
 * Uses colored rectangles until real sprite atlases are available.
 */
import { Graphics, Container, Text } from 'pixi.js'
import { PIXEL } from '@data/constants'

// Map of eid → { container, body, hpBar, size }
const spriteMap = new Map()

const COLORS = {
  player:  0x4488ff,  // blue
  monster: 0xff4444,  // red
  boss:    0xff8800,  // orange
}

/**
 * Create a placeholder sprite (colored rectangle) for an entity.
 * @param {import('pixi.js').Container} worldContainer - Parent container in the scene graph
 * @param {number} eid - Entity ID
 * @param {'player'|'monster'|'boss'} type
 * @returns {import('pixi.js').Container}
 */
export function createSprite(worldContainer, eid, type = 'monster') {
  const size = type === 'boss' ? PIXEL.BOSS_SIZE : PIXEL.CHAR_SIZE

  const container = new Container()

  // Body rectangle
  const body = new Graphics()
  body.rect(-size / 2, -size, size, size)
  body.fill(COLORS[type] ?? 0xff4444)
  body.stroke({ width: 3, color: 0xffffff, alpha: 1.0 })
  container.addChild(body)

  // Entity type label above sprite
  const label = new Text({
    text: type === 'player' ? 'P' : type === 'boss' ? 'B' : 'M',
    style: {
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
    },
  })
  label.anchor.set(0.5, 1)
  label.x = 0
  label.y = -size - 10
  container.addChild(label)

  // HP bar background
  const hpBg = new Graphics()
  hpBg.rect(-size / 2, -size - 8, size, 4)
  hpBg.fill(0x333333)
  container.addChild(hpBg)

  // HP bar fill
  const hpBar = new Graphics()
  hpBar.rect(-size / 2, -size - 8, size, 4)
  hpBar.fill(0x44ff44)
  hpBar.label = 'hpBar'
  container.addChild(hpBar)

  worldContainer.addChild(container)
  spriteMap.set(eid, { container, body, hpBar, size, lastHpRatio: 1 })

  return container
}

/**
 * @param {number} eid
 * @returns {{ container: import('pixi.js').Container, body: import('pixi.js').Graphics, hpBar: import('pixi.js').Graphics, size: number } | undefined}
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
  // Quantize to avoid redundant redraws (1% precision)
  const quantized = Math.round(clamped * 100) / 100
  if (quantized === entry.lastHpRatio) return
  entry.lastHpRatio = quantized
  const { hpBar, size } = entry
  hpBar.clear()
  hpBar.rect(-size / 2, -size - 8, size * clamped, 4)
  hpBar.fill(clamped > 0.5 ? 0x44ff44 : clamped > 0.25 ? 0xffaa00 : 0xff4444)
}

/** Destroy all sprites — call on scene teardown. */
export function clearAllSprites() {
  for (const [, entry] of spriteMap) {
    entry.container.destroy({ children: true })
  }
  spriteMap.clear()
}
