import { isAutoOrderArmed, meetsThreshold } from '@/lib/confidence';
import type { Confidence } from '@/types/meal';

// ─── meetsThreshold ───────────────────────────────────────────────────────────

describe('meetsThreshold', () => {
  // Same level always passes
  it.each<Confidence>(['low', 'medium', 'high'])(
    '%s meets its own level',
    (level) => {
      expect(meetsThreshold(level, level)).toBe(true);
    },
  );

  // Strictly higher current always passes
  it('medium meets low minimum', () => {
    expect(meetsThreshold('medium', 'low')).toBe(true);
  });

  it('high meets low minimum', () => {
    expect(meetsThreshold('high', 'low')).toBe(true);
  });

  it('high meets medium minimum', () => {
    expect(meetsThreshold('high', 'medium')).toBe(true);
  });

  // Strictly lower current always fails
  it('low does NOT meet medium minimum', () => {
    expect(meetsThreshold('low', 'medium')).toBe(false);
  });

  it('low does NOT meet high minimum', () => {
    expect(meetsThreshold('low', 'high')).toBe(false);
  });

  it('medium does NOT meet high minimum', () => {
    expect(meetsThreshold('medium', 'high')).toBe(false);
  });
});

// ─── isAutoOrderArmed ─────────────────────────────────────────────────────────

describe('isAutoOrderArmed', () => {
  // ── Threshold disabled ────────────────────────────────────────────────────

  it('returns false when autoOrderThreshold is 0 (off)', () => {
    expect(isAutoOrderArmed(150, 0, 'high', 'low')).toBe(false);
  });

  it('returns false when autoOrderThreshold is negative', () => {
    expect(isAutoOrderArmed(150, -100, 'high', 'low')).toBe(false);
  });

  // ── Price above threshold ─────────────────────────────────────────────────

  it('returns false when price exceeds threshold', () => {
    expect(isAutoOrderArmed(301, 300, 'high', 'low')).toBe(false);
  });

  it('returns false when price is 1 rupee above threshold', () => {
    expect(isAutoOrderArmed(201, 200, 'high', 'low')).toBe(false);
  });

  // ── Price at or below threshold, but confidence too low ───────────────────

  it('returns false when price is below threshold but confidence is below minimum', () => {
    expect(isAutoOrderArmed(150, 300, 'low', 'medium')).toBe(false);
  });

  it('returns false when price equals threshold but confidence is below minimum', () => {
    expect(isAutoOrderArmed(300, 300, 'medium', 'high')).toBe(false);
  });

  // ── All conditions met ────────────────────────────────────────────────────

  it('returns true when price is below threshold and confidence meets minimum', () => {
    expect(isAutoOrderArmed(250, 300, 'high', 'medium')).toBe(true);
  });

  it('returns true when price equals threshold exactly', () => {
    expect(isAutoOrderArmed(300, 300, 'high', 'medium')).toBe(true);
  });

  it('returns true with low minimum and any confidence', () => {
    expect(isAutoOrderArmed(100, 200, 'low', 'low')).toBe(true);
  });

  it('returns true with high minimum only when confidence is high', () => {
    expect(isAutoOrderArmed(100, 200, 'high', 'high')).toBe(true);
    expect(isAutoOrderArmed(100, 200, 'medium', 'high')).toBe(false);
    expect(isAutoOrderArmed(100, 200, 'low', 'high')).toBe(false);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('treats price=0 as below any positive threshold', () => {
    expect(isAutoOrderArmed(0, 1, 'high', 'low')).toBe(true);
  });
});
