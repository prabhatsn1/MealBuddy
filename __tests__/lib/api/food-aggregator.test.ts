import { searchAllPlatforms } from '@/lib/api/food-aggregator';
import type { RestaurantResult } from '@/types/meal';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/api/swiggy');
jest.mock('@/lib/api/zomato');
jest.mock('@/lib/api/ubereats');
jest.mock('@/data/mock-restaurants');

import { getMockResults } from '@/data/mock-restaurants';
import { searchSwiggy } from '@/lib/api/swiggy';
import { searchUberEats } from '@/lib/api/ubereats';
import { searchZomato } from '@/lib/api/zomato';

const mockSearchSwiggy  = searchSwiggy   as jest.MockedFunction<typeof searchSwiggy>;
const mockSearchZomato  = searchZomato   as jest.MockedFunction<typeof searchZomato>;
const mockSearchUberEats = searchUberEats as jest.MockedFunction<typeof searchUberEats>;
const mockGetMockResults = getMockResults as jest.MockedFunction<typeof getMockResults>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fakeResult(platform: 'Swiggy' | 'Zomato' | 'Uber Eats', id: string): RestaurantResult {
  return {
    id,
    name: `Restaurant ${id}`,
    platform,
    cuisine: 'biryani',
    price: 200,
    originalPrice: 240,
    rating: 4.0,
    deliveryMinutes: 30,
    distance: '1.5 km',
    offer: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Mock fallback ────────────────────────────────────────────────────────────

describe('searchAllPlatforms — mock fallback', () => {
  beforeEach(() => {
    mockSearchSwiggy.mockResolvedValue([]);
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);

    // getMockResults is called per platform — return platform-specific subsets
    mockGetMockResults.mockImplementation(() => [
      fakeResult('Swiggy', 'mock-sw'),
      fakeResult('Zomato', 'mock-zo'),
      fakeResult('Uber Eats', 'mock-ue'),
    ]);
  });

  it('marks all platforms as "mock" when APIs return empty arrays', async () => {
    const { platformStatus } = await searchAllPlatforms('biryani', 28.6, 77.2);
    expect(platformStatus.swiggy).toBe('mock');
    expect(platformStatus.zomato).toBe('mock');
    expect(platformStatus.ubereats).toBe('mock');
  });

  it('still returns results from mock data', async () => {
    const { results } = await searchAllPlatforms('biryani', 28.6, 77.2);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── API source ───────────────────────────────────────────────────────────────

describe('searchAllPlatforms — API source', () => {
  it('marks a platform as "api" when its API returns data', async () => {
    mockSearchSwiggy.mockResolvedValue([fakeResult('Swiggy', 'sw-1')]);
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([]);

    const { platformStatus } = await searchAllPlatforms('biryani', 28.6, 77.2);
    expect(platformStatus.swiggy).toBe('api');
  });

  it('marks remaining platforms as "mock" when they return empty', async () => {
    mockSearchSwiggy.mockResolvedValue([fakeResult('Swiggy', 'sw-1')]);
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([fakeResult('Zomato', 'mock-zo')]);

    const { platformStatus } = await searchAllPlatforms('biryani', 28.6, 77.2);
    expect(platformStatus.zomato).toBe('mock');
    expect(platformStatus.ubereats).toBe('mock');
  });

  it('falls through to mock when the API throws', async () => {
    mockSearchSwiggy.mockRejectedValue(new Error('network error'));
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([fakeResult('Swiggy', 'mock-sw')]);

    const { platformStatus } = await searchAllPlatforms('biryani', 28.6, 77.2);
    expect(platformStatus.swiggy).toBe('mock');
  });
});

// ─── WebView source ───────────────────────────────────────────────────────────

describe('searchAllPlatforms — webview source', () => {
  it('marks a platform as "webview" when webViewSearch returns data', async () => {
    const webViewSearch = jest.fn().mockImplementation(async (platform: string) => {
      if (platform === 'swiggy') return [fakeResult('Swiggy', 'wv-sw')];
      return [];
    });

    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([]);

    const { platformStatus } = await searchAllPlatforms('biryani', 28.6, 77.2, webViewSearch);
    expect(platformStatus.swiggy).toBe('webview');
  });

  it('does not call the direct API when webViewSearch returns data', async () => {
    const webViewSearch = jest.fn().mockResolvedValue([fakeResult('Swiggy', 'wv-sw')]);
    mockSearchSwiggy.mockResolvedValue([fakeResult('Swiggy', 'api-sw')]);
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([]);

    await searchAllPlatforms('biryani', 28.6, 77.2, webViewSearch);
    // searchSwiggy must NOT have been called (webview won)
    expect(mockSearchSwiggy).not.toHaveBeenCalled();
  });

  it('falls through to API when webViewSearch returns empty array', async () => {
    const webViewSearch = jest.fn().mockResolvedValue([]);
    mockSearchSwiggy.mockResolvedValue([fakeResult('Swiggy', 'api-sw')]);
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([]);

    const { platformStatus } = await searchAllPlatforms('biryani', 28.6, 77.2, webViewSearch);
    expect(platformStatus.swiggy).toBe('api');
    expect(mockSearchSwiggy).toHaveBeenCalled();
  });

  it('webViewSearch is called with correct (platform, query, lat, lng)', async () => {
    const webViewSearch = jest.fn().mockResolvedValue([]);
    mockSearchSwiggy.mockResolvedValue([]);
    mockSearchZomato.mockResolvedValue([]);
    mockSearchUberEats.mockResolvedValue([]);
    mockGetMockResults.mockReturnValue([]);

    await searchAllPlatforms('biryani', 28.6, 77.2, webViewSearch);

    expect(webViewSearch).toHaveBeenCalledWith('swiggy',   'biryani', 28.6, 77.2);
    expect(webViewSearch).toHaveBeenCalledWith('zomato',   'biryani', 28.6, 77.2);
    expect(webViewSearch).toHaveBeenCalledWith('ubereats', 'biryani', 28.6, 77.2);
  });
});

// ─── Combined results ─────────────────────────────────────────────────────────

describe('searchAllPlatforms — combined results', () => {
  it('merges results from all three platforms', async () => {
    mockSearchSwiggy.mockResolvedValue([fakeResult('Swiggy', 'sw-1')]);
    mockSearchZomato.mockResolvedValue([fakeResult('Zomato', 'zo-1')]);
    mockSearchUberEats.mockResolvedValue([fakeResult('Uber Eats', 'ue-1')]);
    mockGetMockResults.mockReturnValue([]);

    const { results } = await searchAllPlatforms('biryani', 28.6, 77.2);
    const ids = results.map((r) => r.id);
    expect(ids).toContain('sw-1');
    expect(ids).toContain('zo-1');
    expect(ids).toContain('ue-1');
  });
});
