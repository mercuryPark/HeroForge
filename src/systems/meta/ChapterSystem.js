/**
 * ChapterSystem — chapter selection, progression, boss challenge logic.
 */
import { signal } from '@preact/signals'
import chaptersData from '@data/chapters.json'
import { Level } from '@components/character'

const CHAPTERS = chaptersData.chapters

export const chapterSignals = {
  currentChapter: signal(0),
  highestUnlocked: signal(0),
  bossActive: signal(false),
  bossTimeRemaining: signal(0),
}

/**
 * Get all chapters with unlock status.
 * @param {number} playerLevel
 */
export function getChapterList(playerLevel) {
  return CHAPTERS.map((ch, i) => ({
    ...ch,
    index: i,
    isUnlocked: i <= chapterSignals.highestUnlocked.value,
    canEnter: playerLevel >= ch.requiredLevel && i <= chapterSignals.highestUnlocked.value,
  }))
}

/** Get current chapter data */
export function getCurrentChapter() {
  return CHAPTERS[chapterSignals.currentChapter.value] || CHAPTERS[0]
}

/** Select a chapter to hunt in */
export function selectChapter(index) {
  if (index > chapterSignals.highestUnlocked.value) return false
  chapterSignals.currentChapter.value = index
  return true
}

/**
 * Start a boss challenge for the current chapter.
 * @returns {object|null} boss data
 */
export function startBossChallenge() {
  const ch = getCurrentChapter()
  if (!ch.boss) return null
  chapterSignals.bossActive.value = true
  chapterSignals.bossTimeRemaining.value = ch.boss.timeLimit
  return ch.boss
}

/**
 * Boss challenge tick — decrement timer.
 * @param {number} dt - delta time in seconds
 * @returns {boolean} true if time expired
 */
export function tickBossTimer(dt) {
  if (!chapterSignals.bossActive.value) return false
  chapterSignals.bossTimeRemaining.value -= dt
  if (chapterSignals.bossTimeRemaining.value <= 0) {
    chapterSignals.bossActive.value = false
    return true // time expired — fail
  }
  return false
}

/**
 * Boss defeated — unlock next chapter.
 */
export function onBossDefeated() {
  chapterSignals.bossActive.value = false
  const current = chapterSignals.currentChapter.value
  if (current >= chapterSignals.highestUnlocked.value && current < CHAPTERS.length - 1) {
    chapterSignals.highestUnlocked.value = current + 1
  }
}

/** Get chapter count */
export function getChapterCount() {
  return CHAPTERS.length
}

/** Serialize */
export function serializeChapterProgress() {
  return {
    currentChapter: chapterSignals.currentChapter.value,
    highestUnlocked: chapterSignals.highestUnlocked.value,
  }
}

/** Deserialize */
export function deserializeChapterProgress(data) {
  if (!data) return
  if (data.currentChapter != null) chapterSignals.currentChapter.value = data.currentChapter
  if (data.highestUnlocked != null) chapterSignals.highestUnlocked.value = data.highestUnlocked
}
