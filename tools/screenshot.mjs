/**
 * Screenshot tool — captures the game at http://localhost:5173
 *
 * Usage:
 *   node tools/screenshot.mjs                   # default screenshot
 *   node tools/screenshot.mjs --wait 3000       # wait 3s before capture
 *   node tools/screenshot.mjs --click "#start"  # click element then capture
 *   node tools/screenshot.mjs --full             # full page screenshot
 *   node tools/screenshot.mjs --console          # also dump console logs
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(name)
  return idx >= 0 ? args[idx + 1] : null
}
const hasFlag = (name) => args.includes(name)

const URL = getArg('--url') || 'http://localhost:5173'
const WAIT = parseInt(getArg('--wait') || '2000', 10)
const CLICK = getArg('--click')
const FULL = hasFlag('--full')
const CONSOLE = hasFlag('--console')
const OUT = getArg('--out') || resolve('tools', 'screenshot.png')

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  const consoleLogs = []
  const errors = []

  page.on('console', (msg) => {
    const entry = `[${msg.type()}] ${msg.text()}`
    consoleLogs.push(entry)
    if (CONSOLE) process.stdout.write(entry + '\n')
  })

  page.on('pageerror', (err) => {
    errors.push(err.message)
    process.stderr.write(`[PAGE ERROR] ${err.message}\n`)
  })

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 10000 })
  } catch (e) {
    console.error(`Failed to load ${URL}: ${e.message}`)
    console.error('Is the dev server running? Start with: npm run dev')
    await browser.close()
    process.exit(1)
  }

  // Wait for rendering
  await page.waitForTimeout(WAIT)

  // Optional click
  if (CLICK) {
    try {
      await page.click(CLICK, { timeout: 3000 })
      await page.waitForTimeout(1000)
    } catch (e) {
      console.warn(`Click target "${CLICK}" not found: ${e.message}`)
    }
  }

  // Capture screenshot
  await page.screenshot({ path: OUT, fullPage: FULL })
  console.log(`Screenshot saved: ${OUT}`)

  // Summary
  if (errors.length) {
    console.log(`\n--- ${errors.length} PAGE ERROR(S) ---`)
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }

  if (CONSOLE && consoleLogs.length) {
    console.log(`\n--- ${consoleLogs.length} console message(s) captured ---`)
  }

  // Save console log alongside screenshot
  if (consoleLogs.length || errors.length) {
    const logPath = OUT.replace(/\.png$/, '.log')
    const logContent = [
      ...consoleLogs,
      ...errors.map(e => `[ERROR] ${e}`),
    ].join('\n')
    writeFileSync(logPath, logContent, 'utf8')
    console.log(`Console log saved: ${logPath}`)
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
