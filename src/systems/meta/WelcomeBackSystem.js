/**
 * WelcomeBackSystem — bonus package for returning players (E7).
 */
import { addCurrency } from '@core/CurrencyManager'

const ABSENCE_THRESHOLD_DAYS = 3
const WELCOME_BACK_REWARDS = {
  gems: 500,
  gold: 50000,
  cube_normal: 5,
  starforce_scroll: 3,
  scroll_70: 5,
}

/**
 * Check if player qualifies for welcome back bonus.
 * @param {number} lastOnlineTimestamp
 * @returns {{ eligible: boolean, daysSince: number }}
 */
export function checkWelcomeBack(lastOnlineTimestamp) {
  const daysSince = Math.floor((Date.now() - lastOnlineTimestamp) / (24 * 60 * 60 * 1000))
  return {
    eligible: daysSince >= ABSENCE_THRESHOLD_DAYS,
    daysSince,
  }
}

/**
 * Claim welcome back rewards.
 * @returns {object} rewards granted
 */
export function claimWelcomeBack() {
  for (const [key, val] of Object.entries(WELCOME_BACK_REWARDS)) {
    addCurrency(key, val)
  }
  return { ...WELCOME_BACK_REWARDS }
}
