import { useEffect } from 'preact/hooks'
import styles from './LoadingScreen.module.css'

export function LoadingScreen({ progress, onComplete }) {
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [progress, onComplete])

  return (
    <div class={styles.screen}>
      <div class={styles.content}>
        <h1 class={styles.title}>HeroForge</h1>
        <p class={styles.subtitle}>Idle RPG</p>
        <div class={styles.loadingRow}>
          <span class={styles.loadingText}>Loading</span>
          <span class={styles.dots}>
            <span class={styles.dot}>.</span>
            <span class={styles.dot}>.</span>
            <span class={styles.dot}>.</span>
          </span>
        </div>
        <div class={styles.barBg}>
          <div class={styles.barFill} style={{ width: `${progress}%` }} />
        </div>
        <p class={styles.percent}>{progress}%</p>
      </div>
    </div>
  )
}
