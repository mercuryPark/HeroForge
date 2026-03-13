import { expToNextLevel } from "../core/formulas"

export function applyExp(hero, expGain) {
  let heroNext = { ...hero, exp: hero.exp + expGain }

  while (heroNext.exp >= expToNextLevel(heroNext.level)) {
    const need = expToNextLevel(heroNext.level)
    heroNext.exp -= need
    heroNext.level += 1
    heroNext.maxHp = Math.floor(heroNext.maxHp + heroNext.growth.hp)
    heroNext.hp = heroNext.maxHp
    heroNext.atk = Number((heroNext.atk + heroNext.growth.atk).toFixed(2))
    heroNext.def = Number((heroNext.def + heroNext.growth.def).toFixed(2))
    heroNext.critRate = Math.min(0.65, Number((heroNext.critRate + heroNext.growth.critRate).toFixed(4)))
  }

  return heroNext
}
