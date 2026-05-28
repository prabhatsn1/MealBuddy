/**
 * Food Aggregator — fetches from Zomato, Swiggy, and Uber Eats in parallel.
 *
 * Priority order (highest to lowest) per platform:
 *   1. WebView session search   — uses the user's authenticated browser session.
 *   2. Direct API search        — RapidAPI key / Swiggy dapi (no login needed).
 *   3. Mock data fallback       — always works, shown when both above fail.
 */

import { getMockResults } from '@/data/mock-restaurants';
import { PlatformKey } from '@/lib/auth/types';
import { RestaurantResult } from '@/types/meal';
import { searchSwiggy } from './swiggy';
import { searchUberEats } from './ubereats';
import { searchZomato } from './zomato';

const DEFAULT_LAT = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? '28.6139');
const DEFAULT_LNG = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? '77.2090');

export type DataSource = 'webview' | 'api' | 'mock';

export type PlatformStatus = {
  zomato: DataSource;
  swiggy: DataSource;
  ubereats: DataSource;
};

export interface AggregatorResult {
  results: RestaurantResult[];
  platformStatus: PlatformStatus;
}

/** Optional callback provided by the PlatformAuthProvider for WebView-based search. */
export type WebViewSearchFn = (
  platform: PlatformKey,
  query: string,
  lat: number,
  lng: number,
) => Promise<RestaurantResult[]>;

async function resolveForPlatform(
  platform: PlatformKey,
  query: string,
  lat: number,
  lng: number,
  webViewSearch?: WebViewSearchFn,
): Promise<{ results: RestaurantResult[]; source: DataSource }> {
  // 1. WebView session (authenticated — best data quality)
  if (webViewSearch) {
    try {
      const results = await webViewSearch(platform, query, lat, lng);
      if (results.length > 0) return { results, source: 'webview' };
    } catch {
      // fall through to direct API
    }
  }

  // 2. Direct API (RapidAPI key or Swiggy dapi)
  try {
    let results: RestaurantResult[] = [];
    if (platform === 'swiggy') results = await searchSwiggy(query, lat, lng);
    else if (platform === 'zomato') results = await searchZomato(query, lat, lng);
    else if (platform === 'ubereats') results = await searchUberEats(query, lat, lng);
    if (results.length > 0) return { results, source: 'api' };
  } catch {
    // fall through to mock
  }

  // 3. Mock fallback
  const label = platform === 'ubereats' ? 'Uber Eats' : platform.charAt(0).toUpperCase() + platform.slice(1);
  return {
    results: getMockResults(query).filter((r) => r.platform === label),
    source: 'mock',
  };
}

/**
 * Searches all three platforms in parallel.
 *
 * @param query         Food item (e.g. "Biryani").
 * @param lat           User latitude — defaults to env config.
 * @param lng           User longitude — defaults to env config.
 * @param webViewSearch Optional WebView session search function from PlatformAuthProvider.
 */
export async function searchAllPlatforms(
  query: string,
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG,
  webViewSearch?: WebViewSearchFn,
): Promise<AggregatorResult> {
  const [swiggyRes, zomatoRes, uberEatsRes] = await Promise.all([
    resolveForPlatform('swiggy', query, lat, lng, webViewSearch),
    resolveForPlatform('zomato', query, lat, lng, webViewSearch),
    resolveForPlatform('ubereats', query, lat, lng, webViewSearch),
  ]);

  return {
    results: [...swiggyRes.results, ...zomatoRes.results, ...uberEatsRes.results],
    platformStatus: {
      swiggy: swiggyRes.source,
      zomato: zomatoRes.source,
      ubereats: uberEatsRes.source,
    },
  };
}
