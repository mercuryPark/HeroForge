import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import styles from './App.module.css'
import { HudPanel } from './hud/HudPanel'
import { LootCounter } from './hud/LootCounter'
import { SettingsPanel, settingsSignals } from './panels/SettingsPanel'
import { LoadingScreen } from './screens/LoadingScreen'
import { TitleScreen } from './screens/TitleScreen'
import { TutorialOverlay, startTutorial, isTutorialDone } from './screens/TutorialOverlay'

/** 'loading' | 'title' | 'game' */
const screenSignal = signal('loading')
const loadProgressSignal = signal(0)

const hasSaveSignal = signal(false)

export function App({ gameLoop, saveManager, world, playerState }) {
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

  // Check for existing save data asynchronously
  useEffect(() => {
    if (!saveManager) return
    saveManager.hasSave('main').then(has => {
      hasSaveSignal.value = has
    }).catch(() => {
      hasSaveSignal.value = false
    })
  }, [saveManager])

  const handleLoadComplete = () => {
    screenSignal.value = 'title'
  }

  const hasSave = hasSaveSignal.value

  const handleNewGame = () => {
    saveManager?.deleteSave?.('main').catch(() => {})
    gameLoop?.start()
    screenSignal.value = 'game'
    // Start tutorial for new players
    if (!isTutorialDone()) {
      setTimeout(() => startTutorial(), 500)
    }
  }

  const handleContinue = async () => {
    if (saveManager) {
      const data = await saveManager.load('main')
      if (data) {
        // Restore playerState signals from saved data
        if (playerState) {
          if (data.gold != null) playerState.gold.value = data.gold
          if (data.monsterPoints != null) playerState.monsterPoints.value = data.monsterPoints
        }
      } else {
        console.warn('No save data found, starting fresh')
      }
    }
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
      <LootCounter />
      <button
        class={styles.settingsBtn}
        onClick={() => { settingsSignals.isOpen.value = true }}
      >
        설정
      </button>
      <SettingsPanel saveManager={saveManager} />
      <TutorialOverlay />
    </div>
  )
}
