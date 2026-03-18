import { ensureDungeonState } from "../../game/data/dungeons"
import { buildClaimState, buildProgressTracker, ACHIEVEMENTS, QUESTS } from "../../game/data/progression"
import { ensureDailyRewardState } from "../../game/data/shop"
import { normalizeCompanion } from "../../game/data/companions"

const SAVE_KEY = "heroforge.save.v2"
const LEGACY_SAVE_KEYS = ["heroforge.save.v2", "heroforge.save.v1"]
const GUIDE_KEY = "heroforge.guide.seen"
export const CURRENT_SCHEMA_VERSION = 2

function defaultCompanionBonus() {
  return { atk: 0, def: 0, hp: 0, critRate: 0 }
}

function migrateV1ToV2(snapshot, savedAt) {
  const hero = snapshot?.hero ?? {}
  const companions = (snapshot.companions ?? []).map((entry) => normalizeCompanion(entry))

  return {
    ...snapshot,
    savedAt,
    profile: snapshot.profile ?? {
      name: hero.name ?? "",
      classLocked: Boolean(hero.classId),
      createdAt: savedAt ?? Date.now(),
    },
    hero: {
      ...hero,
      skillLevels: hero.skillLevels ?? { q: 1, e: 1, r: 1 },
      companionBonus: hero.companionBonus ?? defaultCompanionBonus(),
      equipmentBonus: hero.equipmentBonus ?? { atk: 0, def: 0, hp: 0 },
      weapon: {
        level: hero.weapon?.level ?? 0,
        bonusAtk: hero.weapon?.bonusAtk ?? 0,
        rarity: hero.weapon?.rarity ?? "common",
        rarityLabel: hero.weapon?.rarityLabel ?? "일반",
        equippedItemId: hero.weapon?.equippedItemId ?? null,
        equippedItemName: hero.weapon?.equippedItemName ?? "훈련용 검",
      },
      armor: {
        atkBonus: hero.armor?.atkBonus ?? 0,
        defBonus: hero.armor?.defBonus ?? 0,
        hpBonus: hero.armor?.hpBonus ?? 0,
        rarity: hero.armor?.rarity ?? "common",
        rarityLabel: hero.armor?.rarityLabel ?? "일반",
        equippedItemId: hero.armor?.equippedItemId ?? null,
        equippedItemName: hero.armor?.equippedItemName ?? "천 갑옷",
      },
      helmet: {
        atkBonus: hero.helmet?.atkBonus ?? 0,
        defBonus: hero.helmet?.defBonus ?? 0,
        hpBonus: hero.helmet?.hpBonus ?? 0,
        rarity: hero.helmet?.rarity ?? "common",
        rarityLabel: hero.helmet?.rarityLabel ?? "일반",
        equippedItemId: hero.helmet?.equippedItemId ?? null,
        equippedItemName: hero.helmet?.equippedItemName ?? "가죽 두건",
      },
    },
    companions,
    activeCompanionId: snapshot.activeCompanionId ?? null,
    dungeons: ensureDungeonState(snapshot.dungeons),
    dailyReward: ensureDailyRewardState(snapshot.dailyReward),
    progression: snapshot.progression ?? buildProgressTracker(),
    questClaims: snapshot.questClaims ?? buildClaimState(QUESTS),
    achievementClaims: snapshot.achievementClaims ?? buildClaimState(ACHIEVEMENTS),
  }
}

function migratePayload(parsed) {
  if (!parsed?.snapshot) return null

  if (parsed.schemaVersion === 1) {
    return migrateV1ToV2(parsed.snapshot, parsed.savedAt)
  }

  if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return migrateV1ToV2(parsed.snapshot, parsed.savedAt)
  }

  return null
}

export function saveSnapshot(snapshot) {
  const payload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: Date.now(),
    snapshot,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
}

export function loadSnapshot() {
  for (const key of LEGACY_SAVE_KEYS) {
    const raw = localStorage.getItem(key)
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw)
      const migrated = migratePayload(parsed)
      if (!migrated) continue
      if (key !== SAVE_KEY) saveSnapshot(migrated)
      return migrated
    } catch {
      continue
    }
  }

  return null
}

export function clearSnapshot() {
  for (const key of LEGACY_SAVE_KEYS) {
    localStorage.removeItem(key)
  }
  localStorage.removeItem(GUIDE_KEY)
}
