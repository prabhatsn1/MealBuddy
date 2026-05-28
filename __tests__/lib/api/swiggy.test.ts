import { searchSwiggy } from '@/lib/api/swiggy';

// ─── fetch mock ───────────────────────────────────────────────────────────────

const DISH_TYPE = 'type.googleapis.com/swiggy.presentation.food.v2.Dish';

function swiggyCard(dishId: string, pricePaise: number) {
  return {
    card: {
      card: {
        '@type': DISH_TYPE,
        info: {
          id: dishId,
          name: `Dish ${dishId}`,
          price: pricePaise,
          finalPrice: pricePaise,
          ratings: { aggregatedRating: { rating: '4.2' } },
        },
        restaurant: {
          info: {
            id: `resto-${dishId}`,
            name: `Restaurant ${dishId}`,
            avgRating: '4.2',
            sla: { deliveryTime: 30, lastMileTravel: 2.5 },
          },
        },
      },
    },
  };
}

function mockFetchOk(cards: unknown[]) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { cards } }),
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('searchSwiggy — error handling', () => {
  it('propagates a network error (no catch in searchSwiggy)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    await expect(searchSwiggy('biryani', 28.6, 77.2)).rejects.toThrow('network error');
  });

  it('returns [] when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    const results = await searchSwiggy('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });

  it('returns [] when the cards array is empty', async () => {
    mockFetchOk([]);
    const results = await searchSwiggy('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });
});

// ─── Parsing ──────────────────────────────────────────────────────────────────

describe('searchSwiggy — parsing', () => {
  it('maps a valid dish card to RestaurantResult', async () => {
    mockFetchOk([swiggyCard('d1', 27500)]); // 275.00 in paise

    const results = await searchSwiggy('biryani', 28.6, 77.2);
    expect(results).toHaveLength(1);

    const r = results[0];
    expect(r.platform).toBe('Swiggy');
    expect(r.price).toBe(275);
    expect(r.cuisine).toBe('biryani');
    expect(typeof r.rating).toBe('number');
  });

  it('divides price from paise to rupees correctly', async () => {
    mockFetchOk([swiggyCard('d2', 34900)]); // 349.00

    const results = await searchSwiggy('pizza', 28.6, 77.2);
    expect(results[0].price).toBe(349);
  });

  it('skips cards that are not of the Dish type', async () => {
    const nonDishCard = {
      card: { card: { '@type': 'some.other.type', info: {} } },
    };
    mockFetchOk([nonDishCard, swiggyCard('d3', 20000)]);

    const results = await searchSwiggy('burger', 28.6, 77.2);
    expect(results).toHaveLength(1);
    expect(results[0].id).toContain('d3');
  });

  it('skips cards where finalPrice is 0', async () => {
    mockFetchOk([swiggyCard('free', 0)]);
    const results = await searchSwiggy('biryani', 28.6, 77.2);
    expect(results).toEqual([]);
  });

  it('returns at most 10 results', async () => {
    const cards = Array.from({ length: 15 }, (_, i) =>
      swiggyCard(`d${i}`, 20000 + i * 100),
    );
    mockFetchOk(cards);

    const results = await searchSwiggy('biryani', 28.6, 77.2);
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
