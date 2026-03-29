/**
 * EnhancementPanel — unified UI for scroll, starforce, and potential enhancement.
 * Also includes equipment presets (3 sets) and batch enhancement.
 */
import { signal } from '@preact/signals'
import { GRADE_NAMES_KR, EQUIP_SLOT_IDS } from '@components/equipment'
import { GRADE_COLORS } from '@data/constants'
import {
  applyScroll, getScrollTypes, attemptStarforce, getStarforceInfo,
  rerollPotential, getPotentialInfo, enhancementCurrencies,
  batchStarforce, estimateBatchCost, recommendEnhanceTarget,
} from '@systems/meta/EnhancementSystem'
import { getEquipped, getAllEquipped } from '@core/Inventory'
import { gold as goldSignal } from '@core/CurrencyManager'
import styles from './EnhancementPanel.module.css'

export const enhancePanelOpen = signal(false)

const SLOT_LABELS = ['모자', '상의', '하의', '장갑', '신발', '망토', '어깨', '벨트', '목걸이', '반지', '얼굴']
const GRADE_COLOR_ARR = [GRADE_COLORS.NORMAL, GRADE_COLORS.RARE, GRADE_COLORS.EPIC, GRADE_COLORS.UNIQUE, GRADE_COLORS.LEGENDARY]

const activeEnhanceTab = signal('scroll')
const selectedSlot = signal(0)
const lastResult = signal('')

/** Equipment presets: 3 sets, each an array of 11 item snapshots */
const presets = [null, null, null]
const presetSignal = signal(0) // bump to re-render

export function EnhancementPanel() {
  if (!enhancePanelOpen.value) return null

  const tab = activeEnhanceTab.value
  const _ps = presetSignal.value // force re-read

  return (
    <div class={styles.overlay} onClick={() => { enhancePanelOpen.value = false }}>
      <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>강화</h2>

        <div class={styles.tabs}>
          {['scroll', 'starforce', 'potential', 'batch', 'preset'].map(t => {
          const labels = { scroll: '주문서', starforce: '스타포스', potential: '잠재능력', batch: '일괄', preset: '프리셋' }
          return (
            <button key={t} class={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => { activeEnhanceTab.value = t }}>
              {labels[t]}
            </button>
          )
        })}
        </div>

        {/* Slot selector */}
        {tab !== 'preset' && (
          <div class={styles.slotSelect}>
            {SLOT_LABELS.map((label, i) => {
              const item = getEquipped(i)
              return (
                <button key={i}
                  class={`${styles.slotBtn} ${selectedSlot.value === i ? styles.slotActive : ''}`}
                  style={item ? { borderColor: GRADE_COLOR_ARR[item.grade] } : {}}
                  onClick={() => { selectedSlot.value = i }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {tab === 'scroll' && <ScrollTab />}
        {tab === 'starforce' && <StarforceTab />}
        {tab === 'potential' && <PotentialTab />}
        {tab === 'batch' && <BatchTab />}
        {tab === 'preset' && <PresetTab />}

        {lastResult.value && <p class={styles.result}>{lastResult.value}</p>}

        <button class={styles.closeBtn} onClick={() => { enhancePanelOpen.value = false }}>닫기</button>
      </div>
    </div>
  )
}

function ScrollTab() {
  const item = getEquipped(selectedSlot.value)
  if (!item) return <p class={styles.empty}>장비를 장착하세요</p>

  const scrolls = getScrollTypes()
  const slotsLeft = item.scrollSlots ?? 7

  return (
    <div>
      <p class={styles.info}>남은 슬롯: {slotsLeft}</p>
      <div class={styles.scrollGrid}>
        {scrolls.map(s => (
          <button key={s.id} class={styles.enhBtn} onClick={() => {
            const result = applyScroll(item, s.id)
            lastResult.value = result.success
              ? `${s.nameKr} 성공! 보너스: ${JSON.stringify(result.bonuses)}`
              : `${s.nameKr} 실패...`
          }}>
            {s.nameKr} ({s.successRate}%)
          </button>
        ))}
      </div>
    </div>
  )
}

function StarforceTab() {
  const item = getEquipped(selectedSlot.value)
  if (!item) return <p class={styles.empty}>장비를 장착하세요</p>

  const info = getStarforceInfo(item)

  return (
    <div class={styles.sfSection}>
      <p class={styles.stars}>{'★'.repeat(info.currentStars)}{'☆'.repeat(Math.max(0, 25 - info.currentStars))}</p>
      <p class={styles.info}>현재: ★{info.currentStars} / ★{info.maxStars}</p>
      <p class={styles.info}>성공률: {info.successRate}%</p>
      <p class={styles.info}>올스탯 보너스: +{info.allStatBonus}</p>
      <p class={styles.info}>비용: {info.goldCost} Gold + {info.scrollCost} SF스크롤</p>
      <p class={styles.info}>SF스크롤 보유: {enhancementCurrencies.starforceScrolls.value}</p>
      <button class={styles.enhBtn} onClick={() => {
        const result = attemptStarforce(item, goldSignal)
        const msgs = { success: '성공! ★ 상승!', maintain: '유지...', drop: '하락! ★ 감소', destroy: '파괴! ★3 하락 + 골드 패널티', no_scrolls: 'SF스크롤 부족', no_gold: '골드 부족', max: '최대 ★ 도달' }
        lastResult.value = `스타포스: ${msgs[result.result]} (★${result.newStars})`
      }}>
        강화 시도
      </button>
    </div>
  )
}

function PotentialTab() {
  const item = getEquipped(selectedSlot.value)
  if (!item) return <p class={styles.empty}>장비를 장착하세요</p>

  const info = getPotentialInfo(item)
  if (!info.hasPotential) return <p class={styles.empty}>에픽 등급 이상 장비만 가능</p>

  return (
    <div>
      <p class={styles.info}>잠재 등급: {info.potentialGradeKr || '없음'}</p>
      {info.lines.length > 0 && (
        <div class={styles.potLines}>
          {info.lines.map((l, i) => (
            <p key={i} class={styles.potLine}>{l.nameKr} +{l.value}%</p>
          ))}
        </div>
      )}
      <p class={styles.info}>일반 큐브: {enhancementCurrencies.normalCubes.value} | 미라클: {enhancementCurrencies.miracleCubes.value}</p>
      <div class={styles.cubeRow}>
        {['normal', 'miracle'].map(type => (
          <button key={type} class={styles.enhBtn} onClick={() => {
            const result = rerollPotential(item, type)
            if (!result.success) { lastResult.value = '큐브 부족 또는 조건 미충족'; return }
            lastResult.value = result.gradeUp ? '등급 UP! 새 옵션 적용됨' : '리롤 완료!'
          }}>
            {type === 'normal' ? '일반 큐브' : '미라클 큐브'}
          </button>
        ))}
        {info.canUseAdditional && (
          <button class={styles.enhBtn} onClick={() => {
            const result = rerollPotential(item, 'additional')
            if (!result.success) { lastResult.value = '에디셔널 큐브 부족'; return }
            lastResult.value = result.gradeUp ? '에디셔널 등급 UP!' : '에디셔널 리롤 완료!'
          }}>
            에디셔널 큐브
          </button>
        )}
      </div>
    </div>
  )
}

const batchTarget = signal(5)

function BatchTab() {
  const equipped = getAllEquipped()
  const target = batchTarget.value
  const estimate = estimateBatchCost(equipped, target)
  const recommendation = recommendEnhanceTarget(equipped)

  return (
    <div>
      <p class={styles.info}>전 슬롯 일괄 스타포스 강화</p>
      <div class={styles.cubeRow}>
        <span class={styles.info}>목표 ★:</span>
        {[3, 5, 10, 12, 15].map(t => (
          <button key={t} class={`${styles.enhBtn} ${target === t ? styles.tabActive : ''}`}
            onClick={() => { batchTarget.value = t }}>
            ★{t}
          </button>
        ))}
      </div>
      <p class={styles.info}>예상 비용: {estimate.totalGold.toLocaleString()} Gold + {estimate.totalScrolls} SF스크롤</p>
      <button class={styles.enhBtn} onClick={() => {
        const result = batchStarforce(equipped, target, goldSignal)
        lastResult.value = `일괄 강화: ${result.totalAttempts}회 시도, ${result.totalSuccess}회 성공, ${result.totalGold.toLocaleString()} Gold 소비`
      }}>
        일괄 강화 시작
      </button>

      {recommendation && (
        <div class={styles.potLines}>
          <p class={styles.info}>추천 강화 타겟:</p>
          <p class={styles.potLine}>
            {recommendation.slotName} (★{recommendation.currentStars}→★{recommendation.nextStars})
          </p>
          <p class={styles.potLine}>
            예상: {recommendation.estimatedGold.toLocaleString()} Gold, +{recommendation.allStatGain} 올스탯
          </p>
        </div>
      )}
    </div>
  )
}

function PresetTab() {
  return (
    <div>
      <p class={styles.info}>장비 프리셋 (최대 3세트)</p>
      {[0, 1, 2].map(i => (
        <div key={i} class={styles.presetRow}>
          <span class={styles.presetLabel}>세트 {i + 1}: {presets[i] ? '저장됨' : '비어있음'}</span>
          <button class={styles.presetBtn} onClick={() => {
            presets[i] = getAllEquipped().map(item => item ? { ...item } : null)
            presetSignal.value++
            lastResult.value = `세트 ${i + 1} 저장 완료`
          }}>저장</button>
          <button class={styles.presetBtn} disabled={!presets[i]} onClick={() => {
            if (!presets[i]) return
            // Preset load would require re-equipping items — simplified for now
            lastResult.value = `세트 ${i + 1} 로드 (장비 교체 기능은 추후 구현)`
          }}>로드</button>
        </div>
      ))}
    </div>
  )
}
