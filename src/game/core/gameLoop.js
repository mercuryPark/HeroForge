const STEP_MS = 200

export function createGameLoop(onStep) {
  let frame = null
  let last = performance.now()
  let acc = 0

  function tick(now) {
    acc += now - last
    last = now

    while (acc >= STEP_MS) {
      onStep(STEP_MS / 1000)
      acc -= STEP_MS
    }

    frame = requestAnimationFrame(tick)
  }

  return {
    start() {
      if (frame != null) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    },
    stop() {
      if (frame == null) return
      cancelAnimationFrame(frame)
      frame = null
    },
  }
}
