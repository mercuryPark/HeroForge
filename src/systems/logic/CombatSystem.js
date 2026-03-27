/**
 * CombatSystem — executes attacks between entities that have a Combat.target.
 *
 * Damage formula (from spec Section 4):
 *   base     = ATK * skillMult * (0.95 + rand * 0.10)
 *   afterDef = max(1, base - target_DEF * (1 - armorPen))
 *   afterCrit = isCrit ? afterDef * CRIT_DMG : afterDef
 *   final    = floor(afterCrit * (1 + dmg%) * (1 + finalDmg%))
 *
 * Hit/Miss: if accuracy < evasion, chance to miss = (evasion - accuracy)%
 * Attack speed: interval = baseInterval / (1 + atkSpeed / 100)
 *
 * Uses balance.json baseInterval of 1.0s.
 */
import { query, hasComponent, addComponent } from 'bitecs'
import { Position } from '@components/transform'
import { Stats, Combat, Dead } from '@components/combat'
import { MonsterTag } from '@components/monster'
import { PlayerTag } from '@components/character'
import { AnimState } from '@components/sprite'

const BASE_ATTACK_INTERVAL = 1.0 // seconds (from balance.json)

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

    const targetEid = Combat.target[eid]
    if (!targetEid || hasComponent(world, targetEid, Dead)) {
      Combat.target[eid] = 0
      continue
    }

    // Check attack range
    const dx = Math.abs(Position.x[targetEid] - Position.x[eid])
    if (dx > Combat.attackRange[eid]) continue

    // Accumulate attack timer
    const interval = BASE_ATTACK_INTERVAL / (1 + Stats.atkSpeed[eid] / 100)
    Combat.attackTimer[eid] += dt

    if (Combat.attackTimer[eid] >= interval) {
      Combat.attackTimer[eid] -= interval

      // Set attack animation
      AnimState.current[eid] = 3 // attack

      // Hit/Miss roll
      const accuracy = Stats.accuracy[eid]
      const evasion = Stats.evasion[targetEid]

      if (accuracy < evasion && Math.random() * 100 < (evasion - accuracy)) {
        world.eventBus?.emit('combat:miss', {
          target: targetEid,
          x: Position.x[targetEid],
          y: Position.y[targetEid],
        })
        continue
      }

      // Base damage with variance
      const skillMult = 1.0 // base attack; skills add multiplier later
      const variance = 0.95 + Math.random() * 0.10
      const baseDmg = Stats.atk[eid] * skillMult * variance

      // Defense reduction with armor penetration
      const armorPen = 0 // no armor pen in Phase 1
      const afterDef = Math.max(1, baseDmg - Stats.def[targetEid] * (1 - armorPen))

      // Critical hit check
      const isCrit = Math.random() * 100 < Stats.critRate[eid]
      const afterCrit = isCrit ? afterDef * (Stats.critDmg[eid] || 1.5) : afterDef

      // Damage multipliers
      const dmgMult = 1 + (Stats.dmgPercent[eid] || 0) / 100
      const finalDmgMult = 1 + (Stats.finalDmgPercent[eid] || 0) / 100

      const finalDmg = Math.floor(afterCrit * dmgMult * finalDmgMult)

      // Apply damage
      Stats.hp[targetEid] -= finalDmg

      // Emit damage event for VFX / UI
      world.eventBus?.emit('combat:damage', {
        target: targetEid,
        source: eid,
        amount: finalDmg,
        isCrit,
        x: Position.x[targetEid],
        y: Position.y[targetEid],
      })

      // Death check
      if (Stats.hp[targetEid] <= 0) {
        Stats.hp[targetEid] = 0
        addComponent(world, targetEid, Dead)
        AnimState.current[targetEid] = 4 // death

        world.eventBus?.emit('combat:death', {
          target: targetEid,
          killer: eid,
          x: Position.x[targetEid],
          y: Position.y[targetEid],
          isMonster: hasComponent(world, targetEid, MonsterTag),
          isPlayer: hasComponent(world, targetEid, PlayerTag),
        })
      }
    }
  }

  return world
}
