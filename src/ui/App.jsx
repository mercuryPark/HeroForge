import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import styles from './App.module.css'
import { HudPanel } from './hud/HudPanel'
import { SettingsPanel, settingsSignals } from './panels/SettingsPanel'
import { LoadingScreen } from './screens/LoadingScreen'
import { TitleScreen } from './screens/TitleScreen'

/** 'loading' | 'title' | 'game' */
const screenSignal = signal('loading')
const loadProgressSignal = signal(0)

export function App({ gameLoop, saveManager }) {
  const loadTimerRef = useRef(null)

  // Simulate loading progress when on loading screen
  useEffect(() => {
    if (screenSignal.value !== 'loading') return

    const start = Date.now()
    const duration = 1200 // ms for fake load

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100))
      loadProgressSignal.value = pct
      if (pct < 100) {
        loadTimerRef.current = requestAnimationFrame(tick)
      }
    }

    loadTimerRef.current = requestAnimationFrame(tick)
    return () => {
      if (loadTimerRef.current) cancelAnimationFrame(loadTimerRef.current)
    }
  }, [])

  const handleLoadComplete = () => {
    screenSignal.value = 'title'
  }

  const hasSave = Boolean(saveManager?.hasSave?.())

  const handleNewGame = () => {
    saveManager?.clearSave?.()
    gameLoop?.start()
    screenSignal.value = 'game'
  }

  const handleContinue = () => {
    gameLoop?.start()
    screenSignal.value = 'game'
  }

  if (screenSignal.value === 'loading') {
    return (
      <LoadingScreen
        progress={loadProgressSignal.value}
        onComplete={handleLoadComplete}
      />
    )
  }

  if (screenSignal.value === 'title') {
    return (
      <TitleScreen
        hasSave={hasSave}
        onNewGame={handleNewGame}
        onContinue={handleContinue}
        onSettings={null}
      />
    )
  }

  // 'game' screen
  return (
    <div class={styles.uiOverlay}>
      <HudPanel />
      <button
        class={styles.settingsBtn}
        onClick={() => { settingsSignals.isOpen.value = true }}
      >
        설정
      </button>
      <SettingsPanel saveManager={saveManager} />
    </div>
  )
}
