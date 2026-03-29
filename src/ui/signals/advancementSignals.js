/**
 * Advancement signals — shared between UIBridgeSystem and AdvancementPanel.
 */
import { signal } from '@preact/signals'

export const advancementSignals = {
  /** Current advancement tier (0-4) */
  currentTier: signal(0),
  /** Whether an advancement quest is active */
  questActive: signal(false),
  /** Current quest tier (1-4) */
  questTier: signal(0),
  /** Kills so far */
  killCount: signal(0),
  /** Total kills needed */
  killTarget: signal(0),
  /** Quest is complete, ready to advance */
  questComplete: signal(false),
  /** Show the advancement notification popup */
  showNotification: signal(false),
  /** Notification message */
  notificationMessage: signal(''),
}
