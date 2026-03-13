export function calculateAfkRewards(snapshot, now = Date.now()) {
  const maxSeconds = 8 * 60 * 60
  const elapsedSec = Math.max(0, Math.floor((now - (snapshot.lastTickAt || now)) / 1000))
  const effectiveSec = Math.min(elapsedSec, maxSeconds)

  const stageFactor = 1 + (snapshot.stage - 1) * 0.08
  const goldPerSec = 0.9 * stageFactor
  const expPerSec = 0.7 * stageFactor

  return {
    effectiveSec,
    gold: Math.floor(effectiveSec * goldPerSec),
    exp: Math.floor(effectiveSec * expPerSec),
  }
}
