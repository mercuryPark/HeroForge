import { hitChance, stageScale } from "../core/formulas"
import { applyExp } from "./growthSystem"
import { rollEquipmentDrop } from "./equipmentSystem"

function calcDamage(attacker, defender, isSkill, rng) {
  if (rng() > hitChance(attacker.accuracy, defender.evasion)) return 0

  const crit = rng() < attacker.critRate
  const critMul = crit ? 1 + attacker.critDmg : 1
  const skillMul = isSkill ? attacker.skill.multiplier : 1
  const raw = attacker.atk * critMul * skillMul
  const mitigated = raw - defender.def * 0.35
  return Math.max(1, Math.floor(mitigated))
}

export function spawnEnemy(stage) {
  const scale = stageScale(stage)
  return {
    id: `enemy-${stage}`,
    name: `Stage ${stage} Foe`,
    maxHp: Math.floor(65 * scale + stage * 7),
    hp: Math.floor(65 * scale + stage * 7),
    atk: Number((8 * scale).toFixed(2)),
    def: Number((3 * scale).toFixed(2)),
    attackSpeed: Number((0.8 + stage * 0.005).toFixed(2)),
    critRate: 0.05,
    critDmg: 0.4,
    evasion: Math.min(0.25, 0.03 + stage * 0.0008),
    accuracy: 100,
  }
}

export function runCombatTick(state, dt, rng) {
  let hero = { ...state.hero }
  let enemy = { ...state.enemy }
  let stage = state.stage
  let lootLog = state.lootLog.slice(0, 8)

  hero.attackTimer += dt
  hero.skillTimer += dt
  enemy.attackTimer += dt

  const heroAttackGap = 1 / hero.attackSpeed
  const enemyAttackGap = 1 / enemy.attackSpeed

  if (hero.skillTimer >= hero.skill.cooldown) {
    enemy.hp -= calcDamage(hero, enemy, true, rng)
    hero.skillTimer = 0
  }

  if (hero.attackTimer >= heroAttackGap) {
    enemy.hp -= calcDamage(hero, enemy, false, rng)
    hero.attackTimer = 0
  }

  if (enemy.attackTimer >= enemyAttackGap && enemy.hp > 0) {
    hero.hp -= calcDamage(enemy, hero, false, rng)
    enemy.attackTimer = 0
  }

  if (hero.hp <= 0) {
    hero.hp = hero.maxHp
    stage = Math.max(1, stage - 1)
    enemy = spawnEnemy(stage)
  }

  if (enemy.hp <= 0) {
    const expGain = Math.floor(12 + stage * 2.1)
    const goldGain = Math.floor(15 + stage * 3)

    hero.gold += goldGain
    hero = applyExp(hero, expGain)

    if (rng() < 0.18) {
      const drop = rollEquipmentDrop(rng)
      hero.weapon.bonusAtk = Math.max(hero.weapon.bonusAtk, drop.atkBonus)
      lootLog = [`Drop: ${drop.id.toUpperCase()} (+${drop.atkBonus} ATK)`, ...lootLog].slice(0, 8)
    }

    stage += 1
    enemy = spawnEnemy(stage)
  }

  hero.hp = Math.max(0, Math.min(hero.maxHp, hero.hp))
  enemy.hp = Math.max(0, Math.min(enemy.maxHp, enemy.hp))
  hero.atk = Number((hero.baseAtk + hero.weapon.bonusAtk).toFixed(2))

  return {
    ...state,
    hero,
    enemy,
    stage,
    lootLog,
    lastTickAt: Date.now(),
  }
}
