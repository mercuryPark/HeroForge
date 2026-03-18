import { getStageMeta } from "./stages"

export const EXP_CURVE = {
  base: 28,
  exponent: 1.42,
}

export const CHAPTER_BALANCE = [
  { chapter: 1, enemyHpMul: 0.78, enemyAtkMul: 0.8, rewardMul: 1.02, dropChance: 0.42, note: "무조작 진입 구간" },
  { chapter: 2, enemyHpMul: 0.88, enemyAtkMul: 0.88, rewardMul: 1.05, dropChance: 0.4, note: "방치 전투 유지 구간" },
  { chapter: 3, enemyHpMul: 1.0, enemyAtkMul: 0.98, rewardMul: 1.08, dropChance: 0.38, note: "자동 클리어 마지막 챕터" },
  { chapter: 4, enemyHpMul: 1.18, enemyAtkMul: 1.15, rewardMul: 1.14, dropChance: 0.34, note: "강화 개입 시작" },
  { chapter: 5, enemyHpMul: 1.36, enemyAtkMul: 1.28, rewardMul: 1.2, dropChance: 0.32, note: "스킬/강화 병행 구간" },
  { chapter: 6, enemyHpMul: 1.58, enemyAtkMul: 1.44, rewardMul: 1.28, dropChance: 0.31, note: "중반 성장 점검 구간" },
  { chapter: 7, enemyHpMul: 1.84, enemyAtkMul: 1.62, rewardMul: 1.37, dropChance: 0.3, note: "장비 교체 요구 구간" },
  { chapter: 8, enemyHpMul: 2.12, enemyAtkMul: 1.82, rewardMul: 1.47, dropChance: 0.29, note: "강화 실패 리스크 체감 구간" },
  { chapter: 9, enemyHpMul: 2.42, enemyAtkMul: 2.04, rewardMul: 1.58, dropChance: 0.28, note: "엔드 전 준비 구간" },
  { chapter: 10, enemyHpMul: 2.78, enemyAtkMul: 2.28, rewardMul: 1.72, dropChance: 0.27, note: "최종 챕터" },
]

export const ENEMY_BALANCE = {
  baseHp: 58,
  hpPerStage: 6,
  stageHpScale: 0.11,
  baseAtk: 7.2,
  baseDef: 2.8,
  stageAtkScale: 0.11,
  stageDefScale: 0.11,
  attackSpeedBase: 0.78,
  attackSpeedPerStage: 0.004,
  evasionBase: 0.02,
  evasionPerStage: 0.0007,
  accuracy: 100,
}

export const REWARD_BALANCE = {
  expBase: 12,
  expPerStage: 2.05,
  goldBase: 16,
  goldPerStage: 3.1,
}

export const AFK_BALANCE = {
  maxSeconds: 8 * 60 * 60,
  goldPerSecBase: 0.92,
  expPerSecBase: 0.72,
  stageFactorStep: 0.07,
}

export const ENHANCE_COST_BALANCE = {
  baseCost: 80,
  growth: 1.24,
}

export function getChapterBalance(stage) {
  const meta = getStageMeta(stage)
  return CHAPTER_BALANCE[meta.chapter - 1] ?? CHAPTER_BALANCE[0]
}

export function getEnemyStageStats(stage) {
  const chapterBalance = getChapterBalance(stage)
  const stageScale = 1 + (stage - 1) * ENEMY_BALANCE.stageHpScale
  const attackScale = 1 + (stage - 1) * ENEMY_BALANCE.stageAtkScale
  const defenseScale = 1 + (stage - 1) * ENEMY_BALANCE.stageDefScale

  return {
    hp: Math.floor((ENEMY_BALANCE.baseHp * stageScale + stage * ENEMY_BALANCE.hpPerStage) * chapterBalance.enemyHpMul),
    atk: Number((ENEMY_BALANCE.baseAtk * attackScale * chapterBalance.enemyAtkMul).toFixed(2)),
    def: Number((ENEMY_BALANCE.baseDef * defenseScale * chapterBalance.enemyHpMul * 0.78).toFixed(2)),
    attackSpeed: Number((ENEMY_BALANCE.attackSpeedBase + stage * ENEMY_BALANCE.attackSpeedPerStage).toFixed(2)),
    evasion: Math.min(0.25, ENEMY_BALANCE.evasionBase + stage * ENEMY_BALANCE.evasionPerStage),
    accuracy: ENEMY_BALANCE.accuracy,
  }
}

export function getStageRewards(stage) {
  const chapterBalance = getChapterBalance(stage)
  return {
    exp: Math.floor((REWARD_BALANCE.expBase + stage * REWARD_BALANCE.expPerStage) * chapterBalance.rewardMul),
    gold: Math.floor((REWARD_BALANCE.goldBase + stage * REWARD_BALANCE.goldPerStage) * chapterBalance.rewardMul),
  }
}

export function getDropChance(stage) {
  return getChapterBalance(stage).dropChance
}

export function getAfkRewardsPerSecond(stage) {
  const chapterBalance = getChapterBalance(stage)
  const stageFactor = 1 + (stage - 1) * AFK_BALANCE.stageFactorStep
  return {
    goldPerSec: AFK_BALANCE.goldPerSecBase * stageFactor * chapterBalance.rewardMul,
    expPerSec: AFK_BALANCE.expPerSecBase * stageFactor * chapterBalance.rewardMul,
  }
}

export function getEnhanceCost(level) {
  return Math.floor(ENHANCE_COST_BALANCE.baseCost * Math.pow(ENHANCE_COST_BALANCE.growth, level))
}
