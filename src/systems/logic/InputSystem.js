/**
 * InputSystem — polls keyboard state each tick and exposes a clean Input object.
 * Jump is consumed (one-shot) after each read.
 */

const keys = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.code))
  window.addEventListener('keyup', (e) => keys.delete(e.code))
}

/** Readable input state — updated once per tick by InputSystem */
export const Input = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  autoBattle: true, // default ON for idle RPG
  toggleAutoBattle() {
    this.autoBattle = !this.autoBattle
  },
}

/**
 * @param {object} world
 * @returns {object} world
 */
export function InputSystem(world) {
  Input.left = keys.has('ArrowLeft') || keys.has('KeyA')
  Input.right = keys.has('ArrowRight') || keys.has('KeyD')
  Input.up = keys.has('ArrowUp') || keys.has('KeyW')
  Input.down = keys.has('ArrowDown') || keys.has('KeyS')
  Input.jump = keys.has('Space')
  Input.attack = keys.has('KeyZ') || keys.has('KeyX')

  // Consume jump so it fires only once per press
  if (Input.jump) keys.delete('Space')

  return world
}
