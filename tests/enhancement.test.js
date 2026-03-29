/**
 * enhancement.test.js — tests for scroll, starforce, and potential systems.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { applyScroll, attemptStarforce, rerollPotential, enhancementCurrencies } from '../src/systems/meta/EnhancementSystem.js'
import { signal } from '@preact/signals'

function makeItem(overrides = {}) {
  return {
    id: 1,
    slotId: 'gloves',
    grade: 2, // epic
    itemLevel: 50,
    mainStat: { atk: 20, critRate: 5 },
    subOptions: [],
    scrollSlots: 7,
    starforce: 0,
    starforceBonus: { allStat: 0 },
    potentialGrade: null,
    potentialLines: [],
    ...overrides,
  }
}

describe('Scroll Enhancement', () => {
  it('100% scroll always succeeds', () => {
    const item = makeItem()
    const result = applyScroll(item, 'scroll_100')
    expect(result.success).toBe(true)
    expect(result.bonuses).not.toBeNull()
    expect(item.scrollSlots).toBe(6)
  })

  it('scroll fails when no slots remaining', () => {
    const item = makeItem({ scrollSlots: 0 })
    const result = applyScroll(item, 'scroll_100')
    expect(result.success).toBe(false)
  })

  it('scroll bonuses are applied to item mainStat', () => {
    const item = makeItem({ mainStat: { atk: 10, critRate: 3 } })
    const atkBefore = item.mainStat.atk
    const result = applyScroll(item, 'scroll_100')
    if (result.success && result.bonuses.atk) {
      expect(item.mainStat.atk).toBeGreaterThan(atkBefore)
    }
  })

  it('scroll success rate distribution (70% scroll)', () => {
    const N = 5000
    let successes = 0
    for (let i = 0; i < N; i++) {
      const item = makeItem({ scrollSlots: 999 })
      const result = applyScroll(item, 'scroll_70')
      if (result.success) successes++
    }
    const rate = successes / N
    expect(rate).toBeGreaterThan(0.63)
    expect(rate).toBeLessThan(0.77)
  })
})

describe('Starforce Enhancement', () => {
  beforeEach(() => {
    enhancementCurrencies.starforceScrolls.value = 1000
  })

  it('starforce success increases stars', () => {
    const item = makeItem({ starforce: 0 })
    const gold = signal(999999)
    // Run multiple times to get at least one success (95% rate at ★0)
    let gotSuccess = false
    for (let i = 0; i < 20; i++) {
      item.starforce = 0
      item.starforceBonus = { allStat: 0 }
      const result = attemptStarforce(item, gold)
      if (result.result === 'success') {
        expect(item.starforce).toBe(1)
        gotSuccess = true
        break
      }
    }
    expect(gotSuccess).toBe(true)
  })

  it('starforce fails without scrolls', () => {
    enhancementCurrencies.starforceScrolls.value = 0
    const item = makeItem({ starforce: 5 })
    const gold = signal(999999)
    const result = attemptStarforce(item, gold)
    expect(result.result).toBe('no_scrolls')
  })

  it('starforce fails without gold', () => {
    const item = makeItem({ starforce: 5 })
    const gold = signal(0)
    const result = attemptStarforce(item, gold)
    expect(result.result).toBe('no_gold')
  })

  it('starforce destroy drops 3 stars (G8)', () => {
    // Force high star for destroy chance
    const N = 10000
    let destroyCount = 0
    for (let i = 0; i < N; i++) {
      const item = makeItem({ starforce: 15, starforceBonus: { allStat: 50 } })
      enhancementCurrencies.starforceScrolls.value = 10000
      const gold = signal(99999999)
      const result = attemptStarforce(item, gold)
      if (result.result === 'destroy') {
        expect(item.starforce).toBe(12) // 15 - 3
        destroyCount++
      }
    }
    // At ★15, destroy chance is 10%
    const rate = destroyCount / N
    expect(rate).toBeGreaterThan(0.06)
    expect(rate).toBeLessThan(0.15)
  })

  it('starforce distribution at ★0 matches table (95% success)', () => {
    const N = 5000
    let successes = 0
    for (let i = 0; i < N; i++) {
      const item = makeItem({ starforce: 0, starforceBonus: { allStat: 0 } })
      enhancementCurrencies.starforceScrolls.value = 10000
      const gold = signal(99999999)
      const result = attemptStarforce(item, gold)
      if (result.result === 'success') successes++
    }
    const rate = successes / N
    expect(rate).toBeGreaterThan(0.90)
    expect(rate).toBeLessThan(0.99)
  })
})

describe('Potential System', () => {
  beforeEach(() => {
    enhancementCurrencies.normalCubes.value = 1000
    enhancementCurrencies.miracleCubes.value = 1000
  })

  it('reroll fails on Normal grade item', () => {
    const item = makeItem({ grade: 0 }) // Normal
    const result = rerollPotential(item, 'normal')
    expect(result.success).toBe(false)
  })

  it('reroll succeeds on Epic+ item', () => {
    const item = makeItem({ grade: 2 }) // Epic
    const result = rerollPotential(item, 'normal')
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(3)
  })

  it('potential lines have valid structure', () => {
    const item = makeItem({ grade: 3 }) // Unique
    const result = rerollPotential(item, 'normal')
    for (const line of result.lines) {
      expect(line.id).toBeDefined()
      expect(line.nameKr).toBeDefined()
      expect(typeof line.value).toBe('number')
      expect(line.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('miracle cube has higher grade-up rate', () => {
    const N = 2000
    let normalGradeUps = 0
    let miracleGradeUps = 0

    for (let i = 0; i < N; i++) {
      enhancementCurrencies.normalCubes.value = 10000
      enhancementCurrencies.miracleCubes.value = 10000
      const item1 = makeItem({ grade: 2, potentialGrade: 0 })
      const r1 = rerollPotential(item1, 'normal')
      if (r1.gradeUp) normalGradeUps++

      const item2 = makeItem({ grade: 2, potentialGrade: 0 })
      const r2 = rerollPotential(item2, 'miracle')
      if (r2.gradeUp) miracleGradeUps++
    }

    // Miracle (15%) should have roughly 3x the grade-ups of normal (5%)
    expect(miracleGradeUps).toBeGreaterThan(normalGradeUps)
  })

  it('additional cube requires starforce 12+', () => {
    enhancementCurrencies.additionalCubes.value = 100
    const item = makeItem({ grade: 2, starforce: 5 })
    const result = rerollPotential(item, 'additional')
    expect(result.success).toBe(false)

    item.starforce = 12
    const result2 = rerollPotential(item, 'additional')
    expect(result2.success).toBe(true)
  })
})
