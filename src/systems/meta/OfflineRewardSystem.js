/**
 * OfflineRewardSystem — calculates rewards earned while offline.
 */
import offlineData from '@data/offline.json'
import { addCurrency, spendCurrency } from '@core/CurrencyManager'

const OFR = offlineData.offlineReward
const QH = offlineData.quickHunt

/**
 * Calculate offline rewards based on time away.
 * @param {number} lastOnlineTimestamp - ms since epoch
 * @returns {object} rewards earned
 */
export function calculateOfflineReward(lastOnlineTimestamp) {
  const now = Date.now()
  const elapsedMs = now - lastOnlineTimestamp
  const elapsedMin = Math.min(elapsedMs / 60000, OFR.maxHours * 60)

  if (elapsedMin < 1) return null

  const rewards = {
    exp: Math.floor(elapsedMin * OFR.expPerMinute * OFR.efficiencyRate),
    gold: Math.floor(elapsedMin * OFR.goldPerMinute * OFR.efficiencyRate),
    monsterPoints: Math.floor(elapsedMin * OFR.monsterPointsPerMinute * OFR.efficiencyRate),
    minutes: Math.floor(elapsedMin),
  }

  return rewards
}

/**
 * Claim offline rewards.
 */
export function claimOfflineReward(rewards) {
  if (!rewards) return
  addCurrency('gold', rewards.gold)
  addCurrency('monster_points', rewards.monsterPoints)
  // EXP is handled via event
  return rewards
}

/**
 * Quick Hunt — spend gems for instant rewards at full efficiency.
 */
export function quickHunt() {
  if (!spendCurrency('gems', QH.gemsCost)) return null

  const rewards = {
    exp: Math.floor(QH.durationMinutes * OFR.expPerMinute * QH.efficiencyRate),
    gold: Math.floor(QH.durationMinutes * OFR.goldPerMinute * QH.efficiencyRate),
    monsterPoints: Math.floor(QH.durationMinutes * OFR.monsterPointsPerMinute * QH.efficiencyRate),
    minutes: QH.durationMinutes,
  }

  addCurrency('gold', rewards.gold)
  addCurrency('monster_points', rewards.monsterPoints)
  return rewards
}
