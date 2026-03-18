import { useEffect, useRef } from "react"
import Phaser from "phaser"
import VirtualJoystickPlugin from "phaser3-rex-plugins/plugins/virtualjoystick-plugin.js"
import { HeroForgeScene } from "../game/render/HeroForgeScene"

export function GameCanvas() {
  const containerRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined
    const container = containerRef.current

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: container.clientWidth || 1280,
      height: container.clientHeight || 720,
      parent: container,
      scene: [HeroForgeScene],
      physics: { default: "arcade" },
      render: { antialias: false, pixelArt: true, roundPixels: true, powerPreference: "high-performance" },
      fps: { target: 60 },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: container.clientWidth || 1280,
        height: container.clientHeight || 720,
      },
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
    gameRef.current = game

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !gameRef.current) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        gameRef.current.scale.resize(width, height)
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <section className="game-stage-shell">
      <div className="game-stage-header">
        <div>
          <p className="stage-eyebrow">실시간 전투 화면</p>
          <h2>HeroForge 전장</h2>
        </div>
        <p className="stage-copy">16:9 무대 비율을 유지하면서 모바일과 데스크톱에서 모두 안정적으로 보이도록 조정됩니다.</p>
      </div>
      <div id="game-canvas" ref={containerRef} />
    </section>
  )
}
