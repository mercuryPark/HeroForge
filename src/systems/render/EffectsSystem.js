/**
 * EffectsSystem — visual combat and event effects using PixiJS Graphics.
 *
 * Implements 4 effect types:
 *   - Hit Flash:      white ring burst on combat:damage        (0.15s)
 *   - Death Burst:    red ring + scatter particles on death    (0.4s)
 *   - Level-Up Burst: golden rising aura on player:levelup     (1.0s)
 *   - Spawn Pop:      green scale bounce on entity:spawn       (0.3s)
 *
 * Uses ObjectPool for zero GC on the hot path.
 * All effects live in WORLD SPACE (worldContainer), moving with the camera.
 */
import { Graphics, Container } from 'pixi.js'
import { ObjectPool } from '@core/ObjectPool'

// Death burst particle count
const DEATH_PARTICLE_COUNT = 4
const DEATH_SCATTER_SPEED = 80 // px/s

/**
 * Factory: creates an EffectsSystem bound to a world container and event bus.
 * @param {import('pixi.js').Container} worldContainer
 * @param {import('@core/EventBus').EventBus} eventBus
 * @returns {function} ECS system function
 */
export function createEffectsSystem(worldContainer, eventBus) {
  const activeEffects = []

  // ─── Hit Flash Pool ────────────────────────────────────────────────────────
  const hitFlashPool = new ObjectPool(() => {
    const gfx = new Graphics()
    gfx.circle(0, 0, 16)
    gfx.stroke({ color: 0xffffff, width: 2, alpha: 1 })
    gfx.visible = false
    worldContainer.addChild(gfx)
    return gfx
  }, 20)

  // ─── Death Burst Pool ──────────────────────────────────────────────────────
  // Each death burst is a Container holding 1 ring + DEATH_PARTICLE_COUNT squares
  const deathBurstPool = new ObjectPool(() => {
    const container = new Container()

    // Ring
    const ring = new Graphics()
    ring.circle(0, 0, 12)
    ring.stroke({ color: 0xff2222, width: 2, alpha: 1 })
    container.addChild(ring)

    // Scatter particles
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      const p = new Graphics()
      p.rect(-2, -2, 4, 4)
      p.fill({ color: 0xff2222, alpha: 1 })
      container.addChild(p)
    }

    container.visible = false
    worldContainer.addChild(container)
    return container
  }, 10)

  // ─── Level-Up Burst Pool ───────────────────────────────────────────────────
  const levelUpPool = new ObjectPool(() => {
    const gfx = new Graphics()
    gfx.rect(-12, -40, 24, 40)
    gfx.fill({ color: 0xffd700, alpha: 0.7 })
    gfx.visible = false
    worldContainer.addChild(gfx)
    return gfx
  }, 5)

  // ─── Revive Burst Pool ────────────────────────────────────────────────────
  const reviveBurstPool = new ObjectPool(() => {
    const gfx = new Graphics()
    gfx.circle(0, 0, 20)
    gfx.fill({ color: 0x44ccff, alpha: 0.8 })
    gfx.visible = false
    worldContainer.addChild(gfx)
    return gfx
  }, 3)

  // ─── Spawn Pop Pool ────────────────────────────────────────────────────────
  const spawnPopPool = new ObjectPool(() => {
    const gfx = new Graphics()
    gfx.circle(0, 0, 14)
    gfx.fill({ color: 0x44ff44, alpha: 0.6 })
    gfx.visible = false
    worldContainer.addChild(gfx)
    return gfx
  }, 20)

  // ─── Spawn Helpers ─────────────────────────────────────────────────────────

  function spawnHitFlash(x, y) {
    const gfx = hitFlashPool.acquire()
    gfx.x = x
    gfx.y = y
    gfx.scale.set(0.5)
    gfx.alpha = 1
    gfx.visible = true
    activeEffects.push({
      type: 'hitFlash',
      gfx,
      pool: hitFlashPool,
      lifetime: 0,
      maxLife: 0.15,
    })
  }

  function spawnDeathBurst(x, y) {
    const container = deathBurstPool.acquire()
    container.x = x
    container.y = y
    container.scale.set(1)
    container.alpha = 1
    container.visible = true

    // Reset ring (child 0)
    container.children[0].scale.set(1)
    container.children[0].alpha = 1

    // Scatter angles for each particle (evenly spaced)
    const velocities = []
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      const angle = (i / DEATH_PARTICLE_COUNT) * Math.PI * 2
      const child = container.children[i + 1]
      child.x = 0
      child.y = 0
      child.alpha = 1
      child.visible = true
      velocities.push({
        vx: Math.cos(angle) * DEATH_SCATTER_SPEED,
        vy: Math.sin(angle) * DEATH_SCATTER_SPEED,
      })
    }

    activeEffects.push({
      type: 'deathBurst',
      gfx: container,
      pool: deathBurstPool,
      lifetime: 0,
      maxLife: 0.4,
      velocities,
    })
  }

  function spawnLevelUp(x, y) {
    const gfx = levelUpPool.acquire()
    gfx.x = x
    gfx.y = y
    gfx.scale.set(1)
    gfx.alpha = 1
    gfx.visible = true
    activeEffects.push({
      type: 'levelUp',
      gfx,
      pool: levelUpPool,
      lifetime: 0,
      maxLife: 1.0,
      baseY: y,
    })
  }

  function spawnReviveBurst(x, y) {
    const gfx = reviveBurstPool.acquire()
    gfx.x = x
    gfx.y = y
    gfx.scale.set(0.5)
    gfx.alpha = 1
    gfx.visible = true
    activeEffects.push({
      type: 'reviveBurst',
      gfx,
      pool: reviveBurstPool,
      lifetime: 0,
      maxLife: 0.6,
    })
  }

  function spawnSpawnPop(x, y) {
    const gfx = spawnPopPool.acquire()
    gfx.x = x
    gfx.y = y
    gfx.scale.set(0)
    gfx.alpha = 1
    gfx.visible = true
    activeEffects.push({
      type: 'spawnPop',
      gfx,
      pool: spawnPopPool,
      lifetime: 0,
      maxLife: 0.3,
    })
  }

  // ─── Event Listeners ───────────────────────────────────────────────────────

  eventBus.on('combat:damage', (e) => {
    if (e.x != null && e.y != null) {
      spawnHitFlash(e.x, e.y)
    }
  })

  eventBus.on('combat:death', (e) => {
    if (e.x != null && e.y != null) {
      spawnDeathBurst(e.x, e.y)
    }
  })

  eventBus.on('player:levelup', (e) => {
    if (e.x != null && e.y != null) {
      spawnLevelUp(e.x, e.y)
    }
  })

  eventBus.on('combat:playerRevive', (e) => {
    if (e.x != null && e.y != null) {
      spawnReviveBurst(e.x, e.y)
    }
  })

  eventBus.on('entity:spawn', (e) => {
    if (e.x != null && e.y != null) {
      spawnSpawnPop(e.x, e.y)
    }
  })

  // ─── Per-Frame Update ──────────────────────────────────────────────────────

  return function EffectsSystem(world) {
    const dt = world.time.renderDelta || 1 / 60

    for (let i = activeEffects.length - 1; i >= 0; i--) {
      const entry = activeEffects[i]
      entry.lifetime += dt
      const t = entry.lifetime / entry.maxLife

      if (entry.type === 'hitFlash') {
        // Scale up 0.5 → 1.2, fade out
        entry.gfx.scale.set(0.5 + t * 0.7)
        entry.gfx.alpha = 1 - t

      } else if (entry.type === 'deathBurst') {
        // Ring expands and fades
        const ring = entry.gfx.children[0]
        ring.scale.set(1 + t * 2.5)
        ring.alpha = 1 - t

        // Particles scatter outward and fade
        for (let j = 0; j < DEATH_PARTICLE_COUNT; j++) {
          const child = entry.gfx.children[j + 1]
          const vel = entry.velocities[j]
          child.x += vel.vx * dt
          child.y += vel.vy * dt
          child.alpha = 1 - t
        }

      } else if (entry.type === 'levelUp') {
        // Column rises upward, expands horizontally, fades toward end
        const riseY = t * 30 // rise 30px over lifetime
        entry.gfx.y = entry.baseY - riseY
        entry.gfx.scale.x = 1 + t * 0.8   // expand width
        entry.gfx.scale.y = 1 + t * 0.4   // expand height slightly
        // Fade starts at 50% of lifetime for dramatic hold
        entry.gfx.alpha = t < 0.5 ? 1 : 1 - ((t - 0.5) / 0.5)

      } else if (entry.type === 'reviveBurst') {
        // Expanding cyan ring, fades out
        entry.gfx.scale.set(0.5 + t * 2.5)
        entry.gfx.alpha = 1 - t * t

      } else if (entry.type === 'spawnPop') {
        // Scale bounce: 0 → 1.2 → 1.0
        let scale
        if (t < 0.6) {
          // Grow phase: 0 → 1.2
          scale = (t / 0.6) * 1.2
        } else {
          // Settle phase: 1.2 → 1.0
          scale = 1.2 - ((t - 0.6) / 0.4) * 0.2
        }
        entry.gfx.scale.set(scale)
        // Fade out last 30%
        entry.gfx.alpha = t < 0.7 ? 1 : 1 - ((t - 0.7) / 0.3)
      }

      // Recycle when expired
      if (entry.lifetime >= entry.maxLife) {
        entry.gfx.visible = false
        entry.pool.release(entry.gfx)
        activeEffects.splice(i, 1)
      }
    }

    return world
  }
}
