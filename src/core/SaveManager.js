import { openDB } from 'idb'
import { SAVE_VERSION, AUTOSAVE_INTERVAL } from '@data/constants'
import { Position, PrevPosition } from '@components/transform'
import { Stats } from '@components/combat'
import { Level, Job, StatAllocation, AdvancementQuest } from '@components/character'
import { AnimState } from '@components/sprite'

const DB_NAME = 'heroforge'
const STORE_NAME = 'saves'

async function getDB() {
  return openDB(DB_NAME, SAVE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export class SaveManager {
  constructor() {
    this.db = null
    this.autoSaveTimer = null
  }

  async init() {
    this.db = await getDB()
  }

  // Serialize player entity's ECS component data into a plain JSON-serializable object
  serializeState(world, playerState) {
    const eid = world.playerEid
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        position: {
          x: Position.x[eid],
          y: Position.y[eid],
        },
        stats: {
          hp: Stats.hp[eid],
          maxHp: Stats.maxHp[eid],
          mp: Stats.mp[eid],
          maxMp: Stats.maxMp[eid],
          atk: Stats.atk[eid],
          def: Stats.def[eid],
          critRate: Stats.critRate[eid],
          critDmg: Stats.critDmg[eid],
          atkSpeed: Stats.atkSpeed[eid],
          accuracy: Stats.accuracy[eid],
          evasion: Stats.evasion[eid],
          armorPen: Stats.armorPen[eid],
          dmgPercent: Stats.dmgPercent[eid],
          bossDmgPercent: Stats.bossDmgPercent[eid],
          normalMonsterDmgPercent: Stats.normalMonsterDmgPercent[eid],
          skillDmgPercent: Stats.skillDmgPercent[eid],
          finalDmgPercent: Stats.finalDmgPercent[eid],
          maxDmgMultiplier: Stats.maxDmgMultiplier[eid],
          minDmgRatio: Stats.minDmgRatio[eid],
          maxDmgRatio: Stats.maxDmgRatio[eid],
        },
        level: {
          current: Level.current[eid],
          xp: Level.xp[eid],
          xpToNext: Level.xpToNext[eid],
        },
        job: {
          classId: Job.classId[eid],
          jobId: Job.jobId[eid],
          advancement: Job.advancement[eid],
        },
        statAllocation: {
          str: StatAllocation.str[eid],
          dex: StatAllocation.dex[eid],
          int_: StatAllocation.int_[eid],
          luk: StatAllocation.luk[eid],
          availablePoints: StatAllocation.availablePoints[eid],
        },
        advancementQuest: {
          questActive: AdvancementQuest.questActive[eid],
          questTier: AdvancementQuest.questTier[eid],
          killCount: AdvancementQuest.killCount[eid],
          killTarget: AdvancementQuest.killTarget[eid],
          questComplete: AdvancementQuest.questComplete[eid],
        },
      },
      economy: {
        gold: playerState?.gold || 0,
        monsterPoints: playerState?.monsterPoints || 0,
      },
    }
  }

  // Restore saved data back into ECS components
  deserializeState(world, saveData, playerState) {
    if (!saveData || !saveData.player) return false
    const eid = world.playerEid
    if (!eid) return false

    const p = saveData.player

    // Position
    if (p.position) {
      Position.x[eid] = p.position.x
      Position.y[eid] = p.position.y
      PrevPosition.x[eid] = p.position.x
      PrevPosition.y[eid] = p.position.y
    }

    // Stats
    if (p.stats) {
      Stats.hp[eid] = p.stats.hp
      Stats.maxHp[eid] = p.stats.maxHp
      Stats.mp[eid] = p.stats.mp
      Stats.maxMp[eid] = p.stats.maxMp
      Stats.atk[eid] = p.stats.atk
      Stats.def[eid] = p.stats.def
      Stats.critRate[eid] = p.stats.critRate
      Stats.critDmg[eid] = p.stats.critDmg
      Stats.atkSpeed[eid] = p.stats.atkSpeed
      Stats.accuracy[eid] = p.stats.accuracy
      Stats.evasion[eid] = p.stats.evasion
      Stats.armorPen[eid] = p.stats.armorPen || 0
      Stats.dmgPercent[eid] = p.stats.dmgPercent || 0
      Stats.bossDmgPercent[eid] = p.stats.bossDmgPercent || 0
      Stats.normalMonsterDmgPercent[eid] = p.stats.normalMonsterDmgPercent || 0
      Stats.skillDmgPercent[eid] = p.stats.skillDmgPercent || 0
      Stats.finalDmgPercent[eid] = p.stats.finalDmgPercent || 0
      Stats.maxDmgMultiplier[eid] = p.stats.maxDmgMultiplier || 0
      Stats.minDmgRatio[eid] = p.stats.minDmgRatio || 0
      Stats.maxDmgRatio[eid] = p.stats.maxDmgRatio || 0
    }

    // Level
    if (p.level) {
      Level.current[eid] = p.level.current
      Level.xp[eid] = p.level.xp
      Level.xpToNext[eid] = p.level.xpToNext
    }

    // Job
    if (p.job) {
      Job.classId[eid] = p.job.classId
      Job.jobId[eid] = p.job.jobId
      Job.advancement[eid] = p.job.advancement
    }

    // StatAllocation
    if (p.statAllocation) {
      StatAllocation.str[eid] = p.statAllocation.str
      StatAllocation.dex[eid] = p.statAllocation.dex
      StatAllocation.int_[eid] = p.statAllocation.int_
      StatAllocation.luk[eid] = p.statAllocation.luk
      StatAllocation.availablePoints[eid] = p.statAllocation.availablePoints
    }

    // AdvancementQuest
    if (p.advancementQuest) {
      AdvancementQuest.questActive[eid] = p.advancementQuest.questActive || 0
      AdvancementQuest.questTier[eid] = p.advancementQuest.questTier || 0
      AdvancementQuest.killCount[eid] = p.advancementQuest.killCount || 0
      AdvancementQuest.killTarget[eid] = p.advancementQuest.killTarget || 0
      AdvancementQuest.questComplete[eid] = p.advancementQuest.questComplete || 0
    }

    // Economy
    if (saveData.economy && playerState) {
      playerState.gold = saveData.economy.gold || 0
      playerState.monsterPoints = saveData.economy.monsterPoints || 0
    }

    return true
  }

  // Convenience: serialize + persist in one call
  async saveGame(world, playerState, key = 'main') {
    const data = this.serializeState(world, playerState)
    await this.save(key, data)
    return data
  }

  // Convenience: load + deserialize in one call
  async loadGame(world, playerState, key = 'main') {
    const data = await this.load(key)
    if (!data) return false
    return this.deserializeState(world, data, playerState)
  }

  // Alias for deleteSave
  async clearSave(key = 'main') {
    return this.deleteSave(key)
  }

  async save(key, data) {
    if (!this.db) await this.init()
    await this.db.put(STORE_NAME, data, key)
  }

  async load(key) {
    if (!this.db) await this.init()
    return this.db.get(STORE_NAME, key)
  }

  async hasSave(key = 'main') {
    if (!this.db) await this.init()
    const data = await this.db.get(STORE_NAME, key)
    return !!data
  }

  async deleteSave(key = 'main') {
    if (!this.db) await this.init()
    await this.db.delete(STORE_NAME, key)
  }

  // Export save as JSON (for manual backup)
  async exportSave(key = 'main') {
    const data = await this.load(key)
    if (!data) return null
    return JSON.stringify(data)
  }

  // Import save from JSON
  async importSave(jsonString, key = 'main') {
    const data = JSON.parse(jsonString)
    if (!data.version) throw new Error('Invalid save data')
    await this.save(key, data)
    return data
  }

  // Start auto-save interval
  startAutoSave(saveFn) {
    this.stopAutoSave()
    this.autoSaveTimer = setInterval(() => {
      saveFn().catch(err => console.error('Auto-save failed:', err))
    }, AUTOSAVE_INTERVAL)
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }
}
