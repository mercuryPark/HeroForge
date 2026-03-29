/**
 * balance-sim.mjs — CLI tool for economic/combat balance simulation.
 *
 * Usage:
 *   node tools/balance-sim.mjs --damage      # Damage distribution analysis
 *   node tools/balance-sim.mjs --gacha       # Gacha probability verification
 *   node tools/balance-sim.mjs --starforce   # Starforce cost analysis
 *   node tools/balance-sim.mjs --economy     # Economy flow simulation
 */

const args = process.argv.slice(2)
const mode = args[0] || '--damage'
const ITERATIONS = parseInt(args[1] || '10000')

console.log(`\n=== HeroForge Balance Simulator ===`)
console.log(`Mode: ${mode} | Iterations: ${ITERATIONS}\n`)

if (mode === '--damage') {
  // Simulate damage distribution at various levels
  const levels = [1, 30, 60, 100, 150, 200]
  for (const level of levels) {
    const atk = 50 + level * 5
    const def = 10 + level * 2
    let totalDmg = 0
    let crits = 0
    for (let i = 0; i < ITERATIONS; i++) {
      const variance = 0.95 + Math.random() * 0.10
      const base = atk * variance
      const afterDef = Math.max(1, base - def * 0.3)
      const isCrit = Math.random() < 0.15
      const dmg = isCrit ? afterDef * 1.5 : afterDef
      totalDmg += dmg
      if (isCrit) crits++
    }
    const avgDmg = (totalDmg / ITERATIONS).toFixed(1)
    const critRate = ((crits / ITERATIONS) * 100).toFixed(1)
    console.log(`Lv${level}: ATK=${atk} DEF=${def} → Avg DMG=${avgDmg} CritRate=${critRate}%`)
  }
}

if (mode === '--gacha') {
  const rates = { R: 80, SR: 17, SSR: 3 }
  let counts = { R: 0, SR: 0, SSR: 0 }
  let pityHits = 0
  let pity = 0

  for (let i = 0; i < ITERATIONS; i++) {
    pity++
    if (pity >= 80) { counts.SSR++; pityHits++; pity = 0; continue }
    const roll = Math.random() * 100
    if (roll < rates.SSR) { counts.SSR++; pity = 0 }
    else if (roll < rates.SSR + rates.SR) { counts.SR++ }
    else { counts.R++ }
  }

  console.log(`Gacha Results (${ITERATIONS} pulls):`)
  console.log(`  R:   ${counts.R} (${(counts.R/ITERATIONS*100).toFixed(1)}%) [expected: ${rates.R}%]`)
  console.log(`  SR:  ${counts.SR} (${(counts.SR/ITERATIONS*100).toFixed(1)}%) [expected: ${rates.SR}%]`)
  console.log(`  SSR: ${counts.SSR} (${(counts.SSR/ITERATIONS*100).toFixed(1)}%) [expected: ${rates.SSR}%+pity]`)
  console.log(`  Pity triggers: ${pityHits}`)
}

if (mode === '--starforce') {
  const table = [95,90,85,80,75,70,65,60,55,50,45,40,35,30,25,20,18,15,12,10,8,6,4,3,2]
  for (const targetStar of [5, 10, 15, 20]) {
    let totalAttempts = 0
    let totalGold = 0
    for (let sim = 0; sim < 1000; sim++) {
      let star = 0; let attempts = 0; let gold = 0
      while (star < targetStar && attempts < 10000) {
        const cost = 1000 + star * star * 500
        gold += cost; attempts++
        if (Math.random() * 100 < table[star]) { star++ }
        else if (star >= 10 && Math.random() < 0.3) { star = Math.max(0, star - 1) }
      }
      totalAttempts += attempts; totalGold += gold
    }
    console.log(`★${targetStar}: Avg ${(totalAttempts/1000).toFixed(0)} attempts, ${(totalGold/1000).toFixed(0)} gold`)
  }
}

if (mode === '--economy') {
  // Simulate 7 days of gameplay
  let gold = 0, gems = 0, mp = 0
  const dailyKills = 500
  const dailyGoldPerKill = 15
  const dailyExpDungeon = 3
  const dailyBossCoins = 50

  for (let day = 1; day <= 7; day++) {
    gold += dailyKills * dailyGoldPerKill
    gold += 5000 // attendance
    gems += 50 // daily quest
    mp += dailyKills * 2
    console.log(`Day ${day}: Gold=${gold} Gems=${gems} MP=${mp}`)
  }
  console.log(`\n7-day summary: Gold=${gold} Gems=${gems} MP=${mp}`)
}

console.log('\nDone.')
