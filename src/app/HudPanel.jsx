import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { motion } from "framer-motion"
import { gsap } from "gsap"
import { Icon } from "@iconify/react"
import broadswordIcon from "@iconify-icons/game-icons/broadsword"
import fireballIcon from "@iconify-icons/game-icons/fireball"
import bowArrowIcon from "@iconify-icons/game-icons/bow-arrow"
import plainDaggerIcon from "@iconify-icons/game-icons/plain-dagger"
import heartWingsIcon from "@iconify-icons/game-icons/heart-wings"
import pawPrintsIcon from "@iconify-icons/game-icons/paw-print"
import sparklesIcon from "@iconify-icons/game-icons/sparkles"
import { HERO_CLASSES } from "../game/data/classes"
import {
  COMPANION_MAX_LEVEL,
  COMPANION_POOL,
  getCompanionEnhanceCost,
  getCompanionStats,
  SUMMON_COST,
} from "../game/data/companions"
import { getEnhanceCost } from "../game/data/balance"
import { DUNGEONS } from "../game/data/dungeons"
import { EQUIPMENT_SLOTS, FUSION_REQUIREMENT, RARITY_TABLE } from "../game/data/equipment"
import { ACHIEVEMENTS, getProgressValue, QUESTS } from "../game/data/progression"
import { getDailyReward, SHOP_ITEMS } from "../game/data/shop"
import { getSkillUpgradeCost, SKILL_UPGRADE_RULES } from "../game/data/skills"
import { getFusionResult } from "../game/systems/equipmentSystem"
import { useGameStore } from "../game/state/gameStore"
import { useShallow } from "zustand/react/shallow"

const LazyThreePreview = lazy(() =>
  import("./ThreePreview").then((module) => ({ default: module.ThreePreview }))
)

const HUD_TABS = [
  { id: "equipment", label: "장비" },
  { id: "growth", label: "성장" },
  { id: "companion", label: "동료" },
  { id: "dungeon", label: "던전" },
  { id: "shop", label: "상점" },
  { id: "missions", label: "임무" },
  { id: "log", label: "기록" },
]

const THEME_OPTIONS = [
  { id: "light", label: "라이트" },
  { id: "dark", label: "다크" },
  { id: "system", label: "시스템" },
]

const EQUIPMENT_SORTERS = {
  latest: (a, b) => (b.obtainedAt ?? 0) - (a.obtainedAt ?? 0),
  power: (a, b) => (b.atkBonus + (b.defBonus ?? 0) * 2 + (b.hpBonus ?? 0) * 0.1) - (a.atkBonus + (a.defBonus ?? 0) * 2 + (a.hpBonus ?? 0) * 0.1),
  rarity: (a, b) => RARITY_TABLE.findIndex((entry) => entry.id === b.rarity) - RARITY_TABLE.findIndex((entry) => entry.id === a.rarity),
}

function slotSummary(item, type = "equipped") {
  if (!item) return "-"
  if (type === "equipped") return `${item.equippedItemName} · ${item.rarityLabel}`
  return `${item.name} · ${item.slotLabel}`
}

function statText(item) {
  if (!item) return ""
  return `공격 +${item.atkBonus ?? 0} / 방어 +${item.defBonus ?? 0} / 체력 +${item.hpBonus ?? 0}`
}

function getSlotEquippedItem(hero, slot) {
  if (slot === "weapon") return hero.weapon
  if (slot === "armor") return hero.armor
  return hero.helmet
}

function getComparison(item, hero) {
  const equipped = getSlotEquippedItem(hero, item.slot)
  return {
    atk: (item.atkBonus ?? 0) - (item.slot === "weapon" ? equipped.bonusAtk ?? 0 : equipped.atkBonus ?? 0),
    def: (item.defBonus ?? 0) - (equipped.defBonus ?? 0),
    hp: (item.hpBonus ?? 0) - (equipped.hpBonus ?? 0),
  }
}

function comparisonLabel(delta, suffix) {
  if (delta === 0) return null
  return `${delta > 0 ? "+" : ""}${delta}${suffix}`
}

function totalComparisonScore(comparison) {
  return comparison.atk + comparison.def * 2 + comparison.hp * 0.1
}

function getActionGuide(state) {
  if (state.afkSummary) {
    return {
      title: "오프라인 보상 수령 추천",
      description: `골드 +${state.afkSummary.gold}, 경험치 +${state.afkSummary.exp}가 쌓였습니다. 먼저 수령하고 강화에 투자하는 편이 가장 효율적입니다.`,
    }
  }

  if (state.chapter >= 4 && state.hero.gold >= getEnhanceCost(state.hero.weapon.level)) {
    return {
      title: "무기 강화 타이밍",
      description: `현재 무기 ${state.hero.weapon.equippedItemName}을 +${state.hero.weapon.level + 1}로 시도할 수 있습니다. 챕터 ${state.chapter}부터는 직접 개입 효율이 큽니다.`,
    }
  }

  if (state.inventory.length > 0) {
    return {
      title: "장비 점검 추천",
      description: `인벤토리에 ${state.inventory.length}개의 장비가 있습니다. 장착 비교 배지를 보고 바로 교체하면 전투력이 더 안정적으로 오릅니다.`,
    }
  }

  return {
    title: "현재 추천 행동",
    description: "자동사냥을 유지하면서 장비 드랍을 모으고, 골드가 쌓이면 무기 강화와 스킬 강화를 번갈아 진행하세요.",
  }
}

export function HudPanel({ theme, onChangeTheme }) {
  const [showGuide, setShowGuide] = useState(false)
  const [activeTab, setActiveTab] = useState("equipment")
  const [equipmentFilter, setEquipmentFilter] = useState("all")
  const [equipmentSort, setEquipmentSort] = useState("latest")

  const state = useGameStore(
    useShallow((s) => ({
      profile: s.profile,
      hero: s.hero,
      enemy: s.enemy,
      stage: s.stage,
      chapter: s.chapter,
      stageInChapter: s.stageInChapter,
      companions: s.companions,
      activeCompanionId: s.activeCompanionId,
      progression: s.progression,
      dungeons: s.dungeons,
      dailyReward: s.dailyReward,
      questClaims: s.questClaims,
      achievementClaims: s.achievementClaims,
      power: s.power,
      lootLog: s.lootLog,
      afkSummary: s.afkSummary,
      inventory: s.inventory,
      autoHunt: s.autoHunt,
      toggleAutoHunt: s.toggleAutoHunt,
      claimAfkRewards: s.claimAfkRewards,
      claimQuestReward: s.claimQuestReward,
      claimAchievementReward: s.claimAchievementReward,
      tryEnhanceWeapon: s.tryEnhanceWeapon,
      summonCompanion: s.summonCompanion,
      equipCompanion: s.equipCompanion,
      upgradeCompanion: s.upgradeCompanion,
      buyShopItem: s.buyShopItem,
      claimDailyReward: s.claimDailyReward,
      runDungeon: s.runDungeon,
      fuseEquipment: s.fuseEquipment,
      upgradeSkill: s.upgradeSkill,
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
    gsap.fromTo(".dashboard-shell", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
  }, [])

  const rarityCounts = state.inventory.reduce((acc, item) => {
    acc[item.rarity] = (acc[item.rarity] || 0) + 1
    return acc
  }, {})

  const filteredInventory = useMemo(() => {
    const base = equipmentFilter === "all"
      ? state.inventory.slice()
      : state.inventory.filter((item) => item.slot === equipmentFilter)
    return base.sort(EQUIPMENT_SORTERS[equipmentSort])
  }, [equipmentFilter, equipmentSort, state.inventory])

  const dailyReward = getDailyReward(state)
  const actionGuide = getActionGuide(state)

  function closeGuide() {
    localStorage.setItem("heroforge.guide.seen", "1")
    setShowGuide(false)
  }

  function handleResetProgress() {
    const confirmed = window.confirm("모든 진행 상황이 초기화됩니다. 정말 새로 시작하시겠습니까?")
    if (!confirmed) return
    state.reset()
    setShowGuide(true)
  }

  return (
    <motion.section className="dashboard-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="dashboard-topbar">
        <div className="identity-block">
          <p className="eyebrow">HeroForge 대시보드</p>
          <h1>{state.profile.name || "새 영웅"}</h1>
          <p className="dashboard-subtitle">{state.hero.className} · 레벨 {state.hero.level} · 챕터 {state.chapter}-{state.stageInChapter}</p>
        </div>
        <div className="theme-switcher">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`theme-chip ${theme === option.id ? "active" : ""}`}
              onClick={() => onChangeTheme(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="status-ribbon">
        <div className="status-card">
          <span>전투력</span>
          <strong>{state.power}</strong>
        </div>
        <div className="status-card hp">
          <span>HP</span>
          <strong>{Math.floor(state.hero.hp)} / {Math.floor(state.hero.maxHp)}</strong>
        </div>
        <div className="status-card mp">
          <span>MP</span>
          <strong>{Math.floor(state.hero.mp)} / {Math.floor(state.hero.maxMp)}</strong>
        </div>
        <div className="status-card">
          <span>공격 / 방어</span>
          <strong>{Math.floor(state.hero.atk)} / {Math.floor(state.hero.def)}</strong>
        </div>
        <div className="status-card">
          <span>골드</span>
          <strong>{state.hero.gold}</strong>
        </div>
        <div className="status-card">
          <span>자동사냥</span>
          <strong>{state.autoHunt ? "ON" : "OFF"}</strong>
        </div>
      </div>

      <div className="guide command-brief">
        <div>
          <p><strong>{actionGuide.title}</strong></p>
          <p>{actionGuide.description}</p>
        </div>
        <span className="pill">실시간 추천</span>
      </div>

      <div className="dashboard-main">
        <aside className="quick-actions">
          <button className={`quick-action ${state.autoHunt ? "active" : ""}`} onClick={state.toggleAutoHunt}>
            자동사냥 {state.autoHunt ? "켜짐" : "꺼짐"}
          </button>
          <button className="quick-action" onClick={state.tryEnhanceWeapon}>무기 강화</button>
          <button className="quick-action" onClick={state.save}>저장</button>
          <button className="quick-action" onClick={state.load}>불러오기</button>
          <button className="quick-action danger-btn" onClick={handleResetProgress}>처음부터 다시</button>

          <div className="class-pills">
            <span><Icon icon={broadswordIcon} /> 전사</span>
            <span><Icon icon={fireballIcon} /> 마법사</span>
            <span><Icon icon={bowArrowIcon} /> 궁수</span>
            <span><Icon icon={plainDaggerIcon} /> 도적</span>
            <span><Icon icon={heartWingsIcon} /> 동료</span>
          </div>
        </aside>

        <div className="dashboard-panels">
          {showGuide && (
            <div className="guide hero-guide">
              <div>
                <p><strong>처음 플레이하는 분을 위한 안내</strong></p>
                <p>전투는 자동으로 진행되고, 장비와 스킬을 강화하면서 더 높은 챕터를 밀어내는 구조입니다.</p>
              </div>
              <button onClick={closeGuide}>가이드 닫기</button>
            </div>
          )}

          {state.afkSummary && (
            <div className="guide afk-panel">
              <div>
                <p><strong>오프라인 보상 도착</strong></p>
                <p>자리 비움 {state.afkSummary.effectiveSec}초 · 골드 +{state.afkSummary.gold} · 경험치 +{state.afkSummary.exp}</p>
              </div>
              <button onClick={state.claimAfkRewards}>보상 수령</button>
            </div>
          )}

          <div className="tab-dock">
            {HUD_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "equipment" && (
            <div className="panel-grid panel-grid-wide">
              <div className="inventory-panel hero-loadout">
                <div className="panel-heading">
                  <h3>현재 장착</h3>
                  <span className="pill">{state.hero.className}</span>
                </div>
                <Suspense fallback={<div className="three-preview preview-fallback">장비 미리보기를 불러오는 중입니다...</div>}>
                  <LazyThreePreview />
                </Suspense>
                <div className="loadout-grid">
                  <article className="loadout-slot">
                    <span>무기</span>
                    <strong>{slotSummary(state.hero.weapon)}</strong>
                    <small>{statText({ atkBonus: state.hero.weapon.bonusAtk, defBonus: 0, hpBonus: 0 })}</small>
                  </article>
                  <article className="loadout-slot">
                    <span>갑옷</span>
                    <strong>{slotSummary(state.hero.armor)}</strong>
                    <small>{statText(state.hero.armor)}</small>
                  </article>
                  <article className="loadout-slot">
                    <span>투구</span>
                    <strong>{slotSummary(state.hero.helmet)}</strong>
                    <small>{statText(state.hero.helmet)}</small>
                  </article>
                </div>
              </div>

              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>인벤토리</h3>
                  <span className="pill">{state.inventory.length}개 보유</span>
                </div>
                <div className="toolbar-row">
                  <div className="segmented">
                    <button className={equipmentFilter === "all" ? "active" : ""} onClick={() => setEquipmentFilter("all")}>전체</button>
                    {EQUIPMENT_SLOTS.map((slot) => (
                      <button
                        key={slot.id}
                        className={equipmentFilter === slot.id ? "active" : ""}
                        onClick={() => setEquipmentFilter(slot.id)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                  <div className="segmented">
                    <button className={equipmentSort === "latest" ? "active" : ""} onClick={() => setEquipmentSort("latest")}>최신순</button>
                    <button className={equipmentSort === "power" ? "active" : ""} onClick={() => setEquipmentSort("power")}>전투력순</button>
                    <button className={equipmentSort === "rarity" ? "active" : ""} onClick={() => setEquipmentSort("rarity")}>등급순</button>
                  </div>
                </div>
                <ul className="inventory-list">
                  {filteredInventory.slice(0, 18).map((item) => {
                    const comparison = getComparison(item, state.hero)
                    const scoreDelta = totalComparisonScore(comparison)
                    const isUpgrade = scoreDelta > 0
                    const isSidegrade = scoreDelta === 0
                    return (
                      <li key={item.id} className="inventory-item">
                        <div>
                          <strong>
                            {slotSummary(item, "inventory")}
                            {isUpgrade && <span className="inline-pill success">추천</span>}
                            {isSidegrade && <span className="inline-pill neutral">동급</span>}
                          </strong>
                          <span>{statText(item)}</span>
                          <div className="delta-row">
                            {comparisonLabel(comparison.atk, "공") && <em className={comparison.atk > 0 ? "up" : "down"}>{comparisonLabel(comparison.atk, "공")}</em>}
                            {comparisonLabel(comparison.def, "방") && <em className={comparison.def > 0 ? "up" : "down"}>{comparisonLabel(comparison.def, "방")}</em>}
                            {comparisonLabel(comparison.hp, "HP") && <em className={comparison.hp > 0 ? "up" : "down"}>{comparisonLabel(comparison.hp, "HP")}</em>}
                          </div>
                          <small className="compare-caption">
                            현재 장착 {item.slotLabel} 대비 {isUpgrade ? "상승" : isSidegrade ? "동일" : "하락"}
                          </small>
                        </div>
                        <button onClick={() => state.equipInventoryItem(item.id)}>장착</button>
                      </li>
                    )
                  })}
                  {filteredInventory.length === 0 && <li className="empty-state">조건에 맞는 장비가 없습니다.</li>}
                </ul>
              </div>

              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>장비 합성</h3>
                  <span className="pill">동일 등급 3개</span>
                </div>
                <ul className="inventory-list">
                  {RARITY_TABLE.map((rarity) => {
                    const fusion = getFusionResult(rarity.id)
                    const count = rarityCounts[rarity.id] || 0
                    const readiness = Math.min(100, Math.round((count / FUSION_REQUIREMENT) * 100))
                    return (
                      <li key={rarity.id} className="inventory-item">
                        <div>
                          <strong>{rarity.label}</strong>
                          <span>{count}개 보유 {fusion ? `· ${fusion.target.label} 등급으로 승급` : "· 최종 등급"}</span>
                          {fusion && (
                            <div className="progress-line">
                              <div className="progress-fill" style={{ width: `${readiness}%` }} />
                            </div>
                          )}
                          {fusion && <small className="compare-caption">합성 준비도 {count} / {FUSION_REQUIREMENT}</small>}
                        </div>
                        <button
                          onClick={() => state.fuseEquipment(rarity.id)}
                          disabled={!fusion || count < FUSION_REQUIREMENT}
                        >
                          {fusion ? "합성" : "완료"}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="inventory-panel full-span">
                <div className="panel-heading">
                  <h3>강화 콘솔</h3>
                  <span className="pill">현재 비용 {getEnhanceCost(state.hero.weapon.level)} 골드</span>
                </div>
                <div className="stats-board">
                  <div>
                    <span>강화 대상</span>
                    <strong>{state.hero.weapon.equippedItemName}</strong>
                  </div>
                  <div>
                    <span>현재 강화 수치</span>
                    <strong>+{state.hero.weapon.level}</strong>
                  </div>
                  <div>
                    <span>현재 추가 공격력</span>
                    <strong>+{state.hero.weapon.bonusAtk}</strong>
                  </div>
                  <div>
                    <span>다음 시도 비용</span>
                    <strong>{getEnhanceCost(state.hero.weapon.level)} 골드</strong>
                  </div>
                  <div>
                    <span>현재 보유 골드</span>
                    <strong>{state.hero.gold} 골드</strong>
                  </div>
                  <div>
                    <span>권장 챕터 구간</span>
                    <strong>{state.chapter <= 3 ? "자동 성장 구간" : "직접 개입 구간"}</strong>
                  </div>
                </div>
                <div className="toolbar-row enhancement-actions">
                  <div className="inline-notice">
                    <strong>팁</strong>
                    <span>챕터 4부터는 무기 강화와 방어구 교체를 같이 챙기면 자동사냥 안정성이 크게 올라갑니다.</span>
                  </div>
                  <button onClick={state.tryEnhanceWeapon} disabled={state.hero.gold < getEnhanceCost(state.hero.weapon.level)}>
                    무기 강화 시도
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "growth" && (
            <div className="panel-grid">
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>영웅 성장</h3>
                  <span className="pill">{HERO_CLASSES[state.hero.classId]?.summary}</span>
                </div>
                <div className="stats-board">
                  <div><span>경험치</span><strong>{Math.floor(state.hero.exp)}</strong></div>
                  <div><span>공격속도</span><strong>{state.hero.attackSpeed}</strong></div>
                  <div><span>치명타율</span><strong>{Math.round(state.hero.critRate * 100)}%</strong></div>
                  <div><span>회피율</span><strong>{Math.round(state.hero.evasion * 100)}%</strong></div>
                </div>
              </div>
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>스킬 강화</h3>
                  <span className="pill">Q / E / R</span>
                </div>
                <ul className="inventory-list">
                  {["q", "e", "r"].map((skillKey) => {
                    const level = state.hero.skillLevels?.[skillKey] ?? 1
                    const cost = getSkillUpgradeCost(skillKey, level)
                    const rule = SKILL_UPGRADE_RULES[skillKey]
                    const canUpgrade = state.hero.gold >= cost
                    return (
                      <li key={skillKey} className="inventory-item">
                        <div>
                          <strong>{skillKey.toUpperCase()} · {rule.label}</strong>
                          <span>Lv.{level} · 비용 {cost} 골드</span>
                        </div>
                        <button onClick={() => state.upgradeSkill(skillKey)} disabled={!canUpgrade}>강화</button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>성장 우선순위</h3>
                  <span className="pill">추천 흐름</span>
                </div>
                <ul className="inventory-list">
                  <li className="inventory-item">
                    <div>
                      <strong>1. 무기 강화</strong>
                      <span>직접 화력을 높여 가장 빠르게 스테이지 정체를 뚫습니다.</span>
                    </div>
                  </li>
                  <li className="inventory-item">
                    <div>
                      <strong>2. 갑옷 / 투구 교체</strong>
                      <span>생존력을 올려 자동사냥 안정성을 높입니다.</span>
                    </div>
                  </li>
                  <li className="inventory-item">
                    <div>
                      <strong>3. Q/E/R 순차 강화</strong>
                      <span>광역기와 주력기 레벨을 같이 올리면 체감 효율이 큽니다.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "companion" && (
            <div className="panel-grid">
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>동료 소환</h3>
                  <span className="pill">비용 {SUMMON_COST} 골드</span>
                </div>
                <p className="panel-copy">등장 등급: {COMPANION_POOL.map((entry) => entry.rarity).filter((value, index, array) => array.indexOf(value) === index).join(" / ")}</p>
                <button onClick={state.summonCompanion} disabled={state.hero.gold < SUMMON_COST}>동료 소환하기</button>
              </div>

              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>보유 동료</h3>
                  <span className="pill">{state.companions.length}명</span>
                </div>
                <ul className="inventory-list">
                  {state.companions.map((companion) => {
                    const level = companion.level ?? 1
                    const stats = getCompanionStats(companion)
                    const cost = getCompanionEnhanceCost(level)
                    const isMax = level >= COMPANION_MAX_LEVEL

                    return (
                      <li key={companion.instanceId} className="inventory-item">
                        <div>
                          <strong><Icon icon={companion.rarity === "전설" ? sparklesIcon : pawPrintsIcon} /> {companion.name} · {companion.rarity} · Lv.{level}</strong>
                          <span>{`공격 +${stats.atkBonus} / 방어 +${stats.defBonus} / 체력 +${stats.hpBonus}`}</span>
                        </div>
                        <div className="inline-actions">
                          <button onClick={() => state.equipCompanion(companion.instanceId)} disabled={state.activeCompanionId === companion.instanceId}>
                            {state.activeCompanionId === companion.instanceId ? "장착 중" : "장착"}
                          </button>
                          <button onClick={() => state.upgradeCompanion(companion.instanceId)} disabled={isMax || state.hero.gold < cost}>
                            {isMax ? "최대" : `강화 ${cost}골드`}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                  {state.companions.length === 0 && <li className="empty-state">아직 동료가 없습니다.</li>}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "dungeon" && (
            <div className="panel-grid">
              <div className="inventory-panel full-span">
                <div className="panel-heading">
                  <h3>일일 던전</h3>
                  <span className="pill">추가 보상 획득</span>
                </div>
                <ul className="inventory-list">
                  {DUNGEONS.map((dungeon) => {
                    const attempts = state.dungeons?.attempts?.[dungeon.id] ?? dungeon.attemptsPerDay
                    const locked = state.chapter < dungeon.unlockChapter
                    return (
                      <li key={dungeon.id} className="inventory-item">
                        <div>
                          <strong>{dungeon.name}</strong>
                          <span>{dungeon.description} · 해금 챕터 {dungeon.unlockChapter} · 남은 횟수 {attempts}</span>
                        </div>
                        <button onClick={() => state.runDungeon(dungeon.id)} disabled={locked || attempts <= 0}>
                          {locked ? "잠김" : attempts > 0 ? "입장" : "소진"}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "shop" && (
            <div className="panel-grid">
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>일일 무료 보상</h3>
                  <span className="pill">오늘 1회</span>
                </div>
                <p className="panel-copy">골드 +{dailyReward.gold} / 경험치 +{dailyReward.exp}</p>
                <button onClick={state.claimDailyReward} disabled={state.dailyReward?.claimed}>
                  {state.dailyReward?.claimed ? "수령 완료" : "무료 수령"}
                </button>
              </div>

              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>상점</h3>
                  <span className="pill">즉시 구매</span>
                </div>
                <ul className="inventory-list">
                  {SHOP_ITEMS.map((item) => (
                    <li key={item.id} className="inventory-item">
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.description} · 가격 {item.cost} 골드</span>
                      </div>
                      <button onClick={() => state.buyShopItem(item.id)} disabled={state.hero.gold < item.cost}>구매</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "missions" && (
            <div className="panel-grid">
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>퀘스트</h3>
                  <span className="pill">단기 목표</span>
                </div>
                <ul className="inventory-list">
                  {QUESTS.map((quest) => {
                    const progress = getProgressValue(quest, state)
                    const completed = progress >= quest.target
                    const claimed = state.questClaims?.[quest.id]
                    return (
                      <li key={quest.id} className="inventory-item">
                        <div>
                          <strong>{quest.title}</strong>
                          <span>{quest.description} · {Math.min(progress, quest.target)} / {quest.target}</span>
                        </div>
                        <button onClick={() => state.claimQuestReward(quest.id)} disabled={!completed || claimed}>
                          {claimed ? "수령 완료" : completed ? `보상 ${quest.rewardGold}G` : "진행 중"}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="inventory-panel">
                <div className="panel-heading">
                  <h3>업적</h3>
                  <span className="pill">장기 목표</span>
                </div>
                <ul className="inventory-list">
                  {ACHIEVEMENTS.map((achievement) => {
                    const progress = getProgressValue(achievement, state)
                    const completed = progress >= achievement.target
                    const claimed = state.achievementClaims?.[achievement.id]
                    return (
                      <li key={achievement.id} className="inventory-item">
                        <div>
                          <strong>{achievement.title}</strong>
                          <span>{achievement.description} · {Math.min(progress, achievement.target)} / {achievement.target}</span>
                        </div>
                        <button onClick={() => state.claimAchievementReward(achievement.id)} disabled={!completed || claimed}>
                          {claimed ? "수령 완료" : completed ? `보상 ${achievement.rewardGold}G` : "진행 중"}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "log" && (
            <div className="panel-grid">
              <div className="inventory-panel full-span">
                <div className="panel-heading">
                  <h3>최근 기록</h3>
                  <span className="pill">실시간 로그</span>
                </div>
                <ul className="inventory-list">
                  {state.lootLog.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="inventory-item log-item">
                      <div><span>{item}</span></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

HudPanel.propTypes = {
  theme: PropTypes.string.isRequired,
  onChangeTheme: PropTypes.func.isRequired,
}
