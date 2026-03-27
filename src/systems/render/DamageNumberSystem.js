/**
 * DamageNumberSystem — floating damage numbers that pop up and fade out.
 *
 * Uses ObjectPool for zero GC allocation in the hot path.
 * Colors: white = normal, yellow = critical, grey = miss
 * Animation: float up + fade out; crits get a scale pop effect.
 *
 * Numbers live in WORLD SPACE (inside worldContainer) so they move with the camera.
 */
import { Text, TextStyle } from 'pixi.js'
import { ObjectPool } from '@core/ObjectPool'

/** Shared text styles (created once, reused) */
const normalStyle = new TextStyle({
  fontFamily: '"Press Start 2P", monospace',
  fontSize: 12,
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 3 },
  align: 'center',
})

// Crit and miss styles are applied dynamically by mutating the cloned normalStyle

/**
 * Factory: creates a DamageNumberSystem bound to a world container and event bus.
 * @param {import('pixi.js').Container} worldContainer — world-space container (moves with camera)
 * @param {import('@core/EventBus').EventBus} eventBus
 * @returns {function} ECS system function
 */
export function createDamageNumberSystem(worldContainer, eventBus) {
  const activeNumbers = []

  const pool = new ObjectPool(() => {
    const text = new Text({ text: '0', style: normalStyle.clone() })
    text.anchor.set(0.5)
    text.visible = false
    worldContainer.addChild(text)
    return text
  }, 30)

  /**
   * Spawn a floating number at the given world position.
   */
  function spawn(x, y, amount, isCrit) {
    const text = pool.acquire()

    text.text = isCrit ? `${amount}!` : `${amount}`
    text.style.fill = isCrit ? 0xffff00 : 0xffffff
    text.style.fontSize = isCrit ? 14 : 12
    text.x = x + (Math.random() - 0.5) * 20
    text.y = y - 40
    text.scale.set(isCrit ? 1.5 : 1.0)
    text.alpha = 1
    text.visible = true

    activeNumbers.push({
      text,
      lifetime: 0,
      maxLife: isCrit ? 1.2 : 0.8,
      isCrit,
    })
  }

  /**
   * Spawn a "MISS" label.
   */
  function spawnMiss(x, y) {
    const text = pool.acquire()

    text.text = 'MISS'
    text.style.fill = 0x999999
    text.style.fontSize = 10
    text.x = x + (Math.random() - 0.5) * 16
    text.y = y - 32
    text.scale.set(1)
    text.alpha = 1
    text.visible = true

    activeNumbers.push({
      text,
      lifetime: 0,
      maxLife: 0.6,
      isCrit: false,
    })
  }

  // Listen for combat events
  eventBus.on('combat:damage', (e) => {
    spawn(e.x, e.y, e.amount, e.isCrit)
  })

  eventBus.on('combat:miss', (e) => {
    if (e.x != null && e.y != null) {
      spawnMiss(e.x, e.y)
    }
  })

  /**
   * Per-frame update: animate active numbers then recycle expired ones.
   * @param {object} world
   * @returns {object} world
   */
  return function DamageNumberSystem(world) {
    const dt = world.time.renderDelta || 1 / 60

    for (let i = activeNumbers.length - 1; i >= 0; i--) {
      const entry = activeNumbers[i]
      entry.lifetime += dt

      const t = entry.lifetime / entry.maxLife

      // Float upward
      entry.text.y -= 60 * dt

      // Fade out (quadratic ease)
      entry.text.alpha = 1 - t * t

      // Crit scale pop: 1.5 -> 1.0 over first 30% of lifetime
      if (entry.isCrit && t < 0.3) {
        const pop = 1.5 - (t / 0.3) * 0.5
        entry.text.scale.set(pop)
      }

      // Recycle when expired
      if (entry.lifetime >= entry.maxLife) {
        entry.text.visible = false
        pool.release(entry.text)
        activeNumbers.splice(i, 1)
      }
    }

    return world
  }
}
