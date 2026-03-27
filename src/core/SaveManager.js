import { openDB } from 'idb'
import { SAVE_VERSION, AUTOSAVE_INTERVAL } from '@data/constants'

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

  // Serialize game state from ECS world
  serializeState(world, playerState) {
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        // Component data is set by the caller who has access to components
      },
      gold: playerState?.gold || 0,
      monsterPoints: playerState?.monsterPoints || 0,
    }
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
