/**
 * CombatPowerHistory — tracks daily combat power for 7-day graph.
 */
import { signal } from '@preact/signals'

const MAX_DAYS = 7
const _history = []

export const cpHistorySignal = signal([])

/**
 * Record today's combat power.
 * @param {number} cp - combat power value
 */
export function recordCombatPower(cp) {
  const today = new Date().toISOString().slice(0, 10)

  // Update or add today's entry
  const existing = _history.find(h => h.date === today)
  if (existing) {
    existing.cp = Math.max(existing.cp, cp) // keep highest
  } else {
    _history.push({ date: today, cp })
    if (_history.length > MAX_DAYS) _history.shift()
  }

  cpHistorySignal.value = [..._history]
}

/** Get history for graph display */
export function getCombatPowerHistory() {
  return _history
}

/** Serialize */
export function serializeCPHistory() {
  return [..._history]
}

/** Deserialize */
export function deserializeCPHistory(data) {
  _history.length = 0
  if (data && Array.isArray(data)) {
    data.forEach(entry => _history.push(entry))
  }
  cpHistorySignal.value = [..._history]
}
