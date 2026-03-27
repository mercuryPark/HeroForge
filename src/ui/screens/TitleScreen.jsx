import styles from './TitleScreen.module.css'
import { settingsSignals } from '../panels/SettingsPanel'
import { SettingsPanel } from '../panels/SettingsPanel'

export function TitleScreen({ hasSave, onNewGame, onContinue, onSettings }) {
  const handleSettings = () => {
    settingsSignals.isOpen.value = true
    onSettings?.()
  }

  return (
    <div class={styles.screen}>
      <div class={styles.stars} aria-hidden="true" />
      <div class={styles.content}>
        <div class={styles.titleBlock}>
          <h1 class={styles.title}>HeroForge</h1>
          <p class={styles.subtitle}>Idle RPG</p>
        </div>

        <div class={styles.buttons}>
          <button class={styles.btn} onClick={onNewGame}>
            새 게임
          </button>
          <button
            class={`${styles.btn} ${!hasSave ? styles.btnDisabled : ''}`}
            onClick={hasSave ? onContinue : undefined}
            disabled={!hasSave}
          >
            이어하기
          </button>
          <button class={`${styles.btn} ${styles.btnSecondary}`} onClick={handleSettings}>
            설정
          </button>
        </div>
      </div>

      <SettingsPanel />
    </div>
  )
}
