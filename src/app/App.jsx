import { Suspense, lazy, useEffect, useState } from "react"
import { useGameStore } from "../game/state/gameStore"
import { CharacterCreationPanel } from "./CharacterCreationPanel"

const LazyGameCanvas = lazy(() =>
  import("./GameCanvas").then((module) => ({ default: module.GameCanvas }))
)

const LazyHudPanel = lazy(() =>
  import("./HudPanel").then((module) => ({ default: module.HudPanel }))
)

export function App() {
  const profile = useGameStore((s) => s.profile)
  const [isReady, setIsReady] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem("heroforge.theme") || "dark")

  useEffect(() => {
    const store = useGameStore.getState()
    store.load()
    setIsReady(true)

    const saveTimer = setInterval(() => {
      useGameStore.getState().save()
    }, 5000)

    return () => {
      clearInterval(saveTimer)
      useGameStore.getState().save()
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : theme
    root.dataset.theme = resolvedTheme
    localStorage.setItem("heroforge.theme", theme)
  }, [theme])

  return (
    <main className="app-shell">
      {!isReady ? null : profile.classLocked ? (
        <section className="play-layout">
          <Suspense fallback={<section className="loading-shell">전장을 불러오는 중입니다...</section>}>
            <LazyGameCanvas />
          </Suspense>
          <Suspense fallback={<section className="loading-shell">HUD를 준비하는 중입니다...</section>}>
            <LazyHudPanel theme={theme} onChangeTheme={setTheme} />
          </Suspense>
        </section>
      ) : (
        <CharacterCreationPanel />
      )}
    </main>
  )
}
