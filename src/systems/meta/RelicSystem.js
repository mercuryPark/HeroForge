/**
 * RelicSystem — relic acquisition, equip, active/passive effect management.
 */
import { signal } from '@preact/signals'
import relicData from '@data/relics.json'
import { RelicSlot, MAX_RELIC_SLOTS } from '@components/relic'
import { spendCurrency } from '@core/CurrencyManager'

const RELICS = relicData.relics
const ACQ = relicData.acquisition

/** Player's relic collection */
const _collection = []
let _nextId = 1

export const relicSignals = {
  version: signal(0),
  collectionCount: signal(0),
}

function _bump() {
  relicSignals.version.value++
  relicSignals.collectionCount.value = _collection.length
}

/**
 * Pull a random relic using boss coins.
 * @returns {object|null}
 */
export function pullRelic() {
  if (!spendCurrency('boss_coins', ACQ.bossCoinsPerPull)) return null

  // Roll grade
  const roll = Math.random() * 100
  let grade = 0
  let cumulative = 0
  for (let i = 0; i < ACQ.gradeRates.length; i++) {
    cumulative += ACQ.gradeRates[i]
    if (roll < cumulative) { grade = i; break }
  }

  const pool = RELICS.filter(r => r.grade === grade)
  const template = pool[Math.floor(Math.random() * pool.length)] || RELICS[0]

  const relic = {
    id: _nextId++,
    relicId: template.id,
    nameKr: template.nameKr,
    grade: template.grade,
    activeType: template.activeType,
    activeValue: template.activeValue,
    activeDuration: template.activeDuration,
    passiveType: template.passiveType,
    passiveValue: template.passiveValue,
  }

  _collection.push(relic)
  _bump()
  return relic
}

/** Get collection */
export function getRelicCollection() { return _collection }

/** Get equipped relics for a player */
export function getEquippedRelics(eid) {
  const result = []
  for (let i = 0; i < MAX_RELIC_SLOTS; i++) {
    const idx = eid * MAX_RELIC_SLOTS + i
    const relicId = RelicSlot.relicId[idx]
    if (relicId > 0) {
      result.push(_collection.find(r => r.id === relicId) || null)
    } else {
      result.push(null)
    }
  }
  return result
}

/** Equip a relic to a slot */
export function equipRelic(eid, slotIndex, relicCollectionId) {
  if (slotIndex >= MAX_RELIC_SLOTS) return false
  const idx = eid * MAX_RELIC_SLOTS + slotIndex
  RelicSlot.relicId[idx] = relicCollectionId
  _bump()
  return true
}

/** Unequip relic from slot */
export function unequipRelic(eid, slotIndex) {
  if (slotIndex >= MAX_RELIC_SLOTS) return
  const idx = eid * MAX_RELIC_SLOTS + slotIndex
  RelicSlot.relicId[idx] = 0
  _bump()
}

/** Calculate total passive bonuses from equipped relics */
export function getRelicPassiveBonuses(eid) {
  const bonuses = {}
  for (let i = 0; i < MAX_RELIC_SLOTS; i++) {
    const idx = eid * MAX_RELIC_SLOTS + i
    const relicId = RelicSlot.relicId[idx]
    if (!relicId) continue
    const relic = _collection.find(r => r.id === relicId)
    if (!relic) continue
    bonuses[relic.passiveType] = (bonuses[relic.passiveType] || 0) + relic.passiveValue
  }
  return bonuses
}

/** Serialize */
export function serializeRelics() {
  return { collection: [..._collection], nextId: _nextId }
}

/** Deserialize */
export function deserializeRelics(data) {
  if (!data) return
  _collection.length = 0
  if (data.collection) data.collection.forEach(r => _collection.push(r))
  _nextId = data.nextId || _collection.length + 1
  _bump()
}
