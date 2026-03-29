/**
 * NotificationToast — popup notifications that stack and auto-dismiss.
 * Also provides RedDotBadge component for menu indicators.
 */
import { signal } from '@preact/signals'
import styles from './NotificationToast.module.css'

/** Active notifications */
const _notifications = signal([])
let _nextId = 1

/**
 * Show a notification toast.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {number} durationMs
 */
export function showNotification(message, type = 'info', durationMs = 3000) {
  const id = _nextId++
  const notifications = [..._notifications.value, { id, message, type }]
  // Max 5 visible
  if (notifications.length > 5) notifications.shift()
  _notifications.value = notifications

  setTimeout(() => {
    _notifications.value = _notifications.value.filter(n => n.id !== id)
  }, durationMs)
}

/** Convenience helpers */
export const notify = {
  info: (msg) => showNotification(msg, 'info'),
  success: (msg) => showNotification(msg, 'success'),
  warning: (msg) => showNotification(msg, 'warning'),
  error: (msg) => showNotification(msg, 'error'),
}

/** Toast container — render in App */
export function NotificationContainer() {
  const items = _notifications.value
  if (items.length === 0) return null

  return (
    <div class={styles.container}>
      {items.map(n => (
        <div key={n.id} class={`${styles.toast} ${styles[n.type]}`}>
          {n.message}
        </div>
      ))}
    </div>
  )
}

/** Red dot badge — shows on buttons when there's pending content */
const _badges = signal({})

export function setBadge(key, show) {
  const current = { ..._badges.value }
  current[key] = show
  _badges.value = current
}

export function hasBadge(key) {
  return _badges.value[key] || false
}

export function RedDot({ badgeKey }) {
  if (!_badges.value[badgeKey]) return null
  return <span class={styles.redDot} />
}
