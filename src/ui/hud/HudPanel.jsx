/**
 * HudPanel — main HUD overlay showing HP, MP, EXP bars, level, gold, and auto-battle toggle.
 *
 * Signals are updated from ECS via UIBridgeSystem each logic tick.
 * Preact re-renders only the affected DOM nodes thanks to fine-grained signal subscriptions.
 */
import { signal, computed } from '@preact/signals'
import styles from './HudPanel.module.css'
import { availablePointsSignal } from '../signals/statSignals'

/** Signals synced from ECS by UIBridgeSystem */
export const hudSignals = {
  hp: signal(500),
  maxHp: signal(500),
  mp: signal(100),
  maxMp: signal(100),
  level: signal(1),
  xp: signal(0),
  xpToNext: signal(100),
  gold: signal(0),
  stageName: signal('Green Forest 1-1'),
  combatPower: signal(0),
  autoBattle: signal(true),
}

export function HudPanel() {
  const hpPercent = computed(() => {
    const max = hudSignals.maxHp.value
    return max > 0 ? (hudSignals.hp.value / max) * 100 : 0
  })
  const mpPercent = computed(() => {
    const max = hudSignals.maxMp.value
    return max > 0 ? (hudSignals.mp.value / max) * 100 : 0
  })
  const xpPercent = computed(() => {
    const next = hudSignals.xpToNext.value
    return next > 0 ? (hudSignals.xp.value / next) * 100 : 0
  })

  return (
    <div class={styles.hud}>
      {/* Top bar: Level + Stage + Gold */}
      <div class={styles.topBar}>
        <span class={styles.level}>
          Lv.{hudSignals.level.value}
          {availablePointsSignal.value > 0 && (
            <span class={styles.statBadge}>{availablePointsSignal.value}</span>
          )}
        </span>
        <span class={styles.stage}>{hudSignals.stageName.value}</span>
        <span class={styles.gold}>Gold: {hudSignals.gold.value}</span>
      </div>

      {/* HP Bar */}
      <div class={styles.barContainer}>
        <div class={styles.barLabel}>HP</div>
        <div class={styles.barBg}>
          <div class={styles.barFillHp} style={{ width: `${hpPercent.value}%` }} />
        </div>
        <div class={styles.barText}>
          {hudSignals.hp.value}/{hudSignals.maxHp.value}
        </div>
      </div>

      {/* MP Bar */}
      <div class={styles.barContainer}>
        <div class={styles.barLabel}>MP</div>
        <div class={styles.barBg}>
          <div class={styles.barFillMp} style={{ width: `${mpPercent.value}%` }} />
        </div>
        <div class={styles.barText}>
          {hudSignals.mp.value}/{hudSignals.maxMp.value}
        </div>
      </div>

      {/* EXP Bar */}
      <div class={styles.barContainer}>
        <div class={styles.barLabel}>EXP</div>
        <div class={styles.barBg}>
          <div class={styles.barFillXp} style={{ width: `${xpPercent.value}%` }} />
        </div>
        <div class={styles.barText}>{Math.floor(xpPercent.value)}%</div>
      </div>

      {/* Auto-battle toggle */}
      <button
        class={`${styles.autoBtn} ${hudSignals.autoBattle.value ? styles.autoBtnOn : ''}`}
        onClick={() => {
          hudSignals.autoBattle.value = !hudSignals.autoBattle.value
        }}
      >
        AUTO {hudSignals.autoBattle.value ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
