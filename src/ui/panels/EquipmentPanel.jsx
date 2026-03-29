/**
 * EquipmentPanel — equipped items, inventory bag (sort/filter/batch), elite summon, comparison.
 */
import { signal } from '@preact/signals'
import {
  EQUIP_SLOT_COUNT, EQUIP_SLOT_IDS, GRADE_NAMES_KR,
} from '@components/equipment'
import {
  getEquipped, getBag, getBagInfo, equipItem, unequipSlot,
  dismantleItem, inventorySignals, sortBag, filterBag,
  batchDismantle, autoDismantle,
} from '@core/Inventory'
import { GRADE_COLORS } from '@data/constants'
import styles from './EquipmentPanel.module.css'

export const equipPanelOpen = signal(false)

const SLOT_LABELS = ['모자', '상의', '하의', '장갑', '신발', '망토', '어깨', '벨트', '목걸이', '반지', '얼굴']
const SLOT_KEYS = ['hat', 'top', 'bottom', 'gloves', 'shoes', 'cape', 'shoulder', 'belt', 'necklace', 'ring', 'face_accessory']
const GRADE_COLOR_ARR = [
  GRADE_COLORS.NORMAL, GRADE_COLORS.RARE, GRADE_COLORS.EPIC,
  GRADE_COLORS.UNIQUE, GRADE_COLORS.LEGENDARY,
]

const activeTab = signal('equip')
const bagSort = signal('grade')
const bagGradeFilter = signal(-1)
const bagSlotFilter = signal('')

function formatMainStat(item) {
  const parts = []
  const ms = item.mainStat
  if (ms.hp) parts.push(`HP +${ms.hp}`)
  if (ms.atk) parts.push(`ATK +${ms.atk}`)
  if (ms.def) parts.push(`DEF +${ms.def}`)
  if (ms.critRate) parts.push(`크리 +${ms.critRate}%`)
  if (ms.critDmg) parts.push(`크뎀 +${ms.critDmg}%`)
  if (ms.atkSpeed) parts.push(`공속 +${ms.atkSpeed.toFixed(2)}`)
  if (ms.allStat) parts.push(`올스탯 +${ms.allStat}`)
  if (ms.statBonus) parts.push(`스탯 +${ms.statBonus}`)
  return parts.join(' · ')
}

/** Compare two items and return stat diffs */
function compareItems(newItem, equippedItem) {
  if (!newItem) return []
  const diffs = []
  const keys = ['hp', 'atk', 'def', 'critRate', 'critDmg', 'atkSpeed', 'allStat', 'statBonus']
  const labels = { hp: 'HP', atk: 'ATK', def: 'DEF', critRate: '크리', critDmg: '크뎀', atkSpeed: '공속', allStat: '올스탯', statBonus: '스탯' }

  for (const key of keys) {
    const newVal = newItem.mainStat[key] || 0
    const oldVal = equippedItem ? (equippedItem.mainStat[key] || 0) : 0
    const diff = newVal - oldVal
    if (diff !== 0) {
      diffs.push({ label: labels[key] || key, diff, isFloat: key === 'atkSpeed' })
    }
  }
  return diffs
}

function ItemCard({ item, onAction, actionLabel, compareWith }) {
  if (!item) return null
  const color = GRADE_COLOR_ARR[item.grade] || '#AAA'
  const diffs = compareWith !== undefined ? compareItems(item, compareWith) : []

  return (
    <div class={styles.itemCard} style={{ borderColor: color }}>
      <div class={styles.itemHeader}>
        <span style={{ color }}>{GRADE_NAMES_KR[item.grade]}</span>
        <span class={styles.itemSlot}>{SLOT_LABELS[EQUIP_SLOT_IDS[item.slotId]] || item.slotId}</span>
      </div>
      <div class={styles.itemStats}>{formatMainStat(item)}</div>
      {item.subOptions.length > 0 && (
        <div class={styles.subOpts}>
          {item.subOptions.map((s, i) => (
            <span key={i} class={styles.subOpt}>{s.key}: +{typeof s.value === 'number' ? (s.value % 1 === 0 ? s.value : s.value.toFixed(1)) : s.value}</span>
          ))}
        </div>
      )}
      {diffs.length > 0 && (
        <div class={styles.comparison}>
          {diffs.map((d, i) => (
            <span key={i} class={d.diff > 0 ? styles.statUp : styles.statDown}>
              {d.label} {d.diff > 0 ? '+' : ''}{d.isFloat ? d.diff.toFixed(2) : d.diff}
            </span>
          ))}
        </div>
      )}
      <div class={styles.itemLevel}>Lv.{item.itemLevel}</div>
      {onAction && (
        <button class={styles.itemBtn} onClick={() => onAction(item)}>{actionLabel}</button>
      )}
    </div>
  )
}

export function EquipmentPanel({ world, onEquipChange, onEliteSummon }) {
  if (!equipPanelOpen.value) return null
  const _v = inventorySignals.version.value
  const tab = activeTab.value

  return (
    <div class={styles.overlay} onClick={() => { equipPanelOpen.value = false }}>
      <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>장비</h2>
        <div class={styles.tabs}>
          {['equip', 'bag', 'elite'].map(t => (
            <button key={t} class={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => { activeTab.value = t }}>
              {t === 'equip' ? '장착' : t === 'bag' ? '가방' : '엘리트'}
            </button>
          ))}
        </div>
        {tab === 'equip' && <EquipTab onEquipChange={onEquipChange} />}
        {tab === 'bag' && <BagTab onEquipChange={onEquipChange} />}
        {tab === 'elite' && <EliteTab onEliteSummon={onEliteSummon} />}
        <button class={styles.closeBtn} onClick={() => { equipPanelOpen.value = false }}>닫기</button>
      </div>
    </div>
  )
}

function EquipTab({ onEquipChange }) {
  const slots = []
  for (let i = 0; i < EQUIP_SLOT_COUNT; i++) {
    const item = getEquipped(i)
    slots.push(
      <div key={i} class={styles.equipSlot}>
        <div class={styles.slotLabel}>{SLOT_LABELS[i]}</div>
        {item ? (
          <ItemCard item={item} onAction={() => { unequipSlot(i); onEquipChange?.() }} actionLabel="해제" />
        ) : (
          <div class={styles.emptySlot}>비어 있음</div>
        )}
      </div>
    )
  }
  return <div class={styles.equipGrid}>{slots}</div>
}

function BagTab({ onEquipChange }) {
  const info = getBagInfo()
  const gradeF = bagGradeFilter.value
  const slotF = bagSlotFilter.value
  const items = (gradeF >= 0 || slotF) ? filterBag(gradeF, slotF) : getBag()

  return (
    <div>
      {/* Sort / Filter controls */}
      <div class={styles.controls}>
        <div class={styles.sortRow}>
          <span class={styles.ctrlLabel}>정렬:</span>
          {['grade', 'slot', 'level'].map(s => (
            <button key={s} class={`${styles.ctrlBtn} ${bagSort.value === s ? styles.ctrlActive : ''}`}
              onClick={() => { bagSort.value = s; sortBag(s) }}>
              {s === 'grade' ? '등급' : s === 'slot' ? '슬롯' : '레벨'}
            </button>
          ))}
        </div>
        <div class={styles.filterRow}>
          <span class={styles.ctrlLabel}>필터:</span>
          <select class={styles.select} value={gradeF}
            onChange={(e) => { bagGradeFilter.value = parseInt(e.target.value) }}>
            <option value={-1}>전체 등급</option>
            {GRADE_NAMES_KR.map((g, i) => <option key={i} value={i}>{g}</option>)}
          </select>
          <select class={styles.select} value={slotF}
            onChange={(e) => { bagSlotFilter.value = e.target.value }}>
            <option value="">전체 슬롯</option>
            {SLOT_KEYS.map((k, i) => <option key={k} value={k}>{SLOT_LABELS[i]}</option>)}
          </select>
        </div>
      </div>

      <div class={styles.bagInfo}>{info.count} / {info.max}</div>
      <div class={styles.bagGrid}>
        {items.length === 0 && <p class={styles.empty}>아이템 없음</p>}
        {items.map(item => {
          const equippedInSlot = getEquipped(EQUIP_SLOT_IDS[item.slotId])
          return (
            <ItemCard key={item.id} item={item}
              compareWith={equippedInSlot}
              onAction={(it) => { equipItem(it); onEquipChange?.() }}
              actionLabel="장착" />
          )
        })}
      </div>

      {/* Batch dismantle + auto-dismantle */}
      <div class={styles.dismantleSection}>
        <p class={styles.dismantleInfo}>아머 스톤: {inventorySignals.armorStones.value}</p>
        <div class={styles.batchRow}>
          {[0, 1, 2].map(g => (
            <button key={g} class={styles.batchBtn} onClick={() => {
              const result = batchDismantle(g)
              if (result.count > 0) {
                // Notification handled by inventory version bump
              }
            }}>
              {GRADE_NAMES_KR[g]}이하 일괄분해
            </button>
          ))}
        </div>
        <div class={styles.autoRow}>
          <label class={styles.autoLabel}>
            <input type="checkbox" checked={autoDismantle.enabled.value}
              onChange={(e) => { autoDismantle.enabled.value = e.target.checked }} />
            자동 분해
          </label>
          <select class={styles.select} value={autoDismantle.maxGrade.value}
            onChange={(e) => { autoDismantle.maxGrade.value = parseInt(e.target.value) }}>
            <option value={0}>노말 이하</option>
            <option value={1}>레어 이하</option>
            <option value={2}>에픽 이하</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function EliteTab({ onEliteSummon }) {
  const level = inventorySignals.eliteSummonLevel.value
  const stones = inventorySignals.armorStones.value
  return (
    <div class={styles.eliteSection}>
      <p class={styles.eliteTitle}>엘리트 몬스터 소환</p>
      <p class={styles.eliteInfo}>소환 레벨: {level}</p>
      <p class={styles.eliteInfo}>높은 소환 레벨 = 더 좋은 등급의 장비!</p>
      <button class={styles.summonBtn} onClick={onEliteSummon}>소환 (100 MP)</button>
      <div class={styles.upgradeSec}>
        <p class={styles.eliteInfo}>아머 스톤: {stones}</p>
        <p class={styles.eliteInfo}>업그레이드 비용: {level * 50} 스톤</p>
      </div>
    </div>
  )
}
