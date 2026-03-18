import { describe, expect, it } from "vitest"
import { expToNextLevel, hitChance, recalculateHeroAttack } from "../game/core/formulas"
import { getChapterBalance, getStageRewards } from "../game/data/balance"
import {
  COMPANION_MAX_LEVEL,
  COMPANION_POOL,
  getCompanionEnhanceCost,
  getCompanionStats,
  normalizeCompanion,
  summonCompanion,
} from "../game/data/companions"
import { createDungeonState, ensureDungeonState, getDungeonRewards } from "../game/data/dungeons"
import { FUSION_REQUIREMENT } from "../game/data/equipment"
import { ACHIEVEMENTS, QUESTS, buildProgressTracker, getProgressValue } from "../game/data/progression"
import { createDailyRewardState, ensureDailyRewardState, getDailyReward } from "../game/data/shop"
import { getNextStage, getPreviousStage, getStageMeta, MAX_STAGE } from "../game/data/stages"
import { createEquipmentItem, getFusionResult } from "../game/systems/equipmentSystem"

describe("game formulas", () => {
  it("exp curve increases by level", () => {
    expect(expToNextLevel(2)).toBeGreaterThan(expToNextLevel(1))
    expect(expToNextLevel(10)).toBeGreaterThan(expToNextLevel(5))
  })

  it("hit chance is clamped", () => {
    expect(hitChance(999, 0)).toBeLessThanOrEqual(0.96)
    expect(hitChance(1, 99)).toBeGreaterThanOrEqual(0.1)
  })

  it("maps stages into chapter and stage slots", () => {
    expect(getStageMeta(1)).toMatchObject({ chapter: 1, stageInChapter: 1, isBossStage: false })
    expect(getStageMeta(10)).toMatchObject({ chapter: 1, stageInChapter: 10, isBossStage: true })
    expect(getStageMeta(57)).toMatchObject({ chapter: 6, stageInChapter: 7, isBossStage: false })
    expect(getStageMeta(100)).toMatchObject({ chapter: 10, stageInChapter: 10, isBossStage: true, isFinalStage: true })
  })

  it("clamps stage progression within the 100-stage campaign", () => {
    expect(getPreviousStage(1)).toBe(1)
    expect(getNextStage(MAX_STAGE)).toBe(MAX_STAGE)
  })

  it("ramps chapter difficulty after chapter 3", () => {
    expect(getChapterBalance(30).enemyHpMul).toBeLessThan(getChapterBalance(31).enemyHpMul)
    expect(getChapterBalance(30).enemyAtkMul).toBeLessThan(getChapterBalance(31).enemyAtkMul)
    expect(getStageRewards(31).gold).toBeGreaterThan(getStageRewards(30).gold)
  })

  it("reads quest and achievement progress from state", () => {
    const state = {
      stage: 16,
      hero: {
        weapon: { level: 4 },
        skillLevels: { q: 2, e: 3, r: 1 },
      },
      progression: {
        ...buildProgressTracker(),
        afkClaims: 1,
        stageClears: 28,
        goldEarned: 5200,
        skillUpgrades: 7,
      },
    }

    expect(getProgressValue(QUESTS[1], state)).toBe(16)
    expect(getProgressValue(QUESTS[3], state)).toBe(3)
    expect(getProgressValue(ACHIEVEMENTS[0], state)).toBe(28)
    expect(getProgressValue(ACHIEVEMENTS[2], state)).toBe(5200)
  })

  it("returns the next rarity for equipment fusion", () => {
    expect(getFusionResult("common")).toMatchObject({
      requirement: FUSION_REQUIREMENT,
      source: { id: "common" },
      target: { id: "uncommon" },
    })
    expect(getFusionResult("legendary")).toBeNull()
  })

  it("builds armor equipment with defensive stats", () => {
    const item = createEquipmentItem({ id: "rare", label: "희귀", atkBonus: 12 }, "armor", 123)
    expect(item.slot).toBe("armor")
    expect(item.defBonus).toBeGreaterThan(0)
    expect(item.hpBonus).toBeGreaterThan(0)
  })

  it("resets dungeon attempts by day and gives scaled rewards", () => {
    const oldState = {
      resetKey: "2026-03-17",
      attempts: { gold_vault: 0, training_hall: 1, relic_cave: 0 },
    }
    const refreshed = ensureDungeonState(oldState, new Date("2026-03-18T09:00:00"))
    expect(refreshed).toEqual(createDungeonState(new Date("2026-03-18T09:00:00")))

    const rewards = getDungeonRewards("gold_vault", {
      chapter: 4,
      hero: { level: 12 },
    })
    expect(rewards.gold).toBeGreaterThan(220)
    expect(rewards.exp).toBe(0)
  })

  it("resets daily reward state and scales by chapter", () => {
    const oldReward = { key: "2026-03-17", claimed: true }
    const refreshed = ensureDailyRewardState(oldReward, new Date("2026-03-18T10:00:00"))
    expect(refreshed).toEqual(createDailyRewardState(new Date("2026-03-18T10:00:00")))

    const reward = getDailyReward({ chapter: 5 })
    expect(reward.gold).toBeGreaterThan(180)
    expect(reward.exp).toBeGreaterThan(140)
  })

  it("summons a companion from the configured pool", () => {
    const result = summonCompanion(() => 0)
    expect(COMPANION_POOL.some((entry) => entry.id === result.id)).toBe(true)
  })

  it("scales companion bonuses by level and clamps level bounds", () => {
    const companion = normalizeCompanion({ ...COMPANION_POOL[0], level: 99 })
    const stats = getCompanionStats(companion)

    expect(companion.level).toBe(COMPANION_MAX_LEVEL)
    expect(stats.atkBonus).toBeGreaterThan(COMPANION_POOL[0].atkBonus)
    expect(getCompanionEnhanceCost(3)).toBeGreaterThan(getCompanionEnhanceCost(1))
  })

  it("keeps equipment and companion attack bonuses when shop buffs are applied", () => {
    const hero = {
      baseAtk: 100,
      atk: 126,
      equipmentBonus: { atk: 18, def: 0, hp: 0 },
      companionBonus: { atk: 8, def: 0, hp: 0, critRate: 0 },
    }

    const buffed = {
      ...hero,
      baseAtk: Number((hero.baseAtk * 1.06).toFixed(2)),
    }

    expect(recalculateHeroAttack(buffed)).toBe(132)
  })
})
