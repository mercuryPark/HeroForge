/**
 * PixiApp — layer hierarchy for the PixiJS stage.
 *
 * Three ordered layers:
 *   bgContainer    – parallax backgrounds (static, not affected by camera)
 *   worldContainer – tilemap + entity sprites (moves with camera)
 *   uiContainer    – in-canvas HUD elements (damage numbers, bars, etc.)
 *
 * worldContainer uses isRenderGroup = true for GPU-accelerated batching.
 */
import { Container } from 'pixi.js'

/**
 * @param {import('pixi.js').Application} pixiApp
 * @returns {{ bgContainer: Container, worldContainer: Container, uiContainer: Container }}
 */
export function createWorldContainer(pixiApp) {
  const bgContainer = new Container()
  const worldContainer = new Container()
  const uiContainer = new Container()

  worldContainer.isRenderGroup = true

  pixiApp.stage.addChild(bgContainer)
  pixiApp.stage.addChild(worldContainer)
  pixiApp.stage.addChild(uiContainer)

  return { bgContainer, worldContainer, uiContainer }
}
