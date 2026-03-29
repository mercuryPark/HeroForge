/**
 * CurrencyManager — unified currency store for all game currencies.
 *
 * Consolidates gold, monster points, armor stones, weapon materials,
 * enhancement currencies, and future currencies into a single signal-based store.
 * Other modules can import and use these signals directly.
 */
import { signal } from '@preact/signals'
import currencyData from '@data/currencies.json'

/** Create signals for all currencies */
const _store = {}
for (const cur of currencyData.currencies) {
  _store[cur.id] = signal(0)
}

/** Create signals for all consumables */
for (const con of currencyData.consumables) {
  _store[con.id] = signal(0)
}

/** Get a currency signal by id */
export function getCurrency(id) {
  return _store[id] || null
}

/** Get current value */
export function getCurrencyValue(id) {
  return _store[id]?.value ?? 0
}

/** Add to a currency */
export function addCurrency(id, amount) {
  if (_store[id]) {
    _store[id].value += amount
  }
}

/** Spend currency. Returns false if insufficient. */
export function spendCurrency(id, amount) {
  if (!_store[id] || _store[id].value < amount) return false
  _store[id].value -= amount
  return true
}

/** Set currency to a specific value */
export function setCurrency(id, value) {
  if (_store[id]) {
    _store[id].value = value
  }
}

/** Get all currency data for UI display */
export function getAllCurrencies() {
  return currencyData.currencies.map(cur => ({
    ...cur,
    value: _store[cur.id]?.value ?? 0,
  }))
}

/** Get primary currencies for top bar display */
export function getPrimaryCurrencies() {
  const primary = ['gold', 'gems', 'monster_points', 'armor_stones', 'weapon_materials']
  return primary.map(id => {
    const def = currencyData.currencies.find(c => c.id === id)
    return {
      id,
      nameKr: def?.nameKr ?? id,
      value: _store[id]?.value ?? 0,
      signal: _store[id],
    }
  })
}

/** Serialize all currencies for save */
export function serializeCurrencies() {
  const data = {}
  for (const key in _store) {
    data[key] = _store[key].value
  }
  return data
}

/** Deserialize currencies from save */
export function deserializeCurrencies(data) {
  if (!data) return
  for (const key in data) {
    if (_store[key]) {
      _store[key].value = data[key]
    }
  }
}

/** Reset all currencies to 0 */
export function resetCurrencies() {
  for (const key in _store) {
    _store[key].value = 0
  }
}

/**
 * Convenience exports for frequently used currencies.
 * These are the same signals as in the store — no duplication.
 */
export const gold = _store.gold
export const gems = _store.gems
export const monsterPoints = _store.monster_points
export const armorStones = _store.armor_stones
export const weaponMaterials = _store.weapon_materials
export const starforceScrolls = _store.starforce_scroll
export const normalCubes = _store.cube_normal
export const additionalCubes = _store.cube_additional
export const miracleCubes = _store.cube_miracle
