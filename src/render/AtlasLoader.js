/**
 * AtlasLoader — loads packed sprite atlases via PixiJS Assets.
 *
 * Usage:
 *   import { loadAtlases, getAtlasTexture } from '@render/AtlasLoader'
 *   await loadAtlases()  // call once during boot
 *   const texture = getAtlasTexture('heroes', 'cemetery-hero-hero-idle-1')
 */
import { Assets, Spritesheet, Texture } from 'pixi.js'

/** @type {Map<string, Spritesheet>} */
const sheets = new Map()

/** Atlas manifest — category → JSON path(s) */
const ATLAS_MANIFEST = {
  heroes: ['/atlases/heroes-0.json', '/atlases/heroes-1.json'],
  monsters: ['/atlases/monsters.json'],
  bosses: ['/atlases/bosses.json'],
  effects: ['/atlases/effects.json'],
  items: ['/atlases/items.json'],
  ui: ['/atlases/ui.json'],
  portraits: ['/atlases/portraits.json'],
}

/**
 * Load all sprite atlases. Call once during boot.
 * Silently skips atlases that fail to load (e.g. missing files).
 */
export async function loadAtlases() {
  const entries = Object.entries(ATLAS_MANIFEST)

  for (const [category, jsonPaths] of entries) {
    for (const jsonPath of jsonPaths) {
      try {
        // Load the JSON manifest
        const data = await Assets.load(jsonPath)

        // The JSON references a sibling PNG via meta.image
        // PixiJS Assets resolves relative paths from the JSON location
        if (data.textures) {
          // Already parsed as Spritesheet by PixiJS
          sheets.set(`${category}:${jsonPath}`, data)
        } else if (data.frames) {
          // Raw JSON — need to create Spritesheet manually
          const pngPath = jsonPath.replace('.json', '.png')
          const texture = await Assets.load(pngPath)
          const sheet = new Spritesheet(texture, data)
          await sheet.parse()
          sheets.set(`${category}:${jsonPath}`, sheet)
        }
      } catch (err) {
        console.warn(`[AtlasLoader] Failed to load ${jsonPath}: ${err.message}`)
      }
    }
  }

  console.log(`[AtlasLoader] Loaded ${sheets.size} atlas sheet(s)`)
}

/**
 * Get a texture from a loaded atlas by category and frame name.
 * @param {string} category - e.g. 'heroes', 'monsters'
 * @param {string} frameName - sprite name without extension
 * @returns {Texture|null}
 */
export function getAtlasTexture(category, frameName) {
  for (const [key, sheet] of sheets) {
    if (!key.startsWith(category + ':')) continue
    const tex = sheet.textures[frameName]
    if (tex) return tex
  }
  return null
}

/**
 * Get all frame names in a category that match a prefix.
 * Useful for building animation sequences.
 * @param {string} category
 * @param {string} prefix - e.g. 'cemetery-hero-hero-idle'
 * @returns {string[]} sorted frame names
 */
export function getFramesByPrefix(category, prefix) {
  const result = []
  for (const [key, sheet] of sheets) {
    if (!key.startsWith(category + ':')) continue
    for (const name of Object.keys(sheet.textures)) {
      if (name.startsWith(prefix)) {
        result.push(name)
      }
    }
  }
  return result.sort()
}

/**
 * Check if atlases are loaded.
 * @returns {boolean}
 */
export function areAtlasesLoaded() {
  return sheets.size > 0
}
