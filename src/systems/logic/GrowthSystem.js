/**
 * GrowthSystem — handles level-up stat growth, job assignment, and job advancement.
 *
 * Factory pattern consistent with LootSystem. Listens for 'player:levelup'
 * events to apply growthPerLevel bonuses and award stat points.
 * Provides applyJob() for one-time base-stat initialization on job selection.
 *
 * Job Advancement (전직):
 *   Lv.10  → 1차 전직 quest activates (kill N monsters)
 *   Lv.30  → 2차 전직 quest activates
 *   Lv.60  → 3차 전직 quest activates
 *   Lv.100 → 4차 전직 quest activates
 *   Quest completion → bonus stats applied, advancement tier increases
 */
import { hasComponent, addComponent } from 'bitecs'
import jobsData from '@data/jobs.json'
import advancementData from '@data/advancement_quests.json'
import { PlayerTag, Job, Level, StatAllocation, AdvancementQuest } from '@components/character'
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

/** Advancement level thresholds from data */
const ADV_LEVELS = advancementData.advancementLevels
const ADV_QUESTS = advancementData.quests

/**
 * Get the job string ID from the numeric Job.jobId.
 * @param {number} numericId
 * @returns {string|null}
 */
function getJobStringId(numericId) {
  for (const key in JOB_ID_MAP) {
    if (JOB_ID_MAP[key] === numericId) return key
  }
  return null
}

/**
 * Apply job base stats and identity to an entity.
 * Call once when a player selects their job.
 */
function applyJob(world, eid, jobId) {
  const jobData = JOB_MAP[jobId]
  if (!jobData) {
    console.error(`[GrowthSystem] Unknown jobId: ${jobId}`)
    return null
  }

  Job.classId[eid]     = CLASS_ID_MAP[jobData.class] ?? 0
  Job.jobId[eid]       = JOB_ID_MAP[jobId] ?? 0
  Job.advancement[eid] = 0

  const b = jobData.baseStats
  Stats.hp[eid]        = b.hp
  Stats.maxHp[eid]     = b.hp
  Stats.mp[eid]        = b.mp
  Stats.maxMp[eid]     = b.mp
  Stats.atk[eid]       = b.atk
  Stats.def[eid]       = b.def
  Stats.atkSpeed[eid]  = b.atkSpeed ?? 1.0
  Stats.critRate[eid]  = b.critRate ?? 10
  Stats.critDmg[eid]   = b.critDmg ?? 150
  Stats.accuracy[eid]  = 80
  Stats.evasion[eid]   = 10

  // Initialize advancement quest component
  if (!hasComponent(world, eid, AdvancementQuest)) {
    addComponent(world, eid, AdvancementQuest)
  }
  AdvancementQuest.questActive[eid] = 0
  AdvancementQuest.questTier[eid] = 0
  AdvancementQuest.killCount[eid] = 0
  AdvancementQuest.killTarget[eid] = 0
  AdvancementQuest.questComplete[eid] = 0

  return jobData
}

/**
 * Check if an advancement quest should activate after a level-up.
 */
function checkAdvancementQuest(world, eid, newLevel) {
  const currentAdv = Job.advancement[eid]
  const nextAdvTier = currentAdv + 1

  // Already at max advancement (4) or quest already active
  if (nextAdvTier > 4 || AdvancementQuest.questActive[eid]) return

  // Check if player reached the required level for next advancement
  const requiredLevel = ADV_LEVELS[currentAdv] // index 0=Lv10, 1=Lv30, 2=Lv60, 3=Lv100
  if (requiredLevel === undefined || newLevel < requiredLevel) return

  // Activate the advancement quest
  const questData = ADV_QUESTS[String(nextAdvTier)]
  if (!questData) return

  AdvancementQuest.questActive[eid] = 1
  AdvancementQuest.questTier[eid] = nextAdvTier
  AdvancementQuest.killCount[eid] = 0
  AdvancementQuest.killTarget[eid] = questData.killTarget
  AdvancementQuest.questComplete[eid] = 0

  world.eventBus?.emit('advancement:questStart', {
    eid,
    tier: nextAdvTier,
    killTarget: questData.killTarget,
    description: questData.descriptionKr,
  })
}

/**
 * Apply advancement bonus stats and increment the advancement tier.
 */
function applyAdvancement(world, eid) {
  const tier = AdvancementQuest.questTier[eid]
  const jobStringId = getJobStringId(Job.jobId[eid])
  const jobData = jobStringId ? JOB_MAP[jobStringId] : null

  if (!jobData || !jobData.advancements) return

  // Advancement data is 0-indexed: tier 1 = index 0
  const advData = jobData.advancements[tier - 1]
  if (!advData) return

  // Apply bonus stats if present
  const bonus = advData.bonusStats
  if (bonus) {
    if (bonus.hp)      { Stats.hp[eid] += bonus.hp; Stats.maxHp[eid] += bonus.hp }
    if (bonus.mp)      { Stats.mp[eid] += bonus.mp; Stats.maxMp[eid] += bonus.mp }
    if (bonus.atk)     Stats.atk[eid] += bonus.atk
    if (bonus.def)     Stats.def[eid] += bonus.def
    if (bonus.str)     {} // STR applied via stat system when implemented
    if (bonus.critRate) Stats.critRate[eid] += bonus.critRate
    if (bonus.critDmg)  Stats.critDmg[eid] += bonus.critDmg
  }

  // Increment advancement tier
  Job.advancement[eid] = tier

  // Reset quest state
  AdvancementQuest.questActive[eid] = 0
  AdvancementQuest.questTier[eid] = 0
  AdvancementQuest.killCount[eid] = 0
  AdvancementQuest.killTarget[eid] = 0
  AdvancementQuest.questComplete[eid] = 0

  world.eventBus?.emit('advancement:complete', {
    eid,
    tier,
    bonusStats: bonus,
    newSkill: advData.newSkill || null,
  })
}

/**
 * Handle monster kill — increment quest kill count if quest is active.
 */
function onMonsterKill(world, event) {
  const playerEid = world.playerEid
  if (!playerEid || !hasComponent(world, playerEid, AdvancementQuest)) return
  if (!AdvancementQuest.questActive[playerEid]) return
  if (AdvancementQuest.questComplete[playerEid]) return

  AdvancementQuest.killCount[playerEid] += 1

  if (AdvancementQuest.killCount[playerEid] >= AdvancementQuest.killTarget[playerEid]) {
    AdvancementQuest.questComplete[playerEid] = 1

    world.eventBus?.emit('advancement:questComplete', {
      eid: playerEid,
      tier: AdvancementQuest.questTier[playerEid],
    })
  }
}

/**
 * Handle a player:levelup event.
 * Awards stat points, applies growthPerLevel bonuses, and checks advancement.
 */
function onLevelUp(world, event) {
  const eid = event.eid
  if (!hasComponent(world, eid, PlayerTag)) return

  // Award manual stat points
  StatAllocation.availablePoints[eid] += STAT_POINTS_PER_LEVEL

  // Determine the player's job to get growthPerLevel
  const jobStringId = getJobStringId(Job.jobId[eid])
  const jobData = jobStringId ? JOB_MAP[jobStringId] : null

  if (!jobData) return

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

  // Check if advancement quest should activate
  checkAdvancementQuest(world, eid, event.level)
}

/**
 * Factory: create and return a GrowthSystem instance.
 */
export function createGrowthSystem() {
  return {
    /**
     * Bind event listeners — call once after world.eventBus is ready.
     */
    init(world) {
      world.eventBus?.on('player:levelup', (e) => onLevelUp(world, e))
      world.eventBus?.on('combat:death', (e) => {
        if (e.isMonster) onMonsterKill(world, e)
      })
    },

    /**
     * Per-tick system function (currently event-driven, no per-tick work).
     */
    system: function GrowthSystem(world) {
      return world
    },

    applyJob,
    applyAdvancement,
  }
}
