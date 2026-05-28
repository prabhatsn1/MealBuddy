import { DEFAULT_PREFERENCES } from '@/hooks/use-preferences';
import type { Confidence } from '@/types/meal';

describe('DEFAULT_PREFERENCES', () => {
  // ── Pre-existing fields ───────────────────────────────────────────────────

  it('has defaultMode set to balanced', () => {
    expect(DEFAULT_PREFERENCES.defaultMode).toBe('balanced');
  });

  it('has maxPrice set to 0 (no limit)', () => {
    expect(DEFAULT_PREFERENCES.maxPrice).toBe(0);
  });

  it('has minRating set to 0 (no limit)', () => {
    expect(DEFAULT_PREFERENCES.minRating).toBe(0);
  });

  // ── New fields ────────────────────────────────────────────────────────────

  it('has minConfidenceToAct defaulting to "medium"', () => {
    expect(DEFAULT_PREFERENCES.minConfidenceToAct).toBe<Confidence>('medium');
  });

  it('has autoOrderThreshold defaulting to 0 (off)', () => {
    expect(DEFAULT_PREFERENCES.autoOrderThreshold).toBe(0);
  });

  // ── Structural checks ─────────────────────────────────────────────────────

  it('minConfidenceToAct is a valid Confidence level', () => {
    const validLevels: Confidence[] = ['low', 'medium', 'high'];
    expect(validLevels).toContain(DEFAULT_PREFERENCES.minConfidenceToAct);
  });

  it('autoOrderThreshold is a non-negative number', () => {
    expect(DEFAULT_PREFERENCES.autoOrderThreshold).toBeGreaterThanOrEqual(0);
  });
});
