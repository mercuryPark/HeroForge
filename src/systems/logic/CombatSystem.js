/**
 * CombatSystem — executes attacks between entities that have a Combat.target.
 *
 * Full damage formula (spec Section 4):
 *   base     = ATK * skillMult * (randomMin + rand * (randomMax - randomMin))
 *   defReduction = target_DEF * (1 - clamp(armorPen, 0, armorPenCap))
 *   afterDef = max(minDamage, base - defReduction)
 *   afterCrit = isCrit ? afterDef * CRIT_DMG : afterDef
 *   final    = floor(afterCrit
 *              * (1 + dmg%)
 *              * (1 + bossDmg%)        [only vs bosses]
 *              * (1 + normalMonsterDmg%) [only vs normal monsters]
 *              * (1 + skillDmg%)        [only when using skill]
 *              * (1 + finalDmg%)
 *   final    = min(final, maxDmgMultiplier)  [absolute cap, spec says "× maxDmgMult" but intent is clamp]
 *
 * NOTE: min/maxDmgRatio clamp is spec-defined as clamp(final, final*minR, final*maxR)
 *       which is a mathematical identity (no-op). Kept as placeholder for future
 *       equipment/buff interactions where ratios may apply against a different base.
 *
 * Hit/Miss: if accuracy < evasion, miss chance = (evasion - accuracy)%
 *           if accuracy > evasion, bonus dmg = floor((accuracy - evasion) / perN) * bonusPct%
 *
 * Attack speed: interval = baseInterval / (1 + atkSpeed / 100)
 *
 * Death penalty (G4): instant revive + 10s invincibility, no gold loss
 */
import { query, hasComponent, addComponent } from 'bitecs'
import { Position } from '@components/transform'
import { Stats, Combat, Dead, BossTag, ReviveState } from '@components/combat'
import { MonsterTag } from '@components/monster'
import { PlayerTag } from '@components/character'
import { AnimState, ANIM_ATTACK, ANIM_DEATH } from '@components/sprite'
import balanceData from '@data/balance.json'

/* ── Constants from balance.json ── */
const DMG = balanceData.damage
const RANDOM_MIN = DMG.randomRange[0]
const RANDOM_MAX = DMG.randomRange[1]
const RANDOM_SPAN = RANDOM_MAX - RANDOM_MIN
const ARMOR_PEN_CAP = DMG.armorPenCap
const MIN_DAMAGE = DMG.minDamage
const DEFAULT_MIN_DMG_RATIO = DMG.defaultMinDmgRatio
const DEFAULT_MAX_DMG_RATIO = DMG.defaultMaxDmgRatio
const DEFAULT_MAX_DMG_MULTIPLIER = DMG.defaultMaxDmgMultiplier
const EXCESS_ACC_PER_N = DMG.excessAccuracyBonus.perN
const EXCESS_ACC_BONUS_PCT = DMG.excessAccuracyBonus.bonusPct

const BASE_ATTACK_INTERVAL = balanceData.attackSpeed.baseInterval
const DEATH_INVINCIBILITY_SEC = balanceData.deathPenalty.invincibilitySeconds

/* ── Pre-allocated objects for zero-GC hot path ── */

/** Reusable result for calculateDamage — caller must read before next call */
const _dmgResult = { amount: 0, isCrit: false, isMiss: false }

/** Reusable event payloads (mutated in-place before each emit) */
const _missEvent = { target: 0, x: 0, y: 0 }
const _damageEvent = { target: 0, source: 0, amount: 0, isCrit: false, x: 0, y: 0 }
const _deathEvent = { target: 0, killer: 0, x: 0, y: 0, isMonster: false, isPlayer: false }
const _reviveEvent = { target: 0, x: 0, y: 0, invincibleSeconds: 0 }

/**
 * Calculate damage from attacker to target.
 * Exported for unit testing.
 *
 * IMPORTANT: returns a shared object (_dmgResult). Caller must consume
 * values before the next call to calculateDamage.
 *
 * @param {object} opts
 * @returns {{ amount: number, isCrit: boolean, isMiss: boolean }}
 */
export function calculateDamage(opts) {
  const {
    atk, skillMult = 1.0, targetDef, armorPen = 0,
    critRate, critDmg, accuracy, targetEvasion,
    dmgPercent = 0, bossDmgPercent = 0, normalMonsterDmgPercent = 0,
    skillDmgPercent = 0, finalDmgPercent = 0,
    maxDmgMultiplier = DEFAULT_MAX_DMG_MULTIPLIER,
    minDmgRatio = DEFAULT_MIN_DMG_RATIO,
    maxDmgRatio = DEFAULT_MAX_DMG_RATIO,
    isBoss = false, isSkill = false,
    rng, critRng, missRng,
  } = opts

  // ── Hit/Miss check ──
  const missRoll = missRng ?? (Math.random() * 100)
  if (accuracy < targetEvasion) {
    const missChance = targetEvasion - accuracy
    if (missRoll < missChance) {
      _dmgResult.amount = 0
      _dmgResult.isCrit = false
      _dmgResult.isMiss = true
      return _dmgResult
    }
  }

  // ── Excess accuracy bonus damage ──
  let excessAccBonus = 0
  if (accuracy > targetEvasion) {
    excessAccBonus = Math.floor((accuracy - targetEvasion) / EXCESS_ACC_PER_N) * EXCESS_ACC_BONUS_PCT
  }

  // ── Base damage with variance ──
  const rand = rng ?? Math.random()
  const variance = RANDOM_MIN + rand * RANDOM_SPAN
  const baseDmg = atk * skillMult * variance

  // ── Defense reduction with capped armor penetration ──
  const clampedPen = Math.min(Math.max(armorPen, 0), ARMOR_PEN_CAP)
  const defReduction = targetDef * (1 - clampedPen)
  const afterDef = Math.max(MIN_DAMAGE, baseDmg - defReduction)

  // ── Critical hit ──
  const critRoll = critRng ?? (Math.random() * 100)
  const isCrit = critRoll < critRate
  const afterCrit = isCrit ? afterDef * (critDmg / 100) : afterDef

  // ── Damage multipliers (all multiplicative) ──
  let multiplied = afterCrit
    * (1 + dmgPercent / 100)
    * (1 + finalDmgPercent / 100)

  // Conditional multipliers
  if (isBoss) {
    multiplied *= (1 + bossDmgPercent / 100)
  } else {
    multiplied *= (1 + normalMonsterDmgPercent / 100)
  }

  if (isSkill) {
    multiplied *= (1 + skillDmgPercent / 100)
  }

  // Excess accuracy bonus
  multiplied *= (1 + excessAccBonus / 100)

  // Max damage multiplier clamp (spec says "× maxDmgMult" but game intent is absolute cap)
  multiplied = Math.min(multiplied, maxDmgMultiplier)

  // Min/Max damage ratio — currently a no-op (clamp(X, X*0.8, X*1.2) === X).
  // Kept for forward-compatibility: future systems may compute ratios against a base reference.
  const minClamp = multiplied * minDmgRatio
  const maxClamp = multiplied * maxDmgRatio
  const finalDmg = Math.max(MIN_DAMAGE, Math.floor(
    Math.min(Math.max(multiplied, minClamp), maxClamp)
  ))

  _dmgResult.amount = finalDmg
  _dmgResult.isCrit = isCrit
  _dmgResult.isMiss = false
  return _dmgResult
}

/**
 * @param {object} world
 * @returns {object} world
 */
export function CombatSystem(world) {
  const dt = world.time.delta
  const combatants = query(world, [Stats, Combat, Position])

  for (let i = 0; i < combatants.length; i++) {
    const eid = combatants[i]
    if (hasComponent(world, eid, Dead)) continue

    // ── Invincibility timer tick ──
    if (hasComponent(world, eid, ReviveState) && ReviveState.invincibleTimer[eid] > 0) {
      ReviveState.invincibleTimer[eid] -= dt
      if (ReviveState.invincibleTimer[eid] <= 0) {
        ReviveState.invincibleTimer[eid] = 0
      }
    }

    const targetEid = Combat.target[eid]
    if (!targetEid || hasComponent(world, targetEid, Dead)) {
      Combat.target[eid] = 0
      continue
    }

    // Skip attacking invincible targets
    if (hasComponent(world, targetEid, ReviveState) && ReviveState.invincibleTimer[targetEid] > 0) {
      continue
    }

    // Check attack range
    const dx = Math.abs(Position.x[targetEid] - Position.x[eid])
    if (dx > Combat.attackRange[eid]) continue

    // ── Attack speed interval ──
    const atkSpd = Stats.atkSpeed[eid] || 0
    const interval = BASE_ATTACK_INTERVAL / (1 + atkSpd / 100)
    Combat.attackTimer[eid] += dt

    if (Combat.attackTimer[eid] >= interval) {
      Combat.attackTimer[eid] -= interval

      // Set attack animation
      AnimState.current[eid] = ANIM_ATTACK

      // Determine target type
      const isBoss = hasComponent(world, targetEid, BossTag)

      // Calculate damage using full formula
      const result = calculateDamage({
        atk: Stats.atk[eid],
        skillMult: 1.0,
        targetDef: Stats.def[targetEid],
        armorPen: Stats.armorPen[eid] || 0,
        critRate: Stats.critRate[eid],
        critDmg: Stats.critDmg[eid] || 150,
        accuracy: Stats.accuracy[eid],
        targetEvasion: Stats.evasion[targetEid],
        dmgPercent: Stats.dmgPercent[eid] || 0,
        bossDmgPercent: Stats.bossDmgPercent[eid] || 0,
        normalMonsterDmgPercent: Stats.normalMonsterDmgPercent[eid] || 0,
        skillDmgPercent: Stats.skillDmgPercent[eid] || 0,
        finalDmgPercent: Stats.finalDmgPercent[eid] || 0,
        maxDmgMultiplier: Stats.maxDmgMultiplier[eid] || DEFAULT_MAX_DMG_MULTIPLIER,
        minDmgRatio: Stats.minDmgRatio[eid] || DEFAULT_MIN_DMG_RATIO,
        maxDmgRatio: Stats.maxDmgRatio[eid] || DEFAULT_MAX_DMG_RATIO,
        isBoss,
        isSkill: false,
      })

      if (result.isMiss) {
        _missEvent.target = targetEid
        _missEvent.x = Position.x[targetEid]
        _missEvent.y = Position.y[targetEid]
        world.eventBus?.emit('combat:miss', _missEvent)
        continue
      }

      // Apply damage
      Stats.hp[targetEid] -= result.amount

      // Emit damage event for VFX / UI
      _damageEvent.target = targetEid
      _damageEvent.source = eid
      _damageEvent.amount = result.amount
      _damageEvent.isCrit = result.isCrit
      _damageEvent.x = Position.x[targetEid]
      _damageEvent.y = Position.y[targetEid]
      world.eventBus?.emit('combat:damage', _damageEvent)

      // ── Death check ──
      if (Stats.hp[targetEid] <= 0) {
        Stats.hp[targetEid] = 0

        const isPlayer = hasComponent(world, targetEid, PlayerTag)

        if (isPlayer) {
          // G4: Instant revive + invincibility (no Dead component added)
          Stats.hp[targetEid] = Stats.maxHp[targetEid]
          if (!hasComponent(world, targetEid, ReviveState)) {
            addComponent(world, targetEid, ReviveState)
          }
          ReviveState.invincibleTimer[targetEid] = DEATH_INVINCIBILITY_SEC
          Combat.target[targetEid] = 0

          _reviveEvent.target = targetEid
          _reviveEvent.x = Position.x[targetEid]
          _reviveEvent.y = Position.y[targetEid]
          _reviveEvent.invincibleSeconds = DEATH_INVINCIBILITY_SEC
          world.eventBus?.emit('combat:playerRevive', _reviveEvent)
        } else {
          // Monster death — normal flow
          addComponent(world, targetEid, Dead)
          AnimState.current[targetEid] = ANIM_DEATH

          _deathEvent.target = targetEid
          _deathEvent.killer = eid
          _deathEvent.x = Position.x[targetEid]
          _deathEvent.y = Position.y[targetEid]
          _deathEvent.isMonster = hasComponent(world, targetEid, MonsterTag)
          _deathEvent.isPlayer = false
          world.eventBus?.emit('combat:death', _deathEvent)
        }
      }
    }
  }

  return world
}
