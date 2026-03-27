/**
 * Shared signals for stat allocation — kept in a separate module to avoid circular imports.
 * Imported by: HudPanel, StatPanel, UIBridgeSystem
 */
import { signal } from '@preact/signals'

/** Available stat points to allocate — synced from ECS by UIBridgeSystem each tick. */
export const availablePointsSignal = signal(0)
