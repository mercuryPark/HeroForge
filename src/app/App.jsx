import { useEffect } from "react"
import { useGameStore } from "../game/state/gameStore"
import { GameCanvas } from "./GameCanvas"
import { HudPanel } from "./HudPanel"

export function App() {
  useEffect(() => {
    const store = useGameStore.getState()
    store.load()

    const saveTimer = setInterval(() => {
      useGameStore.getState().save()
    }, 5000)

    return () => {
      clearInterval(saveTimer)
      useGameStore.getState().save()
    }
  }, [])

  return (
    <main className="app">
      <GameCanvas />
      <HudPanel />
    </main>
  )
}
