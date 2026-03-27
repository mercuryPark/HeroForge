// GameLoop — Fixed timestep (20 tick/s) + rAF + alpha interpolation
import { TICK_MS, MAX_CATCHUP } from '@data/constants'

const TICK_S = TICK_MS / 1000 // Fixed delta in seconds (0.05)

export function createGameLoop(world) {
  let rafId = 0
  let running = false
  let paused = false
  let lastTime = 0
  let accumulator = 0

  const logicPipeline = []
  const renderPipeline = []

  let lastRenderTime = 0

  function loop(now) {
    rafId = requestAnimationFrame(loop)

    if (paused) {
      lastTime = now
      lastRenderTime = now
      return
    }

    let frameTime = now - lastTime
    lastTime = now

    // Clamp frame time to avoid spiral of death
    if (frameTime > TICK_MS * MAX_CATCHUP) {
      frameTime = TICK_MS * MAX_CATCHUP
    }

    accumulator += frameTime

    // Fixed-step logic updates
    let ticks = 0
    while (accumulator >= TICK_MS && ticks < MAX_CATCHUP) {
      world.time.delta = TICK_S
      world.time.elapsed += TICK_S
      world.time.tick++

      for (let i = 0, len = logicPipeline.length; i < len; i++) {
        try {
          logicPipeline[i](world)
        } catch (err) {
          console.error(`[GameLoop] Logic system ${i} threw:`, err)
        }
      }

      accumulator -= TICK_MS
      ticks++
    }

    // Interpolation alpha for render systems
    world.time.alpha = accumulator / TICK_MS

    // Track render delta for render systems (in seconds)
    const renderNow = now
    world.time.renderDelta = lastRenderTime > 0
      ? Math.min((renderNow - lastRenderTime) / 1000, 0.1)
      : 1 / 60
    lastRenderTime = renderNow

    // Render at display refresh rate
    for (let i = 0, len = renderPipeline.length; i < len; i++) {
      try {
        renderPipeline[i](world)
      } catch (err) {
        console.error(`[GameLoop] Render system ${i} threw:`, err)
      }
    }
  }

  return {
    addLogicSystem(fn) {
      logicPipeline.push(fn)
    },

    addRenderSystem(fn) {
      renderPipeline.push(fn)
    },

    start() {
      if (running) return
      running = true
      paused = false
      lastTime = performance.now()
      lastRenderTime = 0
      accumulator = 0
      rafId = requestAnimationFrame(loop)
    },

    stop() {
      if (!running) return
      running = false
      paused = false
      cancelAnimationFrame(rafId)
      rafId = 0
    },

    pause() {
      paused = true
    },

    resume() {
      if (!paused) return
      paused = false
      lastTime = performance.now()
      lastRenderTime = 0
      accumulator = 0
    },
  }
}
