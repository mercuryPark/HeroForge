/**
 * QuestSystem — daily quests, achievements, attendance tracking.
 */
import { signal } from '@preact/signals'
import dailyData from '@data/daily_quests.json'
import achievementData from '@data/achievements.json'
import attendanceData from '@data/attendance.json'
import { addCurrency } from '@core/CurrencyManager'

/* ── Daily Quests ── */

const _dailyProgress = {}
for (const q of dailyData.quests) {
  _dailyProgress[q.id] = { current: 0, completed: false }
}
let _activityPoints = 0
const _claimedMilestones = new Set()

export const questSignals = {
  version: signal(0),
  activityPoints: signal(0),
}

function _bump() { questSignals.version.value++ }

/** Increment progress for a quest type */
export function trackQuestProgress(type, amount = 1) {
  for (const q of dailyData.quests) {
    if (q.type === type && !_dailyProgress[q.id].completed) {
      _dailyProgress[q.id].current += amount
      if (_dailyProgress[q.id].current >= q.target) {
        _dailyProgress[q.id].completed = true
        // Grant rewards
        for (const [key, val] of Object.entries(q.reward)) {
          if (key === 'activityPoints') {
            _activityPoints += val
            questSignals.activityPoints.value = _activityPoints
          } else {
            addCurrency(key, val)
          }
        }
      }
    }
  }
  _bump()
}

/** Claim activity milestone */
export function claimMilestone(index) {
  if (_claimedMilestones.has(index)) return false
  const ms = dailyData.activityMilestones[index]
  if (!ms || _activityPoints < ms.points) return false
  _claimedMilestones.add(index)
  for (const [key, val] of Object.entries(ms.reward)) {
    addCurrency(key, val)
  }
  _bump()
  return true
}

/** Get daily quest info for UI */
export function getDailyQuestInfo() {
  return {
    quests: dailyData.quests.map(q => ({
      ...q,
      current: _dailyProgress[q.id].current,
      completed: _dailyProgress[q.id].completed,
    })),
    activityPoints: _activityPoints,
    milestones: dailyData.activityMilestones.map((ms, i) => ({
      ...ms,
      claimed: _claimedMilestones.has(i),
      canClaim: !_claimedMilestones.has(i) && _activityPoints >= ms.points,
    })),
  }
}

/** Reset daily quests */
export function resetDailyQuests() {
  for (const id in _dailyProgress) {
    _dailyProgress[id] = { current: 0, completed: false }
  }
  _activityPoints = 0
  _claimedMilestones.clear()
  questSignals.activityPoints.value = 0
  _bump()
}

/* ── Achievements ── */

const _achievementProgress = {}
for (const a of achievementData.achievements) {
  _achievementProgress[a.id] = { current: 0, tier: -1 }
}

/** Update achievement progress */
export function updateAchievement(id, value) {
  const progress = _achievementProgress[id]
  if (!progress) return
  const def = achievementData.achievements.find(a => a.id === id)
  if (!def) return

  progress.current = value

  // Check tier advancement
  while (progress.tier < def.targets.length - 1 && progress.current >= def.targets[progress.tier + 1]) {
    progress.tier++
    const reward = def.rewards[progress.tier]
    if (reward) {
      for (const [key, val] of Object.entries(reward)) {
        addCurrency(key, val)
      }
    }
  }
  _bump()
}

/** Get achievement info for UI */
export function getAchievementInfo() {
  return achievementData.achievements.map(a => {
    const p = _achievementProgress[a.id]
    const nextTier = p.tier + 1
    return {
      ...a,
      current: p.current,
      currentTier: p.tier,
      tierName: p.tier >= 0 ? achievementData.tiers[p.tier] : null,
      nextTarget: nextTier < a.targets.length ? a.targets[nextTier] : null,
      isMaxed: nextTier >= a.targets.length,
    }
  })
}

/* ── Attendance ── */

let _attendanceDay = 0
let _consecutiveDays = 0
let _todayClaimed = false
const _claimedConsecutive = new Set()

/** Claim today's attendance */
export function claimAttendance() {
  if (_todayClaimed) return null
  _todayClaimed = true
  _attendanceDay = (_attendanceDay % attendanceData.cycleDays) + 1
  _consecutiveDays++

  const dayReward = attendanceData.dailyRewards.find(d => d.day === _attendanceDay)
  if (dayReward) {
    for (const [key, val] of Object.entries(dayReward.reward)) {
      addCurrency(key, val)
    }
  }

  // Check consecutive bonuses
  const bonusKeys = Object.keys(attendanceData.consecutiveBonus)
  for (const key of bonusKeys) {
    const days = parseInt(key)
    if (_consecutiveDays >= days && !_claimedConsecutive.has(key)) {
      _claimedConsecutive.add(key)
      for (const [k, v] of Object.entries(attendanceData.consecutiveBonus[key])) {
        addCurrency(k, v)
      }
    }
  }

  _bump()
  return dayReward
}

/** Get attendance info */
export function getAttendanceInfo() {
  return {
    currentDay: _attendanceDay,
    consecutiveDays: _consecutiveDays,
    todayClaimed: _todayClaimed,
    cycleDays: attendanceData.cycleDays,
    rewards: attendanceData.dailyRewards,
  }
}

/** Reset daily attendance flag (called at midnight) */
export function resetAttendanceDaily() {
  _todayClaimed = false
  _bump()
}

/* ── Serialization ── */

export function serializeQuests() {
  return {
    dailyProgress: { ..._dailyProgress },
    activityPoints: _activityPoints,
    claimedMilestones: [..._claimedMilestones],
    achievements: { ..._achievementProgress },
    attendanceDay: _attendanceDay,
    consecutiveDays: _consecutiveDays,
    todayClaimed: _todayClaimed,
  }
}

export function deserializeQuests(data) {
  if (!data) return
  if (data.dailyProgress) Object.assign(_dailyProgress, data.dailyProgress)
  if (data.activityPoints != null) { _activityPoints = data.activityPoints; questSignals.activityPoints.value = _activityPoints }
  if (data.claimedMilestones) { _claimedMilestones.clear(); data.claimedMilestones.forEach(i => _claimedMilestones.add(i)) }
  if (data.achievements) Object.assign(_achievementProgress, data.achievements)
  if (data.attendanceDay != null) _attendanceDay = data.attendanceDay
  if (data.consecutiveDays != null) _consecutiveDays = data.consecutiveDays
  if (data.todayClaimed != null) _todayClaimed = data.todayClaimed
  _bump()
}
