import { getBestChoice } from '@/lib/recommendation-engine';
import type { RestaurantResult } from '@/types/meal';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

function makeResult(overrides: Partial<RestaurantResult> & { id: string }): RestaurantResult {
  return {
    name: 'Test Restaurant',
    platform: 'Swiggy',
    cuisine: 'biryani',
    price: 200,
    originalPrice: 250,
    rating: 4.0,
    deliveryMinutes: 30,
    distance: '2.0 km',
    offer: null,
    ...overrides,
  };
}

const cheapest = makeResult({ id: 'r1', price: 150, deliveryMinutes: 30, rating: 4.0, platform: 'Swiggy' });
const fastest  = makeResult({ id: 'r2', price: 250, deliveryMinutes: 20, rating: 4.5, platform: 'Zomato' });
const bestRated = makeResult({ id: 'r3', price: 200, deliveryMinutes: 25, rating: 4.8, platform: 'Uber Eats' });

const threeResults = [cheapest, fastest, bestRated];

// ─── Mode: cheapest ───────────────────────────────────────────────────────────

describe('getBestChoice — cheapest mode', () => {
  it('picks the lowest-priced result', () => {
    const { winner } = getBestChoice(threeResults, 'cheapest');
    expect(winner.id).toBe('r1');
  });

  it('explanation mentions the platform', () => {
    const { explanation } = getBestChoice(threeResults, 'cheapest');
    expect(explanation).toContain('Swiggy');
  });

  it('explanation mentions a price (₹ symbol)', () => {
    const { explanation } = getBestChoice(threeResults, 'cheapest');
    expect(explanation).toContain('₹');
  });

  it('explanation includes a comparative price delta against the runner-up', () => {
    // winner=r1 (₹150 Swiggy), runner=r3 (₹200 Uber Eats) → diff=50
    const { explanation } = getBestChoice(threeResults, 'cheapest');
    expect(explanation).toContain('50');
    expect(explanation).toContain('Uber Eats');
  });
});

// ─── Mode: fastest ────────────────────────────────────────────────────────────

describe('getBestChoice — fastest mode', () => {
  it('picks the result with shortest delivery time', () => {
    const { winner } = getBestChoice(threeResults, 'fastest');
    expect(winner.id).toBe('r2');
  });
});

// ─── Mode: bestRated ──────────────────────────────────────────────────────────

describe('getBestChoice — bestRated mode', () => {
  it('picks the highest-rated result', () => {
    const { winner } = getBestChoice(threeResults, 'bestRated');
    expect(winner.id).toBe('r3');
  });
});

// ─── Mode: balanced ───────────────────────────────────────────────────────────

describe('getBestChoice — balanced mode', () => {
  it('returns a winner without throwing', () => {
    expect(() => getBestChoice(threeResults, 'balanced')).not.toThrow();
  });

  it('winner is one of the input results', () => {
    const { winner } = getBestChoice(threeResults, 'balanced');
    const ids = threeResults.map((r) => r.id);
    expect(ids).toContain(winner.id);
  });
});

// ─── rankedResults ────────────────────────────────────────────────────────────

describe('getBestChoice — rankedResults', () => {
  it('contains all input results', () => {
    const { rankedResults } = getBestChoice(threeResults, 'cheapest');
    expect(rankedResults).toHaveLength(threeResults.length);
  });

  it('every item has a numeric score', () => {
    const { rankedResults } = getBestChoice(threeResults, 'balanced');
    for (const item of rankedResults) {
      expect(typeof item.score).toBe('number');
    }
  });

  it('results are sorted descending by score', () => {
    const { rankedResults } = getBestChoice(threeResults, 'balanced');
    for (let i = 1; i < rankedResults.length; i++) {
      expect(rankedResults[i - 1].score).toBeGreaterThanOrEqual(rankedResults[i].score);
    }
  });

  it('winner is the first ranked result', () => {
    const { winner, rankedResults } = getBestChoice(threeResults, 'cheapest');
    expect(rankedResults[0].id).toBe(winner.id);
  });
});

// ─── Preference filters ───────────────────────────────────────────────────────

describe('getBestChoice — preference filters', () => {
  it('maxPrice filters out results above the limit', () => {
    // Only r1 (150) and r3 (200) are ≤200
    const { rankedResults } = getBestChoice(threeResults, 'cheapest', {
      maxPrice: 200,
      minRating: 0,
    });
    expect(rankedResults.every((r) => r.price <= 200)).toBe(true);
  });

  it('minRating filters out results below the threshold', () => {
    // Only r3 (4.8) is ≥4.6
    const { rankedResults } = getBestChoice(threeResults, 'bestRated', {
      maxPrice: 0,
      minRating: 4.6,
    });
    expect(rankedResults.every((r) => r.rating >= 4.6)).toBe(true);
  });

  it('maxPrice=0 is treated as "no price filter"', () => {
    const { rankedResults } = getBestChoice(threeResults, 'cheapest', {
      maxPrice: 0,
      minRating: 0,
    });
    expect(rankedResults).toHaveLength(threeResults.length);
  });

  it('over-strict filter falls back to all results', () => {
    // maxPrice=50 matches nothing — should fallback
    const { rankedResults } = getBestChoice(threeResults, 'cheapest', {
      maxPrice: 50,
      minRating: 0,
    });
    expect(rankedResults).toHaveLength(threeResults.length);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('getBestChoice — edge cases', () => {
  it('throws on empty input', () => {
    expect(() => getBestChoice([], 'cheapest')).toThrow('No results to rank');
  });

  it('works with a single result', () => {
    const single = [makeResult({ id: 'only' })];
    const { winner } = getBestChoice(single, 'cheapest');
    expect(winner.id).toBe('only');
  });

  it('does not throw when all prices are equal (normalize edge case)', () => {
    const equal = [
      makeResult({ id: 'a', price: 200, deliveryMinutes: 30, rating: 4.0 }),
      makeResult({ id: 'b', price: 200, deliveryMinutes: 25, rating: 4.2 }),
    ];
    expect(() => getBestChoice(equal, 'cheapest')).not.toThrow();
  });

  it('does not throw when all times are equal', () => {
    const equal = [
      makeResult({ id: 'a', price: 200, deliveryMinutes: 30, rating: 4.0 }),
      makeResult({ id: 'b', price: 250, deliveryMinutes: 30, rating: 4.2 }),
    ];
    expect(() => getBestChoice(equal, 'fastest')).not.toThrow();
  });
});
