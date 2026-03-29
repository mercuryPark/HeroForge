/**
 * Player character components — class, level, stat allocation.
 */
import { MAX_ENTITIES } from '@data/constants'

const MAX = MAX_ENTITIES

/** Tag: identifies the player-controlled entity */
export const PlayerTag = {}

/**
 * Job/class identity.
 *   classId: 0=warrior, 1=mage, 2=archer, 3=thief
 *   jobId:   specific job within the class tree
 *   advancement: 0-4 (job advancement tier)
 */
export const Job = {
  classId: new Uint8Array(MAX),
  jobId: new Uint8Array(MAX),
  advancement: new Uint8Array(MAX),
}

/** Level and experience tracking */
export const Level = {
  current: new Uint16Array(MAX),
  xp: new Float32Array(MAX),
  xpToNext: new Float32Array(MAX),
}

/**
 * Manual stat point allocation.
 *   int_ avoids collision with the `int` keyword.
 */
export const StatAllocation = {
  str: new Uint16Array(MAX),
  dex: new Uint16Array(MAX),
  int_: new Uint16Array(MAX),
  luk: new Uint16Array(MAX),
  availablePoints: new Uint16Array(MAX),
}

/**
 * Advancement quest tracking.
 *   questActive:    0=no active quest, 1=quest in progress
 *   questTier:      which advancement tier this quest is for (1-4)
 *   killCount:      current kills toward the quest target
 *   killTarget:     total kills needed to complete
 *   questComplete:  0=incomplete, 1=ready to advance
 */
export const AdvancementQuest = {
  questActive: new Uint8Array(MAX),
  questTier: new Uint8Array(MAX),
  killCount: new Uint16Array(MAX),
  killTarget: new Uint16Array(MAX),
  questComplete: new Uint8Array(MAX),
}
