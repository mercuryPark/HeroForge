/**
 * DungeonSystem — 5 growth dungeons with daily entry limits, tier progression, sweep.
 */
import { signal } from '@preact/signals'
import dungeonsData from '@data/dungeons.json'
import { addCurrency, spendCurrency } from '@core/CurrencyManager'

const DUNGEONS = dungeonsData.dungeons

/** Daily entry tracking: { dungeonId: { used: number, extraUsed: number } } */
const _entries = {}
for (const d of DUNGEONS) {
  _entries[d.id] = { used: 0, extraUsed: 0 }
}

/** Highest cleared tier per dungeon */
const _clearedTiers = {}
for (const d of DUNGEONS) {
  _clearedTiers[d.id] = 0
}

export const dungeonSignals = {
  version: signal(0),
}

function _bump() { dungeonSignals.version.value++ }

/**
 * Get dungeon list with entry info.
 */
export function getDungeonList() {
  return DUNGEONS.map(d => ({
    ...d,
    entriesUsed: _entries[d.id].used,
    extraUsed: _entries[d.id].extraUsed,
    entriesRemaining: d.dailyEntries - _entries[d.id].used,
    highestCleared: _clearedTiers[d.id],
    canSweep: _clearedTiers[d.id] > 0 && dungeonsData.sweepEnabled,
  }))
}

/**
 * Enter a dungeon at a given tier.
 * @returns {{ success: boolean, reward: number, rewardType: string } | null}
 */
export function enterDungeon(dungeonId, tier) {
  const dungeon = DUNGEONS.find(d => d.id === dungeonId)
  if (!dungeon) return null

  const entry = _entries[dungeonId]
  if (entry.used >= dungeon.dailyEntries) {
    // Try extra entry with Red Diamonds
    const extraCosts = dungeonsData.extraEntryCost
    const extraIdx = Math.min(entry.extraUsed, extraCosts.length - 1)
    if (!spendCurrency('red_diamonds', extraCosts[extraIdx])) {
      return { success: false, reward: 0, rewardType: '' }
    }
    entry.extraUsed++
  }

  entry.used++

  // Calculate reward
  const reward = Math.floor(dungeon.baseReward + (tier - 1) * dungeon.rewardPerTier)

  // Grant reward
  if (dungeon.reward === 'mixed' && dungeon.mixedRewards) {
    // Give one of each mixed reward type
    for (const r of dungeon.mixedRewards) {
      addCurrency(r, Math.ceil(reward / dungeon.mixedRewards.length))
    }
  } else if (dungeon.reward === 'exp') {
    // EXP is handled differently — emitted as event
  } else {
    addCurrency(dungeon.reward, reward)
  }

  // Update cleared tier
  if (tier > _clearedTiers[dungeonId]) {
    _clearedTiers[dungeonId] = tier
  }

  _bump()
  return { success: true, reward, rewardType: dungeon.reward }
}

/**
 * Sweep a dungeon (instant clear for previously cleared tier).
 */
export function sweepDungeon(dungeonId, tier) {
  if (!dungeonsData.sweepEnabled) return null
  if (tier > _clearedTiers[dungeonId]) return null
  return enterDungeon(dungeonId, tier)
}

/**
 * Reset daily entries (called at midnight).
 */
export function resetDailyEntries() {
  for (const id in _entries) {
    _entries[id].used = 0
    _entries[id].extraUsed = 0
  }
  _bump()
}

/** Serialize */
export function serializeDungeons() {
  return {
    entries: { ..._entries },
    clearedTiers: { ..._clearedTiers },
  }
}

/** Deserialize */
export function deserializeDungeons(data) {
  if (!data) return
  if (data.entries) {
    for (const id in data.entries) {
      if (_entries[id]) Object.assign(_entries[id], data.entries[id])
    }
  }
  if (data.clearedTiers) {
    for (const id in data.clearedTiers) {
      _clearedTiers[id] = data.clearedTiers[id]
    }
  }
  _bump()
}
