/**
 * Confidence threshold utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helper functions for comparing MealBuddy confidence levels and
 * evaluating auto-order arming conditions.
 */

import { Confidence } from '@/types/meal';

/** Maps confidence level to a numeric rank (higher = more confident). */
export const CONFIDENCE_RANK: Record<Confidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/**
 * Returns true when `current` confidence meets or exceeds the `minimum`
 * required level (e.g. current='high', minimum='medium' → true).
 */
export function meetsThreshold(current: Confidence, minimum: Confidence): boolean {
  return CONFIDENCE_RANK[current] >= CONFIDENCE_RANK[minimum];
}

/**
 * Returns true when all auto-order conditions are met:
 *  - An auto-order threshold is configured (> 0)
 *  - The winner's price is at or below that threshold
 *  - The current confidence level meets the user's minimum required level
 */
export function isAutoOrderArmed(
  price: number,
  autoOrderThreshold: number,
  confidence: Confidence,
  minConfidenceToAct: Confidence,
): boolean {
  if (autoOrderThreshold <= 0) return false;
  if (price > autoOrderThreshold) return false;
  return meetsThreshold(confidence, minConfidenceToAct);
}
