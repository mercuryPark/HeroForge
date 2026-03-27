import { signal, computed } from '@preact/signals'
import styles from './JobSelectScreen.module.css'
import jobsData from '@data/jobs.json'

/** Class definitions */
const CLASSES = [
  { id: 'warrior', label: '전사',   tabClass: styles.tabWarrior },
  { id: 'mage',    label: '마법사', tabClass: styles.tabMage    },
  { id: 'archer',  label: '궁수',   tabClass: styles.tabArcher  },
  { id: 'thief',   label: '도적',   tabClass: styles.tabThief   },
]

/** Weapon type Korean mapping */
const WEAPON_KR = {
  sword:    '검',
  spear:    '창',
  mace:     '철퇴',
  staff:    '마법봉',
  bow:      '활',
  crossbow: '쇠뇌',
  claw:     '클로',
  dagger:   '단검',
}

/**
 * Generate a short description based on the job's base stats.
 * @param {object} baseStats
 * @returns {string}
 */
function getJobDesc(baseStats) {
  const { hp, def, atk, critRate, atkSpeed, mp } = baseStats
  const parts = []
  if (hp >= 1200) parts.push('높은 HP')
  if (def >= 80)  parts.push('강한 방어')
  if (atk >= 100) parts.push('강력한 공격')
  if (critRate >= 30) parts.push('높은 크리티컬')
  if (atkSpeed >= 1.3) parts.push('빠른 공격속도')
  if (mp >= 1500) parts.push('풍부한 MP')
  if (parts.length === 0) parts.push('균형 잡힌 스펙')
  return parts.join(' · ')
}

// Module-level signals (persist between renders)
const activeClassSignal = signal('warrior')
const selectedJobSignal = signal(null)

/**
 * Job selection screen.
 *
 * @param {{ onSelectJob: (jobId: string) => void }} props
 */
export function JobSelectScreen({ onSelectJob }) {
  const activeClass = activeClassSignal.value
  const selectedJob = selectedJobSignal.value

  const jobsForClass = jobsData.jobs.filter(j => j.class === activeClass)

  const handleConfirm = () => {
    if (!selectedJob) return
    onSelectJob(selectedJob)
  }

  return (
    <div class={styles.screen}>
      <h1 class={styles.title}>직업 선택</h1>

      {/* Class tabs */}
      <div class={styles.tabs}>
        {CLASSES.map(cls => (
          <button
            key={cls.id}
            class={[
              styles.tab,
              cls.tabClass,
              activeClass === cls.id ? styles.tabActive : '',
            ].filter(Boolean).join(' ')}
            onClick={() => {
              activeClassSignal.value = cls.id
              selectedJobSignal.value = null
            }}
          >
            {cls.label}
          </button>
        ))}
      </div>

      {/* Job cards */}
      <div class={styles.cardGrid}>
        {jobsForClass.map(job => (
          <div
            key={job.id}
            class={[
              styles.card,
              selectedJob === job.id ? styles.cardSelected : '',
            ].filter(Boolean).join(' ')}
            onClick={() => { selectedJobSignal.value = job.id }}
          >
            <p class={styles.cardName}>{job.nameKr}</p>
            <p class={styles.cardWeapon}>{WEAPON_KR[job.weaponType] ?? job.weaponType}</p>

            <div class={styles.cardStats}>
              <div class={styles.statRow}>
                <span class={styles.statLabel}>HP</span>
                <span class={styles.statValue}>{job.baseStats.hp}</span>
              </div>
              <div class={styles.statRow}>
                <span class={styles.statLabel}>ATK</span>
                <span class={styles.statValue}>{job.baseStats.atk}</span>
              </div>
              <div class={styles.statRow}>
                <span class={styles.statLabel}>DEF</span>
                <span class={styles.statValue}>{job.baseStats.def}</span>
              </div>
              <div class={styles.statRow}>
                <span class={styles.statLabel}>크리티컬</span>
                <span class={styles.statValue}>{job.baseStats.critRate}%</span>
              </div>
              <div class={styles.statRow}>
                <span class={styles.statLabel}>공격속도</span>
                <span class={styles.statValue}>{job.baseStats.atkSpeed.toFixed(2)}</span>
              </div>
            </div>

            <p class={styles.cardDesc}>{getJobDesc(job.baseStats)}</p>
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <button
        class={styles.startBtn}
        disabled={!selectedJob}
        onClick={handleConfirm}
      >
        게임 시작
      </button>
    </div>
  )
}
