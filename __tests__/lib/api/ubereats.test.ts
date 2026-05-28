/**
 * Uber Eats API tests.
 *
 * The RAPIDAPI_KEY constant is read at module load time. We use
 * jest.resetModules() + require() (not dynamic import) to reload the module
 * with a different environment for each suite.
 */

type SearchUberEatsFn = (q: string, lat: number, lng: number) => Promise<import('@/types/meal').RestaurantResult[]>;

// ─── Without API key ──────────────────────────────────────────────────────────

describe('searchUberEats — no API key', () => {
  it('returns [] immediately without calling fetch', async () => {
    delete process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
    jest.resetModules();
    global.fetch = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchUberEats } = require('@/lib/api/ubereats') as { searchUberEats: SearchUberEatsFn };
    const results = await searchUberEats('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── With API key ─────────────────────────────────────────────────────────────

describe('searchUberEats — with API key', () => {
  let searchUberEats: SearchUberEatsFn;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_RAPIDAPI_KEY = 'test-key-456';
    jest.resetModules();
    global.fetch = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ searchUberEats } = require('@/lib/api/ubereats') as { searchUberEats: SearchUberEatsFn });
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
  });

  it('returns [] when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const results = await searchUberEats('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });

  it('returns [] when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    await expect(searchUberEats('biryani', 28.6, 77.2)).rejects.toThrow('network error');
  });

  it('returns [] when feedItems array is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedItems: [] }),
    });
    const results = await searchUberEats('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });

  it('parses a valid feedItem of type "store"', async () => {
    const item = {
      type: 'store',
      uuid: 'abc-123',
      title: 'KFC',
      etaRange: { rangeMinutes: { min: 20, max: 30 } },
      rawRating: { ratingValue: 4.3 },
      promotions: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedItems: [item] }),
    });

    const results = await searchUberEats('biryani', 28.6, 77.2);

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.platform).toBe('Uber Eats');
    expect(r.name).toBe('KFC');
    expect(r.rating).toBe(4.3);
    expect(r.deliveryMinutes).toBe(25); // (20 + 30) / 2
    expect(r.id).toContain('abc-123');
  });

  it('skips feedItems that are not of type "store"', async () => {
    const adItem = { type: 'ad', uuid: 'ad-1', title: 'Ad Banner' };
    const storeItem = {
      type: 'store',
      uuid: 'store-1',
      title: 'Pizza Place',
      rawRating: { ratingValue: 4.0 },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feedItems: [adItem, storeItem] }),
    });

    const results = await searchUberEats('pizza', 28.6, 77.2);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Pizza Place');
  });

  it('handles the nested data.feedItems response shape', async () => {
    const item = {
      type: 'store',
      uuid: 'nested-1',
      title: 'Nested Restaurant',
      rawRating: { ratingValue: 3.8 },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { feedItems: [item] } }),
    });

    const results = await searchUberEats('burger', 28.6, 77.2);
    expect(results).toHaveLength(1);
    expect(results[0].id).toContain('nested-1');
  });
});
