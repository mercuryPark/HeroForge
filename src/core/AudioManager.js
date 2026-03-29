/**
 * AudioManager — Howler.js wrapper for BGM and SFX.
 * Provides volume control, mute, and channel management.
 */
import { signal } from '@preact/signals'

export const audioSignals = {
  bgmVolume: signal(0.5),
  sfxVolume: signal(0.7),
  bgmMuted: signal(false),
  sfxMuted: signal(false),
}

let _bgmHowl = null
let _sfxCache = {}

/**
 * Play background music.
 * @param {string} src - audio file path
 */
export function playBGM(src) {
  // Howler integration placeholder — requires actual audio files
  // if (_bgmHowl) _bgmHowl.stop()
  // _bgmHowl = new Howl({ src: [src], loop: true, volume: audioSignals.bgmVolume.value })
  // if (!audioSignals.bgmMuted.value) _bgmHowl.play()
}

/** Stop BGM */
export function stopBGM() {
  if (_bgmHowl) { _bgmHowl.stop(); _bgmHowl = null }
}

/**
 * Play a sound effect.
 * @param {string} id - SFX identifier
 */
export function playSFX(id) {
  if (audioSignals.sfxMuted.value) return
  // Placeholder — requires actual audio files
  // const src = SFX_MAP[id]
  // if (!src) return
  // if (!_sfxCache[id]) _sfxCache[id] = new Howl({ src: [src], volume: audioSignals.sfxVolume.value })
  // _sfxCache[id].play()
}

/** Set BGM volume (0-1) */
export function setBGMVolume(vol) {
  audioSignals.bgmVolume.value = vol
  if (_bgmHowl) _bgmHowl.volume(vol)
}

/** Set SFX volume (0-1) */
export function setSFXVolume(vol) {
  audioSignals.sfxVolume.value = vol
}

/** Toggle BGM mute */
export function toggleBGMMute() {
  audioSignals.bgmMuted.value = !audioSignals.bgmMuted.value
  if (_bgmHowl) _bgmHowl.mute(audioSignals.bgmMuted.value)
}

/** Toggle SFX mute */
export function toggleSFXMute() {
  audioSignals.sfxMuted.value = !audioSignals.sfxMuted.value
}
