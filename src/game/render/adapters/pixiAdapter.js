import { Application, Graphics } from "pixi.js"

export async function createPixiPreview(container) {
  const app = new Application()
  await app.init({ width: 220, height: 120, background: "#0b1220", antialias: true })
  container.appendChild(app.canvas)

  const orb = new Graphics().circle(0, 0, 24).fill(0x38bdf8)
  orb.position.set(110, 60)
  app.stage.addChild(orb)

  app.ticker.add((ticker) => {
    orb.rotation += 0.02 * ticker.deltaTime
    orb.scale.x = 1 + Math.sin(app.ticker.lastTime * 0.004) * 0.07
    orb.scale.y = 1 + Math.cos(app.ticker.lastTime * 0.004) * 0.07
  })

  return () => {
    app.destroy(true)
  }
}
