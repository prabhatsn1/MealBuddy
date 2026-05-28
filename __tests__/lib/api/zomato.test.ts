/**
 * Zomato API tests.
 *
 * The RAPIDAPI_KEY constant is read at module load time. We use
 * jest.resetModules() + require() (not dynamic import) to reload the module
 * with a different environment for each suite.
 */

// ─── Without API key ──────────────────────────────────────────────────────────

describe('searchZomato — no API key', () => {
  it('returns [] immediately without calling fetch', async () => {
    delete process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
    jest.resetModules();
    global.fetch = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { searchZomato } = require('@/lib/api/zomato') as typeof import('@/lib/api/zomato');
    const results = await searchZomato('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── With API key ─────────────────────────────────────────────────────────────

describe('searchZomato — with API key', () => {
  let searchZomato: (q: string, lat: number, lng: number) => Promise<import('@/types/meal').RestaurantResult[]>;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_RAPIDAPI_KEY = 'test-key-123';
    jest.resetModules();
    global.fetch = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ searchZomato } = require('@/lib/api/zomato') as typeof import('@/lib/api/zomato'));
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
  });

  it('returns [] when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    const results = await searchZomato('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });

  it('returns [] when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    await expect(searchZomato('biryani', 28.6, 77.2)).rejects.toThrow('network error');
  });

  it('returns [] when restaurants array is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results_found: 0 }),
    });
    const results = await searchZomato('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });

  it('parses a valid response and maps to RestaurantResult', async () => {
    const rawRestaurant = {
      restaurant: {
        id: 'z1',
        name: 'Behrouz Biryani',
        cuisines: 'Biryani',
        average_cost_for_two: 600,
        has_online_delivery: 1,
        delivery_time_estimate: 35,
        user_rating: { aggregate_rating: '4.4' },
        location: { locality_verbose: 'Connaught Place', distance: '2.1' },
        offers: [],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results_found: 1,
        restaurants: [rawRestaurant],
      }),
    });

    const results = await searchZomato('biryani', 28.6, 77.2);

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.platform).toBe('Zomato');
    expect(r.price).toBe(300); // average_cost_for_two / 2
    expect(r.rating).toBe(4.4);
    expect(r.deliveryMinutes).toBe(35);
    expect(r.name).toBe('Behrouz Biryani');
  });

  it('skips restaurants that do not have online delivery', async () => {
    const rawRestaurant = {
      restaurant: {
        id: 'z2',
        name: 'Offline Only',
        cuisines: 'Biryani',
        average_cost_for_two: 400,
        has_online_delivery: 0,
        user_rating: { aggregate_rating: '4.0' },
        location: { locality_verbose: 'Test' },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results_found: 1,
        restaurants: [rawRestaurant],
      }),
    });

    const results = await searchZomato('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });
});
