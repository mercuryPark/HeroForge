/**
 * AdvancementPanel — shows job advancement quest progress and allows advancing.
 *
 * Displays:
 *  - Current advancement tier (0~4차)
 *  - Active quest progress (kill count / target)
 *  - "전직하기" button when quest is complete
 *  - Notification popup when quest starts or completes
 */
import { signal } from '@preact/signals'
import { advancementSignals } from '../signals/advancementSignals'
import styles from './AdvancementPanel.module.css'

export const advancementPanelOpen = signal(false)

const TIER_NAMES = ['미전직', '1차 전직', '2차 전직', '3차 전직', '4차 전직']
const TIER_COLORS = ['#AAAAAA', '#5B9BD5', '#9B59B6', '#F39C12', '#E74C3C']

export function AdvancementPanel({ onAdvance }) {
  if (!advancementPanelOpen.value) return null

  const tier = advancementSignals.currentTier.value
  const questActive = advancementSignals.questActive.value
  const questComplete = advancementSignals.questComplete.value
  const killCount = advancementSignals.killCount.value
  const killTarget = advancementSignals.killTarget.value
  const questTier = advancementSignals.questTier.value

  const progressPct = killTarget > 0 ? Math.min(100, (killCount / killTarget) * 100) : 0

  return (
    <div class={styles.overlay} onClick={() => { advancementPanelOpen.value = false }}>
      <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>전직</h2>

        <div class={styles.tierInfo}>
          <span class={styles.tierLabel}>현재 등급:</span>
          <span class={styles.tierValue} style={{ color: TIER_COLORS[tier] }}>
            {TIER_NAMES[tier]}
          </span>
        </div>

        {tier >= 4 && (
          <p class={styles.maxTier}>최고 전직 달성!</p>
        )}

        {questActive && !questComplete && (
          <div class={styles.questSection}>
            <p class={styles.questTitle}>{questTier}차 전직 시련</p>
            <p class={styles.questDesc}>몬스터 {killTarget}마리 처치</p>
            <div class={styles.progressBar}>
              <div class={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <p class={styles.progressText}>{killCount} / {killTarget}</p>
          </div>
        )}

        {questActive && questComplete && (
          <div class={styles.questSection}>
            <p class={styles.questComplete}>{questTier}차 전직 시련 완료!</p>
            <button class={styles.advanceBtn} onClick={onAdvance}>
              {questTier}차 전직하기
            </button>
          </div>
        )}

        {!questActive && tier < 4 && (
          <p class={styles.waitMsg}>다음 전직 레벨에 도달하면 시련이 시작됩니다.</p>
        )}

        <button
          class={styles.closeBtn}
          onClick={() => { advancementPanelOpen.value = false }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

/**
 * AdvancementNotification — small popup that appears when quest starts/completes.
 */
export function AdvancementNotification() {
  if (!advancementSignals.showNotification.value) return null

  return (
    <div class={styles.notification}>
      <p>{advancementSignals.notificationMessage.value}</p>
    </div>
  )
}
