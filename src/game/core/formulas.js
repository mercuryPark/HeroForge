export function expToNextLevel(level) {
  return Math.floor(28 * Math.pow(level, 1.42))
}

export function stageScale(stage) {
  return 1 + (stage - 1) * 0.15
}

export function computePower(hero) {
  const offense = hero.atk * (1 + hero.critRate * hero.critDmg)
  const speedFactor = Math.sqrt(hero.attackSpeed)
  const defense = hero.def * 0.7 + hero.hp * 0.03
  return Math.floor(offense * speedFactor + defense)
}

export function hitChance(accuracy, evasion) {
  return Math.max(0.1, Math.min(0.96, 0.82 + (accuracy - evasion * 100) * 0.0025))
}

export function rollWeighted(items, rng) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  const ticket = rng() * total
  let acc = 0
  for (const item of items) {
    acc += item.weight
    if (ticket <= acc) return item
  }
  return items[0]
}
