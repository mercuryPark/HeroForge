import { HERO_CLASSES } from "../game/data/classes"
import { useGameStore } from "../game/state/gameStore"
import { useShallow } from "zustand/react/shallow"

export function HudPanel() {
  const state = useGameStore(
    useShallow((s) => ({
      hero: s.hero,
      enemy: s.enemy,
      stage: s.stage,
      power: s.power,
      lootLog: s.lootLog,
      afkSummary: s.afkSummary,
      chooseClass: s.chooseClass,
      tryEnhanceWeapon: s.tryEnhanceWeapon,
      save: s.save,
      load: s.load,
      reset: s.reset,
    }))
  )

  return (
    <section className="hud">
      <div className="row">
        <h1>HeroForge</h1>
        <span>Power {state.power}</span>
      </div>

      <div className="row classes">
        {Object.values(HERO_CLASSES).map((job) => (
          <button key={job.id} onClick={() => state.chooseClass(job.id)}>{job.name}</button>
        ))}
      </div>

      <div className="grid">
        <p>Class: {state.hero.className}</p>
        <p>Level: {state.hero.level}</p>
        <p>EXP: {Math.floor(state.hero.exp)}</p>
        <p>Gold: {state.hero.gold}</p>
        <p>Stage: {state.stage}</p>
        <p>Weapon: +{state.hero.weapon.level} (ATK +{state.hero.weapon.bonusAtk})</p>
        <p>Hero HP: {Math.floor(state.hero.hp)} / {Math.floor(state.hero.maxHp)}</p>
        <p>Enemy HP: {Math.floor(state.enemy.hp)} / {Math.floor(state.enemy.maxHp)}</p>
      </div>

      <div className="row actions">
        <button onClick={state.tryEnhanceWeapon}>Enhance Weapon</button>
        <button onClick={state.save}>Save</button>
        <button onClick={state.load}>Load + AFK</button>
        <button onClick={state.reset}>Reset</button>
      </div>

      {state.afkSummary && (
        <div className="afk">
          AFK {state.afkSummary.effectiveSec}s | Gold +{state.afkSummary.gold} | EXP +{state.afkSummary.exp}
        </div>
      )}

      <ul>
        {state.lootLog.map((item, idx) => (
          <li key={`${item}-${idx}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
