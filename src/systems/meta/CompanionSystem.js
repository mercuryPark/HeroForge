/**
 * CompanionSystem — gacha pulls, companion collection, equip, synergy calculation.
 */
import { signal } from '@preact/signals'
import companionData from '@data/companions.json'
import synergyData from '@data/synergies.json'
import { CompanionEquipped, MAX_EQUIPPED_COMPANIONS, RARITY } from '@components/companion'
import { spendCurrency } from '@core/CurrencyManager'

const COMPANIONS = companionData.companions
const GACHA = companionData.gacha

/** Player's companion collection */
const _collection = []
let _nextId = 1
let _pityCounter = 0

/** Signal for UI reactivity */
export const companionSignals = {
  version: signal(0),
  collectionCount: signal(0),
  pityCounter: signal(0),
}

function _bump() {
  companionSignals.version.value++
  companionSignals.collectionCount.value = _collection.length
  companionSignals.pityCounter.value = _pityCounter
}

/**
 * Perform a single gacha pull.
 * @returns {object|null} pulled companion
 */
export function gachaPull() {
  if (!spendCurrency('gems', GACHA.singleCost)) return null
  const companion = _rollOne()
  _addToCollection(companion)
  _bump()
  return companion
}

/**
 * Perform a 10-pull with SR+ guarantee on last slot.
 * @returns {Array<object>} pulled companions
 */
export function gachaTenPull() {
  if (!spendCurrency('gems', GACHA.tenPullCost)) return []
  const results = []
  for (let i = 0; i < 9; i++) {
    results.push(_rollOne())
  }
  // 10th pull: SR+ guaranteed
  let last = _rollOne()
  if (GACHA.tenPullSRGuarantee && last.rarity < RARITY.SR) {
    last = _rollOneMinRarity(RARITY.SR)
  }
  results.push(last)

  for (const c of results) _addToCollection(c)
  _bump()
  return results
}

function _rollOne() {
  _pityCounter++

  // Pity: guarantee SSR at threshold
  if (_pityCounter >= GACHA.pityThreshold) {
    _pityCounter = 0
    return _rollOneMinRarity(RARITY.SSR)
  }

  const roll = Math.random() * 100
  let rarity
  if (roll < GACHA.rates.SSR) {
    rarity = RARITY.SSR
    _pityCounter = 0
  } else if (roll < GACHA.rates.SSR + GACHA.rates.SR) {
    rarity = RARITY.SR
  } else {
    rarity = RARITY.R
  }

  return _createCompanion(rarity)
}

function _rollOneMinRarity(minRarity) {
  const pool = COMPANIONS.filter(c => c.rarity >= minRarity)
  const template = pool[Math.floor(Math.random() * pool.length)]
  return _makeFromTemplate(template)
}

function _createCompanion(rarity) {
  const pool = COMPANIONS.filter(c => c.rarity === rarity)
  const template = pool[Math.floor(Math.random() * pool.length)]
  return _makeFromTemplate(template)
}

function _makeFromTemplate(template) {
  return {
    id: _nextId++,
    companionId: template.id,
    nameKr: template.nameKr,
    rarity: template.rarity,
    star: 1,
    jobClass: template.jobClass,
    equipEffect: { ...template.equipEffect },
    ownEffect: { ...template.ownEffect },
  }
}

function _addToCollection(companion) {
  // Check duplicate → star rank up
  const existing = _collection.find(c => c.companionId === companion.companionId)
  if (existing && existing.star < GACHA.maxStar) {
    existing.star += GACHA.starPerDuplicate
    if (existing.star > GACHA.maxStar) existing.star = GACHA.maxStar
    // Scale effects by star
    const template = COMPANIONS.find(t => t.id === companion.companionId)
    if (template) {
      const mult = 1 + (existing.star - 1) * GACHA.starStatBonus
      existing.equipEffect.value = Math.floor(template.equipEffect.value * mult)
      existing.ownEffect.value = Math.floor(template.ownEffect.value * mult)
    }
  } else if (!existing) {
    _collection.push(companion)
  }
}

/** Get collection */
export function getCollection() { return _collection }

/** Get equipped companion IDs for a player entity */
export function getEquippedCompanions(eid) {
  return [
    CompanionEquipped.slot0[eid],
    CompanionEquipped.slot1[eid],
    CompanionEquipped.slot2[eid],
    CompanionEquipped.slot3[eid],
  ].map(collIdx => collIdx > 0 ? _collection.find(c => c.id === collIdx) : null)
}

/** Equip a companion to a slot */
export function equipCompanion(eid, slotIndex, companionId) {
  const key = `slot${slotIndex}`
  CompanionEquipped[key][eid] = companionId
  _bump()
}

/** Unequip a companion from a slot */
export function unequipCompanion(eid, slotIndex) {
  const key = `slot${slotIndex}`
  CompanionEquipped[key][eid] = 0
  _bump()
}

/**
 * Calculate active synergy bonuses based on equipped companions.
 * @returns {Array<object>} active synergies
 */
export function getActiveSynergies(eid) {
  const equipped = getEquippedCompanions(eid).filter(Boolean)
  const active = []

  for (const syn of synergyData.synergies) {
    const cond = syn.condition

    if (cond.jobClass && cond.count) {
      const matches = equipped.filter(c => c.jobClass === cond.jobClass)
      if (matches.length >= cond.count) active.push(syn)
    } else if (cond.combo) {
      const classes = equipped.map(c => c.jobClass)
      if (cond.combo.every(cls => classes.includes(cls))) active.push(syn)
    } else if (cond.allClasses) {
      const uniqueClasses = new Set(equipped.map(c => c.jobClass))
      if (uniqueClasses.size >= 4) active.push(syn)
    } else if (cond.rarity != null && cond.count) {
      const matches = equipped.filter(c => c.rarity >= cond.rarity)
      if (matches.length >= cond.count) active.push(syn)
    }
  }

  return active
}

/** Serialize for save */
export function serializeCompanions() {
  return { collection: [..._collection], pityCounter: _pityCounter, nextId: _nextId }
}

/** Deserialize from save */
export function deserializeCompanions(data) {
  if (!data) return
  _collection.length = 0
  if (data.collection) data.collection.forEach(c => _collection.push(c))
  _pityCounter = data.pityCounter || 0
  _nextId = data.nextId || _collection.length + 1
  _bump()
}

/** Clear collection */
export function clearCompanions() {
  _collection.length = 0
  _pityCounter = 0
  _nextId = 1
  _bump()
}
