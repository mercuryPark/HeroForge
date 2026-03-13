import { create } from "zustand"
import { DEFAULT_CLASS, HERO_CLASSES } from "../data/classes"
import { computePower } from "../core/formulas"
import { runCombatTick, spawnEnemy } from "../systems/combatSystem"
import { calculateAfkRewards } from "../systems/afkSystem"
import { applyExp } from "../systems/growthSystem"
import { enhanceWeapon, rollEquipmentDrop } from "../systems/equipmentSystem"
import { loadSnapshot, saveSnapshot } from "../../infra/storage/saveGame"

function buildHero(classId = DEFAULT_CLASS) {
  const model = HERO_CLASSES[classId]
  return {
    classId,
    className: model.name,
    level: 1,
    exp: 0,
    maxHp: model.base.hp,
    hp: model.base.hp,
    baseAtk: model.base.atk,
    atk: model.base.atk,
    def: model.base.def,
    attackSpeed: model.base.attackSpeed,
    critRate: model.base.critRate,
    critDmg: model.base.critDmg,
    evasion: model.base.evasion,
    accuracy: model.base.accuracy,
    growth: model.growth,
    skill: model.skill,
    attackTimer: 0,
    skillTimer: 0,
    gold: 0,
    weapon: { level: 0, bonusAtk: 0 },
  }
}

function initialState() {
  const hero = buildHero(DEFAULT_CLASS)
  return {
    hero,
    stage: 1,
    enemy: spawnEnemy(1),
    autoHunt: false,
    inventory: [],
    lootLog: [],
    afkSummary: null,
    lastTickAt: Date.now(),
    power: computePower(hero),
  }
}

export const useGameStore = create((set, get) => ({
  ...initialState(),

  chooseClass: (classId) => {
    const next = initialState()
    next.hero = buildHero(classId)
    next.power = computePower(next.hero)
    set(next)
  },

  toggleAutoHunt: () => {
    set((s) => ({
      ...s,
      autoHunt: !s.autoHunt,
      lootLog: [`자동사냥 ${!s.autoHunt ? "활성화" : "비활성화"}`, ...s.lootLog].slice(0, 8),
    }))
  },

  tick: (dt) => {
    const updated = runCombatTick(get(), dt, Math.random)
    updated.power = computePower(updated.hero)
    set(updated)
  },

  syncRealtimeCombat: ({ heroHp, enemyHp }) => {
    set((s) => ({
      ...s,
      hero: {
        ...s.hero,
        hp: Math.max(0, Math.min(s.hero.maxHp, heroHp)),
      },
      enemy: {
        ...s.enemy,
        hp: Math.max(0, Math.min(s.enemy.maxHp, enemyHp)),
      },
      lastTickAt: Date.now(),
    }))
  },

  onEnemyDefeated: () => {
    const s = get()
    const expGain = Math.floor(12 + s.stage * 2.1)
    const goldGain = Math.floor(15 + s.stage * 3)

    const hero = applyExp({ ...s.hero, gold: s.hero.gold + goldGain }, expGain)
    const stage = s.stage + 1
    const enemy = spawnEnemy(stage)
    const inventory = s.inventory.slice(0, 49)
    const lootLog = [`스테이지 ${s.stage} 클리어 (+경험치 ${expGain} / +골드 ${goldGain})`, ...s.lootLog].slice(0, 8)

    if (Math.random() < 0.36) {
      const drop = rollEquipmentDrop(Math.random)
      const item = {
        id: `it-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        name: `${drop.label} 무기`,
        rarity: drop.id,
        rarityLabel: drop.label,
        atkBonus: drop.atkBonus,
        obtainedAt: Date.now(),
      }
      inventory.unshift(item)
      lootLog.unshift(`획득: ${item.name} (공격 +${item.atkBonus})`)

      if (item.atkBonus > hero.weapon.bonusAtk) {
        hero.weapon = { ...hero.weapon, bonusAtk: item.atkBonus }
        hero.atk = Number((hero.baseAtk + hero.weapon.bonusAtk).toFixed(2))
        lootLog.unshift(`자동 장착: ${item.name}`)
      }
    }

    set({
      ...s,
      hero,
      stage,
      enemy,
      inventory,
      power: computePower(hero),
      lootLog: lootLog.slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  onHeroDefeated: () => {
    const s = get()
    const stage = Math.max(1, s.stage - 1)
    const enemy = spawnEnemy(stage)
    const hero = { ...s.hero, hp: s.hero.maxHp }

    set({
      ...s,
      hero,
      stage,
      enemy,
      lootLog: ["전투에서 패배했습니다. 스테이지가 1 감소합니다.", ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  tryEnhanceWeapon: () => {
    const cost = Math.floor(80 * Math.pow(1.25, get().hero.weapon.level))
    const { hero, result } = enhanceWeapon(get().hero, cost, Math.random)
    const msg = result === "success" ? `강화 성공: +${hero.weapon.level}` : result === "fail" ? "강화 실패" : "골드가 부족합니다"

    set((s) => ({
      ...s,
      hero,
      power: computePower(hero),
      lootLog: [msg, ...s.lootLog].slice(0, 8),
    }))
  },

  equipInventoryItem: (itemId) => {
    const s = get()
    const item = s.inventory.find((it) => it.id === itemId)
    if (!item) return

    const hero = {
      ...s.hero,
      weapon: {
        ...s.hero.weapon,
        bonusAtk: item.atkBonus,
      },
    }
    hero.atk = Number((hero.baseAtk + hero.weapon.bonusAtk).toFixed(2))

    set({
      ...s,
      hero,
      power: computePower(hero),
      lootLog: [`장착: ${item.name} (공격 +${item.atkBonus})`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  save: () => {
    saveSnapshot(get())
  },

  load: () => {
    const snapshot = loadSnapshot()
    if (!snapshot) return

    const afk = calculateAfkRewards(snapshot)
    const heroWithAfk = applyExp({ ...snapshot.hero, gold: snapshot.hero.gold + afk.gold }, afk.exp)

    set({
      ...snapshot,
      autoHunt: snapshot.autoHunt ?? false,
      inventory: snapshot.inventory ?? [],
      hero: heroWithAfk,
      afkSummary: afk,
      power: computePower(heroWithAfk),
      lastTickAt: Date.now(),
    })
  },

  reset: () => {
    set(initialState())
  },
}))
