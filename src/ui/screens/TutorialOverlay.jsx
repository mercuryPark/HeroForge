/**
 * TutorialOverlay — step-by-step onboarding guide for new players.
 *
 * Shows tutorial steps from tutorial.json with a dark overlay,
 * highlighted areas, and next/skip buttons.
 */
import { signal } from '@preact/signals'
import styles from './TutorialOverlay.module.css'
import tutorialSteps from '@data/tutorial.json'

/** Whether tutorial is active */
export const tutorialActive = signal(false)

/** Current step index */
const currentStep = signal(0)

/** Start the tutorial */
export function startTutorial() {
  currentStep.value = 0
  tutorialActive.value = true
}

/** End the tutorial */
function endTutorial() {
  tutorialActive.value = false
  // Save that tutorial was completed
  try {
    localStorage.setItem('heroforge_tutorial_done', '1')
  } catch (e) { /* ignore */ }
}

/** Check if tutorial was already completed */
export function isTutorialDone() {
  try {
    return localStorage.getItem('heroforge_tutorial_done') === '1'
  } catch (e) {
    return false
  }
}

export function TutorialOverlay() {
  if (!tutorialActive.value) return null

  const step = tutorialSteps[currentStep.value]
  if (!step) {
    endTutorial()
    return null
  }

  const isLast = currentStep.value >= tutorialSteps.length - 1
  const stepNum = `${currentStep.value + 1}/${tutorialSteps.length}`

  function handleNext() {
    if (isLast) {
      endTutorial()
    } else {
      currentStep.value += 1
    }
  }

  function handleSkip() {
    endTutorial()
  }

  // Position class based on step.position
  const posClass = styles[step.position] || styles.center

  return (
    <div class={styles.overlay} onClick={handleNext}>
      <div class={`${styles.dialog} ${posClass}`} onClick={(e) => e.stopPropagation()}>
        <div class={styles.stepCounter}>{stepNum}</div>
        <h3 class={styles.title}>{step.title}</h3>
        <p class={styles.text}>{step.text}</p>
        <div class={styles.buttons}>
          <button class={styles.skipBtn} onClick={handleSkip}>건너뛰기</button>
          <button class={styles.nextBtn} onClick={handleNext}>
            {isLast ? '시작!' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
