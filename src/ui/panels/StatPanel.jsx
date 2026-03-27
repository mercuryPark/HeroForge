/**
 * StatPanel — Stat allocation panel for distributing available stat points.
 *
 * Reads/writes ECS StatAllocation and Stats components on world.playerEid.
 * Signals are updated here and the UIBridge picks them up on next tick.
 */
import { signal } from '@preact/signals'
import styles from './StatPanel.module.css'
import { StatAllocation } from '@components/character'
import { Stats } from '@components/combat'
import { hudSignals } from '../hud/HudPanel'
import { availablePointsSignal } from '../signals/statSignals'
import { GRADE_COLORS } from '@data/constants'
import balanceData from '@data/balance.json'

/** Toggle signal for panel open/close */
export const statPanelOpen = signal(false)

// Re-export for convenience (consumers that only need the signal can import from here)
export { availablePointsSignal }

/** Current allocated stat signals (read from ECS on each render) */
const statSignals = {
  str: signal(0),
  dex: signal(0),
  int_: signal(0),
  luk: signal(0),
}

/** Sync current stat values from ECS into signals */
function syncFromECS(world) {
  const eid = world?.playerEid
  if (eid == null) return
  statSignals.str.value = StatAllocation.str[eid]
  statSignals.dex.value = StatAllocation.dex[eid]
  statSignals.int_.value = StatAllocation.int_[eid]
  statSignals.luk.value = StatAllocation.luk[eid]
  availablePointsSignal.value = StatAllocation.availablePoints[eid]
}

/**
 * Apply stat bonuses to the Stats component based on allocated points.
 * Uses base stats stored on the entity minus previously calculated bonuses.
 * Simple flat bonus model:
 *   STR: +1 ATK per point
 *   DEX: +0.5 DEF per point
 *   INT: +5 MP per point
 *   LUK: +0.5 critRate per point
 */
function applyStatBonuses(world) {
  const eid = world?.playerEid
  if (eid == null) return
  const str = StatAllocation.str[eid]
  const dex = StatAllocation.dex[eid]
  const int_ = StatAllocation.int_[eid]
  const luk = StatAllocation.luk[eid]

  // Read base values stored on the entity (floor prevents drift)
  // We store base values separately via a convention: treat current minus bonus
  // For simplicity, re-derive from the stored baseAtk etc. if available,
  // otherwise just set absolute derived values from signals/known base.
  // We track base stats separately on the signal side for correctness.
  // Since ECS stats already include bonuses, we recalculate from scratch
  // using the UIBridge-exposed base values for HP/MP.
  const baseHp = world._baseHp?.[eid] ?? Stats.maxHp[eid]
  const baseMp = world._baseMp?.[eid] ?? Stats.maxMp[eid]
  const baseAtk = world._baseAtk?.[eid] ?? Stats.atk[eid]
  const baseDef = world._baseDef?.[eid] ?? Stats.def[eid]
  const baseCrit = world._baseCrit?.[eid] ?? Stats.critRate[eid]

  // Apply bonuses
  Stats.atk[eid] = baseAtk + str * 1
  Stats.def[eid] = baseDef + dex * 0.5
  Stats.maxMp[eid] = baseMp + int_ * 5
  Stats.critRate[eid] = baseCrit + luk * 0.5

  // Update HUD signals immediately so UI reflects change without waiting for UIBridge tick
  hudSignals.maxMp.value = Math.floor(Stats.maxMp[eid])
}

/**
 * Store base stats so we can recalculate bonuses cleanly on re-allocation or reset.
 * Called once when the panel first opens for a fresh entity.
 */
function ensureBaseStats(world) {
  const eid = world?.playerEid
  if (eid == null) return
  if (world._baseAtk == null) {
    world._baseAtk = new Float32Array(10000)
    world._baseDef = new Float32Array(10000)
    world._baseHp = new Float32Array(10000)
    world._baseMp = new Float32Array(10000)
    world._baseCrit = new Float32Array(10000)
  }
  // Only snapshot if not yet recorded (first open)
  if (world._baseAtk[eid] === 0 && Stats.atk[eid] > 0) {
    world._baseAtk[eid] = Stats.atk[eid]
    world._baseDef[eid] = Stats.def[eid]
    world._baseHp[eid] = Stats.maxHp[eid]
    world._baseMp[eid] = Stats.maxMp[eid]
    world._baseCrit[eid] = Stats.critRate[eid]
  }
}

/** Allocate `amount` points into a stat */
function allocate(world, stat, amount) {
  const eid = world?.playerEid
  if (eid == null) return
  const avail = StatAllocation.availablePoints[eid]
  if (avail < amount) return
  StatAllocation.availablePoints[eid] -= amount
  StatAllocation[stat][eid] += amount
  applyStatBonuses(world)
  syncFromECS(world)
}

/** Reset all allocated points back to the pool */
function resetStats(world) {
  const eid = world?.playerEid
  if (eid == null) return
  const total =
    StatAllocation.str[eid] +
    StatAllocation.dex[eid] +
    StatAllocation.int_[eid] +
    StatAllocation.luk[eid] +
    StatAllocation.availablePoints[eid]
  StatAllocation.str[eid] = 0
  StatAllocation.dex[eid] = 0
  StatAllocation.int_[eid] = 0
  StatAllocation.luk[eid] = 0
  StatAllocation.availablePoints[eid] = total
  applyStatBonuses(world)
  syncFromECS(world)
}

const GRADE_NAMES = ['NORMAL', 'RARE', 'EPIC', 'UNIQUE', 'LEGENDARY', 'MYTHIC']

/** Calculate Maple Grade from total allocated stat points */
function getMapleGrade(world) {
  const eid = world?.playerEid
  if (eid == null) return { level: 0, name: 'NORMAL', color: GRADE_COLORS.NORMAL }
  const total = StatAllocation.str[eid] + StatAllocation.dex[eid] + StatAllocation.int_[eid] + StatAllocation.luk[eid]
  const threshold = balanceData.experience.mapleGradeThreshold
  const level = Math.min(Math.floor(total / threshold), GRADE_NAMES.length - 1)
  const name = GRADE_NAMES[level]
  return { level, name, color: GRADE_COLORS[name] }
}

/** Calculate Combat Power */
function getCombatPower(world) {
  const eid = world?.playerEid
  if (eid == null) return 0
  const w = balanceData.combatPower.weights
  return Math.floor(
    Stats.atk[eid] * w.atk +
    Stats.maxHp[eid] * w.hp +
    Stats.def[eid] * w.def +
    Stats.critRate[eid] * w.critRate +
    Stats.critDmg[eid] * w.critDmg
  )
}

/** Derived combat stat display values (computed from ECS + allocations) */
function getDerivedStats(world) {
  const eid = world?.playerEid
  if (eid == null) return { atk: 0, def: 0, hp: 0, crit: 0, mp: 0 }
  return {
    atk: Math.floor(Stats.atk[eid]),
    def: Math.floor(Stats.def[eid]),
    hp: Math.floor(Stats.maxHp[eid]),
    mp: Math.floor(Stats.maxMp[eid]),
    crit: Stats.critRate[eid].toFixed(1),
  }
}

function StatRow({ label, statKey, world }) {
  const val = statSignals[statKey].value
  return (
    <div class={styles.statRow}>
      <span class={styles.statLabel}>{label}</span>
      <span class={styles.statValue}>{val}</span>
      <button
        class={styles.btnPlus}
        onClick={() => allocate(world, statKey, 1)}
        disabled={availablePointsSignal.value < 1}
      >
        +1
      </button>
      <button
        class={styles.btnPlus}
        onClick={() => allocate(world, statKey, 5)}
        disabled={availablePointsSignal.value < 5}
      >
        +5
      </button>
    </div>
  )
}

export function StatPanel({ world }) {
  if (!statPanelOpen.value) return null

  ensureBaseStats(world)
  syncFromECS(world)

  const derived = getDerivedStats(world)
  const avail = availablePointsSignal.value
  const grade = getMapleGrade(world)
  const combatPower = getCombatPower(world)

  return (
    <div class={styles.panel}>
      <div class={styles.header}>
        <span class={styles.title}>스탯 배분</span>
        <span class={styles.availBadge}>잔여: {avail}</span>
        <button class={styles.closeBtn} onClick={() => { statPanelOpen.value = false }}>X</button>
      </div>

      {/* Grade + Combat Power */}
      <div class={styles.gradeSection}>
        <div class={styles.gradeBadge} style={{ color: grade.color, borderColor: grade.color }}>
          {grade.name}
        </div>
        <div class={styles.combatPower}>
          <span class={styles.cpLabel}>전투력</span>
          <span class={styles.cpValue}>{combatPower.toLocaleString()}</span>
        </div>
      </div>

      <div class={styles.statList}>
        <StatRow label="STR" statKey="str"  world={world} />
        <StatRow label="DEX" statKey="dex"  world={world} />
        <StatRow label="INT" statKey="int_" world={world} />
        <StatRow label="LUK" statKey="luk"  world={world} />
      </div>

      <button
        class={styles.resetBtn}
        onClick={() => resetStats(world)}
      >
        초기화
      </button>

      <div class={styles.divider} />

      <div class={styles.summary}>
        <div class={styles.summaryTitle}>전투 스탯</div>
        <div class={styles.summaryRow}><span>ATK</span><span>{derived.atk}</span></div>
        <div class={styles.summaryRow}><span>DEF</span><span>{derived.def}</span></div>
        <div class={styles.summaryRow}><span>MaxHP</span><span>{derived.hp}</span></div>
        <div class={styles.summaryRow}><span>MaxMP</span><span>{derived.mp}</span></div>
        <div class={styles.summaryRow}><span>CRIT</span><span>{derived.crit}%</span></div>
      </div>
    </div>
  )
}
