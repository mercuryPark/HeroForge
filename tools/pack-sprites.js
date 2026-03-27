/**
 * pack-sprites.js
 * Packs individual PNG sprites from assets/sprites/<category>/ into
 * PixiJS v8-compatible sprite atlases at public/atlases/<category>.{png,json}.
 *
 * Usage: node tools/pack-sprites.js
 */

import { createRequire } from 'module'
import { readdir, mkdir, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// free-tex-packer-core is CommonJS — use createRequire to import it
const cjsRequire = createRequire(import.meta.url)
const texPacker = cjsRequire('free-tex-packer-core')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SPRITES_DIR = path.join(ROOT, 'assets', 'sprites')
const OUTPUT_DIR = path.join(ROOT, 'public', 'atlases')

const CATEGORIES = ['heroes', 'monsters', 'bosses', 'effects', 'items', 'ui', 'portraits']

const PACKER_OPTIONS = {
  textureName: '',          // overridden per category
  width: 4096,
  height: 4096,
  fixedSize: false,
  padding: 2,
  allowRotation: false,
  detectIdentical: true,
  allowTrim: false,
  exporter: 'Pixi',         // PixiJS-compatible JSON
  removeFileExtension: true,
  prependFolderName: false,
  powerOfTwo: true,
}

/**
 * Read PNG dimensions from the IHDR chunk (bytes 16-23).
 * Returns {w, h} or null on failure.
 */
function readPngSize(buffer) {
  // PNG signature: 137 80 78 71 13 10 26 10
  if (buffer.length < 24) return null
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    return null
  }
  const w = buffer.readUInt32BE(16)
  const h = buffer.readUInt32BE(20)
  return { w, h }
}

/**
 * Wraps free-tex-packer-core's callback API in a Promise.
 */
function packImages(images, options) {
  return new Promise((resolve, reject) => {
    texPacker(images, options, (files, error) => {
      if (error) return reject(error)
      resolve(files)
    })
  })
}

/**
 * Read all eligible PNGs from a category directory.
 * Skips files whose names contain "spritesheet" (they are already packed).
 */
async function readCategoryImages(categoryDir) {
  let entries
  try {
    entries = await readdir(categoryDir)
  } catch {
    return []
  }

  const pngFiles = entries.filter(
    (f) => f.toLowerCase().endsWith('.png') && !f.toLowerCase().includes('spritesheet')
  )

  const images = []
  for (const file of pngFiles) {
    const filePath = path.join(categoryDir, file)
    try {
      const contents = await readFile(filePath)
      const size = readPngSize(contents)
      if (!size) {
        console.warn(`  [WARN] Skipping ${file}: not a valid PNG`)
        continue
      }
      images.push({ path: file, contents })
    } catch (err) {
      console.warn(`  [WARN] Skipping ${file}: ${err.message}`)
    }
  }
  return images
}

/**
 * Normalise the Pixi-format JSON into guaranteed PixiJS v8 Spritesheet format.
 */
function normalisePixiJson(rawJson, atlasImageName, atlasWidth, atlasHeight) {
  const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson

  const frames = {}
  for (const [name, data] of Object.entries(parsed.frames ?? {})) {
    const f = data.frame ?? data
    const sw = data.sourceSize?.w ?? f.w
    const sh = data.sourceSize?.h ?? f.h
    frames[name] = {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: data.rotated ?? false,
      trimmed: data.trimmed ?? false,
      spriteSourceSize: data.spriteSourceSize ?? { x: 0, y: 0, w: sw, h: sh },
      sourceSize: { w: sw, h: sh },
    }
  }

  return {
    frames,
    meta: {
      image: atlasImageName,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlasHeight },
      scale: 1,
    },
  }
}

async function packCategory(category) {
  const categoryDir = path.join(SPRITES_DIR, category)
  console.log(`\n[${category}] Reading sprites from ${categoryDir}`)

  const images = await readCategoryImages(categoryDir)
  if (images.length === 0) {
    console.log(`[${category}] No eligible PNGs found — skipping.`)
    return
  }
  console.log(`[${category}] Found ${images.length} sprite(s).`)

  const options = { ...PACKER_OPTIONS, textureName: category }

  let files
  try {
    files = await packImages(images, options)
  } catch (err) {
    console.error(`[${category}] Packing failed: ${err.message}`)
    return
  }

  for (const file of files) {
    const destPath = path.join(OUTPUT_DIR, file.name)

    if (file.name.endsWith('.png')) {
      await writeFile(destPath, file.buffer)
      const size = readPngSize(file.buffer)
      console.log(`[${category}] Written atlas PNG (${size?.w}x${size?.h}) → ${destPath}`)
    } else if (file.name.endsWith('.json')) {
      const pngName = file.name.replace('.json', '.png')
      const pngFile = files.find((f) => f.name === pngName)
      const size = pngFile ? readPngSize(pngFile.buffer) : null

      const raw = file.buffer.toString('utf8')
      const rawParsed = JSON.parse(raw)
      const atlasW = size?.w ?? rawParsed.meta?.size?.w ?? PACKER_OPTIONS.width
      const atlasH = size?.h ?? rawParsed.meta?.size?.h ?? PACKER_OPTIONS.height

      const normalised = normalisePixiJson(rawParsed, pngName, atlasW, atlasH)
      await writeFile(destPath, JSON.stringify(normalised, null, 2))
      console.log(`[${category}] Written atlas JSON (${Object.keys(normalised.frames).length} frames) → ${destPath}`)
    } else {
      await writeFile(destPath, file.buffer)
      console.log(`[${category}] Written ${file.name} → ${destPath}`)
    }
  }
}

async function main() {
  console.log('=== HeroForge Sprite Atlas Packer ===')

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
    console.log(`Created output directory: ${OUTPUT_DIR}`)
  }

  for (const category of CATEGORIES) {
    await packCategory(category)
  }

  console.log('\n=== Done ===')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
