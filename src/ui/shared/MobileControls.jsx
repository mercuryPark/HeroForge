/**
 * MobileControls — virtual joystick and action buttons for touch devices.
 * Only visible on touch-capable devices.
 */
import { signal } from '@preact/signals'
import styles from './MobileControls.module.css'
import { Input } from '@systems/logic/InputSystem'

const isTouchDevice = signal(false)

if (typeof window !== 'undefined') {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

function handleTouch(key, active) {
  Input[key] = active
}

export function MobileControls() {
  if (!isTouchDevice.value) return null

  return (
    <div class={styles.controls}>
      {/* D-pad */}
      <div class={styles.dpad}>
        <button class={styles.dpadBtn}
          onTouchStart={() => handleTouch('up', true)}
          onTouchEnd={() => handleTouch('up', false)}>
          ▲
        </button>
        <div class={styles.dpadRow}>
          <button class={styles.dpadBtn}
            onTouchStart={() => handleTouch('left', true)}
            onTouchEnd={() => handleTouch('left', false)}>
            ◀
          </button>
          <button class={styles.dpadBtn}
            onTouchStart={() => handleTouch('down', true)}
            onTouchEnd={() => handleTouch('down', false)}>
            ▼
          </button>
          <button class={styles.dpadBtn}
            onTouchStart={() => handleTouch('right', true)}
            onTouchEnd={() => handleTouch('right', false)}>
            ▶
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div class={styles.actions}>
        <button class={`${styles.actionBtn} ${styles.jumpBtn}`}
          onTouchStart={() => handleTouch('jump', true)}
          onTouchEnd={() => handleTouch('jump', false)}>
          JUMP
        </button>
        <button class={`${styles.actionBtn} ${styles.attackBtn}`}
          onTouchStart={() => handleTouch('attack', true)}
          onTouchEnd={() => handleTouch('attack', false)}>
          ATK
        </button>
      </div>
    </div>
  )
}
