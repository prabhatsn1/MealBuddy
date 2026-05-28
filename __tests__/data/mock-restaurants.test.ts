import { getMockResults } from '@/data/mock-restaurants';

const VALID_PLATFORMS = ['Swiggy', 'Zomato', 'Uber Eats'] as const;

// ─── Known cuisines ───────────────────────────────────────────────────────────

describe('getMockResults — known cuisines', () => {
  it.each([
    ['biryani', 'biryani'],
    ['pizza',   'pizza'],
    ['burger',  'burger'],
    ['dosa',    'dosa'],
    ['rolls',   'rolls'],
  ])('returns results for "%s"', (query, expectedCuisine) => {
    const results = getMockResults(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.cuisine === expectedCuisine)).toBe(true);
  });
});

// ─── Keyword map aliases ──────────────────────────────────────────────────────

describe('getMockResults — keyword aliases', () => {
  it('"roll" resolves to rolls cuisine', () => {
    const results = getMockResults('roll');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].cuisine).toBe('rolls');
  });

  it('"kathi" resolves to rolls cuisine', () => {
    const results = getMockResults('kathi');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].cuisine).toBe('rolls');
  });

  it('"frankie" resolves to rolls cuisine', () => {
    const results = getMockResults('frankie');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].cuisine).toBe('rolls');
  });

  it('"wrap" resolves to rolls cuisine', () => {
    const results = getMockResults('wrap');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].cuisine).toBe('rolls');
  });
});

// ─── Partial / compound queries ───────────────────────────────────────────────

describe('getMockResults — partial and compound queries', () => {
  it('"chicken biryani" returns biryani results', () => {
    const results = getMockResults('chicken biryani');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].cuisine).toBe('biryani');
  });

  it('"veg pizza" returns pizza results', () => {
    const results = getMockResults('veg pizza');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].cuisine).toBe('pizza');
  });
});

// ─── Case insensitivity ───────────────────────────────────────────────────────

describe('getMockResults — case insensitivity', () => {
  it('"BIRYANI" returns results', () => {
    const results = getMockResults('BIRYANI');
    expect(results.length).toBeGreaterThan(0);
  });

  it('"Pizza" returns results', () => {
    const results = getMockResults('Pizza');
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── Unknown / empty queries ──────────────────────────────────────────────────

describe('getMockResults — empty/unknown queries', () => {
  it('returns [] for an empty string', () => {
    expect(getMockResults('')).toEqual([]);
  });

  it('returns [] for whitespace-only string', () => {
    expect(getMockResults('   ')).toEqual([]);
  });

  it('returns [] for an unknown food', () => {
    expect(getMockResults('spaghetti bolognese')).toEqual([]);
  });
});

// ─── Result schema validation ─────────────────────────────────────────────────

describe('getMockResults — result schema', () => {
  const results = getMockResults('biryani');

  it('every result has required string fields', () => {
    for (const r of results) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(typeof r.cuisine).toBe('string');
      expect(typeof r.distance).toBe('string');
    }
  });

  it('every result has a valid platform', () => {
    for (const r of results) {
      expect(VALID_PLATFORMS).toContain(r.platform);
    }
  });

  it('every result has a positive price', () => {
    for (const r of results) {
      expect(r.price).toBeGreaterThan(0);
    }
  });

  it('every result has a rating between 0 and 5', () => {
    for (const r of results) {
      expect(r.rating).toBeGreaterThanOrEqual(0);
      expect(r.rating).toBeLessThanOrEqual(5);
    }
  });

  it('every result has a positive delivery time', () => {
    for (const r of results) {
      expect(r.deliveryMinutes).toBeGreaterThan(0);
    }
  });
});

// ─── Multi-platform coverage ──────────────────────────────────────────────────

describe('getMockResults — platform coverage', () => {
  it('biryani results cover at least 2 different platforms', () => {
    const results = getMockResults('biryani');
    const platforms = new Set(results.map((r) => r.platform));
    expect(platforms.size).toBeGreaterThanOrEqual(2);
  });

  it('all result IDs within a cuisine are unique', () => {
    const results = getMockResults('biryani');
    const ids = results.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
