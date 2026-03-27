/**
 * GrowthSystem — handles level-up stat growth and job assignment.
 *
 * Factory pattern consistent with LootSystem. Listens for 'player:levelup'
 * events to apply growthPerLevel bonuses and award stat points.
 * Provides applyJob() for one-time base-stat initialization on job selection.
 */
import { hasComponent } from 'bitecs'
import jobsData from '@data/jobs.json'
import { PlayerTag, Job, Level, StatAllocation } from '@components/character'
import { Stats } from '@components/combat'

/** Map class name → classId */
const CLASS_ID_MAP = {
  warrior: 0,
  mage:    1,
  archer:  2,
  thief:   3,
}

/** Map jobId string → numeric id */
const JOB_ID_MAP = {
  hero:         0,
  dark_knight:  1,
  paladin:      2,
  archmage_il:  3,
  archmage_fp:  4,
  bowmaster:    5,
  marksman:     6,
  night_lord:   7,
  shadower:     8,
}

/** Indexed map for fast lookup: jobId string → job object */
const JOB_MAP = {}
for (const job of jobsData.jobs) {
  JOB_MAP[job.id] = job
}

/** Stat points awarded per level-up */
const STAT_POINTS_PER_LEVEL = 5

/**
 * Apply job base stats and identity to an entity.
 * Call once when a player selects their job.
 *
 * @param {object} world
 * @param {number} eid  - entity id
 * @param {string} jobId - e.g. 'hero', 'archmage_il'
 * @returns {object} the job data object
 */
function applyJob(world, eid, jobId) {
  const jobData = JOB_MAP[jobId]
  if (!jobData) {
    console.error(`[GrowthSystem] Unknown jobId: ${jobId}`)
    return null
  }

  // Set identity components
  Job.classId[eid]     = CLASS_ID_MAP[jobData.class] ?? 0
  Job.jobId[eid]       = JOB_ID_MAP[jobId] ?? 0
  Job.advancement[eid] = 0

  // Apply base stats
  const b = jobData.baseStats
  Stats.hp[eid]      = b.hp
  Stats.maxHp[eid]   = b.hp
  Stats.mp[eid]      = b.mp
  Stats.maxMp[eid]   = b.mp
  Stats.atk[eid]     = b.atk
  Stats.def[eid]     = b.def
  Stats.atkSpeed[eid]  = b.atkSpeed ?? 1.0
  Stats.critRate[eid]  = b.critRate ?? 10
  Stats.critDmg[eid]   = b.critDmg ?? 150
  Stats.accuracy[eid]  = 80
  Stats.evasion[eid]   = 10

  return jobData
}

/**
 * Handle a player:levelup event.
 * Awards stat points and applies growthPerLevel bonuses.
 *
 * @param {object} world
 * @param {object} event - { eid, level }
 */
function onLevelUp(world, event) {
  const eid = event.eid
  if (!hasComponent(world, eid, PlayerTag)) return

  // Award manual stat points
  StatAllocation.availablePoints[eid] += STAT_POINTS_PER_LEVEL

  // Determine the player's job to get growthPerLevel
  const jobNumericId = Job.jobId[eid]
  // Reverse-lookup the string key
  const jobStringId = Object.keys(JOB_ID_MAP).find(k => JOB_ID_MAP[k] === jobNumericId)
  const jobData = jobStringId ? JOB_MAP[jobStringId] : null

  if (!jobData) return // No job selected yet — skip growth bonuses

  const g = jobData.growthPerLevel

  // Apply incremental growth
  const hpGain = g.hp ?? 0
  const mpGain = g.mp ?? 0

  Stats.hp[eid]    += hpGain
  Stats.maxHp[eid] += hpGain
  Stats.mp[eid]    += mpGain
  Stats.maxMp[eid] += mpGain
  Stats.atk[eid]   += g.atk ?? 0
  Stats.def[eid]   += g.def ?? 0

  const changes = { hp: hpGain, mp: mpGain, atk: g.atk ?? 0, def: g.def ?? 0, statPoints: STAT_POINTS_PER_LEVEL }

  world.eventBus?.emit('player:growth', {
    eid,
    level: event.level,
    changes,
  })
}

/**
 * Factory: create and return a GrowthSystem instance.
 *
 * @returns {{ init: function, system: function, applyJob: function }}
 */
export function createGrowthSystem() {
  return {
    /**
     * Bind event listeners — call once after world.eventBus is ready.
     * @param {object} world
     */
    init(world) {
      world.eventBus?.on('player:levelup', (e) => onLevelUp(world, e))
    },

    /**
     * Per-tick system function (currently event-driven, no per-tick work).
     * @param {object} world
     * @returns {object} world
     */
    system: function GrowthSystem(world) {
      return world
    },

    applyJob,
  }
}
