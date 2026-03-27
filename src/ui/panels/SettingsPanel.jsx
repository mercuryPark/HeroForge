import { signal } from '@preact/signals'
import styles from './SettingsPanel.module.css'

export const settingsSignals = {
  bgmVolume: signal(70),
  sfxVolume: signal(80),
  showDamageNumbers: signal(true),
  particleDensity: signal(2),  // 0=off, 1=low, 2=medium, 3=high
  isOpen: signal(false),
}

export function SettingsPanel({ saveManager }) {
  if (!settingsSignals.isOpen.value) return null

  const close = () => { settingsSignals.isOpen.value = false }

  const handleExport = async () => {
    if (!saveManager) return
    const json = await saveManager.exportSave()
    if (!json) { alert('No save data found'); return }
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heroforge-save-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      try {
        await saveManager?.importSave(text)
        alert('Save imported! Reloading...')
        location.reload()
      } catch (err) {
        alert('Failed to import: ' + err.message)
      }
    }
    input.click()
  }

  return (
    <div class={styles.overlay} onClick={close}>
      <div class={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 class={styles.title}>Settings</h2>

        <div class={styles.section}>
          <label class={styles.label}>BGM Volume</label>
          <input
            type="range" min="0" max="100"
            value={settingsSignals.bgmVolume.value}
            onInput={(e) => { settingsSignals.bgmVolume.value = +e.target.value }}
            class={styles.slider}
          />
          <span class={styles.value}>{settingsSignals.bgmVolume}%</span>
        </div>

        <div class={styles.section}>
          <label class={styles.label}>SFX Volume</label>
          <input
            type="range" min="0" max="100"
            value={settingsSignals.sfxVolume.value}
            onInput={(e) => { settingsSignals.sfxVolume.value = +e.target.value }}
            class={styles.slider}
          />
          <span class={styles.value}>{settingsSignals.sfxVolume}%</span>
        </div>

        <div class={styles.section}>
          <label class={styles.label}>
            <input
              type="checkbox"
              checked={settingsSignals.showDamageNumbers.value}
              onChange={(e) => { settingsSignals.showDamageNumbers.value = e.target.checked }}
            />
            {' '}Damage Numbers
          </label>
        </div>

        <div class={styles.section}>
          <label class={styles.label}>Particles</label>
          <select
            value={settingsSignals.particleDensity.value}
            onChange={(e) => { settingsSignals.particleDensity.value = +e.target.value }}
            class={styles.select}
          >
            <option value="0">OFF</option>
            <option value="1">Low</option>
            <option value="2">Medium</option>
            <option value="3">High</option>
          </select>
        </div>

        <div class={styles.divider} />

        <div class={styles.section}>
          <button class={styles.btn} onClick={handleExport}>Export Save</button>
          <button class={styles.btn} onClick={handleImport}>Import Save</button>
        </div>

        <button class={styles.closeBtn} onClick={close}>Close</button>
      </div>
    </div>
  )
}
