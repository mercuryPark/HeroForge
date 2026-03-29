/**
 * DebugPanel — cheat buttons for testing all game systems.
 */
import { signal } from '@preact/signals'
import { Stats } from '@components/combat'
import { Level, StatAllocation } from '@components/character'
import { setCurrency } from '@core/CurrencyManager'
import { addToBag } from '@core/Inventory'
import { generateItem } from '@systems/meta/EquipmentSystem'
import { enhancementCurrencies } from '@systems/meta/EnhancementSystem'
import { weaponMaterials } from '@systems/meta/WeaponSystem'
import { showNotification } from '../shared/NotificationToast'
import styles from './DebugPanel.module.css'

export const debugPanelOpen = signal(false)

export function DebugPanel({ world }) {
  if (!debugPanelOpen.value) return null

  const eid = world?.playerEid

  const cheat = (label, fn) => (
    <button class={styles.btn} onClick={() => { fn(); showNotification(label, 'success') }}>
      {label}
    </button>
  )

  return (
    <div class={styles.overlay} onClick={() => { debugPanelOpen.value = false }}>
      <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>DEBUG</h2>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>재화</h3>
          {cheat('골드 +1M', () => setCurrency('gold', 1000000))}
          {cheat('보석 +10K', () => setCurrency('gems', 10000))}
          {cheat('몬스터 포인트 +10K', () => setCurrency('monster_points', 10000))}
          {cheat('아머 스톤 +1K', () => setCurrency('armor_stones', 1000))}
          {cheat('무기 재료 +1K', () => { weaponMaterials.value = 1000 })}
          {cheat('용사 증표 +500', () => setCurrency('warrior_tokens', 500))}
          {cheat('명예 훈장 +500', () => setCurrency('honor_medals', 500))}
          {cheat('보스 코인 +500', () => setCurrency('boss_coins', 500))}
          {cheat('아레나 포인트 +500', () => setCurrency('arena_points', 500))}
        </div>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>강화 재료</h3>
          {cheat('SF 스크롤 +100', () => { enhancementCurrencies.starforceScrolls.value += 100 })}
          {cheat('일반 큐브 +50', () => { enhancementCurrencies.normalCubes.value += 50 })}
          {cheat('미라클 큐브 +20', () => { enhancementCurrencies.miracleCubes.value += 20 })}
          {cheat('에디셔널 큐브 +20', () => { enhancementCurrencies.additionalCubes.value += 20 })}
        </div>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>캐릭터</h3>
          {cheat('레벨 +10', () => {
            if (!eid) return
            for (let i = 0; i < 10; i++) {
              Level.current[eid] += 1
              Level.xp[eid] = 0
              world.eventBus?.emit('player:levelup', { eid, level: Level.current[eid] })
            }
          })}
          {cheat('레벨 100', () => {
            if (!eid) return
            Level.current[eid] = 100
            Level.xp[eid] = 0
          })}
          {cheat('스탯 포인트 +100', () => {
            if (!eid) return
            StatAllocation.availablePoints[eid] += 100
          })}
          {cheat('ATK +500', () => { if (eid) Stats.atk[eid] += 500 })}
          {cheat('HP +5000', () => {
            if (!eid) return
            Stats.hp[eid] += 5000
            Stats.maxHp[eid] += 5000
          })}
          {cheat('크리 100%', () => { if (eid) Stats.critRate[eid] = 100 })}
        </div>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>장비</h3>
          {cheat('랜덤 장비 x5', () => {
            const slots = ['hat', 'top', 'bottom', 'gloves', 'shoes', 'cape', 'shoulder', 'belt', 'necklace', 'ring']
            for (let i = 0; i < 5; i++) {
              const slot = slots[Math.floor(Math.random() * slots.length)]
              const grade = Math.floor(Math.random() * 5)
              const item = generateItem(slot, grade, Level.current[eid] || 1)
              if (item) addToBag(item)
            }
          })}
          {cheat('레전더리 장비 x3', () => {
            const slots = ['gloves', 'necklace', 'ring']
            for (const slot of slots) {
              const item = generateItem(slot, 4, Level.current[eid] || 1)
              if (item) addToBag(item)
            }
          })}
        </div>

        <button class={styles.closeBtn} onClick={() => { debugPanelOpen.value = false }}>닫기</button>
      </div>
    </div>
  )
}
