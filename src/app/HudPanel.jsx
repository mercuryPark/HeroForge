import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { gsap } from "gsap"
import { HERO_CLASSES } from "../game/data/classes"
import { useGameStore } from "../game/state/gameStore"
import { useShallow } from "zustand/react/shallow"
import { ThreePreview } from "./ThreePreview"

export function HudPanel() {
  const [showGuide, setShowGuide] = useState(false)
  const state = useGameStore(
    useShallow((s) => ({
      hero: s.hero,
      enemy: s.enemy,
      stage: s.stage,
      power: s.power,
      lootLog: s.lootLog,
      afkSummary: s.afkSummary,
      inventory: s.inventory,
      autoHunt: s.autoHunt,
      chooseClass: s.chooseClass,
      toggleAutoHunt: s.toggleAutoHunt,
      tryEnhanceWeapon: s.tryEnhanceWeapon,
      equipInventoryItem: s.equipInventoryItem,
      save: s.save,
      load: s.load,
      reset: s.reset,
    }))
  )

  useEffect(() => {
    const seen = localStorage.getItem("heroforge.guide.seen")
    if (!seen) setShowGuide(true)
  }, [])

  useEffect(() => {
    gsap.fromTo(
      ".hud",
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
    )
  }, [])

  function closeGuide() {
    localStorage.setItem("heroforge.guide.seen", "1")
    setShowGuide(false)
  }

  return (
    <motion.section className="hud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="row">
        <h1>히어로포지</h1>
        <span>전투력 {state.power}</span>
      </div>

      {showGuide && (
        <div className="guide">
          <p><strong>처음 오셨다면 이렇게 시작하세요</strong></p>
          <p>1) 직업을 선택합니다. 2) 이동하면서 전투합니다. 3) 장비를 강화해 성장합니다.</p>
          <p>조작: 이동(WASD/방향키) · 기본공격(J) · 스킬(Q/E/R) · 대시(Space)</p>
          <button onClick={closeGuide}>가이드 닫기</button>
        </div>
      )}

      <div className="row classes">
        {Object.values(HERO_CLASSES).map((job) => (
          <button className={`class-btn ${job.id}`} key={job.id} onClick={() => state.chooseClass(job.id)}>
            <strong>{job.name}</strong>
            <span>{job.title}</span>
          </button>
        ))}
      </div>

      <p className="class-summary">
        현재 직업: <strong>{state.hero.className}</strong> · {HERO_CLASSES[state.hero.classId]?.summary}
      </p>

      <div className="grid">
        <p>직업: {state.hero.className}</p>
        <p>레벨: {state.hero.level}</p>
        <p>경험치: {Math.floor(state.hero.exp)}</p>
        <p>골드: {state.hero.gold}</p>
        <p>스테이지: {state.stage}</p>
        <p>무기 강화: +{state.hero.weapon.level} (공격 +{state.hero.weapon.bonusAtk})</p>
        <p>영웅 체력: {Math.floor(state.hero.hp)} / {Math.floor(state.hero.maxHp)}</p>
        <p>적 체력: {Math.floor(state.enemy.hp)} / {Math.floor(state.enemy.maxHp)}</p>
      </div>

      <div className="row actions">
        <button onClick={state.toggleAutoHunt}>자동사냥: {state.autoHunt ? "ON" : "OFF"}</button>
        <button onClick={state.tryEnhanceWeapon}>무기 강화</button>
        <button onClick={state.save}>저장</button>
        <button onClick={state.load}>불러오기 + AFK</button>
        <button onClick={state.reset}>초기화</button>
      </div>

      <div className="inventory-panel">
        <h3>장비 / 인벤토리</h3>
        <ThreePreview />
        <p>현재 장착 무기 보너스: 공격 +{state.hero.weapon.bonusAtk}</p>
        <ul className="inventory-list">
          {state.inventory.slice(0, 8).map((item) => (
            <li key={item.id} className="inventory-item">
              <span>{item.name} (공격 +{item.atkBonus})</span>
              <button onClick={() => state.equipInventoryItem(item.id)}>장착</button>
            </li>
          ))}
          {state.inventory.length === 0 && <li>아직 획득한 장비가 없습니다.</li>}
        </ul>
      </div>

      {state.afkSummary && (
        <div className="afk">
          AFK {state.afkSummary.effectiveSec}초 | 골드 +{state.afkSummary.gold} | 경험치 +{state.afkSummary.exp}
        </div>
      )}

      <ul>
        {state.lootLog.map((item, idx) => (
          <li key={`${item}-${idx}`}>{item}</li>
        ))}
      </ul>
    </motion.section>
  )
}
