const SAVE_KEY = "heroforge.save.v1"

export function saveSnapshot(snapshot) {
  const payload = {
    schemaVersion: 1,
    savedAt: Date.now(),
    snapshot,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

export function loadSnapshot() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (parsed.schemaVersion !== 1) return null
    return parsed.snapshot
  } catch {
    return null
  }
}
