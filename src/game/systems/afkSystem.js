import { AFK_BALANCE, getAfkRewardsPerSecond } from "../data/balance"
import { clampStage } from "../data/stages"

export function calculateAfkRewards(snapshot, now = Date.now()) {
  const maxSeconds = AFK_BALANCE.maxSeconds
  const elapsedSec = Math.max(0, Math.floor((now - (snapshot.lastTickAt || now)) / 1000))
  const effectiveSec = Math.min(elapsedSec, maxSeconds)

  const stage = clampStage(snapshot.stage ?? snapshot.globalStage ?? 1)
  const { goldPerSec, expPerSec } = getAfkRewardsPerSecond(stage)

  return {
    effectiveSec,
    gold: Math.floor(effectiveSec * goldPerSec),
    exp: Math.floor(effectiveSec * expPerSec),
  }
}
