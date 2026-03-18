import { rollWeighted } from "../core/formulas"

export const SUMMON_COST = 320
export const COMPANION_MAX_LEVEL = 10

export const COMPANION_POOL = [
  { id: "sprout", name: "새싹 정령", rarity: "일반", weight: 40, atkBonus: 3, defBonus: 1, hpBonus: 18, critRateBonus: 0 },
  { id: "emberfox", name: "불꽃여우", rarity: "고급", weight: 26, atkBonus: 6, defBonus: 2, hpBonus: 26, critRateBonus: 0.01 },
  { id: "glacierowl", name: "빙결 올빼미", rarity: "고급", weight: 24, atkBonus: 5, defBonus: 3, hpBonus: 24, critRateBonus: 0.01 },
  { id: "stormlynx", name: "폭풍 스라소니", rarity: "희귀", weight: 13, atkBonus: 10, defBonus: 4, hpBonus: 42, critRateBonus: 0.018 },
  { id: "moonwarden", name: "월광 수호수", rarity: "영웅", weight: 5, atkBonus: 16, defBonus: 7, hpBonus: 70, critRateBonus: 0.025 },
  { id: "auroradrake", name: "오로라 드레이크", rarity: "전설", weight: 1, atkBonus: 26, defBonus: 10, hpBonus: 110, critRateBonus: 0.04 },
]

export function summonCompanion(rng) {
  return rollWeighted(COMPANION_POOL, rng)
}

export function normalizeCompanion(companion) {
  return {
    ...companion,
    level: Math.min(COMPANION_MAX_LEVEL, Math.max(1, companion?.level ?? 1)),
  }
}

export function getCompanionEnhanceCost(level = 1) {
  return 140 + Math.max(0, level - 1) * 90
}

export function getCompanionStats(companion) {
  const normalized = normalizeCompanion(companion)
  const level = normalized.level
  const scale = 1 + (level - 1) * 0.22

  return {
    ...normalized,
    atkBonus: Math.round(normalized.atkBonus * scale),
    defBonus: Math.round(normalized.defBonus * scale),
    hpBonus: Math.round(normalized.hpBonus * scale),
    critRateBonus: Number((normalized.critRateBonus * scale).toFixed(4)),
  }
}
