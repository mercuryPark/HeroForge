import { useEffect, useRef } from "react"
import Phaser from "phaser"
import VirtualJoystickPlugin from "phaser3-rex-plugins/plugins/virtualjoystick-plugin.js"
import { HeroForgeScene } from "../game/render/HeroForgeScene"

export function GameCanvas() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: containerRef.current,
      scene: [HeroForgeScene],
      physics: { default: "arcade" },
      render: { antialias: true },
      fps: { target: 60 },
      plugins: {
        global: [
          {
            key: "rexVirtualJoystick",
            plugin: VirtualJoystickPlugin,
            start: true,
          },
        ],
      },
    })

    return () => game.destroy(true)
  }, [])

  return <div id="game-canvas" ref={containerRef} />
}
