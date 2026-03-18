import { getTodayKey } from "./dungeons"

export const SHOP_ITEMS = [
  {
    id: "healing_potion",
    name: "상급 회복 물약",
    description: "즉시 HP를 최대 체력의 35% 회복합니다.",
    cost: 140,
    type: "heal",
    value: 0.35,
  },
  {
    id: "focus_tonic",
    name: "집중 비약",
    description: "즉시 MP를 최대 마나의 40% 회복합니다.",
    cost: 150,
    type: "mana",
    value: 0.4,
  },
  {
    id: "combat_scroll",
    name: "전투 두루마리",
    description: "현재 공격력을 6% 상승시킵니다.",
    cost: 260,
    type: "atk_buff",
    value: 0.06,
  },
  {
    id: "dungeon_ticket",
    name: "던전 충전권",
    description: "모든 던전 입장 횟수를 1회씩 회복합니다.",
    cost: 420,
    type: "dungeon_refill",
    value: 1,
  },
]

export function createDailyRewardState(now = new Date()) {
  return {
    key: getTodayKey(now),
    claimed: false,
  }
}

export function ensureDailyRewardState(current, now = new Date()) {
  const todayKey = getTodayKey(now)
  if (!current || current.key !== todayKey) return createDailyRewardState(now)
  return current
}

export function getDailyReward(state) {
  const chapterFactor = 1 + (state.chapter - 1) * 0.2
  return {
    gold: Math.floor(180 * chapterFactor),
    exp: Math.floor(140 * chapterFactor),
  }
}
