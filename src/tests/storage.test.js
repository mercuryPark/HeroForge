import { describe, expect, it, beforeEach } from "vitest"
import { clearSnapshot, CURRENT_SCHEMA_VERSION, loadSnapshot, saveSnapshot } from "../infra/storage/saveGame"

describe("save migration", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("loads and migrates legacy v1 saves into the latest shape", () => {
    localStorage.setItem(
      "heroforge.save.v1",
      JSON.stringify({
        schemaVersion: 1,
        savedAt: 1000,
        snapshot: {
          hero: {
            name: "테스터",
            classId: "warrior",
            hp: 100,
            maxHp: 100,
            atk: 20,
            def: 5,
            critRate: 0.1,
            critDmg: 0.5,
          },
          companions: [
            {
              id: "sprout",
              name: "새싹 정령",
              rarity: "일반",
              atkBonus: 3,
              defBonus: 1,
              hpBonus: 18,
              critRateBonus: 0,
              instanceId: "legacy-cp",
            },
          ],
          stage: 8,
        },
      })
    )

    const migrated = loadSnapshot()
    expect(migrated.profile.name).toBe("테스터")
    expect(migrated.hero.skillLevels).toEqual({ q: 1, e: 1, r: 1 })
    expect(migrated.hero.weapon).toMatchObject({ rarity: "common", rarityLabel: "일반" })
    expect(migrated.companions[0].level).toBe(1)
    expect(migrated.dungeons).toBeTruthy()
    expect(migrated.dailyReward).toBeTruthy()
  })

  it("writes the current schema version", () => {
    saveSnapshot({ hero: { name: "현재" }, stage: 1 })
    const payload = JSON.parse(localStorage.getItem("heroforge.save.v2"))
    expect(payload.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it("clears both legacy and current save keys", () => {
    localStorage.setItem("heroforge.save.v1", "{}")
    localStorage.setItem("heroforge.save.v2", "{}")
    clearSnapshot()
    expect(localStorage.getItem("heroforge.save.v1")).toBeNull()
    expect(localStorage.getItem("heroforge.save.v2")).toBeNull()
  })
})
