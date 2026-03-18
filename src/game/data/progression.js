export const QUESTS = [
  { id: "reach_stage_5", title: "첫 돌파", description: "전체 스테이지 5 도달", type: "stage_reached", target: 5, rewardGold: 120 },
  { id: "reach_stage_15", title: "초반 질주", description: "전체 스테이지 15 도달", type: "stage_reached", target: 15, rewardGold: 260 },
  { id: "enhance_weapon_3", title: "강화의 시작", description: "무기 강화 +3 달성", type: "weapon_level", target: 3, rewardGold: 220 },
  { id: "upgrade_skill_3", title: "스킬 숙련", description: "아무 스킬이나 레벨 3 달성", type: "skill_level_any", target: 3, rewardGold: 260 },
  { id: "claim_afk_once", title: "방치 보상", description: "오프라인 보상 1회 수령", type: "afk_claims", target: 1, rewardGold: 150 },
]

export const ACHIEVEMENTS = [
  { id: "clear_25", title: "사냥꾼", description: "스테이지 25회 클리어", type: "stage_clears", target: 25, rewardGold: 400 },
  { id: "clear_60", title: "베테랑", description: "스테이지 60회 클리어", type: "stage_clears", target: 60, rewardGold: 850 },
  { id: "earn_5000", title: "금고 확보", description: "누적 골드 5,000 획득", type: "gold_earned", target: 5000, rewardGold: 500 },
  { id: "enhance_5", title: "숙련 대장장이", description: "무기 강화 +5 달성", type: "weapon_level", target: 5, rewardGold: 700 },
  { id: "skill_upgrade_10", title: "숙련 마스터", description: "누적 스킬 강화 10회", type: "skill_upgrades", target: 10, rewardGold: 900 },
]

export function buildProgressTracker() {
  return {
    stageClears: 0,
    goldEarned: 0,
    afkClaims: 0,
    skillUpgrades: 0,
  }
}

export function getProgressValue(definition, state) {
  const { hero, stage, progression } = state

  switch (definition.type) {
    case "stage_reached":
      return stage
    case "weapon_level":
      return hero.weapon.level
    case "skill_level_any":
      return Math.max(hero.skillLevels?.q ?? 1, hero.skillLevels?.e ?? 1, hero.skillLevels?.r ?? 1)
    case "afk_claims":
      return progression.afkClaims
    case "stage_clears":
      return progression.stageClears
    case "gold_earned":
      return progression.goldEarned
    case "skill_upgrades":
      return progression.skillUpgrades
    default:
      return 0
  }
}

export function buildClaimState(definitions) {
  return definitions.reduce((acc, definition) => {
    acc[definition.id] = false
    return acc
  }, {})
}
