/**
 * WarriorPanel — Warrior's Power + Ability management UI.
 */
import { signal } from '@preact/signals'
import {
  getWarriorPowerInfo, investWarriorPoint,
  getAbilityInfo, getAbilityOptionName, getAbilityGradeName,
  rerollAbilities, toggleAbilityLock,
} from '@systems/meta/WarriorSystem'
import { getCurrency } from '@core/CurrencyManager'
import styles from './WarriorPanel.module.css'

export const warriorPanelOpen = signal(false)

const activeWarriorTab = signal('power')
const lastMsg = signal('')

const STAT_LABELS = {
  accuracy: '명중', damage: '데미지', mainStat: '주스탯',
  atk: 'ATK', hp: 'HP', def: 'DEF',
}

const GRADE_COLORS = ['#5B9BD5', '#9B59B6', '#F39C12', '#27AE60', '#E74C3C']

export function WarriorPanel({ playerEid }) {
  if (!warriorPanelOpen.value) return null

  const tab = activeWarriorTab.value

  return (
    <div class={styles.overlay} onClick={() => { warriorPanelOpen.value = false }}>
      <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>용사의 힘</h2>

        <div class={styles.tabs}>
          <button class={`${styles.tab} ${tab === 'power' ? styles.tabActive : ''}`}
            onClick={() => { activeWarriorTab.value = 'power' }}>스탯 투자</button>
          <button class={`${styles.tab} ${tab === 'ability' ? styles.tabActive : ''}`}
            onClick={() => { activeWarriorTab.value = 'ability' }}>어빌리티</button>
        </div>

        {tab === 'power' && <PowerTab eid={playerEid} />}
        {tab === 'ability' && <AbilityTab eid={playerEid} />}

        {lastMsg.value && <p class={styles.result}>{lastMsg.value}</p>}

        <button class={styles.closeBtn} onClick={() => { warriorPanelOpen.value = false }}>닫기</button>
      </div>
    </div>
  )
}

function PowerTab({ eid }) {
  const info = getWarriorPowerInfo(eid)
  const tokens = getCurrency('warrior_tokens')

  return (
    <div>
      <p class={styles.info}>티어: {info.tier + 1} / {info.maxTier + 1}</p>
      <p class={styles.info}>투자: {info.totalInvested} / {info.cap}</p>
      <p class={styles.info}>용사의 증표: {tokens?.value ?? 0}</p>

      <div class={styles.statGrid}>
        {info.priority.map(key => (
          <div key={key} class={styles.statRow}>
            <span class={styles.statLabel}>{STAT_LABELS[key]}</span>
            <span class={styles.statValue}>{info.stats[key]}</span>
            <button class={styles.investBtn} onClick={() => {
              const ok = investWarriorPoint(eid, key)
              lastMsg.value = ok ? `${STAT_LABELS[key]} +1` : '증표 부족'
            }}>+1</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbilityTab({ eid }) {
  const info = getAbilityInfo(eid)
  const medals = getCurrency('honor_medals')

  return (
    <div>
      <p class={styles.info}>변환 레벨: {info.transformLevel} (높을수록 등급업 확률 증가)</p>
      <p class={styles.info}>명예의 훈장: {medals?.value ?? 0}</p>
      <p class={styles.info}>활성 슬롯: {info.activeSlots} / 4</p>

      <div class={styles.abilityGrid}>
        {info.slots.map((slot, i) => (
          <div key={i} class={`${styles.abilitySlot} ${!slot.active ? styles.slotInactive : ''}`}>
            <div class={styles.abilityHeader}>
              <span style={{ color: GRADE_COLORS[slot.grade] }}>{getAbilityGradeName(slot.grade)}</span>
              {slot.active && (
                <button class={`${styles.lockBtn} ${slot.locked ? styles.locked : ''}`}
                  onClick={() => { toggleAbilityLock(eid, i + 1); lastMsg.value = '' }}>
                  {slot.locked ? '잠금' : '해제'}
                </button>
              )}
            </div>
            {slot.active ? (
              <p class={styles.abilityValue}>
                {getAbilityOptionName(slot.type)} +{slot.value}
              </p>
            ) : (
              <p class={styles.abilityValue}>미해금 (티어 상승 필요)</p>
            )}
          </div>
        ))}
      </div>

      <button class={styles.rerollBtn} onClick={() => {
        const result = rerollAbilities(eid)
        if (!result.success) { lastMsg.value = '훈장 부족'; return }
        lastMsg.value = result.gradeUps > 0 ? `리롤 완료! ${result.gradeUps}개 등급 UP!` : '리롤 완료!'
      }}>
        리롤
      </button>
    </div>
  )
}
