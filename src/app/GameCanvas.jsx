import { useEffect, useRef } from "react"
import Phaser from "phaser"
import { HeroForgeScene } from "../game/render/HeroForgeScene"

export function GameCanvas() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 760,
      height: 240,
      parent: containerRef.current,
      scene: [HeroForgeScene],
      physics: { default: "arcade" },
      render: { antialias: true },
      fps: { target: 60 },
    })

    return () => game.destroy(true)
  }, [])

  return <div id="game-canvas" ref={containerRef} />
}
