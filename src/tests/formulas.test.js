import { describe, expect, it } from "vitest"
import { expToNextLevel, hitChance } from "../game/core/formulas"

describe("game formulas", () => {
  it("exp curve increases by level", () => {
    expect(expToNextLevel(2)).toBeGreaterThan(expToNextLevel(1))
    expect(expToNextLevel(10)).toBeGreaterThan(expToNextLevel(5))
  })

  it("hit chance is clamped", () => {
    expect(hitChance(999, 0)).toBeLessThanOrEqual(0.96)
    expect(hitChance(1, 99)).toBeGreaterThanOrEqual(0.1)
  })
})
