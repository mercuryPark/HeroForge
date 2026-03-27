/**
 * LootCounter — floating loot gain popups (+Gold, +EXP).
 *
 * Shows animated floating text when loot is collected.
 * Popups stack vertically and auto-remove after animation completes.
 */
import { signal } from '@preact/signals'
import styles from './LootCounter.module.css'

/** @type {import('@preact/signals').Signal<Array<{id: number, type: string, amount: number}>>} */
const popups = signal([])

let nextId = 0

/**
 * Add a loot popup. Called externally from EventBus listener.
 * @param {'gold' | 'exp'} type
 * @param {number} amount
 */
export function addLootPopup(type, amount) {
  if (amount <= 0) return
  const id = nextId++
  popups.value = [...popups.value, { id, type, amount }]

  // Auto-remove after animation duration (1.2s)
  setTimeout(() => {
    popups.value = popups.value.filter(p => p.id !== id)
  }, 1200)
}

export function LootCounter() {
  return (
    <div class={styles.lootContainer}>
      {popups.value.map(p => (
        <div
          key={p.id}
          class={`${styles.popup} ${p.type === 'gold' ? styles.gold : styles.exp}`}
        >
          +{p.amount} {p.type === 'gold' ? 'Gold' : 'EXP'}
        </div>
      ))}
    </div>
  )
}
