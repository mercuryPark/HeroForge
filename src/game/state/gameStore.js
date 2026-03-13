import { create } from "zustand"
import { DEFAULT_CLASS, HERO_CLASSES } from "../data/classes"
import { computePower } from "../core/formulas"
import { runCombatTick, spawnEnemy } from "../systems/combatSystem"
import { calculateAfkRewards } from "../systems/afkSystem"
import { applyExp } from "../systems/growthSystem"
import { enhanceWeapon } from "../systems/equipmentSystem"
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

    set({
      ...s,
      hero,
      stage,
      enemy,
      power: computePower(hero),
      lootLog: [`Clear Stage ${s.stage} (+${expGain} EXP / +${goldGain} Gold)`, ...s.lootLog].slice(0, 8),
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
      lootLog: ["You were defeated. Stage -1", ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  tryEnhanceWeapon: () => {
    const cost = Math.floor(80 * Math.pow(1.25, get().hero.weapon.level))
    const { hero, result } = enhanceWeapon(get().hero, cost, Math.random)
    const msg = result === "success" ? `Enhance +${hero.weapon.level} success` : result === "fail" ? "Enhance failed" : "Not enough gold"

    set((s) => ({
      ...s,
      hero,
      power: computePower(hero),
      lootLog: [msg, ...s.lootLog].slice(0, 8),
    }))
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
