/**
 * CurrencyBar — displays primary currencies in the top-right area of the HUD.
 */
import { getPrimaryCurrencies } from '@core/CurrencyManager'
import styles from './CurrencyBar.module.css'

const ICONS = {
  gold: 'G',
  gems: '💎',
  monster_points: 'MP',
  armor_stones: 'AS',
  weapon_materials: 'WM',
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export function CurrencyBar() {
  const currencies = getPrimaryCurrencies()

  return (
    <div class={styles.bar}>
      {currencies.map(c => (
        <div key={c.id} class={styles.item}>
          <span class={styles.icon}>{ICONS[c.id] || '?'}</span>
          <span class={styles.value}>{formatNumber(c.signal.value)}</span>
        </div>
      ))}
    </div>
  )
}
