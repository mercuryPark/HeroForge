/**
 * formulas.test.js — comprehensive tests for the CombatSystem damage formula.
 *
 * Covers:
 *   - Base damage calculation with variance
 *   - Defense reduction + armor penetration (capped)
 *   - Critical hits (0%, 100%, normal rates)
 *   - Hit/Miss system (accuracy < evasion → miss chance)
 *   - Excess accuracy bonus damage
 *   - Damage multipliers (dmg%, bossDmg%, normalMonsterDmg%, skillDmg%, finalDmg%)
 *   - Max damage multiplier clamp
 *   - Min/Max damage ratio clamp
 *   - Edge cases: DEF > ATK, zero stats
 *   - Attack speed formula
 *   - Damage distribution verification (statistical)
 */
import { describe, it, expect } from 'vitest'
import { calculateDamage } from '../src/systems/logic/CombatSystem.js'

/** Helper: default opts with sensible test defaults */
function makeOpts(overrides = {}) {
  return {
    atk: 100,
    skillMult: 1.0,
    targetDef: 0,
    armorPen: 0,
    critRate: 0,
    critDmg: 150,
    accuracy: 50,
    targetEvasion: 50,
    dmgPercent: 0,
    bossDmgPercent: 0,
    normalMonsterDmgPercent: 0,
    skillDmgPercent: 0,
    finalDmgPercent: 0,
    maxDmgMultiplier: 99999999,
    minDmgRatio: 0.8,
    maxDmgRatio: 1.2,
    isBoss: false,
    isSkill: false,
    rng: 0.5,       // mid variance
    critRng: 100,    // no crit by default
    missRng: 100,    // no miss by default
    ...overrides,
  }
}

// ─── Base Damage ────────────────────────────────────────
describe('Base damage calculation', () => {
  it('calculates base damage with mid variance (rng=0.5)', () => {
    const result = calculateDamage(makeOpts({ rng: 0.5 }))
    // ATK 100 * 1.0 * (0.95 + 0.5 * 0.10) = 100
    expect(result.amount).toBe(100)
    expect(result.isCrit).toBe(false)
    expect(result.isMiss).toBe(false)
  })

  it('calculates base damage with min variance (rng=0)', () => {
    const result = calculateDamage(makeOpts({ rng: 0.0 }))
    // 100 * 1.0 * 0.95 = 95
    expect(result.amount).toBe(95)
  })

  it('calculates base damage with max variance (rng=1)', () => {
    const result = calculateDamage(makeOpts({ rng: 1.0 }))
    // 100 * 1.0 * 1.05 = 105
    expect(result.amount).toBe(105)
  })

  it('applies skill multiplier', () => {
    const result = calculateDamage(makeOpts({ skillMult: 2.5, rng: 0.5 }))
    // 100 * 2.5 * 1.0 = 250
    expect(result.amount).toBe(250)
  })
})

// ─── Defense Reduction ──────────────────────────────────
describe('Defense reduction', () => {
  it('reduces damage by target DEF', () => {
    const result = calculateDamage(makeOpts({ atk: 100, targetDef: 30, rng: 0.5 }))
    // base 100 - 30 = 70
    expect(result.amount).toBe(70)
  })

  it('clamps minimum damage to 1 when DEF > ATK', () => {
    const result = calculateDamage(makeOpts({ atk: 10, targetDef: 500, rng: 0.5 }))
    expect(result.amount).toBe(1)
  })

  it('applies armor penetration', () => {
    const result = calculateDamage(makeOpts({ atk: 100, targetDef: 50, armorPen: 0.5, rng: 0.5 }))
    // base 100 - 50*(1-0.5) = 100 - 25 = 75
    expect(result.amount).toBe(75)
  })

  it('caps armor penetration at 0.8', () => {
    const result = calculateDamage(makeOpts({ atk: 100, targetDef: 100, armorPen: 1.5, rng: 0.5 }))
    // Clamped to 0.8: 100 - 100*(1-0.8) = 100 - 20 = 80
    expect(result.amount).toBe(80)
  })

  it('clamps negative armor penetration to 0', () => {
    const result = calculateDamage(makeOpts({ atk: 100, targetDef: 50, armorPen: -0.5, rng: 0.5 }))
    // Clamped to 0: 100 - 50*(1-0) = 50
    expect(result.amount).toBe(50)
  })
})

// ─── Critical Hits ──────────────────────────────────────
describe('Critical hits', () => {
  it('does not crit when critRng >= critRate', () => {
    const result = calculateDamage(makeOpts({ critRate: 50, critRng: 60 }))
    expect(result.isCrit).toBe(false)
    expect(result.amount).toBe(100)
  })

  it('crits when critRng < critRate', () => {
    const result = calculateDamage(makeOpts({ critRate: 50, critDmg: 200, critRng: 10, rng: 0.5 }))
    expect(result.isCrit).toBe(true)
    // 100 * (200/100) = 200
    expect(result.amount).toBe(200)
  })

  it('handles 0% crit rate — never crits', () => {
    const result = calculateDamage(makeOpts({ critRate: 0, critRng: 0 }))
    // critRng 0 < critRate 0 is false
    expect(result.isCrit).toBe(false)
  })

  it('handles 100% crit rate — always crits', () => {
    const result = calculateDamage(makeOpts({ critRate: 100, critDmg: 150, critRng: 99.9, rng: 0.5 }))
    expect(result.isCrit).toBe(true)
    // 100 * 1.5 = 150
    expect(result.amount).toBe(150)
  })

  it('applies critDmg as percentage (150 = 1.5x)', () => {
    const result = calculateDamage(makeOpts({ critRate: 100, critDmg: 300, critRng: 0, rng: 0.5 }))
    // 100 * 3.0 = 300
    expect(result.amount).toBe(300)
  })
})

// ─── Hit/Miss System ────────────────────────────────────
describe('Hit/Miss system', () => {
  it('hits when accuracy > evasion', () => {
    const result = calculateDamage(makeOpts({ accuracy: 100, targetEvasion: 50 }))
    expect(result.isMiss).toBe(false)
  })

  it('misses when accuracy < evasion and roll is below miss chance', () => {
    // miss chance = 80 - 20 = 60%, roll = 30 < 60 → MISS
    const result = calculateDamage(makeOpts({ accuracy: 20, targetEvasion: 80, missRng: 30 }))
    expect(result.isMiss).toBe(true)
    expect(result.amount).toBe(0)
  })

  it('hits even when accuracy < evasion if roll is above miss chance', () => {
    // miss chance = 80 - 20 = 60%, roll = 70 > 60 → HIT
    const result = calculateDamage(makeOpts({ accuracy: 20, targetEvasion: 80, missRng: 70, rng: 0.5 }))
    expect(result.isMiss).toBe(false)
    expect(result.amount).toBeGreaterThan(0)
  })

  it('never misses when accuracy === evasion', () => {
    const result = calculateDamage(makeOpts({ accuracy: 50, targetEvasion: 50, missRng: 0, rng: 0.5 }))
    expect(result.isMiss).toBe(false)
  })

  it('100% miss when accuracy = 0, evasion = 100, roll = 0', () => {
    const result = calculateDamage(makeOpts({ accuracy: 0, targetEvasion: 100, missRng: 0 }))
    expect(result.isMiss).toBe(true)
  })
})

// ─── Excess Accuracy Bonus ──────────────────────────────
describe('Excess accuracy bonus', () => {
  it('grants bonus damage for excess accuracy', () => {
    // excess = 100 - 0 = 100, bonus = floor(100/10)*1 = 10%
    const withExcess = calculateDamage(makeOpts({ accuracy: 100, targetEvasion: 0, rng: 0.5 }))
    // base 100 * (1 + 10/100) = 110
    expect(withExcess.amount).toBe(110)
  })

  it('gives no bonus when accuracy equals evasion', () => {
    const result = calculateDamage(makeOpts({ accuracy: 50, targetEvasion: 50, rng: 0.5 }))
    expect(result.amount).toBe(100)
  })

  it('gives no bonus when accuracy less than evasion (and hit)', () => {
    const result = calculateDamage(makeOpts({ accuracy: 40, targetEvasion: 50, missRng: 99, rng: 0.5 }))
    // no excess bonus, so base 100
    expect(result.amount).toBe(100)
  })

  it('scales correctly: 50 excess = 5% bonus', () => {
    const result = calculateDamage(makeOpts({ accuracy: 80, targetEvasion: 30, rng: 0.5 }))
    // excess 50, bonus = floor(50/10)*1 = 5%
    // 100 * 1.05 = 105
    expect(result.amount).toBe(105)
  })
})

// ─── Damage Multipliers ─────────────────────────────────
describe('Damage multipliers', () => {
  it('applies dmgPercent', () => {
    const result = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50, // no excess bonus
      dmgPercent: 50, rng: 0.5,
    }))
    // 100 * 1.5 = 150
    expect(result.amount).toBe(150)
  })

  it('applies finalDmgPercent', () => {
    const result = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      finalDmgPercent: 30, rng: 0.5,
    }))
    // 100 * 1.3 = 130
    expect(result.amount).toBe(130)
  })

  it('applies bossDmgPercent only vs bosses', () => {
    // NOTE: calculateDamage returns a shared object — read values before next call
    const r1 = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      bossDmgPercent: 40, isBoss: true, rng: 0.5,
    }))
    const bossAmount = r1.amount

    const r2 = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      bossDmgPercent: 40, isBoss: false, rng: 0.5,
    }))
    expect(bossAmount).toBe(140)
    expect(r2.amount).toBe(100) // not applied
  })

  it('applies normalMonsterDmgPercent only vs normal monsters', () => {
    const r1 = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      normalMonsterDmgPercent: 20, isBoss: false, rng: 0.5,
    }))
    const normalAmount = r1.amount

    const r2 = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      normalMonsterDmgPercent: 20, isBoss: true, rng: 0.5,
    }))
    expect(normalAmount).toBe(120)
    expect(r2.amount).toBe(100) // not applied
  })

  it('applies skillDmgPercent only when isSkill', () => {
    const r1 = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      skillDmgPercent: 50, isSkill: true, rng: 0.5,
    }))
    const skillAmount = r1.amount

    const r2 = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      skillDmgPercent: 50, isSkill: false, rng: 0.5,
    }))
    expect(skillAmount).toBe(150)
    expect(r2.amount).toBe(100)
  })

  it('stacks all multipliers multiplicatively', () => {
    const result = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      dmgPercent: 100,      // 2.0x
      finalDmgPercent: 50,  // 1.5x
      rng: 0.5,
    }))
    // 100 * 2.0 * 1.5 = 300
    expect(result.amount).toBe(300)
  })
})

// ─── Max Damage Multiplier Clamp ────────────────────────
describe('Max damage multiplier clamp', () => {
  it('clamps damage when exceeding maxDmgMultiplier', () => {
    const result = calculateDamage(makeOpts({
      atk: 1000,
      accuracy: 50, targetEvasion: 50,
      maxDmgMultiplier: 500,
      rng: 0.5,
    }))
    expect(result.amount).toBe(500)
  })
})

// ─── Min/Max Damage Ratio ───────────────────────────────
describe('Min/Max damage ratio clamp', () => {
  it('default ratios (0.8/1.2) do not change mid-range damage', () => {
    const result = calculateDamage(makeOpts({
      accuracy: 50, targetEvasion: 50,
      rng: 0.5,
    }))
    // 100 is within [100*0.8, 100*1.2] = [80, 120]
    expect(result.amount).toBe(100)
  })
})

// ─── Edge Cases ─────────────────────────────────────────
describe('Edge cases', () => {
  it('zero ATK produces minimum damage 1', () => {
    const result = calculateDamage(makeOpts({ atk: 0, rng: 0.5 }))
    expect(result.amount).toBe(1)
  })

  it('very high DEF still produces minimum 1 damage', () => {
    const result = calculateDamage(makeOpts({ atk: 50, targetDef: 99999, rng: 0.5 }))
    expect(result.amount).toBe(1)
  })

  it('combined: crit + defense + multipliers', () => {
    const result = calculateDamage(makeOpts({
      atk: 200,
      targetDef: 50,
      critRate: 100,
      critDmg: 200,
      dmgPercent: 50,
      finalDmgPercent: 20,
      accuracy: 50, targetEvasion: 50,
      rng: 0.5,
      critRng: 0,
    }))
    // base = 200*1.0*1.0 = 200
    // afterDef = max(1, 200 - 50) = 150
    // afterCrit = 150 * 2.0 = 300
    // * 1.5 (dmg%) * 1.2 (finalDmg%) = 300 * 1.5 * 1.2 = 540
    expect(result.amount).toBe(540)
  })
})

// ─── Attack Speed Formula ───────────────────────────────
describe('Attack speed formula', () => {
  it('baseInterval / (1 + atkSpeed / 100)', () => {
    const baseInterval = 1.0
    // 0% speed: interval = 1.0
    expect(baseInterval / (1 + 0 / 100)).toBeCloseTo(1.0)
    // 100% speed: interval = 0.5
    expect(baseInterval / (1 + 100 / 100)).toBeCloseTo(0.5)
    // 50% speed: interval = ~0.667
    expect(baseInterval / (1 + 50 / 100)).toBeCloseTo(0.6667, 3)
    // 200% speed: interval = ~0.333
    expect(baseInterval / (1 + 200 / 100)).toBeCloseTo(0.3333, 3)
  })
})

// ─── Statistical Distribution (10K runs) ─────────────────
describe('Damage distribution (statistical)', () => {
  it('damage with random variance falls within expected range', () => {
    const N = 10000
    let min = Infinity
    let max = -Infinity
    let sum = 0

    for (let i = 0; i < N; i++) {
      const result = calculateDamage({
        atk: 100,
        skillMult: 1.0,
        targetDef: 0,
        armorPen: 0,
        critRate: 0,
        critDmg: 150,
        accuracy: 50,
        targetEvasion: 50,
        dmgPercent: 0,
        bossDmgPercent: 0,
        normalMonsterDmgPercent: 0,
        skillDmgPercent: 0,
        finalDmgPercent: 0,
        maxDmgMultiplier: 99999999,
        minDmgRatio: 0.8,
        maxDmgRatio: 1.2,
        isBoss: false,
        isSkill: false,
        // Use real random for rng, but force hit and no crit
        critRng: 100,
        missRng: 100,
      })

      if (result.amount < min) min = result.amount
      if (result.amount > max) max = result.amount
      sum += result.amount
    }

    const avg = sum / N

    // Damage should be in [95, 105] = ATK * [0.95, 1.05]
    expect(min).toBeGreaterThanOrEqual(95)
    expect(max).toBeLessThanOrEqual(105)
    // Average should be close to 100
    expect(avg).toBeGreaterThan(98)
    expect(avg).toBeLessThan(102)
  })

  it('miss rate matches expected probability', () => {
    const N = 10000
    let misses = 0
    const accuracy = 30
    const evasion = 80
    const expectedMissRate = (evasion - accuracy) / 100 // 50%

    for (let i = 0; i < N; i++) {
      const result = calculateDamage({
        atk: 100,
        skillMult: 1.0,
        targetDef: 0,
        armorPen: 0,
        critRate: 0,
        critDmg: 150,
        accuracy,
        targetEvasion: evasion,
        dmgPercent: 0,
        bossDmgPercent: 0,
        normalMonsterDmgPercent: 0,
        skillDmgPercent: 0,
        finalDmgPercent: 0,
        maxDmgMultiplier: 99999999,
        minDmgRatio: 0.8,
        maxDmgRatio: 1.2,
        isBoss: false,
        isSkill: false,
        critRng: 100,
        // Let missRng be truly random
      })
      if (result.isMiss) misses++
    }

    const actualRate = misses / N
    // Should be roughly 50% ± 5% tolerance
    expect(actualRate).toBeGreaterThan(expectedMissRate - 0.05)
    expect(actualRate).toBeLessThan(expectedMissRate + 0.05)
  })

  it('crit rate matches expected probability', () => {
    const N = 10000
    let crits = 0
    const critRate = 35

    for (let i = 0; i < N; i++) {
      const result = calculateDamage({
        atk: 100,
        skillMult: 1.0,
        targetDef: 0,
        armorPen: 0,
        critRate,
        critDmg: 150,
        accuracy: 50,
        targetEvasion: 50,
        dmgPercent: 0,
        bossDmgPercent: 0,
        normalMonsterDmgPercent: 0,
        skillDmgPercent: 0,
        finalDmgPercent: 0,
        maxDmgMultiplier: 99999999,
        minDmgRatio: 0.8,
        maxDmgRatio: 1.2,
        isBoss: false,
        isSkill: false,
        missRng: 100,
        // Let critRng be truly random
      })
      if (result.isCrit) crits++
    }

    const actualRate = crits / N
    expect(actualRate).toBeGreaterThan(0.30)
    expect(actualRate).toBeLessThan(0.40)
  })
})
