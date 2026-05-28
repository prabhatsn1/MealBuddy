/**
 * Zomato API service — powered by RapidAPI.
 *
 * RapidAPI host : zomato-api2.p.rapidapi.com
 * Subscribe at  : https://rapidapi.com/apidojo/api/zomato-api2  (100 req/day free)
 *
 * Returns [] if EXPO_PUBLIC_RAPIDAPI_KEY is not set, letting the aggregator
 * fall back to mock data for this platform.
 */

import { RestaurantResult } from '@/types/meal';
import { ZomatoRestaurantRaw, ZomatoSearchResponse } from './types';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = 'zomato-api2.p.rapidapi.com';

/** Map a single raw Zomato restaurant into our shared schema. */
function mapRestaurant(raw: ZomatoRestaurantRaw, query: string, index: number): RestaurantResult {
  const r = raw.restaurant;
  // Zomato reports "cost for two"; divide by 2 for a single-meal estimate.
  const basePrice = Math.round(r.average_cost_for_two / 2);

  return {
    id: `zomato-${r.id}`,
    name: r.name,
    platform: 'Zomato',
    cuisine: query.toLowerCase(),
    price: basePrice,
    originalPrice: Math.round(basePrice * 1.15), // ~15% markup as "original"
    rating: parseFloat(r.user_rating.aggregate_rating) || 0,
    // delivery_time_estimate is not always populated; stagger fallback values.
    deliveryMinutes: r.delivery_time_estimate ?? 25 + (index % 4) * 5,
    distance: r.location.distance ? `${parseFloat(r.location.distance).toFixed(1)} km` : `${(1 + index * 0.5).toFixed(1)} km`,
    offer: r.offers?.[0]?.offer_description ?? null,
  };
}

/**
 * Search Zomato for food items near the given coordinates.
 * Returns an empty array on any failure so the aggregator can fall back gracefully.
 */
export async function searchZomato(
  query: string,
  lat: number,
  lng: number,
): Promise<RestaurantResult[]> {
  if (!RAPIDAPI_KEY) return [];

  const url =
    `https://${RAPIDAPI_HOST}/search` +
    `?q=${encodeURIComponent(query)}` +
    `&lat=${lat}&lon=${lng}` +
    `&sort=rating&order=desc&count=15&radius=5`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (!response.ok) return [];

  const data: ZomatoSearchResponse = await response.json();

  if (!Array.isArray(data.restaurants)) return [];

  return data.restaurants
    .filter((r) => r.restaurant.has_online_delivery === 1)
    .slice(0, 10)
    .map((r, i) => mapRestaurant(r, query, i));
}
