export const CHAPTER_COUNT = 10
export const STAGES_PER_CHAPTER = 10
export const MAX_STAGE = CHAPTER_COUNT * STAGES_PER_CHAPTER
export const NORMAL_STAGE_KILL_TARGET = 5

export function clampStage(stage) {
  return Math.max(1, Math.min(MAX_STAGE, Math.floor(stage)))
}

export function getStageMeta(stage) {
  const globalStage = clampStage(stage)
  const chapter = Math.ceil(globalStage / STAGES_PER_CHAPTER)
  const stageInChapter = ((globalStage - 1) % STAGES_PER_CHAPTER) + 1
  const isBossStage = stageInChapter === STAGES_PER_CHAPTER
  const isFinalStage = globalStage === MAX_STAGE

  return {
    globalStage,
    chapter,
    stageInChapter,
    isBossStage,
    isFinalStage,
    killTarget: isBossStage ? 1 : NORMAL_STAGE_KILL_TARGET,
  }
}

export function getNextStage(stage) {
  return clampStage(stage + 1)
}

export function getPreviousStage(stage) {
  return clampStage(stage - 1)
}
