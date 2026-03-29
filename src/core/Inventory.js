/**
 * Inventory — module-level store for equipment items.
 *
 * Items are plain JS objects (not ECS entities) because they have
 * variable-length sub-options and need to move between slots freely.
 *
 * Max 100 inventory slots (expandable later).
 */
import { signal } from '@preact/signals'
import { EQUIP_SLOT_COUNT, EQUIP_SLOT_IDS } from '@components/equipment'

const MAX_INVENTORY = 100

/** Equipped items: array of 11 slots, each null or an item object */
const _equipped = new Array(EQUIP_SLOT_COUNT).fill(null)

/** Inventory bag: array of item objects */
const _bag = []

/** Signals for UI reactivity */
export const inventorySignals = {
  /** Bumped on any inventory change to trigger re-render */
  version: signal(0),
  /** Number of items in bag */
  bagCount: signal(0),
  /** Armor stones currency */
  armorStones: signal(0),
  /** Elite summon level */
  eliteSummonLevel: signal(1),
}

function _bump() {
  inventorySignals.version.value++
  inventorySignals.bagCount.value = _bag.length
}

/** Get equipped item for a slot index (0-10) */
export function getEquipped(slotIndex) {
  return _equipped[slotIndex] ?? null
}

/** Get all equipped items (for stat recalculation) */
export function getAllEquipped() {
  return _equipped
}

/** Equip an item from bag to its slot. Returns the previously equipped item (or null). */
export function equipItem(item) {
  const slotIndex = EQUIP_SLOT_IDS[item.slotId]
  if (slotIndex === undefined) return null

  const prev = _equipped[slotIndex]

  // Remove from bag
  const bagIdx = _bag.indexOf(item)
  if (bagIdx >= 0) _bag.splice(bagIdx, 1)

  // If there was an equipped item, put it back in bag
  if (prev && _bag.length < MAX_INVENTORY) {
    _bag.push(prev)
  }

  _equipped[slotIndex] = item
  _bump()
  return prev
}

/** Unequip item from slot, put in bag. Returns the item or null if bag full. */
export function unequipSlot(slotIndex) {
  const item = _equipped[slotIndex]
  if (!item) return null
  if (_bag.length >= MAX_INVENTORY) return null

  _equipped[slotIndex] = null
  _bag.push(item)
  _bump()
  return item
}

/** Add item to bag. Returns false if bag is full. */
export function addToBag(item) {
  if (_bag.length >= MAX_INVENTORY) return false
  _bag.push(item)
  _bump()
  return true
}

/** Remove item from bag. Returns the item or null. */
export function removeFromBag(item) {
  const idx = _bag.indexOf(item)
  if (idx < 0) return null
  _bag.splice(idx, 1)
  _bump()
  return item
}

/** Get all bag items (read-only snapshot) */
export function getBag() {
  return _bag
}

/** Get bag capacity info */
export function getBagInfo() {
  return { count: _bag.length, max: MAX_INVENTORY }
}

/** Dismantle an item → returns armor stones gained */
export function dismantleItem(item) {
  const removed = removeFromBag(item)
  if (!removed) return 0

  // Armor stones based on grade: Normal=1, Rare=3, Epic=8, Unique=20, Legendary=50
  const stonesByGrade = [1, 3, 8, 20, 50]
  const stones = stonesByGrade[item.grade] ?? 1
  inventorySignals.armorStones.value += stones
  _bump()
  return stones
}

/** Sort bag items. sortBy: 'grade' | 'slot' | 'level' */
export function sortBag(sortBy = 'grade') {
  if (sortBy === 'grade') {
    _bag.sort((a, b) => b.grade - a.grade || b.itemLevel - a.itemLevel)
  } else if (sortBy === 'slot') {
    _bag.sort((a, b) => (EQUIP_SLOT_IDS[a.slotId] ?? 99) - (EQUIP_SLOT_IDS[b.slotId] ?? 99))
  } else if (sortBy === 'level') {
    _bag.sort((a, b) => b.itemLevel - a.itemLevel || b.grade - a.grade)
  }
  _bump()
}

/** Filter bag items. Returns a filtered view (does not mutate). */
export function filterBag(gradeFilter = -1, slotFilter = '') {
  let items = _bag
  if (gradeFilter >= 0) {
    items = items.filter(i => i.grade === gradeFilter)
  }
  if (slotFilter) {
    items = items.filter(i => i.slotId === slotFilter)
  }
  return items
}

/** Batch dismantle: dismantle all items at or below a grade threshold */
export function batchDismantle(maxGrade) {
  const stonesByGrade = [1, 3, 8, 20, 50]
  let totalStones = 0
  let count = 0
  for (let i = _bag.length - 1; i >= 0; i--) {
    if (_bag[i].grade <= maxGrade) {
      totalStones += stonesByGrade[_bag[i].grade] ?? 1
      _bag.splice(i, 1)
      count++
    }
  }
  inventorySignals.armorStones.value += totalStones
  _bump()
  return { count, stones: totalStones }
}

/** Auto-dismantle setting signal */
export const autoDismantle = {
  enabled: signal(false),
  maxGrade: signal(1), // 0=Normal only, 1=Rare이하
}

/** Apply auto-dismantle to a newly added item. Returns true if dismantled. */
export function tryAutoDismantle(item) {
  if (!autoDismantle.enabled.value) return false
  if (item.grade <= autoDismantle.maxGrade.value) {
    const stonesByGrade = [1, 3, 8, 20, 50]
    const idx = _bag.indexOf(item)
    if (idx >= 0) {
      _bag.splice(idx, 1)
      inventorySignals.armorStones.value += stonesByGrade[item.grade] ?? 1
      _bump()
      return true
    }
  }
  return false
}

/** Clear all inventory (for new game) */
export function clearInventory() {
  _equipped.fill(null)
  _bag.length = 0
  inventorySignals.armorStones.value = 0
  inventorySignals.eliteSummonLevel.value = 1
  _bump()
}

/** Serialize inventory state for save */
export function serializeInventory() {
  return {
    equipped: _equipped.map(i => i ?? null),
    bag: [..._bag],
    armorStones: inventorySignals.armorStones.value,
    eliteSummonLevel: inventorySignals.eliteSummonLevel.value,
    nextItemId: undefined, // handled separately by equipment.js
  }
}

/** Deserialize inventory from save */
export function deserializeInventory(data) {
  if (!data) return
  clearInventory()
  if (data.equipped) {
    data.equipped.forEach((item, i) => {
      if (item && i < EQUIP_SLOT_COUNT) _equipped[i] = item
    })
  }
  if (data.bag) {
    data.bag.forEach(item => {
      if (item && _bag.length < MAX_INVENTORY) _bag.push(item)
    })
  }
  if (data.armorStones != null) inventorySignals.armorStones.value = data.armorStones
  if (data.eliteSummonLevel != null) inventorySignals.eliteSummonLevel.value = data.eliteSummonLevel
  _bump()
}
