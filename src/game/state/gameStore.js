import { create } from "zustand"
import { DEFAULT_CLASS, HERO_CLASSES } from "../data/classes"
import { getDropChance, getEnhanceCost, getStageRewards } from "../data/balance"
import {
  COMPANION_MAX_LEVEL,
  getCompanionEnhanceCost,
  getCompanionStats,
  normalizeCompanion,
  SUMMON_COST,
  summonCompanion,
} from "../data/companions"
import { createDungeonState, DUNGEONS, ensureDungeonState, getDungeonRewards } from "../data/dungeons"
import { ACHIEVEMENTS, buildClaimState, buildProgressTracker, getProgressValue, QUESTS } from "../data/progression"
import { createDailyRewardState, ensureDailyRewardState, getDailyReward, SHOP_ITEMS } from "../data/shop"
import { getSkillUpgradeCost, SKILL_UPGRADE_RULES } from "../data/skills"
import { computePower, recalculateHeroAttack } from "../core/formulas"
import { getNextStage, getPreviousStage, getStageMeta } from "../data/stages"
import { runCombatTick, spawnEnemy } from "../systems/combatSystem"
import { calculateAfkRewards } from "../systems/afkSystem"
import { applyExp } from "../systems/growthSystem"
import { createEquipmentItem, enhanceWeapon, getFusionResult, rollEquipmentDrop, rollEquipmentSlot } from "../systems/equipmentSystem"
import { clearSnapshot, loadSnapshot, saveSnapshot } from "../../infra/storage/saveGame"

function buildHero(classId = DEFAULT_CLASS, name = "새 영웅") {
  const model = HERO_CLASSES[classId]
  return {
    name,
    classId,
    className: model.name,
    level: 1,
    exp: 0,
    maxHp: model.base.hp,
    hp: model.base.hp,
    maxMp: model.base.mp,
    mp: model.base.mp,
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
    skillLevels: { q: 1, e: 1, r: 1 },
    attackTimer: 0,
    skillTimer: 0,
    gold: 0,
    weapon: { level: 0, bonusAtk: 0, rarity: "common", rarityLabel: "일반", equippedItemId: null, equippedItemName: "훈련용 검" },
    armor: { defBonus: 0, hpBonus: 0, rarity: "common", rarityLabel: "일반", equippedItemId: null, equippedItemName: "천 갑옷" },
    helmet: { defBonus: 0, hpBonus: 0, rarity: "common", rarityLabel: "일반", equippedItemId: null, equippedItemName: "가죽 두건" },
    equipmentBonus: { atk: 0, def: 0, hp: 0 },
  }
}

function applyEquipmentBonuses(hero, nextEquipment) {
  const currentBonus = hero.equipmentBonus ?? { atk: 0, def: 0, hp: 0 }
  const nextBonus = {
    atk: (nextEquipment.weapon?.bonusAtk ?? 0) + (nextEquipment.armor?.atkBonus ?? 0) + (nextEquipment.helmet?.atkBonus ?? 0),
    def: (nextEquipment.armor?.defBonus ?? 0) + (nextEquipment.helmet?.defBonus ?? 0),
    hp: (nextEquipment.armor?.hpBonus ?? 0) + (nextEquipment.helmet?.hpBonus ?? 0),
  }
  const maxHp = hero.maxHp - currentBonus.hp + nextBonus.hp
  const hpRatio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1

  return {
    ...hero,
    ...nextEquipment,
    atk: recalculateHeroAttack({
      ...hero,
      ...nextEquipment,
      equipmentBonus: nextBonus,
    }),
    def: Number((hero.def - currentBonus.def + nextBonus.def).toFixed(2)),
    maxHp: Math.max(1, Math.floor(maxHp)),
    hp: Math.max(1, Math.floor(Math.max(1, maxHp) * hpRatio)),
    equipmentBonus: nextBonus,
  }
}

function getEquipmentSlotScore(item) {
  if (!item) return 0
  if (item.slot === "weapon") return item.atkBonus
  return (item.defBonus ?? 0) * 3 + (item.hpBonus ?? 0) * 0.2 + (item.atkBonus ?? 0)
}

function initialState() {
  const hero = buildHero(DEFAULT_CLASS, "")
  const stageMeta = getStageMeta(1)
  return {
    profile: {
      name: "",
      classLocked: false,
      createdAt: null,
    },
    hero,
    stage: stageMeta.globalStage,
    chapter: stageMeta.chapter,
    stageInChapter: stageMeta.stageInChapter,
    enemy: spawnEnemy(1),
    autoHunt: true,
    companions: [],
    activeCompanionId: null,
    inventory: [],
    lootLog: [],
    dungeons: createDungeonState(),
    dailyReward: createDailyRewardState(),
    progression: buildProgressTracker(),
    questClaims: buildClaimState(QUESTS),
    achievementClaims: buildClaimState(ACHIEVEMENTS),
    afkSummary: null,
    lastTickAt: Date.now(),
    power: computePower(hero),
  }
}

function withProgress(state, updates = {}) {
  return {
    ...state,
    progression: {
      ...state.progression,
      ...updates,
    },
  }
}

function grantGold(hero, amount) {
  return {
    ...hero,
    gold: hero.gold + amount,
  }
}

function applyCompanionBonus(hero, companion) {
  const currentBonus = hero.companionBonus ?? { atk: 0, def: 0, hp: 0, critRate: 0 }
  const companionStats = companion ? getCompanionStats(companion) : null
  const nextBonus = companionStats
    ? {
        atk: companionStats.atkBonus,
        def: companionStats.defBonus,
        hp: companionStats.hpBonus,
        critRate: companionStats.critRateBonus,
      }
    : { atk: 0, def: 0, hp: 0, critRate: 0 }

  const maxHp = hero.maxHp - currentBonus.hp + nextBonus.hp
  const hpRatio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1
  return {
    ...hero,
    atk: recalculateHeroAttack({
      ...hero,
      companionBonus: nextBonus,
    }),
    def: Number((hero.def - currentBonus.def + nextBonus.def).toFixed(2)),
    critRate: Number((hero.critRate - currentBonus.critRate + nextBonus.critRate).toFixed(4)),
    maxHp: Math.max(1, Math.floor(maxHp)),
    hp: Math.max(1, Math.floor(Math.max(1, maxHp) * hpRatio)),
    companionBonus: nextBonus,
  }
}

export const useGameStore = create((set, get) => ({
  ...initialState(),

  createCharacter: (name, classId) => {
    const current = get()
    if (current.profile.classLocked) return

    const next = initialState()
    next.profile = {
      name,
      classLocked: true,
      createdAt: Date.now(),
    }
    next.hero = buildHero(classId, name)
    next.power = computePower(next.hero)
    next.lootLog = [`${name}님이 ${next.hero.className}로 모험을 시작했습니다.`, "자동사냥이 기본 활성화되어 있습니다."]
    set(next)
  },

  chooseClass: (classId) => {
    if (get().profile.classLocked) return
    const next = initialState()
    next.hero = buildHero(classId, next.profile.name)
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

  claimAfkRewards: () => {
    const s = get()
    if (!s.afkSummary) return

    const hero = applyExp(grantGold(s.hero, s.afkSummary.gold), s.afkSummary.exp)
    const next = withProgress(s, {
      afkClaims: s.progression.afkClaims + 1,
      goldEarned: s.progression.goldEarned + s.afkSummary.gold,
    })
    set({
      ...next,
      hero,
      afkSummary: null,
      power: computePower(hero),
      lootLog: [
        `AFK 보상 수령: 골드 +${s.afkSummary.gold} / 경험치 +${s.afkSummary.exp}`,
        ...s.lootLog,
      ].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  upgradeSkill: (skillKey) => {
    const s = get()
    const currentLevel = s.hero.skillLevels?.[skillKey] ?? 1
    const rule = SKILL_UPGRADE_RULES[skillKey]
    if (!rule) return
    if (currentLevel >= rule.maxLevel) {
      set({
        ...s,
        lootLog: [`${rule.label}은(는) 이미 최대 레벨입니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const cost = getSkillUpgradeCost(skillKey, currentLevel)
    if (s.hero.gold < cost) {
      set({
        ...s,
        lootLog: [`${rule.label} 강화 골드가 부족합니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const hero = {
      ...s.hero,
      gold: s.hero.gold - cost,
      skillLevels: {
        ...s.hero.skillLevels,
        [skillKey]: currentLevel + 1,
      },
    }
    const next = withProgress(s, {
      skillUpgrades: s.progression.skillUpgrades + 1,
    })

    set({
      ...next,
      hero,
      power: computePower(hero),
      lootLog: [`${rule.label} 레벨 ${currentLevel + 1} 달성`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  tick: (dt) => {
    const updated = runCombatTick(get(), dt, Math.random)
    const stageMeta = getStageMeta(updated.stage)
    updated.power = computePower(updated.hero)
    updated.chapter = stageMeta.chapter
    updated.stageInChapter = stageMeta.stageInChapter
    updated.dungeons = ensureDungeonState(updated.dungeons)
    updated.dailyReward = ensureDailyRewardState(updated.dailyReward)
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
    const currentMeta = getStageMeta(s.stage)
    const { exp: expGain, gold: goldGain } = getStageRewards(s.stage)

    const hero = applyExp(grantGold(s.hero, goldGain), expGain)
    const stage = getNextStage(s.stage)
    const stageMeta = getStageMeta(stage)
    const enemy = spawnEnemy(stage)
    const inventory = s.inventory.slice(0, 49)
    const stageLabel = `챕터 ${currentMeta.chapter}-${currentMeta.stageInChapter}`
    const clearedText = currentMeta.isFinalStage
      ? `최종 스테이지 정복 (+경험치 ${expGain} / +골드 ${goldGain})`
      : `${stageLabel} 클리어 (+경험치 ${expGain} / +골드 ${goldGain})`
    const lootLog = [clearedText, ...s.lootLog].slice(0, 8)

    if (Math.random() < getDropChance(s.stage)) {
      const drop = rollEquipmentDrop(Math.random)
      const item = createEquipmentItem(drop, rollEquipmentSlot(Math.random), Date.now())
      inventory.unshift(item)
      lootLog.unshift(`획득: ${item.name} (${item.slot === "weapon" ? `공격 +${item.atkBonus}` : `방어 +${item.defBonus} / 체력 +${item.hpBonus}`})`)

      const slotState = hero[item.slot]
      if (getEquipmentSlotScore(item) > getEquipmentSlotScore({ slot: item.slot, ...slotState })) {
        Object.assign(hero, applyEquipmentBonuses(hero, {
          weapon: item.slot === "weapon" ? {
            ...hero.weapon,
            bonusAtk: item.atkBonus,
            rarity: item.rarity,
            rarityLabel: item.rarityLabel,
            equippedItemId: item.id,
            equippedItemName: item.name,
          } : hero.weapon,
          armor: item.slot === "armor" ? {
            atkBonus: item.atkBonus,
            defBonus: item.defBonus,
            hpBonus: item.hpBonus,
            rarity: item.rarity,
            rarityLabel: item.rarityLabel,
            equippedItemId: item.id,
            equippedItemName: item.name,
          } : hero.armor,
          helmet: item.slot === "helmet" ? {
            atkBonus: item.atkBonus,
            defBonus: item.defBonus,
            hpBonus: item.hpBonus,
            rarity: item.rarity,
            rarityLabel: item.rarityLabel,
            equippedItemId: item.id,
            equippedItemName: item.name,
          } : hero.helmet,
        }))
        lootLog.unshift(`자동 장착: ${item.name}`)
      }
    }

    const next = withProgress(s, {
      stageClears: s.progression.stageClears + 1,
      goldEarned: s.progression.goldEarned + goldGain,
    })

    set({
      ...next,
      hero,
      stage,
      chapter: stageMeta.chapter,
      stageInChapter: stageMeta.stageInChapter,
      enemy,
      inventory,
      power: computePower(hero),
      lootLog: lootLog.slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  onHeroDefeated: () => {
    const s = get()
    const stage = getPreviousStage(s.stage)
    const stageMeta = getStageMeta(stage)
    const enemy = spawnEnemy(stage)
    const hero = { ...s.hero, hp: s.hero.maxHp }

    set({
      ...s,
      hero,
      stage,
      chapter: stageMeta.chapter,
      stageInChapter: stageMeta.stageInChapter,
      enemy,
      lootLog: ["전투에서 패배했습니다. 스테이지가 1 감소합니다.", ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  tryEnhanceWeapon: () => {
    const cost = getEnhanceCost(get().hero.weapon.level)
    const { hero, result } = enhanceWeapon(get().hero, cost, Math.random)
    const msg = result === "success" ? `강화 성공: +${hero.weapon.level}` : result === "fail" ? "강화 실패" : "골드가 부족합니다"

    set((s) => ({
      ...s,
      hero,
      power: computePower(hero),
      lootLog: [msg, ...s.lootLog].slice(0, 8),
    }))
  },

  fuseEquipment: (rarityId) => {
    const s = get()
    const fusion = getFusionResult(rarityId)
    if (!fusion) {
      set({
        ...s,
        lootLog: ["이 등급은 더 이상 합성할 수 없습니다.", ...s.lootLog].slice(0, 8),
      })
      return
    }

    const candidates = s.inventory.filter((item) => item.rarity === rarityId)
    if (candidates.length < fusion.requirement) {
      set({
        ...s,
        lootLog: [`${fusion.source.label} 장비 ${fusion.requirement}개가 필요합니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const consumeIds = new Set(candidates.slice(0, fusion.requirement).map((item) => item.id))
    const inventory = s.inventory.filter((item) => !consumeIds.has(item.id))
    const item = createEquipmentItem(fusion.target, candidates[0]?.slot ?? "weapon", `fuse-${Date.now()}`)
    inventory.unshift(item)

    const hero = { ...s.hero }
    const lootLog = [
      `합성 성공: ${fusion.source.label} 3개 -> ${item.name}`,
      ...s.lootLog,
    ]

    const slotState = hero[item.slot]
    if (getEquipmentSlotScore(item) > getEquipmentSlotScore({ slot: item.slot, ...slotState })) {
      Object.assign(hero, applyEquipmentBonuses(hero, {
        weapon: item.slot === "weapon" ? {
          ...hero.weapon,
          bonusAtk: item.atkBonus,
          rarity: item.rarity,
          rarityLabel: item.rarityLabel,
          equippedItemId: item.id,
          equippedItemName: item.name,
        } : hero.weapon,
        armor: item.slot === "armor" ? {
          atkBonus: item.atkBonus,
          defBonus: item.defBonus,
          hpBonus: item.hpBonus,
          rarity: item.rarity,
          rarityLabel: item.rarityLabel,
          equippedItemId: item.id,
          equippedItemName: item.name,
        } : hero.armor,
        helmet: item.slot === "helmet" ? {
          atkBonus: item.atkBonus,
          defBonus: item.defBonus,
          hpBonus: item.hpBonus,
          rarity: item.rarity,
          rarityLabel: item.rarityLabel,
          equippedItemId: item.id,
          equippedItemName: item.name,
        } : hero.helmet,
      }))
      lootLog.unshift(`자동 장착: ${item.name}`)
    }

    set({
      ...s,
      hero,
      inventory: inventory.slice(0, 49),
      power: computePower(hero),
      lootLog: lootLog.slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  claimQuestReward: (questId) => {
    const s = get()
    const quest = QUESTS.find((item) => item.id === questId)
    if (!quest || s.questClaims?.[questId]) return
    const progress = getProgressValue(quest, s)
    if (progress < quest.target) return

    const hero = grantGold(s.hero, quest.rewardGold)
    set({
      ...s,
      hero,
      questClaims: {
        ...s.questClaims,
        [questId]: true,
      },
      power: computePower(hero),
      lootLog: [`퀘스트 완료: ${quest.title} (+${quest.rewardGold} 골드)`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  runDungeon: (dungeonId) => {
    const s = get()
    const dungeon = DUNGEONS.find((item) => item.id === dungeonId)
    const dungeons = ensureDungeonState(s.dungeons)
    if (!dungeon) return
    if (s.chapter < dungeon.unlockChapter) {
      set({
        ...s,
        dungeons,
        lootLog: [`${dungeon.name}은(는) 챕터 ${dungeon.unlockChapter}부터 입장할 수 있습니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }
    if ((dungeons.attempts[dungeonId] ?? 0) <= 0) {
      set({
        ...s,
        dungeons,
        lootLog: [`${dungeon.name} 일일 입장 횟수를 모두 사용했습니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const rewards = getDungeonRewards(dungeonId, s)
    const hero = applyExp(grantGold(s.hero, rewards.gold), rewards.exp)
    const nextAttempts = {
      ...dungeons.attempts,
      [dungeonId]: Math.max(0, (dungeons.attempts[dungeonId] ?? 0) - 1),
    }
    const inventory = s.inventory.slice(0, 49)
    const lootLog = [
      `${dungeon.name} 클리어: 골드 +${rewards.gold} / 경험치 +${rewards.exp}`,
      ...s.lootLog,
    ]

    if (rewards.equipment) {
      const item = createEquipmentItem(rewards.equipment, rollEquipmentSlot(Math.random), `dungeon-${Date.now()}`)
      inventory.unshift(item)
      lootLog.unshift(`던전 획득: ${item.name}`)

      const slotState = hero[item.slot]
      if (getEquipmentSlotScore(item) > getEquipmentSlotScore({ slot: item.slot, ...slotState })) {
        Object.assign(hero, applyEquipmentBonuses(hero, {
          weapon: item.slot === "weapon" ? {
            ...hero.weapon,
            bonusAtk: item.atkBonus,
            rarity: item.rarity,
            rarityLabel: item.rarityLabel,
            equippedItemId: item.id,
            equippedItemName: item.name,
          } : hero.weapon,
          armor: item.slot === "armor" ? {
            atkBonus: item.atkBonus,
            defBonus: item.defBonus,
            hpBonus: item.hpBonus,
            rarity: item.rarity,
            rarityLabel: item.rarityLabel,
            equippedItemId: item.id,
            equippedItemName: item.name,
          } : hero.armor,
          helmet: item.slot === "helmet" ? {
            atkBonus: item.atkBonus,
            defBonus: item.defBonus,
            hpBonus: item.hpBonus,
            rarity: item.rarity,
            rarityLabel: item.rarityLabel,
            equippedItemId: item.id,
            equippedItemName: item.name,
          } : hero.helmet,
        }))
        lootLog.unshift(`자동 장착: ${item.name}`)
      }
    }

    const next = withProgress(s, {
      goldEarned: s.progression.goldEarned + rewards.gold,
    })

    set({
      ...next,
      hero,
      inventory: inventory.slice(0, 49),
      dungeons: {
        ...dungeons,
        attempts: nextAttempts,
      },
      power: computePower(hero),
      lootLog: lootLog.slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  buyShopItem: (itemId) => {
    const s = get()
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId)
    if (!item) return
    if (s.hero.gold < item.cost) {
      set({
        ...s,
        lootLog: [`${item.name} 구매 골드가 부족합니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const hero = {
      ...s.hero,
      gold: s.hero.gold - item.cost,
    }
    const dungeons = ensureDungeonState(s.dungeons)
    let lootLog = [`상점 구매: ${item.name}`, ...s.lootLog]

    if (item.type === "heal") {
      hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * item.value)
    }

    if (item.type === "mana") {
      hero.mp = Math.min(hero.maxMp, hero.mp + hero.maxMp * item.value)
    }

    if (item.type === "atk_buff") {
      hero.baseAtk = Number((hero.baseAtk * (1 + item.value)).toFixed(2))
      hero.atk = recalculateHeroAttack(hero)
    }

    let nextDungeons = dungeons
    if (item.type === "dungeon_refill") {
      nextDungeons = {
        ...dungeons,
        attempts: Object.fromEntries(
          DUNGEONS.map((dungeon) => [
            dungeon.id,
            Math.min(dungeon.attemptsPerDay, (dungeons.attempts[dungeon.id] ?? 0) + item.value),
          ])
        ),
      }
    }

    set({
      ...s,
      hero,
      dungeons: nextDungeons,
      power: computePower(hero),
      lootLog: lootLog.slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  summonCompanion: () => {
    const s = get()
    if (s.hero.gold < SUMMON_COST) {
      set({
        ...s,
        lootLog: [`동료 소환 골드가 부족합니다. 필요 골드: ${SUMMON_COST}`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const template = summonCompanion(Math.random)
    const companion = {
      ...normalizeCompanion(template),
      instanceId: `cp-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      obtainedAt: Date.now(),
    }
    const companions = [companion, ...s.companions].slice(0, 30)
    let hero = {
      ...s.hero,
      gold: s.hero.gold - SUMMON_COST,
    }
    let activeCompanionId = s.activeCompanionId
    const lootLog = [`동료 소환: ${companion.name} (${companion.rarity})`, ...s.lootLog]

    if (!activeCompanionId) {
      activeCompanionId = companion.instanceId
      hero = applyCompanionBonus(hero, companion)
      lootLog.unshift(`동료 장착: ${companion.name}`)
    }

    set({
      ...s,
      hero,
      companions,
      activeCompanionId,
      power: computePower(hero),
      lootLog: lootLog.slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  equipCompanion: (instanceId) => {
    const s = get()
    const companion = s.companions.find((entry) => entry.instanceId === instanceId)
    if (!companion) return
    const hero = applyCompanionBonus(s.hero, companion)
    set({
      ...s,
      hero,
      activeCompanionId: instanceId,
      power: computePower(hero),
      lootLog: [`동료 장착: ${companion.name}`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  upgradeCompanion: (instanceId) => {
    const s = get()
    const companion = s.companions.find((entry) => entry.instanceId === instanceId)
    if (!companion) return

    const level = companion.level ?? 1
    if (level >= COMPANION_MAX_LEVEL) {
      set({
        ...s,
        lootLog: [`${companion.name}은(는) 이미 최대 레벨입니다.`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const cost = getCompanionEnhanceCost(level)
    if (s.hero.gold < cost) {
      set({
        ...s,
        lootLog: [`${companion.name} 강화 골드가 부족합니다. 필요 골드: ${cost}`, ...s.lootLog].slice(0, 8),
      })
      return
    }

    const companions = s.companions.map((entry) =>
      entry.instanceId === instanceId
        ? { ...entry, level: Math.min(COMPANION_MAX_LEVEL, level + 1) }
        : entry
    )
    const upgraded = companions.find((entry) => entry.instanceId === instanceId)
    let hero = {
      ...s.hero,
      gold: s.hero.gold - cost,
    }

    if (s.activeCompanionId === instanceId) {
      hero = applyCompanionBonus(hero, upgraded)
    }

    set({
      ...s,
      hero,
      companions,
      power: computePower(hero),
      lootLog: [`동료 강화: ${companion.name} Lv.${level + 1}`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  claimDailyReward: () => {
    const s = get()
    const dailyReward = ensureDailyRewardState(s.dailyReward)
    if (dailyReward.claimed) return

    const rewards = getDailyReward(s)
    const hero = applyExp(grantGold(s.hero, rewards.gold), rewards.exp)
    const next = withProgress(s, {
      goldEarned: s.progression.goldEarned + rewards.gold,
    })

    set({
      ...next,
      hero,
      dailyReward: {
        ...dailyReward,
        claimed: true,
      },
      power: computePower(hero),
      lootLog: [`일일 보상 수령: 골드 +${rewards.gold} / 경험치 +${rewards.exp}`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  claimAchievementReward: (achievementId) => {
    const s = get()
    const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId)
    if (!achievement || s.achievementClaims?.[achievementId]) return
    const progress = getProgressValue(achievement, s)
    if (progress < achievement.target) return

    const hero = grantGold(s.hero, achievement.rewardGold)
    set({
      ...s,
      hero,
      achievementClaims: {
        ...s.achievementClaims,
        [achievementId]: true,
      },
      power: computePower(hero),
      lootLog: [`업적 달성: ${achievement.title} (+${achievement.rewardGold} 골드)`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  equipInventoryItem: (itemId) => {
    const s = get()
    const item = s.inventory.find((it) => it.id === itemId)
    if (!item) return

    const hero = applyEquipmentBonuses(s.hero, {
      weapon: item.slot === "weapon" ? {
        ...s.hero.weapon,
        bonusAtk: item.atkBonus,
        rarity: item.rarity,
        rarityLabel: item.rarityLabel,
        equippedItemId: item.id,
        equippedItemName: item.name,
      } : s.hero.weapon,
      armor: item.slot === "armor" ? {
        atkBonus: item.atkBonus,
        defBonus: item.defBonus,
        hpBonus: item.hpBonus,
        rarity: item.rarity,
        rarityLabel: item.rarityLabel,
        equippedItemId: item.id,
        equippedItemName: item.name,
      } : s.hero.armor,
      helmet: item.slot === "helmet" ? {
        atkBonus: item.atkBonus,
        defBonus: item.defBonus,
        hpBonus: item.hpBonus,
        rarity: item.rarity,
        rarityLabel: item.rarityLabel,
        equippedItemId: item.id,
        equippedItemName: item.name,
      } : s.hero.helmet,
    })

    set({
      ...s,
      hero,
      power: computePower(hero),
      lootLog: [`장착: ${item.name}`, ...s.lootLog].slice(0, 8),
      lastTickAt: Date.now(),
    })
  },

  save: () => {
    saveSnapshot(get())
  },

  load: () => {
    const snapshot = loadSnapshot()
    if (!snapshot) return

    const afk = snapshot.afkSummary?.effectiveSec ? snapshot.afkSummary : calculateAfkRewards(snapshot)
    const heroBase = {
      ...snapshot.hero,
      skillLevels: snapshot.hero?.skillLevels ?? { q: 1, e: 1, r: 1 },
      equipmentBonus: snapshot.hero?.equipmentBonus ?? { atk: 0, def: 0, hp: 0 },
      weapon: snapshot.hero?.weapon ?? { level: 0, bonusAtk: 0, rarity: "common", rarityLabel: "일반", equippedItemId: null, equippedItemName: "훈련용 검" },
      armor: snapshot.hero?.armor ?? { atkBonus: 0, defBonus: 0, hpBonus: 0, rarity: "common", rarityLabel: "일반", equippedItemId: null, equippedItemName: "천 갑옷" },
      helmet: snapshot.hero?.helmet ?? { atkBonus: 0, defBonus: 0, hpBonus: 0, rarity: "common", rarityLabel: "일반", equippedItemId: null, equippedItemName: "가죽 두건" },
    }
    heroBase.atk = recalculateHeroAttack({
      ...heroBase,
      companionBonus: heroBase.companionBonus ?? { atk: 0, def: 0, hp: 0, critRate: 0 },
    })
    const companions = (snapshot.companions ?? []).map((entry) => normalizeCompanion(entry))
    const hero = snapshot.activeCompanionId && snapshot.companions?.length
      ? applyCompanionBonus(heroBase, companions.find((entry) => entry.instanceId === snapshot.activeCompanionId) ?? null)
      : { ...heroBase, companionBonus: heroBase.companionBonus ?? { atk: 0, def: 0, hp: 0, critRate: 0 } }

    set({
      ...snapshot,
      profile: snapshot.profile ?? {
        name: snapshot.hero?.name ?? "",
        classLocked: Boolean(snapshot.hero?.classId),
        createdAt: snapshot.savedAt ?? Date.now(),
      },
      stage: getStageMeta(snapshot.stage ?? snapshot.globalStage ?? 1).globalStage,
      chapter: getStageMeta(snapshot.stage ?? snapshot.globalStage ?? 1).chapter,
      stageInChapter: getStageMeta(snapshot.stage ?? snapshot.globalStage ?? 1).stageInChapter,
      autoHunt: snapshot.autoHunt ?? true,
      inventory: snapshot.inventory ?? [],
      companions,
      activeCompanionId: snapshot.activeCompanionId ?? null,
      dungeons: ensureDungeonState(snapshot.dungeons),
      dailyReward: ensureDailyRewardState(snapshot.dailyReward),
      progression: snapshot.progression ?? buildProgressTracker(),
      questClaims: snapshot.questClaims ?? buildClaimState(QUESTS),
      achievementClaims: snapshot.achievementClaims ?? buildClaimState(ACHIEVEMENTS),
      hero,
      afkSummary: afk,
      power: computePower(hero),
      lastTickAt: Date.now(),
    })
  },

  reset: () => {
    clearSnapshot()
    set(initialState())
  },
}))
