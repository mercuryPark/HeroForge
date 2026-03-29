/**
 * gacha.test.js — gacha probability verification.
 *
 * Tests:
 *   - R/SR/SSR rate distribution matches expected
 *   - Pity system triggers at 80 pulls
 *   - 10-pull SR guarantee works
 *   - Duplicate → star rank-up
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  gachaPull, gachaTenPull, getCollection, clearCompanions,
} from '../src/systems/meta/CompanionSystem.js'
import { setCurrency, getCurrencyValue } from '../src/core/CurrencyManager.js'

beforeEach(() => {
  clearCompanions()
  setCurrency('gems', 999999)
})

describe('Gacha single pull', () => {
  it('returns a companion object', () => {
    const result = gachaPull()
    expect(result).not.toBeNull()
    expect(result.companionId).toBeDefined()
    expect(result.rarity).toBeGreaterThanOrEqual(0)
    expect(result.rarity).toBeLessThanOrEqual(2)
    expect(result.star).toBe(1)
  })

  it('deducts gems', () => {
    setCurrency('gems', 200)
    gachaPull()
    expect(getCurrencyValue('gems')).toBe(100)
  })

  it('fails when gems insufficient', () => {
    setCurrency('gems', 50)
    const result = gachaPull()
    expect(result).toBeNull()
  })
})

describe('Gacha rate distribution', () => {
  it('R/SR/SSR rates match expected (10K pulls)', () => {
    const N = 10000
    const counts = { 0: 0, 1: 0, 2: 0 }

    for (let i = 0; i < N; i++) {
      clearCompanions()
      setCurrency('gems', 999999)
      const result = gachaPull()
      if (result) counts[result.rarity]++
    }

    const rRate = counts[0] / N
    const srRate = counts[1] / N
    const ssrRate = counts[2] / N

    // R ~80%, SR ~17%, SSR ~3% + pity bonus
    expect(rRate).toBeGreaterThan(0.70)
    expect(rRate).toBeLessThan(0.88)
    expect(srRate).toBeGreaterThan(0.12)
    expect(srRate).toBeLessThan(0.24)
    expect(ssrRate).toBeGreaterThan(0.02)
    expect(ssrRate).toBeLessThan(0.08)
  })
})

describe('Pity system', () => {
  it('guarantees SSR within 80 pulls', () => {
    let gotSSR = false
    for (let i = 0; i < 80; i++) {
      const result = gachaPull()
      if (result && result.rarity === 2) {
        gotSSR = true
        break
      }
    }
    expect(gotSSR).toBe(true)
  })
})

describe('10-pull', () => {
  it('returns exactly 10 companions', () => {
    const results = gachaTenPull()
    expect(results.length).toBe(10)
  })

  it('guarantees at least one SR+ in 10-pull', () => {
    // Run multiple 10-pulls to verify SR guarantee
    let allHaveSR = true
    for (let t = 0; t < 20; t++) {
      clearCompanions()
      setCurrency('gems', 999999)
      const results = gachaTenPull()
      const hasSRPlus = results.some(r => r.rarity >= 1)
      if (!hasSRPlus) { allHaveSR = false; break }
    }
    expect(allHaveSR).toBe(true)
  })

  it('costs 900 gems', () => {
    setCurrency('gems', 1000)
    gachaTenPull()
    expect(getCurrencyValue('gems')).toBe(100)
  })
})

describe('Duplicate star rank-up', () => {
  it('increases star on duplicate companion', () => {
    // Pull many times to get duplicates
    for (let i = 0; i < 50; i++) {
      gachaPull()
    }

    const collection = getCollection()
    // At least one companion should have star > 1 from duplicates
    const hasRankUp = collection.some(c => c.star > 1)
    // With 14 unique companions and 50 pulls, very likely to get duplicates
    expect(hasRankUp).toBe(true)
  })
})
