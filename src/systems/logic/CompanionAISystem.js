/**
 * CompanionAISystem — drives equipped companion behavior in combat.
 *
 * In the current phase, companions provide stat bonuses only (via equip/own effects).
 * This system will handle companion entity spawning, following, and auto-attack
 * when visual companions are implemented in a future update.
 */

/**
 * @param {object} world
 * @returns {object} world
 */
export function CompanionAISystem(world) {
  // Stat bonuses from equipped companions are applied via CompanionSystem.
  // Future: spawn companion sprites, follow player, auto-attack monsters.
  return world
}
