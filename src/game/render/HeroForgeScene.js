import Phaser from "phaser"
import { useGameStore } from "../state/gameStore"

export class HeroForgeScene extends Phaser.Scene {
  constructor() {
    super("HeroForgeScene")
    this.unsubscribe = null
  }

  create() {
    this.cameras.main.setBackgroundColor("#101827")
    this.heroText = this.add.text(18, 20, "", { fontFamily: "monospace", fontSize: "16px", color: "#dbeafe" })
    this.enemyText = this.add.text(18, 80, "", { fontFamily: "monospace", fontSize: "16px", color: "#fca5a5" })

    const refresh = (state) => {
      this.heroText.setText(`Hero HP ${Math.floor(state.hero.hp)} / ${Math.floor(state.hero.maxHp)} | ATK ${state.hero.atk}`)
      this.enemyText.setText(`Enemy HP ${Math.floor(state.enemy.hp)} / ${Math.floor(state.enemy.maxHp)} | Stage ${state.stage}`)
    }

    refresh(useGameStore.getState())
    this.unsubscribe = useGameStore.subscribe(refresh)
  }

  shutdown() {
    if (this.unsubscribe) this.unsubscribe()
  }
}
