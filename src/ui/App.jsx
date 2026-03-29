import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import { addComponent } from 'bitecs'
import styles from './App.module.css'
import { HudPanel } from './hud/HudPanel'
import { LootCounter } from './hud/LootCounter'
import { SettingsPanel, settingsSignals } from './panels/SettingsPanel'
import { StatPanel, statPanelOpen } from './panels/StatPanel'
import { AdvancementPanel, AdvancementNotification, advancementPanelOpen } from './panels/AdvancementPanel'
import { advancementSignals } from './signals/advancementSignals'
import { EquipmentPanel, equipPanelOpen } from './panels/EquipmentPanel'
import { CurrencyBar } from './hud/CurrencyBar'
import { EnhancementPanel, enhancePanelOpen } from './panels/EnhancementPanel'
import { WarriorPanel, warriorPanelOpen } from './panels/WarriorPanel'
import { NotificationContainer } from './shared/NotificationToast'
import { MobileControls } from './shared/MobileControls'
import { generateEliteDrop, recalcEquipStats, ELITE_SUMMON_COST } from '@systems/meta/EquipmentSystem'
import { assignInitialWeapon } from '@systems/meta/WeaponSystem'
import { initSkills } from '@systems/meta/SkillSystem'
import { addToBag } from '@core/Inventory'
import { LoadingScreen } from './screens/LoadingScreen'
import { TitleScreen } from './screens/TitleScreen'
import { JobSelectScreen } from './screens/JobSelectScreen'
import { TutorialOverlay, startTutorial, isTutorialDone } from './screens/TutorialOverlay'
import { Job, StatAllocation, Level } from '@components/character'

/** 'loading' | 'title' | 'jobSelect' | 'game' */
const screenSignal = signal('loading')
const loadProgressSignal = signal(0)

const hasSaveSignal = signal(false)

export function App({ gameLoop, saveManager, world, playerState, growthSystem }) {
  // world ref needed in game screen for StatPanel
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
    // Go to job selection before starting the game
    screenSignal.value = 'jobSelect'
  }

  const handleJobSelected = (jobId) => {
    if (world && growthSystem) {
      const eid = world.playerEid
      // Ensure Job and StatAllocation components are added
      try { addComponent(world, eid, Job) } catch (_) { /* already added */ }
      try { addComponent(world, eid, StatAllocation) } catch (_) { /* already added */ }
      growthSystem.applyJob(world, eid, jobId)
      assignInitialWeapon(eid, jobId)
      initSkills(eid, jobId)
    }
    gameLoop?.start()
    screenSignal.value = 'game'
    // Start tutorial for new players
    if (!isTutorialDone()) {
      setTimeout(() => startTutorial(), 500)
    }

    // Wire up advancement notifications
    if (world?.eventBus) {
      world.eventBus.on('advancement:questStart', (e) => {
        advancementSignals.showNotification.value = true
        advancementSignals.notificationMessage.value = `${e.tier}차 전직 시련 시작! ${e.description}`
        setTimeout(() => { advancementSignals.showNotification.value = false }, 3000)
      })
      world.eventBus.on('advancement:questComplete', (e) => {
        advancementSignals.showNotification.value = true
        advancementSignals.notificationMessage.value = `${e.tier}차 전직 시련 완료! 전직 패널을 확인하세요.`
        setTimeout(() => { advancementSignals.showNotification.value = false }, 3000)
      })
      world.eventBus.on('advancement:complete', (e) => {
        advancementSignals.showNotification.value = true
        advancementSignals.notificationMessage.value = `${e.tier}차 전직 완료!`
        setTimeout(() => { advancementSignals.showNotification.value = false }, 3000)
      })
    }
  }

  const handleAdvance = () => {
    if (world && growthSystem) {
      growthSystem.applyAdvancement(world, world.playerEid)
    }
  }

  const handleEquipChange = () => {
    if (world) {
      recalcEquipStats(world.playerEid)
    }
  }

  const handleEliteSummon = () => {
    if (!world || !playerState) return
    if ((playerState.monsterPoints?.value ?? 0) < ELITE_SUMMON_COST) return
    playerState.monsterPoints.value -= ELITE_SUMMON_COST
    const playerLevel = Level.current[world.playerEid] || 1
    const item = generateEliteDrop(playerLevel)
    if (item) {
      addToBag(item)
      world.eventBus?.emit('elite:drop', { item })
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

  if (screenSignal.value === 'jobSelect') {
    return (
      <JobSelectScreen onSelectJob={handleJobSelected} />
    )
  }

  // 'game' screen
  return (
    <div class={styles.uiOverlay}>
      <HudPanel />
      <CurrencyBar />
      <LootCounter />
      <button
        class={styles.statBtn}
        onClick={() => { statPanelOpen.value = !statPanelOpen.value }}
      >
        스탯
      </button>
      <button
        class={styles.settingsBtn}
        onClick={() => { settingsSignals.isOpen.value = true }}
      >
        설정
      </button>
      <button
        class={styles.advBtn}
        onClick={() => { advancementPanelOpen.value = !advancementPanelOpen.value }}
      >
        전직
        {advancementSignals.questComplete.value && <span class={styles.advBadge}>!</span>}
      </button>
      <button
        class={styles.equipBtn}
        onClick={() => { equipPanelOpen.value = !equipPanelOpen.value }}
      >
        장비
      </button>
      <button
        class={styles.enhanceBtn}
        onClick={() => { enhancePanelOpen.value = !enhancePanelOpen.value }}
      >
        강화
      </button>
      <button
        class={styles.warriorBtn}
        onClick={() => { warriorPanelOpen.value = !warriorPanelOpen.value }}
      >
        용사
      </button>
      <StatPanel world={world} />
      <AdvancementPanel onAdvance={handleAdvance} />
      <EquipmentPanel world={world} onEquipChange={handleEquipChange} onEliteSummon={handleEliteSummon} />
      <EnhancementPanel />
      <WarriorPanel playerEid={world?.playerEid} />
      <SettingsPanel saveManager={saveManager} />
      <AdvancementNotification />
      <NotificationContainer />
      <MobileControls />
      <TutorialOverlay />
    </div>
  )
}
