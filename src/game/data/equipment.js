export const RARITY_TABLE = [
  { id: "common", weight: 700, atkBonus: 0 },
  { id: "uncommon", weight: 220, atkBonus: 5 },
  { id: "rare", weight: 65, atkBonus: 12 },
  { id: "epic", weight: 14, atkBonus: 24 },
  { id: "legendary", weight: 1, atkBonus: 45 },
]

export const ENHANCE_RULES = {
  0: { success: 1.0, bonus: 2 },
  1: { success: 0.95, bonus: 2 },
  2: { success: 0.9, bonus: 3 },
  3: { success: 0.8, bonus: 3 },
  4: { success: 0.7, bonus: 4 },
  5: { success: 0.6, bonus: 5 },
  6: { success: 0.5, bonus: 6 },
  7: { success: 0.4, bonus: 7 },
  8: { success: 0.3, bonus: 8 },
  9: { success: 0.2, bonus: 10 },
}
