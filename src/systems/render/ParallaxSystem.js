/**
 * ParallaxSystem — multi-layer parallax scrolling backgrounds.
 *
 * Creates 3 colored placeholder layers that scroll at different speeds
 * relative to the camera (worldContainer) position.
 */
import { Sprite, Texture } from 'pixi.js'

/**
 * Factory: creates parallax layers and returns the system function.
 *
 * @param {import('pixi.js').Container} bgContainer — background layer container
 * @param {number} screenWidth  — viewport width (1280)
 * @param {number} screenHeight — viewport height (720)
 * @returns {(world: object) => object} system function
 */
export function createParallaxSystem(bgContainer, screenWidth, screenHeight) {
  const layerDefs = [
    { speed: 0.1, color: 0x0a0a2a, y: 0, height: screenHeight },
    { speed: 0.3, color: 0x1a1a3e, y: screenHeight * 0.3, height: screenHeight * 0.7 },
    { speed: 0.6, color: 0x2a3a2e, y: screenHeight * 0.5, height: screenHeight * 0.5 },
  ]

  const layerSprites = layerDefs.map((layer) => {
    const sprite = new Sprite(Texture.WHITE)
    sprite.width = screenWidth + 200 // extra width for parallax movement
    sprite.height = layer.height
    sprite.y = layer.y
    sprite.tint = layer.color
    sprite.alpha = 0.7
    bgContainer.addChild(sprite)
    return { sprite, speed: layer.speed }
  })

  return function ParallaxSystem(world) {
    // Read camera offset from world containers (set by CameraSystem)
    const camX = world.containers?.world?.x ?? 0

    for (let i = 0; i < layerSprites.length; i++) {
      const { sprite, speed } = layerSprites[i]
      sprite.x = camX * speed
    }

    return world
  }
}
