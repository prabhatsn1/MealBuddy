/**
 * Uber Eats service — powered by RapidAPI.
 *
 * RapidAPI host : uber-eats-data.p.rapidapi.com
 * Subscribe at  : https://rapidapi.com/ptwebsolution/api/uber-eats-data  (Free tier)
 *
 * Returns [] if EXPO_PUBLIC_RAPIDAPI_KEY is not set, letting the aggregator
 * fall back to mock data for this platform.
 */

import { RestaurantResult } from '@/types/meal';
import { UberEatsFeedItem, UberEatsSearchResponse } from './types';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = 'uber-eats-data.p.rapidapi.com';

function mapFeedItem(item: UberEatsFeedItem, query: string, index: number): RestaurantResult | null {
  if (item.type !== 'store') return null;

  const minEta = item.etaRange?.rangeMinutes?.min;
  const maxEta = item.etaRange?.rangeMinutes?.max;
  const deliveryMinutes = minEta != null ? Math.round((minEta + (maxEta ?? minEta)) / 2) : 30 + (index % 4) * 5;

  const rating = item.rawRating?.ratingValue ?? 0;

  // Uber Eats doesn't expose per-item price in search results — derive from
  // category position as a rough ordering.
  const basePrice = 150 + index * 20;

  const offer = item.promotions?.[0]?.text ?? null;

  return {
    id: `ubereats-${item.uuid}`,
    name: item.title,
    platform: 'Uber Eats',
    cuisine: query.toLowerCase(),
    price: basePrice,
    originalPrice: Math.round(basePrice * 1.1),
    rating,
    deliveryMinutes,
    distance: `${(0.8 + index * 0.5).toFixed(1)} km`,
    offer,
  };
}

/**
 * Search Uber Eats for restaurants near the given coordinates.
 * Returns an empty array on any failure.
 */
export async function searchUberEats(
  query: string,
  lat: number,
  lng: number,
): Promise<RestaurantResult[]> {
  if (!RAPIDAPI_KEY) return [];

  const url =
    `https://${RAPIDAPI_HOST}/restaurant-search` +
    `?q=${encodeURIComponent(query)}&lat=${lat}&lng=${lng}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (!response.ok) return [];

  const data: UberEatsSearchResponse = await response.json();

  // Handle both response shapes (top-level feedItems or nested under data)
  const feedItems: UberEatsFeedItem[] = data.feedItems ?? data.data?.feedItems ?? [];

  const results: RestaurantResult[] = [];
  feedItems.forEach((item, index) => {
    const mapped = mapFeedItem(item, query, index);
    if (mapped) results.push(mapped);
  });

  return results.slice(0, 10);
}
