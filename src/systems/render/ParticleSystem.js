/**
 * ParticleSystem — loot particles with fly-to-counter animation.
 *
 * Gold coins and EXP orbs float up from kill position then fly toward
 * HUD counters. Uses ObjectPool for zero GC on the hot path.
 *
 * All particles live in uiContainer (screen space).
 */
import { Graphics } from 'pixi.js'
import { ObjectPool } from '@core/ObjectPool'

/** HUD target cache (lazily resolved) */
let goldTarget = null
let expTarget = null

function getTargets() {
  if (!goldTarget) {
    const el = document.querySelector('[class*="gold"]')
    if (el) {
      const rect = el.getBoundingClientRect()
      goldTarget = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
  }
  if (!expTarget) {
    const el = document.querySelector('[class*="barFillXp"]')
    if (el) {
      const rect = el.getBoundingClientRect()
      expTarget = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    } else {
      expTarget = { x: 640, y: 55 }
    }
  }
  // fallback defaults
  if (!goldTarget) goldTarget = { x: 1220, y: 18 }
  if (!expTarget) expTarget = { x: 640, y: 55 }
}

/**
 * Factory: creates a ParticleSystem bound to containers and event bus.
 * @param {import('pixi.js').Container} worldContainer — world-space container (moves with camera)
 * @param {import('pixi.js').Container} uiContainer — screen-space container (fixed)
 * @param {import('@core/EventBus').EventBus} eventBus
 * @returns {function} ECS system function
 */
export function createParticleSystem(worldContainer, uiContainer, eventBus) {
  const activeParticles = []

  /** Gold coin pool — filled circle radius 4, color 0xF39C12 */
  const goldPool = new ObjectPool(() => {
    const gfx = new Graphics()
    gfx.circle(0, 0, 4)
    gfx.fill({ color: 0xF39C12 })
    gfx.visible = false
    uiContainer.addChild(gfx)
    return gfx
  }, 30)

  /** EXP orb pool — filled circle radius 3, color 0xFFD700 */
  const expPool = new ObjectPool(() => {
    const gfx = new Graphics()
    gfx.circle(0, 0, 3)
    gfx.fill({ color: 0xFFD700 })
    gfx.visible = false
    uiContainer.addChild(gfx)
    return gfx
  }, 30)

  /**
   * Spawn a single loot particle.
   * @param {ObjectPool} pool
   * {'gold'|'exp'} type
   * @param {number} worldX — world-space X of kill
   * @param {number} worldY — world-space Y of kill
   */
  function spawnParticle(pool, type, worldX, worldY) {
    getTargets()

    const gfx = pool.acquire()

    // Convert world space to screen space
    const screenX = worldX + worldContainer.x + (Math.random() - 0.5) * 24
    const screenY = worldY + worldContainer.y + (Math.random() - 0.5) * 16

    gfx.x = screenX
    gfx.y = screenY
    gfx.scale.set(1)
    gfx.alpha = 1
    gfx.visible = true

    const target = type === 'gold' ? goldTarget : expTarget

    activeParticles.push({
      gfx,
      pool,
      phase: 'float',
      lifetime: 0,
      flyLifetime: 0,
      floatDuration: 0.4 + Math.random() * 0.2,
      flyDuration: 0.8,
      vx: (Math.random() - 0.5) * 40,
      vy: -(50 + Math.random() * 30),
      targetX: target.x,
      targetY: target.y,
      type,
    })
  }

  /** Listen for loot drops */
  eventBus.on('loot:drop', (e) => {
    const { x, y, gold, exp } = e

    if (gold > 0) {
      const count = 2 + (Math.random() < 0.5 ? 1 : 0) // 2 or 3
      for (let i = 0; i < count; i++) {
        spawnParticle(goldPool, 'gold', x, y)
      }
    }

    if (exp > 0) {
      const count = 1 + (Math.random() < 0.5 ? 1 : 0) // 1 or 2
      for (let i = 0; i < count; i++) {
        spawnParticle(expPool, 'exp', x, y)
      }
    }
  })

  /**
   * Per-frame update: animate active particles then recycle expired ones.
   * @param {object} world
   * @returns {object} world
   */
  return function ParticleSystem(world) {
    const dt = world.time.renderDelta || 1 / 60

    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i]

      if (p.phase === 'float') {
        p.lifetime += dt

        // Float upward with slight horizontal drift
        p.gfx.x += p.vx * dt
        p.gfx.y += p.vy * dt

        // Shimmer scale pulse
        p.gfx.scale.set(1.0 + 0.2 * Math.sin(p.lifetime * 10))
        p.gfx.alpha = 1.0

        // Transition to fly phase
        if (p.lifetime >= p.floatDuration) {
          p.phase = 'fly'
          p.flyLifetime = 0
        }
      } else {
        // fly phase
        p.flyLifetime += dt

        // Exponential homing toward HUD target
        p.gfx.x += (p.targetX - p.gfx.x) * 8 * dt
        p.gfx.y += (p.targetY - p.gfx.y) * 8 * dt

        // Scale shrinks 1.0 -> 0.3
        const flyT = Math.min(p.flyLifetime / p.flyDuration, 1)
        p.gfx.scale.set(1.0 - flyT * 0.7)

        // Alpha 1.0 -> 0.5
        p.gfx.alpha = 1.0 - flyT * 0.5

        // Recycle when close enough or timed out
        const dx = p.targetX - p.gfx.x
        const dy = p.targetY - p.gfx.y
        const distSq = dx * dx + dy * dy

        if (distSq < 25 || p.flyLifetime > 0.8) {
          p.gfx.visible = false
          p.pool.release(p.gfx)
          activeParticles.splice(i, 1)
        }
      }
    }

    return world
  }
}
