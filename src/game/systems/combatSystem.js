import { hitChance, recalculateHeroAttack } from "../core/formulas"
import { getDropChance, getEnemyStageStats, getStageRewards } from "../data/balance"
import { getNextStage, getPreviousStage } from "../data/stages"
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
  const stats = getEnemyStageStats(stage)
  return {
    id: `enemy-${stage}`,
    name: `스테이지 ${stage} 몬스터`,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    attackSpeed: stats.attackSpeed,
    critRate: 0.05,
    critDmg: 0.4,
    evasion: stats.evasion,
    accuracy: stats.accuracy,
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
    stage = getPreviousStage(stage)
    enemy = spawnEnemy(stage)
  }

  if (enemy.hp <= 0) {
    const { exp: expGain, gold: goldGain } = getStageRewards(stage)

    hero.gold += goldGain
    hero = applyExp(hero, expGain)

    if (rng() < getDropChance(stage)) {
      const drop = rollEquipmentDrop(rng)
      hero.weapon.bonusAtk = Math.max(hero.weapon.bonusAtk, drop.atkBonus)
      lootLog = [`장비 획득: ${drop.label} 등급 (공격 +${drop.atkBonus})`, ...lootLog].slice(0, 8)
    }

    stage = getNextStage(stage)
    enemy = spawnEnemy(stage)
  }

  hero.hp = Math.max(0, Math.min(hero.maxHp, hero.hp))
  enemy.hp = Math.max(0, Math.min(enemy.maxHp, enemy.hp))
  hero.atk = recalculateHeroAttack(hero)

  return {
    ...state,
    hero,
    enemy,
    stage,
    lootLog,
    lastTickAt: Date.now(),
  }
}
