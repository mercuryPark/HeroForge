import { RARITY_TABLE } from "./equipment"

export const DUNGEONS = [
  {
    id: "gold_vault",
    name: "황금 금고",
    description: "골드를 대량으로 획득하는 재화 던전",
    unlockChapter: 2,
    attemptsPerDay: 3,
    rewardType: "gold",
  },
  {
    id: "training_hall",
    name: "수련 전당",
    description: "경험치를 집중적으로 획득하는 성장 던전",
    unlockChapter: 3,
    attemptsPerDay: 3,
    rewardType: "exp",
  },
  {
    id: "relic_cave",
    name: "유물 동굴",
    description: "장비를 확정 획득하는 파밍 던전",
    unlockChapter: 4,
    attemptsPerDay: 2,
    rewardType: "equipment",
  },
]

export function getTodayKey(now = new Date()) {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function createDungeonState(now = new Date()) {
  return {
    resetKey: getTodayKey(now),
    attempts: DUNGEONS.reduce((acc, dungeon) => {
      acc[dungeon.id] = dungeon.attemptsPerDay
      return acc
    }, {}),
  }
}

export function ensureDungeonState(current, now = new Date()) {
  const todayKey = getTodayKey(now)
  if (!current || current.resetKey !== todayKey) return createDungeonState(now)
  return current
}

export function getDungeonRewards(dungeonId, state) {
  const chapterFactor = 1 + (state.chapter - 1) * 0.18
  const levelFactor = 1 + (state.hero.level - 1) * 0.04

  if (dungeonId === "gold_vault") {
    return {
      gold: Math.floor(220 * chapterFactor * levelFactor),
      exp: 0,
      equipment: null,
    }
  }

  if (dungeonId === "training_hall") {
    return {
      gold: Math.floor(60 * chapterFactor),
      exp: Math.floor(180 * chapterFactor * levelFactor),
      equipment: null,
    }
  }

  if (dungeonId === "relic_cave") {
    const unlockIndex = Math.min(RARITY_TABLE.length - 2, Math.max(1, Math.floor((state.chapter - 1) / 2) + 1))
    const rewardRarity = RARITY_TABLE[unlockIndex]
    return {
      gold: Math.floor(80 * chapterFactor),
      exp: Math.floor(80 * chapterFactor),
      equipment: {
        rarity: rewardRarity.id,
        rarityLabel: rewardRarity.label,
        atkBonus: rewardRarity.atkBonus,
      },
    }
  }

  return { gold: 0, exp: 0, equipment: null }
}
